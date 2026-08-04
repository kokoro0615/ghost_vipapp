import { NextResponse } from "next/server";

import {
  copyJson,
  ghostAdminFetch,
  readAdminSession,
  readAdminToken,
} from "@/lib/server/ghostAdminProxy";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/u;
const FIXED_REASON = "管理画面操作";

export async function GET(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  if (
    !date
    || !BUSINESS_DATE_PATTERN.test(date)
    || [...url.searchParams.keys()].some((key) => key !== "date")
  ) {
    return NextResponse.json({ ok: false, error: "invalid_business_date" }, { status: 400 });
  }
  const response = await ghostAdminFetch(
    `/api/admin/v2/staff?businessDate=${encodeURIComponent(date)}`,
    {},
    auth.token,
  );
  const payload = await copyJson(response);

  // Staff assignments are event-day scoped. While an operator is recovering
  // from an unregistered day, absence is expected and the client intentionally
  // keeps staffData null. Preserve the domain outcome without emitting a
  // browser-level failed-resource error; all other upstream failures remain
  // failures, and no synthetic event-day or assignment data is created.
  if (
    response.status === 404
    && payload
    && typeof payload === "object"
    && "error" in payload
    && payload.error === "event_day_not_found"
  ) {
    return NextResponse.json(payload, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json(payload, { status: response.status });
}

export async function POST(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.response;
  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey || !IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return NextResponse.json({ ok: false, error: "invalid_idempotency_key" }, { status: 400 });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const action = body?.action;
  const payload = body?.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ ok: false, error: "invalid_staff_command" }, { status: 400 });
  }
  const command = payload as Record<string, unknown>;
  let path = "/api/admin/v2/staff";
  let method: "POST" | "PATCH" = "POST";
  let upstream: Record<string, unknown>;

  if (action === "create") {
    const displayName = readString(command.displayName, 80);
    if (!displayName) {
      return NextResponse.json({ ok: false, error: "invalid_staff_create" }, { status: 400 });
    }
    upstream = { displayName, reason: FIXED_REASON };
  } else if (action === "update") {
    const staffMemberId = readUuid(command.staffMemberId);
    const expectedVersion = readInteger(command.expectedVersion, 1);
    const displayName = readString(command.displayName, 80);
    const active = typeof command.active === "boolean" ? command.active : null;
    if (!staffMemberId || expectedVersion === null || !displayName || active === null) {
      return NextResponse.json({ ok: false, error: "invalid_staff_update" }, { status: 400 });
    }
    path = `/api/admin/v2/staff/${encodeURIComponent(staffMemberId)}`;
    method = "PATCH";
    upstream = { expectedVersion, displayName, active, reason: FIXED_REASON };
  } else if (action === "assign") {
    const eventDayId = readUuid(command.eventDayId);
    const tableId = readUuid(command.tableId);
    const staffMemberId = command.staffMemberId === null ? null : readUuid(command.staffMemberId);
    const expectedAssignmentVersion = command.expectedAssignmentVersion === null
      ? null
      : readInteger(command.expectedAssignmentVersion, 1);
    if (
      !eventDayId
      || !tableId
      || (command.staffMemberId !== null && !staffMemberId)
      || (command.expectedAssignmentVersion !== null && expectedAssignmentVersion === null)
    ) {
      return NextResponse.json({ ok: false, error: "invalid_staff_assignment" }, { status: 400 });
    }
    path = "/api/admin/v2/staff/assignments";
    upstream = {
      eventDayId,
      tableId,
      staffMemberId,
      expectedAssignmentVersion,
      reason: FIXED_REASON,
    };
  } else {
    return NextResponse.json({ ok: false, error: "unsupported_staff_action" }, { status: 400 });
  }

  return forward(
    path,
    {
      method,
      headers: {
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify(upstream),
    },
    auth.token,
  );
}

async function requireOwner(request: Request) {
  const token = readAdminToken(request);
  if (!token) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "missing_admin_session" }, { status: 401 }),
    };
  }
  const session = await readAdminSession(token);
  if (!session.ok) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "invalid_admin_session" },
        { status: session.status || 401 },
      ),
    };
  }
  if (session.actor.role !== "owner") {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "insufficient_role" }, { status: 403 }),
    };
  }
  return { ok: true as const, token };
}

async function forward(path: string, init: RequestInit, token: string) {
  const response = await ghostAdminFetch(path, init, token);
  return NextResponse.json(await copyJson(response), { status: response.status });
}

function readUuid(value: unknown) {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

function readInteger(value: unknown, minimum: number) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum
    ? value
    : null;
}

function readString(value: unknown, maximum: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maximum ? normalized : null;
}
