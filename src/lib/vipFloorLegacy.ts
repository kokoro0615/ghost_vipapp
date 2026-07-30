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

// Keep the read-only fallback on the same canonical geometry as the v2
// backend seed. Exact resource/display codes are used deliberately: parsing
// the first digit would make an unrelated code such as VIP-101 occupy VIP-1.
const FLOOR_POSITIONS = [
  { x: 72.8, y: 17.9, w: 4.7, h: 4.7, r: 0 },
  { x: 71.6, y: 71.9, w: 4.45, h: 4.45, r: -6 },
  { x: 50.9, y: 71.6, w: 4.45, h: 4.45, r: 0 },
  { x: 40.8, y: 71.6, w: 4.45, h: 4.45, r: 0 },
  { x: 42.5, y: 53.3, w: 4.3, h: 4.3, r: 0 },
  { x: 51.9, y: 53.3, w: 4.3, h: 4.3, r: 0 },
  { x: 51.8, y: 16.1, w: 4.15, h: 4.15, r: 0 },
  { x: 44.2, y: 16.1, w: 4.15, h: 4.15, r: 0 },
] as const;

const FLOOR_POSITION_INDEX_BY_CODE = new Map<string, number>([
  ["royal-vip-1", 0],
  ["prime-vip-2", 1],
  ["regular-vip-3", 2],
  ["regular-vip-4", 3],
  ["floor-vip-5", 4],
  ["floor-vip-6", 5],
  ["floor-vip-7", 6],
  ["floor-vip-8", 7],
  ["VIP-1", 0],
  ["VIP-2", 1],
  ["VIP-3", 2],
  ["VIP-4", 3],
  ["VIP-5", 4],
  ["VIP-6", 5],
  ["VIP-7", 6],
  ["VIP-8", 7],
]);

function resolveFloorPositions(seats: LegacyVipSeat[]) {
  const slots = new Array<number | null>(seats.length).fill(null);
  const taken = new Set<number>();

  seats.forEach((seat, index) => {
    const resourceCode = seat.publicResourceCode?.trim() ?? "";
    const displayCode = seat.name.trim().toUpperCase();
    const slot = FLOOR_POSITION_INDEX_BY_CODE.get(resourceCode)
      ?? FLOOR_POSITION_INDEX_BY_CODE.get(displayCode);
    if (slot === undefined || taken.has(slot)) return;
    slots[index] = slot;
    taken.add(slot);
  });

  return slots.map((slot, index) => {
    if (slot !== null) return FLOOR_POSITIONS[slot];
    const firstFree = FLOOR_POSITIONS.findIndex((_, candidate) => !taken.has(candidate));
    const fallback = firstFree >= 0 ? firstFree : index % FLOOR_POSITIONS.length;
    taken.add(fallback);
    return FLOOR_POSITIONS[fallback];
  });
}

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

function legacyGhostOperatingWindow(businessDate: string) {
  const nextDate = new Date(`${businessDate}T00:00:00.000Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  return {
    startAt: `${businessDate}T22:00:00+09:00`,
    endAt: `${nextDate.toISOString().slice(0, 10)}T05:00:00+09:00`,
  };
}

export function adaptLegacyVipBoard(source: LegacyVipBoard, requestedDate: string): VipFloorBoardV2 {
  const now = new Date().toISOString();
  const businessDate = source.businessDate ?? requestedDate;
  // Keep the read-only compatibility payload on the same explicit service
  // window as the v2 BFF. event_days.sales_open_at is a broader admin boundary.
  const operatingWindow = legacyGhostOperatingWindow(businessDate);
  const operatingStartAt = operatingWindow.startAt;
  const operatingEndAt = operatingWindow.endAt;

  const tableIdByCode = new Map<string, string>();
  const floorPositions = resolveFloorPositions(source.seats);
  const tables = source.seats.map((seat, index) => {
    const id = seat.publicResourceCode ?? `seat-${index + 1}`;
    const position = floorPositions[index];
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
