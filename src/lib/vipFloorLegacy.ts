import type {
  VipFloorBoardV2,
  VipFloorReservationV2,
  VipServiceStatus,
} from "@/lib/vipFloorV2Contract";

export type LegacyVipReservation = {
  id: string;
  publicCode: string;
  status: string;
  sourceChannel?: string | null;
  serviceStatus?: VipServiceStatus | null;
  arrivedAt?: string | null;
  guestLabel?: string | null;
  operatorNote?: string | null;
  guestCount: number;
  slot: { publicSlotId?: string; startAt: string; endAt: string } | null;
  seats: Array<{
    publicResourceCode: string | null;
    name: string | null;
  }>;
  checkedInAt: string | null;
  seatDueAt?: string | null;
  seatExtendedUntilAt: string | null;
  seatOverdue?: boolean;
  seatOverdueMinutes?: number;
  updatedAt: string;
};

export type LegacyVipSeat = {
  publicResourceCode: string | null;
  name: string;
  capacityMin: number;
  capacityMax: number;
  active?: boolean;
  occupancy: string;
  reservation: LegacyVipReservation | null;
};

export type LegacyVipBoard = {
  ok?: boolean;
  businessDate: string | null;
  eventDay?: {
    id: string;
    businessDate: string;
    salesOpenAt?: string | null;
    salesCloseAt?: string | null;
    venueTimezone?: string;
  } | null;
  slots?: Array<{ startAt: string; endAt: string }>;
  reservations: LegacyVipReservation[];
  seats: LegacyVipSeat[];
  totals: {
    reservations?: number;
    availableSeats?: number;
    occupiedSeats?: number;
  };
  operations?: {
    adminMutationEnabled?: boolean;
  };
};

const FLOOR_POSITIONS = [
  { x: 17, y: 25, w: 13, h: 9, r: -4 },
  { x: 37, y: 23, w: 13, h: 9, r: 2 },
  { x: 61, y: 23, w: 13, h: 9, r: -2 },
  { x: 82, y: 26, w: 13, h: 9, r: 4 },
  { x: 17, y: 65, w: 13, h: 9, r: 3 },
  { x: 38, y: 70, w: 13, h: 9, r: -3 },
  { x: 62, y: 70, w: 13, h: 9, r: 3 },
  { x: 82, y: 65, w: 13, h: 9, r: -3 },
] as const;

function deriveServiceStatus(reservation: LegacyVipReservation): VipServiceStatus {
  if (reservation.serviceStatus) return reservation.serviceStatus;
  if (reservation.checkedInAt) return "seated";
  if (reservation.status === "cancelled") return "completed";
  return "expected";
}

function safeTimestamp(value: string | null | undefined, fallback: string) {
  return value && !Number.isNaN(Date.parse(value)) ? value : fallback;
}

function revisionFromReservations(reservations: LegacyVipReservation[]) {
  return reservations.reduce((latest, item) => {
    const value = Date.parse(item.updatedAt);
    return Number.isNaN(value) ? latest : Math.max(latest, value);
  }, 0);
}

export function adaptLegacyVipBoard(source: LegacyVipBoard, requestedDate: string): VipFloorBoardV2 {
  const now = new Date().toISOString();
  const businessDate = source.businessDate ?? requestedDate;
  const slotStart = source.slots?.[0]?.startAt;
  const slotEnd = source.slots?.at(-1)?.endAt;
  const operatingStartAt = safeTimestamp(
    source.eventDay?.salesOpenAt ?? slotStart,
    `${businessDate}T21:00:00+09:00`,
  );
  const nextDate = new Date(`${businessDate}T12:00:00+09:00`);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextBusinessDate = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(nextDate);
  const operatingEndAt = safeTimestamp(
    source.eventDay?.salesCloseAt ?? slotEnd,
    `${nextBusinessDate}T05:00:00+09:00`,
  );

  const tableIdByCode = new Map<string, string>();
  const tables = source.seats.map((seat, index) => {
    const id = seat.publicResourceCode ?? `seat-${index + 1}`;
    const position = FLOOR_POSITIONS[index % FLOOR_POSITIONS.length];
    if (seat.publicResourceCode) tableIdByCode.set(seat.publicResourceCode, id);
    return {
      id,
      version: 1,
      publicResourceCode: seat.publicResourceCode,
      displayCode: seat.publicResourceCode ?? String(index + 1).padStart(2, "0"),
      name: seat.name,
      sectionId: index < Math.ceil(source.seats.length / 2) ? "vip-north" : "vip-south",
      capacityMin: seat.capacityMin,
      capacityMax: seat.capacityMax,
      onlineEligible: seat.active ?? true,
      geometry: {
        shape: "table",
        xPercent: position.x,
        yPercent: position.y,
        widthPercent: position.w,
        heightPercent: position.h,
        rotationDegrees: position.r,
      },
      operationalLocked: seat.active === false,
      lockReason: seat.active === false ? "現在利用停止中" : null,
      reservationIds: seat.reservation ? [seat.reservation.id] : [],
      blockIds: [],
    };
  });

  const reservations: VipFloorReservationV2[] = source.reservations.map((reservation) => {
    const startAt = safeTimestamp(reservation.slot?.startAt, operatingStartAt);
    const endAt = safeTimestamp(reservation.slot?.endAt, operatingEndAt);
    const tableIds = reservation.seats
      .map((seat) => seat.publicResourceCode)
      .filter((value): value is string => Boolean(value))
      .map((code) => tableIdByCode.get(code) ?? code);
    const flags = [
      ...(reservation.seatOverdue ? ["time_conflict"] : []),
      ...(tableIds.length === 0 ? ["unassigned"] : []),
    ];
    const version = Math.max(1, Math.floor(Date.parse(reservation.updatedAt) / 1000) || 1);

    return {
      id: reservation.id,
      version,
      publicCode: reservation.publicCode,
      businessDate,
      lifecycleStatus: reservation.status,
      serviceStatus: deriveServiceStatus(reservation),
      sourceChannel:
        reservation.sourceChannel === "walk_in" || reservation.sourceChannel === "admin_hold"
          ? reservation.sourceChannel
          : "online",
      scheduledStartAt: startAt,
      scheduledEndAt: endAt,
      expectedReleaseAt: reservation.seatExtendedUntilAt ?? reservation.seatDueAt ?? endAt,
      actualSeatedAt: reservation.checkedInAt,
      completedAt: null,
      guestCount: { total: reservation.guestCount, adults: null, children: null },
      assignmentIds: tableIds.map((tableId) => `${reservation.id}:${tableId}`),
      tableIds,
      customer: {
        displayNameMasked: reservation.guestLabel ?? "ゲスト名非表示",
        masked: true,
      },
      payment: null,
      notes: [],
      flags,
      updatedAt: reservation.updatedAt,
    };
  });

  const notes = source.reservations.flatMap((reservation) =>
    reservation.operatorNote
      ? [{
          id: `operator-note:${reservation.id}`,
          reservationId: reservation.id,
          kind: "floor" as const,
          body: reservation.operatorNote,
          pinned: false,
          version: Math.max(1, Math.floor(Date.parse(reservation.updatedAt) / 1000) || 1),
          updatedAt: reservation.updatedAt,
        }]
      : [],
  );

  const assignedIds = new Set(reservations.flatMap((reservation) => reservation.tableIds));
  return {
    schemaVersion: "vip-floor.v2",
    generatedAt: now,
    boardRevision: revisionFromReservations(source.reservations),
    businessDay: {
      id: source.eventDay?.id ?? `business-day:${businessDate}`,
      businessDate,
      venueTimezone: "Asia/Tokyo",
      operatingStartAt,
      operatingEndAt,
    },
    capabilities: {
      readCustomerPii: false,
      changeServiceStatus: true,
      changeAssignments: true,
      changeSchedule: false,
      manageBlocks: false,
      cancelReservation: false,
    },
    sections: [
      { id: "vip-north", code: "NORTH", name: "VIP NORTH", sortOrder: 10 },
      { id: "vip-south", code: "SOUTH", name: "VIP SOUTH", sortOrder: 20 },
    ],
    tables,
    reservations,
    assignments: reservations.flatMap((reservation) =>
      reservation.tableIds.map((tableId) => ({
        id: `${reservation.id}:${tableId}`,
        version: reservation.version,
        reservationId: reservation.id,
        tableId,
        lockStatus: "confirmed",
        assignmentRole: "primary",
        startAt: reservation.scheduledStartAt,
        endAt: reservation.scheduledEndAt,
        updatedAt: reservation.updatedAt,
      }))),
    unassignedReservationIds: reservations.filter((reservation) => reservation.tableIds.length === 0).map((reservation) => reservation.id),
    blocks: [],
    notes,
    totals: {
      tableCount: tables.length,
      reservationCount: reservations.length,
      activeReservationCount: reservations.filter((reservation) => reservation.lifecycleStatus !== "cancelled").length,
      assignmentCount: assignedIds.size,
      unassignedReservationCount: reservations.filter((reservation) => reservation.tableIds.length === 0).length,
      activeBlockCount: 0,
      noteCount: notes.length,
      guestCount: reservations.reduce((sum, reservation) => sum + reservation.guestCount.total, 0),
      serviceStatusCounts: reservations.reduce<Record<string, number>>((counts, reservation) => {
        const key = reservation.serviceStatus ?? "expected";
        counts[key] = (counts[key] ?? 0) + 1;
        return counts;
      }, {}),
    },
    legacyFallbackCount: reservations.length,
    operations: {
      // The legacy board has no monotonic numeric version contract. It is
      // intentionally read-only so commands can only target canonical v2.
      adminMutationEnabled: false,
      webhookProcessingEnabled: false,
      publicBookingEnabled: false,
    },
  };
}

export function createEmptyVipBoard(businessDate: string): VipFloorBoardV2 {
  return adaptLegacyVipBoard({
    businessDate,
    reservations: [],
    seats: [],
    totals: {},
    operations: { adminMutationEnabled: false },
  }, businessDate);
}
