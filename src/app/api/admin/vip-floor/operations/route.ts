import { NextResponse } from "next/server";

import {
  copyJson,
  ghostAdminFetch,
  readAdminSession,
  readAdminToken,
} from "@/lib/server/ghostAdminProxy";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/u;
const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const FIXED_REASON = "管理画面操作";

type OperationBody = {
  kind?: "walk_in" | "block_create";
  payload?: Record<string, unknown>;
};

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
    return NextResponse.json(
      { ok: false, error: "invalid_admin_session" },
      { status: session.status || 401 },
    );
  }

  if (session.actor.role !== "owner") {
    return NextResponse.json({ ok: false, error: "insufficient_role" }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as OperationBody | null;

  if (!body?.kind || !body.payload) {
    return NextResponse.json({ ok: false, error: "invalid_operation" }, { status: 400 });
  }

  if (body.kind === "walk_in") {
    const payload = parseWalkIn(body.payload);

    if (!payload.ok) {
      return NextResponse.json({ ok: false, error: payload.error }, { status: 400 });
    }

    return forwardOperation(
      "/api/admin/v2/walk-ins",
      payload.value,
      idempotencyKey,
      token,
    );
  }

  if (body.kind === "block_create") {
    const payload = parseBlock(body.payload);

    if (!payload.ok) {
      return NextResponse.json({ ok: false, error: payload.error }, { status: 400 });
    }

    return createRepeatedBlocks(payload.value, idempotencyKey, token);
  }

  return NextResponse.json({ ok: false, error: "unsupported_operation" }, { status: 400 });
}

function parseWalkIn(payload: Record<string, unknown>) {
  const eventDayId = readUuid(payload.eventDayId);
  const offeringId = readUuid(payload.offeringId);
  const scheduledStartAt = readIso(payload.scheduledStartAt);
  const scheduledEndAt = readIso(payload.scheduledEndAt);
  const guestCount = readInteger(payload.guestCount, 1, 99);
  const tableIds = readUuidArray(payload.tableIds, 1, 8);
  const expectedTableVersions = Array.isArray(payload.expectedTableVersions)
    ? payload.expectedTableVersions
    : null;
  const guestLabel = readNullableString(payload.guestLabel, 80);
  const operatorNote = readNullableString(payload.operatorNote, 500);

  if (
    !eventDayId
    || !offeringId
    || !scheduledStartAt
    || !scheduledEndAt
    || Date.parse(scheduledStartAt) >= Date.parse(scheduledEndAt)
    || guestCount === null
    || !tableIds
    || !expectedTableVersions
    || expectedTableVersions.length !== tableIds.length
    || guestLabel === undefined
    || operatorNote === undefined
  ) {
    return { ok: false as const, error: "invalid_walk_in" };
  }

  const versions = expectedTableVersions.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const value = item as Record<string, unknown>;
    const tableId = readUuid(value.tableId);
    const expectedVersion = readInteger(value.expectedVersion, 1, Number.MAX_SAFE_INTEGER);
    return tableId && expectedVersion !== null ? { tableId, expectedVersion } : null;
  });

  if (
    versions.some((item) => item === null)
    || versions.some((item) => !tableIds.includes(item?.tableId ?? ""))
  ) {
    return { ok: false as const, error: "invalid_table_versions" };
  }

  return {
    ok: true as const,
    value: {
      eventDayId,
      offeringId,
      scheduledStartAt,
      scheduledEndAt,
      guestCount,
      tableIds,
      guestLabel,
      operatorNote,
      expectedTableVersions: versions,
      capacityOverride: false,
      reason: FIXED_REASON,
    },
  };
}

function parseBlock(payload: Record<string, unknown>) {
  const eventDayId = readUuid(payload.eventDayId);
  const businessDate = typeof payload.businessDate === "string"
    && BUSINESS_DATE_PATTERN.test(payload.businessDate)
    ? payload.businessDate
    : null;
  const scope = payload.scope === "online_only" || payload.scope === "all_operations"
    ? payload.scope
    : null;
  const kind = ["manual", "maintenance", "owner_hold", "event"].includes(String(payload.blockKind))
    ? String(payload.blockKind)
    : null;
  const startAt = readIso(payload.startAt);
  const endAt = readIso(payload.endAt);
  const memo = readNullableString(payload.memo, 1000);
  const seatResourceIds = readUuidArray(payload.seatResourceIds, 0, 8);
  const venueWide = payload.venueWide === true;
  const repeatDays = readInteger(payload.repeatDays, 1, 14);

  if (
    !eventDayId
    || !businessDate
    || !scope
    || !kind
    || !startAt
    || !endAt
    || Date.parse(startAt) >= Date.parse(endAt)
    || memo === undefined
    || !seatResourceIds
    || (!venueWide && seatResourceIds.length === 0)
    || (venueWide && seatResourceIds.length > 0)
    || repeatDays === null
  ) {
    return { ok: false as const, error: "invalid_block" };
  }

  return {
    ok: true as const,
    value: {
      eventDayId,
      businessDate,
      scope,
      blockKind: kind,
      startAt,
      endAt,
      memo,
      seatResourceIds,
      venueWide,
      repeatDays,
    },
  };
}

async function createRepeatedBlocks(
  payload: ReturnType<typeof parseBlock> & { ok: true } extends { value: infer Value } ? Value : never,
  idempotencyKey: string,
  token: string,
) {
  const results: unknown[] = [];

  for (let index = 0; index < payload.repeatDays; index += 1) {
    const businessDate = shiftBusinessDate(payload.businessDate, index);
    let eventDayId = payload.eventDayId;

    if (index > 0) {
      const optionsResponse = await ghostAdminFetch(
        `/api/admin/v2/vip-floor/options?businessDate=${encodeURIComponent(businessDate)}`,
        {},
        token,
      );
      const optionsPayload = await copyJson(optionsResponse) as Record<string, unknown>;
      const businessDay = optionsPayload.businessDay as Record<string, unknown> | undefined;
      const resolvedId = readUuid(businessDay?.id);

      if (!optionsResponse.ok || !resolvedId) {
        return NextResponse.json(
          {
            ok: false,
            error: "repeat_event_day_unavailable",
            completedCount: results.length,
            failedBusinessDate: businessDate,
          },
          { status: optionsResponse.status || 409 },
        );
      }

      eventDayId = resolvedId;
    }

    const response = await ghostAdminFetch(
      "/api/admin/v2/vip-blocks",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": `${idempotencyKey}:${String(index + 1).padStart(2, "0")}`,
        },
        body: JSON.stringify({
          eventDayId,
          scope: payload.scope,
          kind: payload.blockKind,
          startAt: shiftIso(payload.startAt, index),
          endAt: shiftIso(payload.endAt, index),
          memo: payload.memo,
          seatResourceIds: payload.seatResourceIds,
          floorSectionIds: [],
          venueWide: payload.venueWide,
          reason: FIXED_REASON,
        }),
      },
      token,
    );
    const result = await copyJson(response);

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "block_create_failed",
          completedCount: results.length,
          failedBusinessDate: businessDate,
          cause: result,
        },
        { status: response.status },
      );
    }

    results.push(result);
  }

  return NextResponse.json({
    ok: true,
    action: payload.repeatDays > 1 ? "reservation_block.series_created" : "reservation_block.created",
    createdCount: results.length,
    results,
  });
}

async function forwardOperation(
  path: string,
  payload: Record<string, unknown>,
  idempotencyKey: string,
  token: string,
) {
  const response = await ghostAdminFetch(
    path,
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
  const result = await copyJson(response);

  return NextResponse.json(result, { status: response.status });
}

function readUuid(value: unknown) {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

function readUuidArray(value: unknown, minimum: number, maximum: number) {
  if (!Array.isArray(value)) return null;
  const ids = [...new Set(value.map(readUuid).filter((item): item is string => Boolean(item)))];
  return ids.length === value.length && ids.length >= minimum && ids.length <= maximum ? ids : null;
}

function readInteger(value: unknown, minimum: number, maximum: number) {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= minimum
    && value <= maximum
    ? value
    : null;
}

function readIso(value: unknown) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
}

function readNullableString(value: unknown, maximum: number) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length <= maximum ? normalized || null : undefined;
}

function shiftIso(value: string, days: number) {
  return new Date(Date.parse(value) + days * 86_400_000).toISOString();
}

function shiftBusinessDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00+09:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(date);
}
