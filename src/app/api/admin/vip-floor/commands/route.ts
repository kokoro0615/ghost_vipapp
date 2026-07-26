import { NextResponse } from "next/server";

import {
  canExecuteVipCommand,
  type VipCommandKind,
} from "@/lib/adminPermissions";
import { VIP_SERVICE_STATUSES, type VipServiceStatus } from "@/lib/vipFloorV2Contract";
import {
  copyJson,
  ghostAdminFetch,
  readAdminSession,
  readAdminToken,
} from "@/lib/server/ghostAdminProxy";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/u;
const COMMANDS = {
  check_in: (id: string) => `/api/admin/reservations/${encodeURIComponent(id)}/vipapp-command`,
  assignment: (id: string) => `/api/admin/reservations/${encodeURIComponent(id)}/vipapp-command`,
  seat_extension: (id: string) => `/api/admin/reservations/${encodeURIComponent(id)}/vipapp-command`,
  service_status: (id: string) => `/api/admin/reservations/${encodeURIComponent(id)}/vipapp-command`,
  arrival_time: (id: string) => `/api/admin/reservations/${encodeURIComponent(id)}/vipapp-command`,
  note: (id: string) => `/api/admin/reservations/${encodeURIComponent(id)}/vipapp-command`,
} as const;

type CommandKind = keyof typeof COMMANDS;
const ALLOWED_KINDS = new Set<CommandKind>(["check_in", "arrival_time", "seat_extension", "assignment", "note", "service_status"]);
const ALLOWED_SERVICE_STATUSES = new Set<string>(VIP_SERVICE_STATUSES);

type CommandBody = {
  kind?: CommandKind;
  reservationId?: string;
  expectedUpdatedAt?: string;
  payload?: {
    reason?: unknown;
    occurredAt?: unknown;
    serviceStatus?: unknown;
    tableIds?: unknown;
    extendMinutes?: unknown;
    note?: unknown;
  };
};

function boundedString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function boundedIsoDate(value: unknown, fieldName: string, allowPastOnly = false) {
  const valueText = boundedString(value, 64);
  if (!valueText || Number.isNaN(Date.parse(valueText))) {
    throw new Error(`invalid_${fieldName}`);
  }

  if (allowPastOnly) {
    const now = Date.now();
    const at = Date.parse(valueText);
    if (at > now) {
      throw new Error(`future_${fieldName}`);
    }
  }

  return valueText;
}

function toCommandPayload(kind: CommandKind, body: CommandBody, reason: string, expectedUpdatedAt: string) {
  switch (kind) {
    case "assignment": {
      const tableIds = Array.isArray(body.payload?.tableIds)
        ? body.payload.tableIds.filter((value): value is string => typeof value === "string" && value.length <= 64)
        : [];
      if (tableIds.length !== 1) {
        return { ok: false, error: "invalid_table_assignment" as const };
      }
      return { ok: true, payload: { command: kind, publicResourceCode: tableIds[0], expectedUpdatedAt, reason } };
    }

    case "seat_extension": {
      if (body.payload?.extendMinutes !== 30) {
        return { ok: false, error: "invalid_extension" as const };
      }
      return { ok: true, payload: { command: kind, extendMinutes: 30, expectedUpdatedAt, reason } };
    }

    case "service_status": {
      const serviceStatus = boundedString(body.payload?.serviceStatus, 32);
      if (!serviceStatus) {
        return { ok: false, error: "invalid_service_status" as const };
      }
      if (!isVipServiceStatus(serviceStatus)) {
        return { ok: false, error: "invalid_service_status" as const };
      }
      if (typeof body.payload?.occurredAt !== "string") {
        return { ok: false, error: "invalid_occurredAt" as const };
      }
      try {
        const occurredAt = boundedIsoDate(body.payload.occurredAt, "occurredAt", false);
        return { ok: true, payload: { command: kind, serviceStatus, occurredAt, expectedUpdatedAt, reason } };
      } catch {
        return { ok: false, error: "invalid_occurredAt" as const };
      }
    }

    case "arrival_time": {
      if (typeof body.payload?.occurredAt !== "string") {
        return { ok: false, error: "invalid_arrival_time" as const };
      }
      try {
        const occurredAt = boundedIsoDate(body.payload.occurredAt, "occurredAt", true);
        return { ok: true, payload: { command: kind, occurredAt, expectedUpdatedAt, reason } };
      } catch (error) {
        if (error instanceof Error && error.message === "future_occurredAt") {
          return { ok: false, error: "future_arrival_time" as const };
        }
        return { ok: false, error: "invalid_arrival_time" as const };
      }
    }

    case "note": {
      const note = boundedString(body.payload?.note, 500);
      if (!note) {
        return { ok: false, error: "invalid_operator_note" as const };
      }
      return { ok: true, payload: { command: kind, note, expectedUpdatedAt, reason } };
    }

    case "check_in":
      return { ok: true, payload: { command: kind, expectedUpdatedAt, reason } };
  }
}

function isVipServiceStatus(value: string): value is VipServiceStatus {
  return ALLOWED_SERVICE_STATUSES.has(value);
}

function normalizeCommandFailurePayload(status: number, payload: Record<string, unknown>) {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "command_failed", status };
  }
  return {
    ok: false,
    error: typeof payload.error === "string" ? payload.error : "command_failed",
    currentVersion: payload.currentVersion,
    action: payload.action,
    auditLogId: payload.auditLogId,
    status,
  };
}

export async function POST(request: Request) {
  const token = readAdminToken(request);
  if (!token) {
    return NextResponse.json({ ok: false, error: "missing_admin_session" }, { status: 401 });
  }

  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey || !IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return NextResponse.json({ ok: false, error: "invalid_idempotency_key" }, { status: 400 });
  }

  const session = await readAdminSession(token);
  if (!session.ok) {
    return NextResponse.json({ ok: false, error: "invalid_admin_session" }, { status: session.status || 401 });
  }

  const body = await request.json().catch(() => null) as CommandBody | null;
  if (!body?.kind || !ALLOWED_KINDS.has(body.kind) || !COMMANDS[body.kind] || !body.reservationId || !UUID_PATTERN.test(body.reservationId)) {
    return NextResponse.json({ ok: false, error: "unsupported_command" }, { status: 400 });
  }

  if (!canExecuteVipCommand(session.actor.role, body.kind as VipCommandKind)) {
    return NextResponse.json({ ok: false, error: "insufficient_role" }, { status: 403 });
  }

  const reason = boundedString(body.payload?.reason, 200);
  if (!reason) {
    return NextResponse.json({ ok: false, error: "invalid_reason" }, { status: 400 });
  }

  const expectedUpdatedAt = boundedIsoDate(body.expectedUpdatedAt, "expectedUpdatedAt", false);
  if (!expectedUpdatedAt) return NextResponse.json({ ok: false, error: "invalid_expected_version" }, { status: 400 });

  const commandPayload = toCommandPayload(body.kind, body, reason, expectedUpdatedAt);
  if (!commandPayload?.ok) {
    return NextResponse.json({ ok: false, error: commandPayload?.error ?? "invalid_command_payload" }, { status: 400 });
  }

  const response = await ghostAdminFetch(
    COMMANDS[body.kind](body.reservationId),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify(commandPayload.payload),
    },
    token,
  );

  if (response.status === 403) {
    return NextResponse.json(
      { ok: false, error: "admin_mutation_disabled" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const rawPayload = await copyJson(response);
  if (!rawPayload || typeof rawPayload !== "object" || rawPayload.ok !== true) {
    return NextResponse.json(normalizeCommandFailurePayload(response.status, rawPayload as Record<string, unknown>), {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json(
    {
      ok: true,
      action: rawPayload.action,
      actor: session.actor,
      reused: rawPayload.reused,
      response: rawPayload.response,
      auditLogId: rawPayload.auditLogId,
      currentVersion: rawPayload.currentVersion,
    },
    { status: response.status, headers: { "Cache-Control": "no-store" } },
  );
}
