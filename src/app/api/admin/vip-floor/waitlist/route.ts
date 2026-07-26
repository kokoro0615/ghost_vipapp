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
  return forward(
    `/api/admin/v2/waitlist?businessDate=${encodeURIComponent(date)}`,
    {},
    auth.token,
  );
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
    return NextResponse.json({ ok: false, error: "invalid_waitlist_command" }, { status: 400 });
  }
  const command = payload as Record<string, unknown>;

  if (action === "create") {
    const eventDayId = readUuid(command.eventDayId);
    const guestCount = readInteger(command.guestCount, 1, 99);
    const guestLabel = readNullableString(command.guestLabel, 80);
    const email = readNullableString(command.email, 254);
    if (
      !eventDayId
      || guestCount === null
      || guestLabel === undefined
      || email === undefined
      || (email !== null && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(email))
    ) {
      return NextResponse.json({ ok: false, error: "invalid_waitlist_create" }, { status: 400 });
    }
    return forward(
      "/api/admin/v2/waitlist",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify({
          eventDayId,
          guestCount,
          guestLabel,
          email,
          reason: FIXED_REASON,
        }),
      },
      auth.token,
    );
  }

  if (["call", "expire", "seat", "cancel"].includes(String(action))) {
    const waitlistEntryId = readUuid(command.waitlistEntryId);
    const expectedVersion = readInteger(command.expectedVersion, 1, Number.MAX_SAFE_INTEGER);
    const reservationId = command.reservationId === null
      ? null
      : readUuid(command.reservationId);
    if (
      !waitlistEntryId
      || expectedVersion === null
      || (action === "seat") !== (reservationId !== null)
    ) {
      return NextResponse.json(
        { ok: false, error: "invalid_waitlist_transition" },
        { status: 400 },
      );
    }
    return forward(
      `/api/admin/v2/waitlist/${encodeURIComponent(waitlistEntryId)}/${action}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify({
          expectedVersion,
          reservationId,
          reason: FIXED_REASON,
        }),
      },
      auth.token,
    );
  }

  return NextResponse.json({ ok: false, error: "unsupported_waitlist_action" }, { status: 400 });
}

async function requireOwner(request: Request) {
  const token = readAdminToken(request);
  if (!token) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "missing_admin_session" },
        { status: 401 },
      ),
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
      response: NextResponse.json(
        { ok: false, error: "insufficient_role" },
        { status: 403 },
      ),
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

function readInteger(value: unknown, minimum: number, maximum: number) {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= minimum
    && value <= maximum
    ? value
    : null;
}

function readNullableString(value: unknown, maximum: number) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length <= maximum ? normalized || null : undefined;
}
