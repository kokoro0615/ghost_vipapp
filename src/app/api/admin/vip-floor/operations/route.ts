import { NextResponse } from "next/server";

import { isGhostOperatingInterval } from "@/lib/ghostOperatingHours";
import { parseOwnerCapacityOverride } from "@/lib/server/ownerCapacityOverride";
import {
  isValidVipManagerIdempotencyKey,
  isVipManagerReservationProvenance,
} from "@/generated/vipManagerRuntimeContract";
import {
  copyJson,
  ghostAdminFetch,
  requireAdminOperation,
} from "@/lib/server/ghostAdminProxy";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const FIXED_REASON = "管理画面操作";

type OperationBody = {
  kind?: "walk_in" | "block_create" | "block_update" | "block_cancel" | "reservation_create" | "reservation_update";
  payload?: Record<string, unknown>;
};

export async function POST(request: Request) {
  const access = await requireAdminOperation(request, { ownerOnly: true });
  if (!access.ok) return access.response;
  const token = access.token;

  const idempotencyKey = request.headers.get("idempotency-key");

  if (!isValidVipManagerIdempotencyKey(idempotencyKey)) {
    return NextResponse.json({ ok: false, error: "invalid_idempotency_key" }, { status: 400 });
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

  if (body.kind === "reservation_create") {
    const payload = parseReservationCreate(body.payload);
    if (!payload.ok) {
      return NextResponse.json({ ok: false, error: payload.error }, { status: 400 });
    }
    const createResponse = await ghostAdminFetch(
      "/api/admin/v2/reservations",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify(payload.value),
      },
      token,
    );
    const createResult = await copyJson(createResponse) as Record<string, unknown>;
    if (!createResponse.ok) {
      return NextResponse.json(
        normalizeOperationFailurePayload(createResponse.status, createResult),
        { status: createResponse.status },
      );
    }
    if (payload.value.notificationPreference !== "email") {
      return NextResponse.json({ ...createResult, notification: { requested: false } });
    }
    const reservationId = readUuid(createResult.reservationId);
    const entityVersion = readInteger(createResult.entityVersion, 1, Number.MAX_SAFE_INTEGER);
    if (!reservationId || entityVersion === null) {
      return NextResponse.json({
        ...createResult,
        notification: { requested: true, queued: false, error: "create_result_missing_identity" },
      });
    }
    const notificationResponse = await ghostAdminFetch(
      `/api/admin/v2/reservations/${encodeURIComponent(reservationId)}/notifications/email`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": `${idempotencyKey}:email`,
        },
        body: JSON.stringify({
          expectedVersion: entityVersion,
          template: "reservation_created",
          reason: FIXED_REASON,
        }),
      },
      token,
    );
    return NextResponse.json({
      ...createResult,
      notification: {
        requested: true,
        queued: notificationResponse.ok,
        status: notificationResponse.status,
      },
    });
  }

  if (body.kind === "reservation_update") {
    const payload = parseReservationUpdate(body.payload);
    if (!payload.ok) {
      return NextResponse.json({ ok: false, error: payload.error }, { status: 400 });
    }
    const updateResponse = await ghostAdminFetch(
      `/api/admin/v2/reservations/${encodeURIComponent(payload.value.reservationId)}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify(payload.value.command),
      },
      token,
    );
    const updateResult = await copyJson(updateResponse) as Record<string, unknown>;
    if (!updateResponse.ok) {
      return NextResponse.json(
        normalizeOperationFailurePayload(updateResponse.status, updateResult),
        { status: updateResponse.status },
      );
    }
    if (payload.value.command.notificationPreference !== "email") {
      return NextResponse.json({ ...updateResult, notification: { requested: false } });
    }
    const entityVersion = readInteger(updateResult.entityVersion, 1, Number.MAX_SAFE_INTEGER);
    if (entityVersion === null) {
      return NextResponse.json({
        ...updateResult,
        notification: { requested: true, queued: false, error: "update_result_missing_version" },
      });
    }
    const notificationResponse = await ghostAdminFetch(
      `/api/admin/v2/reservations/${encodeURIComponent(payload.value.reservationId)}/notifications/email`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": `${idempotencyKey}:email`,
        },
        body: JSON.stringify({
          expectedVersion: entityVersion,
          template: "reservation_changed",
          reason: FIXED_REASON,
        }),
      },
      token,
    );
    return NextResponse.json({
      ...updateResult,
      notification: {
        requested: true,
        queued: notificationResponse.ok,
        status: notificationResponse.status,
      },
    });
  }

  if (body.kind === "block_create") {
    const payload = parseBlock(body.payload);

    if (!payload.ok) {
      return NextResponse.json({ ok: false, error: payload.error }, { status: 400 });
    }

    return forwardOperation(
      "/api/admin/v2/vip-blocks/series",
      {
        eventDayId: payload.value.eventDayId,
        repeatDays: payload.value.repeatDays,
        scope: payload.value.scope,
        kind: payload.value.blockKind,
        startAt: payload.value.startAt,
        endAt: payload.value.endAt,
        memo: payload.value.memo,
        seatResourceIds: payload.value.seatResourceIds,
        floorSectionIds: [],
        venueWide: payload.value.venueWide,
        reason: FIXED_REASON,
      },
      idempotencyKey,
      token,
    );
  }

  if (body.kind === "block_update") {
    const payload = parseBlockMutation(body.payload, true);
    if (!payload.ok) {
      return NextResponse.json({ ok: false, error: payload.error }, { status: 400 });
    }
    return forwardOperation(
      `/api/admin/v2/vip-blocks/${encodeURIComponent(payload.value.blockId)}`,
      {
        expectedVersion: payload.value.expectedVersion,
        scope: payload.value.scope,
        kind: payload.value.blockKind,
        startAt: payload.value.startAt,
        endAt: payload.value.endAt,
        memo: payload.value.memo,
        seatResourceIds: payload.value.seatResourceIds,
        floorSectionIds: [],
        venueWide: payload.value.venueWide,
        reason: FIXED_REASON,
      },
      idempotencyKey,
      token,
      "PATCH",
    );
  }

  if (body.kind === "block_cancel") {
    const blockId = readUuid(body.payload.blockId);
    const expectedVersion = readInteger(
      body.payload.expectedVersion,
      1,
      Number.MAX_SAFE_INTEGER,
    );
    if (!blockId || expectedVersion === null) {
      return NextResponse.json({ ok: false, error: "invalid_block_cancel" }, { status: 400 });
    }
    return forwardOperation(
      `/api/admin/v2/vip-blocks/${encodeURIComponent(blockId)}`,
      { expectedVersion, reason: FIXED_REASON },
      idempotencyKey,
      token,
      "DELETE",
    );
  }

  return NextResponse.json({ ok: false, error: "unsupported_operation" }, { status: 400 });
}

function parseWalkIn(payload: Record<string, unknown>) {
  const capacity = parseOwnerCapacityOverride(payload);
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
  const bookingStaffMemberId = payload.bookingStaffMemberId === null
    ? null
    : readUuid(payload.bookingStaffMemberId);

  if (
    !capacity.ok
    || !eventDayId
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
    || (payload.bookingStaffMemberId !== null && !bookingStaffMemberId)
  ) {
    return { ok: false as const, error: "invalid_walk_in" };
  }
  if (!isGhostOperatingInterval(scheduledStartAt, scheduledEndAt)) {
    return { ok: false as const, error: "outside_operating_hours" };
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
      bookingStaffMemberId,
      expectedTableVersions: versions,
      capacityOverride: capacity.capacityOverride,
      reason: capacity.reason,
    },
  };
}

function parseReservationCreate(payload: Record<string, unknown>) {
  const capacity = parseOwnerCapacityOverride(payload);
  const eventDayId = readUuid(payload.eventDayId);
  const offeringId = readUuid(payload.offeringId);
  const scheduledStartAt = readIso(payload.scheduledStartAt);
  const scheduledEndAt = readIso(payload.scheduledEndAt);
  const guestCount = readInteger(payload.guestCount, 1, 99);
  const tableIds = readUuidArray(payload.tableIds, 1, 8);
  const versions = readTableVersions(payload.expectedTableVersions, tableIds);
  const displayName = readNullableString(payload.displayName, 120);
  const phone = readNullableString(payload.phone, 40);
  const email = readNullableString(payload.email, 254);
  const languageCode = readNullableString(payload.languageCode, 16);
  const guestLabel = readNullableString(payload.guestLabel, 80);
  const operatorNote = readNullableString(payload.operatorNote, 500);
  const sourceChannel = isVipManagerReservationProvenance(payload.sourceChannel)
    && payload.sourceChannel !== "walk_in"
    ? payload.sourceChannel
    : null;
  const serviceStatuses = [
    "expected", "late", "no_contact", "arrived", "partial_arrival", "seated",
    "bottle_pending", "bottle_served", "bill_requested", "paid", "resetting",
    "completed", "no_show",
  ];
  const serviceStatus = serviceStatuses.includes(String(payload.serviceStatus))
    ? String(payload.serviceStatus)
    : null;
  const bookingStaffMemberId = payload.bookingStaffMemberId === null
    ? null
    : readUuid(payload.bookingStaffMemberId);
  const notificationPreference = payload.notificationPreference === "none"
    || payload.notificationPreference === "email"
    ? payload.notificationPreference
    : null;
  if (
    !capacity.ok
    || !eventDayId || !offeringId || !scheduledStartAt || !scheduledEndAt
    || Date.parse(scheduledStartAt) >= Date.parse(scheduledEndAt)
    || guestCount === null || !tableIds || !versions
    || displayName === undefined || phone === undefined || email === undefined
    || languageCode === undefined || guestLabel === undefined || operatorNote === undefined
    || !sourceChannel || !serviceStatus || !notificationPreference
    || (payload.bookingStaffMemberId !== null && !bookingStaffMemberId)
    || (email !== null && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(email))
    || (notificationPreference === "email" && email === null)
  ) {
    return { ok: false as const, error: "invalid_reservation_create" };
  }
  if (!isGhostOperatingInterval(scheduledStartAt, scheduledEndAt)) {
    return { ok: false as const, error: "outside_operating_hours" };
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
      expectedTableVersions: versions,
      existingCustomerId: null,
      displayName,
      phone,
      email,
      languageCode,
      guestLabel,
      operatorNote,
      sourceChannel,
      serviceStatus,
      bookingStaffMemberId,
      notificationPreference,
      capacityOverride: capacity.capacityOverride,
      reason: capacity.reason,
    },
  };
}

function parseReservationUpdate(payload: Record<string, unknown>) {
  const capacity = parseOwnerCapacityOverride(payload);
  const reservationId = readUuid(payload.reservationId);
  const expectedVersion = readInteger(payload.expectedVersion, 1, Number.MAX_SAFE_INTEGER);
  const offeringId = readUuid(payload.offeringId);
  const scheduledStartAt = readIso(payload.scheduledStartAt);
  const scheduledEndAt = readIso(payload.scheduledEndAt);
  const guestCount = readInteger(payload.guestCount, 1, 99);
  const tableIds = readUuidArray(payload.tableIds, 1, 8);
  const versions = readTableVersions(payload.expectedTableVersions, tableIds);
  const guestLabel = readNullableString(payload.guestLabel, 80);
  const operatorNote = readNullableString(payload.operatorNote, 500);
  const sourceChannel = isVipManagerReservationProvenance(payload.sourceChannel)
    && payload.sourceChannel !== "walk_in"
    ? payload.sourceChannel
    : null;
  const serviceStatuses = [
    "expected", "late", "no_contact", "arrived", "partial_arrival", "seated",
    "bottle_pending", "bottle_served", "bill_requested", "paid", "resetting",
    "completed", "no_show",
  ];
  const serviceStatus = serviceStatuses.includes(String(payload.serviceStatus))
    ? String(payload.serviceStatus)
    : null;
  const bookingStaffMemberId = payload.bookingStaffMemberId === null
    ? null
    : readUuid(payload.bookingStaffMemberId);
  const notificationPreference = payload.notificationPreference === "none"
    || payload.notificationPreference === "email"
    ? payload.notificationPreference
    : null;
  if (
    !capacity.ok
    || !reservationId || expectedVersion === null || !offeringId
    || !scheduledStartAt || !scheduledEndAt
    || Date.parse(scheduledStartAt) >= Date.parse(scheduledEndAt)
    || guestCount === null || !tableIds || !versions
    || guestLabel === undefined || operatorNote === undefined
    || !sourceChannel || !serviceStatus || !notificationPreference
    || (payload.bookingStaffMemberId !== null && !bookingStaffMemberId)
  ) {
    return { ok: false as const, error: "invalid_reservation_update" };
  }
  if (!isGhostOperatingInterval(scheduledStartAt, scheduledEndAt)) {
    return { ok: false as const, error: "outside_operating_hours" };
  }
  return {
    ok: true as const,
    value: {
      reservationId,
      command: {
        expectedVersion,
        offeringId,
        scheduledStartAt,
        scheduledEndAt,
        guestCount,
        tableIds,
        expectedTableVersions: versions,
        guestLabel,
        operatorNote,
        sourceChannel,
        serviceStatus,
        bookingStaffMemberId,
        notificationPreference,
        capacityOverride: capacity.capacityOverride,
        reason: capacity.reason,
      },
    },
  };
}

function readTableVersions(value: unknown, tableIds: string[] | null) {
  if (!tableIds || !Array.isArray(value) || value.length !== tableIds.length) return null;
  const versions = value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const entry = item as Record<string, unknown>;
    const tableId = readUuid(entry.tableId);
    const expectedVersion = readInteger(entry.expectedVersion, 1, Number.MAX_SAFE_INTEGER);
    return tableId && expectedVersion !== null ? { tableId, expectedVersion } : null;
  });
  if (
    versions.some((item) => item === null)
    || new Set(versions.map((item) => item?.tableId)).size !== tableIds.length
    || versions.some((item) => !tableIds.includes(item?.tableId ?? ""))
  ) {
    return null;
  }
  return versions as Array<{ tableId: string; expectedVersion: number }>;
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
  if (!isGhostOperatingInterval(startAt, endAt, businessDate)) {
    return { ok: false as const, error: "outside_operating_hours" };
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

function parseBlockMutation(payload: Record<string, unknown>, requireIdentity: boolean) {
  const blockId = readUuid(payload.blockId);
  const expectedVersion = readInteger(payload.expectedVersion, 1, Number.MAX_SAFE_INTEGER);
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

  if (
    (requireIdentity && (!blockId || expectedVersion === null))
    || !scope
    || !kind
    || !startAt
    || !endAt
    || Date.parse(startAt) >= Date.parse(endAt)
    || memo === undefined
    || !seatResourceIds
    || (!venueWide && seatResourceIds.length === 0)
    || (venueWide && seatResourceIds.length > 0)
  ) {
    return { ok: false as const, error: "invalid_block_update" };
  }
  if (!isGhostOperatingInterval(startAt, endAt)) {
    return { ok: false as const, error: "outside_operating_hours" };
  }

  return {
    ok: true as const,
    value: {
      blockId: blockId!,
      expectedVersion: expectedVersion!,
      scope,
      blockKind: kind,
      startAt,
      endAt,
      memo,
      seatResourceIds,
      venueWide,
    },
  };
}

async function forwardOperation(
  path: string,
  payload: Record<string, unknown>,
  idempotencyKey: string,
  token: string,
  method: "POST" | "PATCH" | "DELETE" = "POST",
) {
  const response = await ghostAdminFetch(
    path,
    {
      method,
      headers: {
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    },
    token,
  );
  const result = await copyJson(response);

  return NextResponse.json(
    response.ok
      ? result
      : normalizeOperationFailurePayload(response.status, result),
    {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function normalizeOperationFailurePayload(status: number, value: unknown) {
  const payload = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const error = payload.error;
  const errorRecord = error && typeof error === "object" && !Array.isArray(error)
    ? error as Record<string, unknown>
    : null;
  const code = typeof error === "string"
    ? error
    : typeof errorRecord?.code === "string"
      ? errorRecord.code
      : "operation_failed";
  const details = errorRecord?.details && typeof errorRecord.details === "object"
    && !Array.isArray(errorRecord.details)
    ? errorRecord.details
    : payload.details;
  const currentVersion = payload.currentVersion ?? errorRecord?.currentVersion;

  return {
    ok: false,
    error: code,
    ...(details === undefined ? {} : { details }),
    ...(currentVersion === undefined ? {} : { currentVersion }),
    status,
  };
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
