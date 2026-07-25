import { NextResponse } from "next/server";

import { copyJson, ghostAdminFetch, readAdminToken } from "@/lib/server/ghostAdminProxy";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/u;

const routes = {
  check_in: (id: string) => `/api/admin/reservations/${encodeURIComponent(id)}/vipapp-command`,
  assignment: (id: string) => `/api/admin/reservations/${encodeURIComponent(id)}/vipapp-command`,
  seat_extension: (id: string) => `/api/admin/reservations/${encodeURIComponent(id)}/vipapp-command`,
  service_status: (id: string) => `/api/admin/reservations/${encodeURIComponent(id)}/vipapp-command`,
  arrival_time: (id: string) => `/api/admin/reservations/${encodeURIComponent(id)}/vipapp-command`,
  note: (id: string) => `/api/admin/reservations/${encodeURIComponent(id)}/vipapp-command`,
} as const;

type CommandKind = keyof typeof routes;

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

export async function POST(request: Request) {
  const token = readAdminToken(request);
  if (!token) {
    return NextResponse.json({ ok: false, error: "missing_admin_session" }, { status: 401 });
  }

  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey || !IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return NextResponse.json({ ok: false, error: "invalid_idempotency_key" }, { status: 400 });
  }

  const body = await request.json().catch(() => null) as CommandBody | null;
  if (!body?.kind || !routes[body.kind] || !body.reservationId || !UUID_PATTERN.test(body.reservationId)) {
    return NextResponse.json({ ok: false, error: "unsupported_command" }, { status: 400 });
  }

  const reason = boundedString(body.payload?.reason, 200);
  if (!reason) {
    return NextResponse.json({ ok: false, error: "invalid_reason" }, { status: 400 });
  }

  const expectedUpdatedAt = boundedString(body.expectedUpdatedAt, 64);
  if (!expectedUpdatedAt || Number.isNaN(Date.parse(expectedUpdatedAt))) {
    return NextResponse.json({ ok: false, error: "invalid_expected_version" }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  switch (body.kind) {
    case "assignment": {
      const tableIds = Array.isArray(body.payload?.tableIds)
        ? body.payload.tableIds.filter((value): value is string => typeof value === "string" && value.length <= 64)
        : [];
      if (tableIds.length !== 1) {
        return NextResponse.json({ ok: false, error: "invalid_table_assignment" }, { status: 400 });
      }
      payload = { command: body.kind, publicResourceCode: tableIds[0], expectedUpdatedAt, reason };
      break;
    }
    case "seat_extension":
      if (body.payload?.extendMinutes !== 30) {
        return NextResponse.json({ ok: false, error: "invalid_extension" }, { status: 400 });
      }
      payload = { command: body.kind, extendMinutes: 30, expectedUpdatedAt, reason };
      break;
    case "service_status": {
      const serviceStatus = boundedString(body.payload?.serviceStatus, 32);
      if (!serviceStatus) {
        return NextResponse.json({ ok: false, error: "invalid_service_status" }, { status: 400 });
      }
      payload = {
        command: body.kind,
        serviceStatus,
        occurredAt: body.payload?.occurredAt,
        expectedUpdatedAt,
        reason,
      };
      break;
    }
    case "arrival_time":
      payload = {
        command: body.kind,
        occurredAt: body.payload?.occurredAt,
        expectedUpdatedAt,
        reason,
      };
      break;
    case "note": {
      const note = boundedString(body.payload?.note, 500);
      if (!note) {
        return NextResponse.json({ ok: false, error: "invalid_operator_note" }, { status: 400 });
      }
      payload = { command: body.kind, note, expectedUpdatedAt, reason };
      break;
    }
    case "check_in":
      payload = { command: body.kind, expectedUpdatedAt, reason };
      break;
  }

  const response = await ghostAdminFetch(
    routes[body.kind](body.reservationId),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    },
    token,
  );
  return NextResponse.json(await copyJson(response), {
    status: response.status,
    headers: { "Cache-Control": "no-store" },
  });
}
