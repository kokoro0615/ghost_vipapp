import { NextResponse } from "next/server";

import {
  copyJson,
  ghostAdminFetch,
  readAdminSession,
  readAdminToken,
} from "@/lib/server/ghostAdminProxy";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const FIXED_REASON = "管理画面操作";

type RouteContext = {
  params: Promise<{ customerId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.response;
  const { customerId } = await context.params;
  if (!UUID_PATTERN.test(customerId)) {
    return NextResponse.json({ ok: false, error: "invalid_customer_id" }, { status: 400 });
  }
  const response = await ghostAdminFetch(
    `/api/admin/v2/customers/${encodeURIComponent(customerId)}`,
    { cache: "no-store" },
    auth.token,
  );
  return NextResponse.json(await copyJson(response), { status: response.status });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.response;
  const { customerId } = await context.params;
  const idempotencyKey = request.headers.get("idempotency-key");
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const expectedVersion = readInteger(body?.expectedVersion);
  const eventDayId = readUuid(body?.eventDayId);
  const reservationId = readUuid(body?.reservationId);
  const nationalityCode = readNullableString(body?.nationalityCode, 2);
  const birthDate = readNullableDate(body?.birthDate);
  const anniversaryDate = readNullableDate(body?.anniversaryDate);
  const vipRank = readNullableString(body?.vipRank, 32);
  if (
    !UUID_PATTERN.test(customerId)
    || !idempotencyKey
    || expectedVersion === null
    || !eventDayId
    || !reservationId
    || nationalityCode === undefined
    || (nationalityCode !== null && !/^[A-Za-z]{2}$/u.test(nationalityCode))
    || birthDate === undefined
    || anniversaryDate === undefined
    || vipRank === undefined
  ) {
    return NextResponse.json({ ok: false, error: "invalid_customer_attributes" }, { status: 400 });
  }
  const response = await ghostAdminFetch(
    `/api/admin/v2/customers/${encodeURIComponent(customerId)}/attributes`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify({
        expectedVersion,
        eventDayId,
        reservationId,
        nationalityCode: nationalityCode?.toUpperCase() ?? null,
        birthDate,
        anniversaryDate,
        vipRank,
        reason: FIXED_REASON,
      }),
    },
    auth.token,
  );
  return NextResponse.json(await copyJson(response), { status: response.status });
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
  if (!session.ok || session.actor.role !== "owner") {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "insufficient_role" }, { status: 403 }),
    };
  }
  return { ok: true as const, token };
}

function readUuid(value: unknown) {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

function readInteger(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1 ? value : null;
}

function readNullableString(value: unknown, maximum: number) {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length <= maximum ? normalized || null : undefined;
}

function readNullableDate(value: unknown) {
  if (value === null) return null;
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value
    ? undefined
    : value;
}
