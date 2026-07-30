import { NextResponse } from "next/server";

import {
  canExecuteVipCommand,
  type VipCommandKind,
} from "@/lib/adminPermissions";
import { isGhostOperatingTimestamp } from "@/lib/ghostOperatingHours";
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
  check_in: (id: string) => `/api/admin/v2/reservations/${encodeURIComponent(id)}/check-in`,
  assignment: (id: string) => `/api/admin/v2/reservations/${encodeURIComponent(id)}/assignments`,
  seat_extension: (id: string) => `/api/admin/v2/reservations/${encodeURIComponent(id)}/extend-seat`,
  service_status: (id: string) => `/api/admin/v2/reservations/${encodeURIComponent(id)}/service-status`,
  arrival_time: (id: string) => `/api/admin/v2/reservations/${encodeURIComponent(id)}/arrival-time`,
  note: (id: string) => `/api/admin/v2/reservations/${encodeURIComponent(id)}/notes`,
  walk_in_cancel: (id: string) => `/api/admin/v2/reservations/${encodeURIComponent(id)}/cancel`,
} as const;

type CommandKind = keyof typeof COMMANDS;
const ALLOWED_KINDS = new Set<CommandKind>([
  "check_in",
  "arrival_time",
  "seat_extension",
  "assignment",
  "note",
  "service_status",
  "walk_in_cancel",
]);
const ALLOWED_SERVICE_STATUSES = new Set<string>(VIP_SERVICE_STATUSES);
const WALK_IN_CANCELLATION_REASON_CODES = {
  mistake: "other",
  duplicate: "duplicate",
  guest_request: "customer_request",
  venue_decision: "venue_decision",
} as const;

type CommandBody = {
  kind?: CommandKind;
  reservationId?: string;
  expectedVersion?: number;
  payload?: {
    occurredAt?: unknown;
    serviceStatus?: unknown;
    tableIds?: unknown;
    extendMinutes?: unknown;
    note?: unknown;
    sourceChannel?: unknown;
    cancelReason?: unknown;
    reasonNote?: unknown;
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

function toCommandPayload(kind: CommandKind, body: CommandBody, expectedVersion: number) {
  switch (kind) {
    case "assignment": {
      const tableIds = Array.isArray(body.payload?.tableIds)
        ? [...new Set(body.payload.tableIds.filter(
          (value): value is string => typeof value === "string" && UUID_PATTERN.test(value),
        ))]
        : [];
      if (tableIds.length < 1 || tableIds.length > 8) {
        return { ok: false, error: "invalid_table_assignment" as const };
      }
      return {
        ok: true,
        payload: {
          expectedVersion,
          operation: "replace",
          tableIds,
          capacityOverride: false,
        },
      };
    }

    case "seat_extension": {
      const extendMinutes = body.payload?.extendMinutes;
      if (
        typeof extendMinutes !== "number"
        || !Number.isSafeInteger(extendMinutes)
        || extendMinutes < 15
        || extendMinutes > 120
        || extendMinutes % 15 !== 0
      ) {
        return { ok: false, error: "invalid_extension" as const };
      }
      return { ok: true, payload: { expectedVersion, extendMinutes } };
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
        return { ok: true, payload: { expectedVersion, toStatus: serviceStatus, occurredAt } };
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
        if (!isGhostOperatingTimestamp(occurredAt)) {
          return { ok: false, error: "outside_operating_hours" as const };
        }
        return { ok: true, payload: { expectedVersion, arrivedAt: occurredAt } };
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
      return {
        ok: true,
        payload: {
          expectedVersion,
          noteId: null,
          expectedNoteVersion: null,
          kind: "floor",
          body: note,
          pinned: false,
        },
      };
    }

    case "check_in": {
      if (typeof body.payload?.occurredAt !== "string") {
        return { ok: false, error: "invalid_occurredAt" as const };
      }
      try {
        return {
          ok: true,
          payload: {
            expectedVersion,
            occurredAt: boundedIsoDate(body.payload.occurredAt, "occurredAt", false),
          },
        };
      } catch {
        return { ok: false, error: "invalid_occurredAt" as const };
      }
    }

    case "walk_in_cancel": {
      if (body.payload?.sourceChannel !== "walk_in") {
        return { ok: false, error: "walk_in_cancel_only" as const };
      }
      const cancelReason = boundedString(body.payload.cancelReason, 32);
      if (
        !cancelReason
        || !(cancelReason in WALK_IN_CANCELLATION_REASON_CODES)
      ) {
        return { ok: false, error: "invalid_cancellation_reason" as const };
      }
      const reasonNote = boundedString(body.payload.reasonNote, 500);
      if (!reasonNote) {
        return { ok: false, error: "invalid_cancellation_reason_note" as const };
      }
      return {
        ok: true,
        payload: {
          expectedVersion,
          reasonCode:
            WALK_IN_CANCELLATION_REASON_CODES[
              cancelReason as keyof typeof WALK_IN_CANCELLATION_REASON_CODES
            ],
          reasonNote,
          refundDecision: "none",
          refundAmountYen: null,
          notifyCustomer: false,
        },
      };
    }
  }
}

function isVipServiceStatus(value: string): value is VipServiceStatus {
  return ALLOWED_SERVICE_STATUSES.has(value);
}

function normalizeCommandFailurePayload(status: number, payload: Record<string, unknown>) {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "command_failed", status };
  }
  const error = payload.error;
  const errorCode = typeof error === "string"
    ? error
    : error && typeof error === "object" && "code" in error && typeof error.code === "string"
      ? error.code
      : "command_failed";
  const errorDetails = error && typeof error === "object" && "details" in error
    ? error.details
    : undefined;
  return {
    ok: false,
    error: errorCode,
    details: errorDetails,
    currentVersion:
      payload.currentVersion
      ?? (errorDetails && typeof errorDetails === "object" && "currentVersion" in errorDetails
        ? errorDetails.currentVersion
        : undefined),
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

  const expectedVersion = body.expectedVersion;
  if (
    typeof expectedVersion !== "number"
    || !Number.isSafeInteger(expectedVersion)
    || expectedVersion < 1
  ) {
    return NextResponse.json({ ok: false, error: "invalid_expected_version" }, { status: 400 });
  }

  const commandPayload = toCommandPayload(body.kind, body, expectedVersion);
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
      auditLogId: rawPayload.auditLogId,
      entityVersion: rawPayload.entityVersion,
      boardRevision: rawPayload.boardRevision,
    },
    { status: response.status, headers: { "Cache-Control": "no-store" } },
  );
}
