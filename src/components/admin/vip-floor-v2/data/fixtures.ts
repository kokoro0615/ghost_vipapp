import type {
  ReservationBlockV2,
  ReservationNoteSummaryV2,
  VipFloorAssignmentV2,
  VipFloorBoardV2,
  VipFloorReservationV2,
  VipServiceStatus,
  VipTableV2,
} from "@/lib/vipFloorV2Contract";
import { VIP_FLOOR_SCHEMA_VERSION } from "@/lib/vipFloorV2Contract";

export const FIXTURE_BUSINESS_DATE = "2026-07-23";
export const FIXTURE_GENERATED_AT = "2026-07-23T22:14:00+09:00";

const fixtureSeatSeeds = [
  { id: "1", publicResourceCode: "royal-vip-1", label: "ROYAL VIP", capacity: 8, x: 72.8, y: 17.9, size: 4.7, rotation: 0 },
  { id: "2", publicResourceCode: "prime-vip-2", label: "PRIME VIP", capacity: 12, x: 71.6, y: 71.9, size: 4.45, rotation: -6 },
  { id: "3", publicResourceCode: "regular-vip-3", label: "REGULAR VIP", capacity: 6, x: 50.9, y: 71.6, size: 4.45, rotation: 0 },
  { id: "4", publicResourceCode: "regular-vip-4", label: "REGULAR VIP", capacity: 6, x: 40.8, y: 71.6, size: 4.45, rotation: 0 },
  { id: "5", publicResourceCode: "floor-vip-5", label: "FLOOR VIP", capacity: 6, x: 42.5, y: 53.3, size: 4.3, rotation: 0 },
  { id: "6", publicResourceCode: "floor-vip-6", label: "FLOOR VIP", capacity: 6, x: 51.9, y: 53.3, size: 4.3, rotation: 0 },
  { id: "7", publicResourceCode: "floor-vip-7", label: "FLOOR VIP", capacity: 6, x: 51.8, y: 16.1, size: 4.15, rotation: 0 },
  { id: "8", publicResourceCode: "floor-vip-8", label: "FLOOR VIP", capacity: 6, x: 44.2, y: 16.1, size: 4.15, rotation: 0 },
] as const;

function uuid(namespace: number, index: number) {
  return `${String(namespace).padStart(8, "0")}-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

const sectionIds = {
  lounge: uuid(10, 1),
  floor: uuid(10, 2),
};

export const fixtureTables: VipTableV2[] = fixtureSeatSeeds.map((seat, index) => {
  const id = uuid(20, index + 1);
  return {
    id,
    version: 3,
    publicResourceCode: seat.publicResourceCode,
    displayCode: `VIP-${seat.id}`,
    name: seat.label,
    sectionId: index < 4 ? sectionIds.lounge : sectionIds.floor,
    capacityMin: 1,
    capacityMax: seat.capacity,
    onlineEligible: true,
    geometry: {
      shape: index < 2 ? "lounge" : "table",
      xPercent: seat.x,
      yPercent: seat.y,
      widthPercent: Math.max(8, seat.size * 2.25),
      heightPercent: Math.max(7, seat.size * 1.65),
      rotationDegrees: seat.rotation,
    },
    operationalLocked: index === 6,
    lockReason: index === 6 ? "機材搬入動線を確保" : null,
    reservationIds: [],
    blockIds: [],
  };
});

type ReservationSeed = {
  code: string;
  hour: number;
  minute?: number;
  duration?: number;
  guests: number;
  tableIndexes?: number[];
  status: VipServiceStatus;
  label: string;
  source?: VipFloorReservationV2["sourceChannel"];
  flags?: string[];
};

const reservationSeeds: ReservationSeed[] = [
  { code: "G7A91F", hour: 22, guests: 7, tableIndexes: [0], status: "expected", label: "予約ゲスト A" },
  { code: "G31C20", hour: 22, minute: 15, guests: 10, tableIndexes: [1], status: "seated", label: "予約ゲスト B" },
  { code: "G8F22A", hour: 22, minute: 30, guests: 5, tableIndexes: [4], status: "late", label: "予約ゲスト C", flags: ["no_contact"] },
  { code: "G40E11", hour: 23, guests: 6, tableIndexes: [2], status: "partial_arrival", label: "予約ゲスト D" },
  { code: "W91C2A", hour: 23, minute: 15, guests: 4, tableIndexes: [3], status: "bottle_pending", label: "入口受付 01", source: "walk_in" },
  { code: "G77B10", hour: 23, minute: 30, guests: 6, status: "expected", label: "予約ゲスト E" },
  { code: "G13A88", hour: 24, guests: 5, tableIndexes: [5], status: "bill_requested", label: "予約ゲスト F", flags: ["payment_review"] },
  { code: "G29D04", hour: 24, minute: 15, guests: 8, tableIndexes: [0, 7], status: "arrived", label: "予約ゲスト G", flags: ["connected_tables"] },
  { code: "G62C33", hour: 24, minute: 45, guests: 4, tableIndexes: [4], status: "paid", label: "予約ゲスト H" },
  { code: "G55E90", hour: 25, guests: 6, tableIndexes: [2], status: "bottle_served", label: "予約ゲスト I" },
  { code: "G18A70", hour: 25, minute: 30, guests: 5, tableIndexes: [3], status: "resetting", label: "予約ゲスト J" },
  { code: "G90F21", hour: 26, guests: 9, tableIndexes: [1], status: "expected", label: "予約ゲスト K", flags: ["capacity_warning"] },
];

function isoAt(hour: number, minute = 0) {
  const day = hour >= 24 ? "24" : "23";
  const normalizedHour = hour >= 24 ? hour - 24 : hour;
  return `2026-07-${day}T${String(normalizedHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+09:00`;
}

function buildReservation(seed: ReservationSeed, index: number): VipFloorReservationV2 {
  const duration = seed.duration ?? 120;
  const start = isoAt(seed.hour, seed.minute ?? 0);
  const end = new Date(new Date(start).getTime() + duration * 60_000).toISOString();
  const tableIds = (seed.tableIndexes ?? []).map((tableIndex) => fixtureTables[tableIndex]?.id).filter(Boolean);
  return {
    id: uuid(30, index + 1),
    version: 4,
    publicCode: seed.code,
    businessDate: FIXTURE_BUSINESS_DATE,
    lifecycleStatus: seed.status === "completed" ? "completed" : "confirmed",
    serviceStatus: seed.status,
    sourceChannel: seed.source ?? "online",
    scheduledStartAt: start,
    scheduledEndAt: end,
    expectedReleaseAt: end,
    actualSeatedAt: ["seated", "bottle_pending", "bottle_served", "bill_requested", "paid", "resetting"].includes(seed.status) ? start : null,
    completedAt: seed.status === "completed" ? end : null,
    guestCount: { total: seed.guests, adults: seed.guests, children: 0 },
    assignmentIds: tableIds.map((_, tableIndex) => uuid(40 + index, tableIndex + 1)),
    tableIds,
    customer: { displayNameMasked: seed.label, masked: true, languageCode: "ja" },
    payment: {
      status: seed.flags?.includes("payment_review") ? "review" : seed.status === "paid" ? "paid" : "card_registered",
      amountYen: seed.guests * 12_000,
      methodLabel: "カード登録済み",
    },
    notes: [],
    flags: seed.flags ?? [],
    updatedAt: FIXTURE_GENERATED_AT,
  };
}

const baseReservations = reservationSeeds.map(buildReservation);

function buildAssignments(reservations: VipFloorReservationV2[]) {
  return reservations.flatMap((reservation) =>
    reservation.tableIds.map((tableId, index) => ({
      id: reservation.assignmentIds[index] ?? uuid(70, index + 1),
      version: 2,
      reservationId: reservation.id,
      tableId,
      lockStatus: "confirmed",
      assignmentRole: index === 0 ? "primary" : "connected",
      startAt: reservation.scheduledStartAt,
      endAt: reservation.scheduledEndAt,
      updatedAt: FIXTURE_GENERATED_AT,
    } satisfies VipFloorAssignmentV2)),
  );
}

const baseBlocks: ReservationBlockV2[] = [
  {
    id: uuid(80, 1),
    version: 1,
    scope: "all_operations",
    kind: "maintenance",
    startAt: "2026-07-23T21:30:00+09:00",
    endAt: "2026-07-23T22:30:00+09:00",
    memo: "音響点検",
    targets: { venueWide: false, sectionIds: [], tableIds: [fixtureTables[7].id] },
    updatedAt: FIXTURE_GENERATED_AT,
  },
];

const baseNotes: ReservationNoteSummaryV2[] = [
  {
    id: uuid(90, 1),
    reservationId: baseReservations[2].id,
    kind: "floor",
    body: "到着時に入口担当からフロア責任者へ連携",
    pinned: true,
    version: 2,
    updatedAt: FIXTURE_GENERATED_AT,
  },
];

export function calculateTotals(board: Pick<VipFloorBoardV2, "tables" | "reservations" | "assignments" | "blocks" | "notes" | "unassignedReservationIds">) {
  const counts = board.reservations.reduce<Record<string, number>>((result, reservation) => {
    const key = reservation.serviceStatus ?? "unassigned";
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {});
  return {
    tableCount: board.tables.length,
    reservationCount: board.reservations.length,
    activeReservationCount: board.reservations.filter((item) => item.lifecycleStatus !== "cancelled").length,
    assignmentCount: board.assignments.length,
    unassignedReservationCount: board.unassignedReservationIds.length,
    activeBlockCount: board.blocks.length,
    noteCount: board.notes.length,
    guestCount: board.reservations.reduce((total, item) => total + item.guestCount.total, 0),
    serviceStatusCounts: counts,
  };
}

export function createHealthyBoard(): VipFloorBoardV2 {
  const reservations = structuredClone(baseReservations);
  const assignments = buildAssignments(reservations);
  const tables = structuredClone(fixtureTables).map((table) => ({
    ...table,
    reservationIds: reservations.filter((item) => item.tableIds.includes(table.id)).map((item) => item.id),
    blockIds: baseBlocks.filter((block) => block.targets.tableIds.includes(table.id)).map((block) => block.id),
  }));
  const partial = {
    schemaVersion: VIP_FLOOR_SCHEMA_VERSION,
    generatedAt: FIXTURE_GENERATED_AT,
    boardRevision: 17,
    businessDay: {
      id: uuid(1, 1),
      businessDate: FIXTURE_BUSINESS_DATE,
      venueTimezone: "Asia/Tokyo" as const,
      operatingStartAt: "2026-07-23T21:00:00+09:00",
      operatingEndAt: "2026-07-24T05:00:00+09:00",
    },
    capabilities: {
      readCustomerPii: false,
      changeServiceStatus: true,
      changeAssignments: true,
      changeSchedule: true,
      manageBlocks: true,
      cancelReservation: true,
    },
    sections: [
      { id: sectionIds.lounge, code: "LNG", name: "VIP LOUNGE", sortOrder: 1 },
      { id: sectionIds.floor, code: "FLR", name: "FLOOR SIDE", sortOrder: 2 },
    ],
    tables,
    reservations,
    assignments,
    unassignedReservationIds: reservations.filter((item) => item.tableIds.length === 0).map((item) => item.id),
    blocks: structuredClone(baseBlocks),
    notes: structuredClone(baseNotes),
    operations: {
      adminMutationEnabled: true,
      webhookProcessingEnabled: true,
      publicBookingEnabled: true,
    },
  };
  return { ...partial, totals: calculateTotals(partial) };
}

export function createDenseBoard() {
  const board = createHealthyBoard();
  const reservations = Array.from({ length: 56 }, (_, index) => {
    const source = board.reservations[index % board.reservations.length];
    const startMinutes = (index * 15) % (7 * 60);
    const start = new Date(new Date(board.businessDay.operatingStartAt).getTime() + startMinutes * 60_000).toISOString();
    const table = board.tables[index % board.tables.length];
    return {
      ...structuredClone(source),
      id: uuid(31, index + 1),
      version: 1 + (index % 7),
      publicCode: `S${String(index + 1).padStart(5, "0")}`,
      scheduledStartAt: start,
      scheduledEndAt: new Date(new Date(start).getTime() + 105 * 60_000).toISOString(),
      expectedReleaseAt: new Date(new Date(start).getTime() + 105 * 60_000).toISOString(),
      tableIds: index % 11 === 0 ? [] : [table.id],
      assignmentIds: index % 11 === 0 ? [] : [uuid(75, index + 1)],
      customer: { displayNameMasked: `ストレステスト予約 ${String(index + 1).padStart(2, "0")}`, masked: true },
      flags: index % 13 === 0 ? ["capacity_warning"] : [],
    } satisfies VipFloorReservationV2;
  });
  board.reservations = reservations;
  board.assignments = buildAssignments(reservations);
  board.unassignedReservationIds = reservations.filter((item) => item.tableIds.length === 0).map((item) => item.id);
  board.tables = board.tables.map((table) => ({
    ...table,
    reservationIds: reservations.filter((item) => item.tableIds.includes(table.id)).map((item) => item.id),
  }));
  board.totals = calculateTotals(board);
  return board;
}
