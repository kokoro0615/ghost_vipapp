import type {
  ReservationBlockV2,
  VipFloorReservationV2,
  VipServiceStatus,
  VipTableV2,
} from "@/lib/vipFloorV2Contract";
import type {
  CustomerDetail,
  StaffMember,
  TableStaffAssignment,
  WaitlistEntry,
} from "@/components/admin/vip-floor-v2/contract/uiTypes";

import {
  DEMO_EXPIRES_AT,
  DEMO_SCHEMA_VERSION,
  DEMO_TIME_ZONE,
  type DemoCustomer,
  type DemoEnvelope,
} from "./contract";
import { assertDemoBusinessDate } from "./validation";

const VIP_TABLE_CODES = [
  "VIP-1",
  "VIP-2",
  "VIP-3",
  "VIP-4",
  "VIP-5",
  "VIP-6",
  "VIP-7",
  "VIP-8",
] as const;

const FIRST_DEMO_GUEST_LABEL = "デモゲスト001";

// Coordinates are the existing GHOST-owned vipSeatHotspots geometry.
const GHOST_TABLE_GEOMETRY = [
  { x: 72.8, y: 17.9, size: 4.7, rotation: 0 },
  { x: 71.6, y: 71.9, size: 4.45, rotation: -6 },
  { x: 50.9, y: 71.6, size: 4.45, rotation: 0 },
  { x: 40.8, y: 71.6, size: 4.45, rotation: 0 },
  { x: 42.5, y: 53.3, size: 4.3, rotation: 0 },
  { x: 51.9, y: 53.3, size: 4.3, rotation: 0 },
  { x: 51.8, y: 16.1, size: 4.15, rotation: 0 },
  { x: 44.2, y: 16.1, size: 4.15, rotation: 0 },
] as const;

type ReservationSeed = {
  index: number;
  startHour: number;
  startMinute?: number;
  durationMinutes?: number;
  guestCount: number;
  status: VipServiceStatus;
  tableNumbers: number[];
  source?: VipFloorReservationV2["sourceChannel"];
  flags?: string[];
  customerIndex?: number;
};

function pad(value: number, length = 2) {
  return String(value).padStart(length, "0");
}

function addDays(businessDate: string, days: number) {
  const date = new Date(`${businessDate}T12:00:00+09:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: DEMO_TIME_ZONE,
  }).format(date);
}

function atBusinessTime(businessDate: string, hour: number, minute = 0) {
  const date = hour < 12 ? addDays(businessDate, 1) : businessDate;
  return `${date}T${pad(hour)}:${pad(minute)}:00+09:00`;
}

function plusMinutes(value: string, minutes: number) {
  return new Date(Date.parse(value) + minutes * 60_000).toISOString();
}

function tableId(tableNumber: number) {
  return `demo-table-vip-${tableNumber}`;
}

function reservationId(index: number) {
  return `demo-reservation-${pad(index, 3)}`;
}

function customerId(index: number) {
  return `00000000-0000-4000-8000-${pad(index, 12)}`;
}

function makeReservation(
  businessDate: string,
  seed: ReservationSeed,
): VipFloorReservationV2 {
  const startAt = atBusinessTime(
    businessDate,
    seed.startHour,
    seed.startMinute ?? 0,
  );
  const endAt = plusMinutes(startAt, seed.durationMinutes ?? 120);
  const linkedCustomerId = customerId(seed.customerIndex ?? seed.index);
  const id = reservationId(seed.index);
  const tableIds = seed.tableNumbers.map(tableId);

  return {
    id,
    version: 1,
    publicCode: `DEMO-${businessDate.replaceAll("-", "").slice(4)}-${pad(seed.index)}`,
    businessDate,
    lifecycleStatus: "confirmed",
    serviceStatus: seed.status,
    sourceChannel: seed.source ?? "admin_hold",
    scheduledStartAt: startAt,
    scheduledEndAt: endAt,
    expectedReleaseAt: endAt,
    actualSeatedAt: ["arrived", "partial_arrival", "seated"].includes(seed.status)
      ? plusMinutes(startAt, 4)
      : null,
    completedAt: seed.status === "completed" ? endAt : null,
    guestCount: {
      total: seed.guestCount,
      adults: seed.guestCount,
      children: 0,
    },
    assignmentIds: tableIds.map((idValue) => `${id}:${idValue}`),
    tableIds,
    customer: {
      customerId: linkedCustomerId,
      displayLabel: seed.index === 1
        ? FIRST_DEMO_GUEST_LABEL
        : `デモゲスト${pad(seed.customerIndex ?? seed.index, 3)}`,
      masked: false,
    },
    payment: null,
    notes: [],
    flags: seed.flags ?? [],
    bookingOfferingId: "demo-offering-vip",
    bookingStaffMemberId: seed.index % 2 === 0 ? "demo-staff-b" : "demo-staff-a",
    notificationPreference: "none",
    operatorNote: "デモ：到着時にVIP担当へ引継ぎ",
    updatedAt: `${businessDate}T12:00:00+09:00`,
  };
}

function scenarioReservations(businessDate: string): ReservationSeed[] {
  if (businessDate === "2026-07-27") {
    return [
      { index: 1, startHour: 21, guestCount: 4, status: "late", tableNumbers: [1], flags: ["no_contact"] },
      { index: 2, startHour: 22, guestCount: 6, status: "arrived", tableNumbers: [2] },
      { index: 3, startHour: 23, guestCount: 5, status: "seated", tableNumbers: [3, 4] },
      { index: 4, startHour: 0, guestCount: 3, status: "expected", tableNumbers: [], flags: ["unassigned"] },
      { index: 5, startHour: 1, guestCount: 2, status: "bottle_pending", tableNumbers: [5] },
    ];
  }
  if (businessDate === "2026-07-28") {
    return [
      { index: 11, startHour: 22, guestCount: 4, status: "expected", tableNumbers: [1] },
      { index: 12, startHour: 23, guestCount: 2, status: "arrived", tableNumbers: [2], source: "walk_in" },
      { index: 13, startHour: 0, guestCount: 5, status: "late", tableNumbers: [6] },
    ];
  }
  if (businessDate === "2026-08-01") {
    return [
      { index: 21, startHour: 22, guestCount: 6, status: "expected", tableNumbers: [1, 2], flags: ["time_conflict"] },
      { index: 22, startHour: 0, guestCount: 4, status: "expected", tableNumbers: [5] },
    ];
  }
  if (businessDate === "2026-08-08") {
    return [
      { index: 31, startHour: 21, guestCount: 3, status: "seated", tableNumbers: [7], customerIndex: 31 },
      { index: 32, startHour: 23, guestCount: 4, status: "expected", tableNumbers: [8], customerIndex: 32 },
      { index: 33, startHour: 1, guestCount: 2, status: "bill_requested", tableNumbers: [4], customerIndex: 31 },
    ];
  }
  if (businessDate === "2026-08-27") {
    return [
      { index: 41, startHour: 22, guestCount: 2, status: "expected", tableNumbers: [8] },
    ];
  }

  const ordinal = Number(businessDate.slice(-2));
  if (ordinal % 3 === 0) return [];
  if (ordinal % 3 === 1) {
    return [{ index: 51, startHour: 22, guestCount: 4, status: "expected", tableNumbers: [3] }];
  }
  return [
    { index: 61, startHour: 22, guestCount: 4, status: "expected", tableNumbers: [2] },
    { index: 62, startHour: 0, guestCount: 3, status: "arrived", tableNumbers: [6] },
  ];
}

function makeTables(reservations: VipFloorReservationV2[], blocks: ReservationBlockV2[]) {
  return VIP_TABLE_CODES.map((code, index): VipTableV2 => {
    const id = tableId(index + 1);
    const geometry = GHOST_TABLE_GEOMETRY[index];
    return {
      id,
      version: 1,
      publicResourceCode: code,
      displayCode: code,
      name: `${code} デモ卓`,
      sectionId: "ghost-vip",
      capacityMin: 2,
      capacityMax: index < 2 ? 8 : 6,
      onlineEligible: false,
      geometry: {
        shape: "table",
        xPercent: geometry.x,
        yPercent: geometry.y,
        widthPercent: geometry.size,
        heightPercent: geometry.size,
        rotationDegrees: geometry.rotation,
      },
      operationalLocked: false,
      lockReason: null,
      reservationIds: reservations
        .filter((reservation) => reservation.tableIds.includes(id))
        .map((reservation) => reservation.id),
      blockIds: blocks
        .filter((block) => block.targets.venueWide || block.targets.tableIds.includes(id))
        .map((block) => block.id),
    };
  });
}

function makeBlocks(businessDate: string): ReservationBlockV2[] {
  if (businessDate !== "2026-08-01") return [];
  return [
    {
      id: "demo-block-online-001",
      version: 1,
      scope: "online_only",
      kind: "owner_hold",
      startAt: atBusinessTime(businessDate, 21, 30),
      endAt: atBusinessTime(businessDate, 23, 0),
      memo: "デモ：オンライン受付を一時停止",
      targets: {
        venueWide: false,
        sectionIds: [],
        tableIds: [tableId(3), tableId(4)],
      },
      updatedAt: `${businessDate}T12:00:00+09:00`,
    },
    {
      id: "demo-block-operations-002",
      version: 1,
      scope: "all_operations",
      kind: "maintenance",
      startAt: atBusinessTime(businessDate, 23, 30),
      endAt: atBusinessTime(businessDate, 1, 0),
      memo: "デモ：VIP卓メンテナンス",
      targets: {
        venueWide: false,
        sectionIds: [],
        tableIds: [tableId(6)],
      },
      updatedAt: `${businessDate}T12:00:00+09:00`,
    },
  ];
}

function makeWaitlist(businessDate: string): WaitlistEntry[] {
  if (businessDate !== "2026-07-28") return [];
  return [
    {
      id: "demo-waitlist-001",
      eventDayId: `demo-day-${businessDate}`,
      guestCount: 3,
      guestLabel: "デモゲスト待機001",
      email: "demo-wait-001@example.invalid",
      status: "waiting",
      storedStatus: "waiting",
      calledAt: null,
      callExpiresAt: null,
      seatedReservationId: null,
      version: 1,
      createdAt: atBusinessTime(businessDate, 21, 15),
      updatedAt: atBusinessTime(businessDate, 21, 15),
    },
    {
      id: "demo-waitlist-002",
      eventDayId: `demo-day-${businessDate}`,
      guestCount: 2,
      guestLabel: "デモゲスト待機002",
      email: null,
      status: "called",
      storedStatus: "called",
      calledAt: atBusinessTime(businessDate, 21, 20),
      callExpiresAt: atBusinessTime(businessDate, 21, 50),
      seatedReservationId: null,
      version: 1,
      createdAt: atBusinessTime(businessDate, 21, 10),
      updatedAt: atBusinessTime(businessDate, 21, 20),
    },
  ];
}

function makeStaff(businessDate: string) {
  const updatedAt = `${businessDate}T12:00:00+09:00`;
  const staffMembers: StaffMember[] = [
    { id: "demo-staff-a", displayName: "デモスタッフA", active: true, version: 1, createdAt: updatedAt, updatedAt },
    { id: "demo-staff-b", displayName: "デモスタッフB", active: true, version: 1, createdAt: updatedAt, updatedAt },
    { id: "demo-staff-c", displayName: "デモスタッフC", active: businessDate === "2026-08-08", version: 1, createdAt: updatedAt, updatedAt },
  ];
  const tableAssignments: TableStaffAssignment[] = businessDate === "2026-08-08"
    ? VIP_TABLE_CODES.slice(0, 6).map((_, index) => ({
        id: `demo-staff-assignment-${index + 1}`,
        tableId: tableId(index + 1),
        staffMemberId: staffMembers[index % staffMembers.length].id,
        version: 1,
        createdAt: updatedAt,
        updatedAt,
      }))
    : [];
  return { staffMembers, tableAssignments };
}

function makeCustomers(
  businessDate: string,
  reservations: VipFloorReservationV2[],
): Record<string, DemoCustomer> {
  return Object.fromEntries(reservations.map((reservation, index) => {
    const id = typeof reservation.customer?.customerId === "string"
      ? reservation.customer.customerId
      : customerId(index + 1);
    const displayName = `デモゲスト${pad(
      Number(id.slice(-3)) || index + 1,
      3,
    )}`;
    const detail: CustomerDetail = {
      id,
      profilePresent: true,
      profileVersion: 1,
      languageCode: "ja",
      displayName,
      nameKana: null,
      phone: null,
      email: `demo-${pad(index + 1, 3)}@example.invalid`,
      allergies: "デモ：アレルギー情報なし",
      preferences: "デモ：静かなVIP卓を希望",
      attributes: {
        nationalityCode: "JP",
        birthDate: null,
        anniversaryDate: null,
        vipRank: "デモVIP",
      },
      aggregates: {
        synthetic: true,
        visitCount: businessDate === "2026-08-08" ? 3 : 1,
      },
      reservationHistory: reservations
        .filter((item) => item.customer?.customerId === id)
        .map((item) => ({
          reservationId: item.id,
          publicCode: item.publicCode,
          businessDate,
          scheduledStartAt: item.scheduledStartAt,
          guestCount: item.guestCount.total,
          lifecycleStatus: item.lifecycleStatus,
          serviceStatus: item.serviceStatus,
        })),
      linkHistory: [{
        eventId: `demo-customer-link-${id}`,
        reservationId: reservation.id,
        linked: true,
        unlinked: false,
        resolutionMethod: "demo_seed",
        createdAt: `${businessDate}T12:00:00+09:00`,
      }],
    };
    return [id, {
      ...detail,
      version: 1,
      updatedAt: `${businessDate}T12:00:00+09:00`,
    }];
  }));
}

export function calculateDemoTotals(envelope: Pick<
  DemoEnvelope,
  "tables" | "reservations" | "assignments" | "blocks" | "notes"
>) {
  return {
    tableCount: envelope.tables.length,
    reservationCount: envelope.reservations.length,
    activeReservationCount: envelope.reservations.filter(
      (reservation) => reservation.lifecycleStatus !== "cancelled",
    ).length,
    assignmentCount: envelope.assignments.length,
    unassignedReservationCount: envelope.reservations.filter(
      (reservation) => reservation.tableIds.length === 0,
    ).length,
    activeBlockCount: envelope.blocks.length,
    noteCount: envelope.notes.length,
    guestCount: envelope.reservations.reduce(
      (total, reservation) => total + reservation.guestCount.total,
      0,
    ),
    serviceStatusCounts: envelope.reservations.reduce<Record<string, number>>(
      (counts, reservation) => {
        const status = reservation.serviceStatus ?? "expected";
        counts[status] = (counts[status] ?? 0) + 1;
        return counts;
      },
      {},
    ),
  };
}

export function createDeterministicDemoEnvelope(input: {
  businessDate: string;
  workspaceId: string;
  dataVersion: string;
}): DemoEnvelope {
  const businessDate = assertDemoBusinessDate(input.businessDate);
  const blocks = makeBlocks(businessDate);
  const reservations = scenarioReservations(businessDate).map((seed) =>
    makeReservation(businessDate, seed));
  const tables = makeTables(reservations, blocks);
  const assignments = reservations.flatMap((reservation) =>
    reservation.tableIds.map((id) => ({
      id: `${reservation.id}:${id}`,
      version: 1,
      reservationId: reservation.id,
      tableId: id,
      lockStatus: "confirmed",
      assignmentRole: "primary",
      startAt: reservation.scheduledStartAt,
      endAt: reservation.scheduledEndAt,
      updatedAt: `${businessDate}T12:00:00+09:00`,
    })));
  const notes = reservations.map((reservation) => ({
    id: `demo-note-${reservation.id}`,
    reservationId: reservation.id,
    kind: "floor" as const,
    body: "デモ：VIP担当へ到着状況を共有",
    pinned: reservation.serviceStatus === "late",
    version: 1,
    updatedAt: `${businessDate}T12:00:00+09:00`,
  }));
  const seededAt = `${businessDate}T12:00:00+09:00`;
  const partial = {
    tables,
    reservations,
    assignments,
    blocks,
    notes,
  };

  return {
    schemaVersion: DEMO_SCHEMA_VERSION,
    dataVersion: input.dataVersion,
    workspaceId: input.workspaceId,
    businessDate,
    seededAt,
    generatedAt: seededAt,
    expiresAt: DEMO_EXPIRES_AT,
    boardRevision: 1,
    businessDay: {
      id: `demo-day-${businessDate}`,
      businessDate,
      venueTimezone: DEMO_TIME_ZONE,
      operatingStartAt: atBusinessTime(businessDate, 22),
      operatingEndAt: atBusinessTime(businessDate, 5),
    },
    capabilities: {
      readCustomerPii: true,
      changeServiceStatus: true,
      changeAssignments: true,
      changeSchedule: true,
      manageBlocks: true,
      cancelReservation: true,
    },
    sections: [{
      id: "ghost-vip",
      code: "GHOST-VIP",
      name: "GHOST OSAKA VIP",
      sortOrder: 10,
    }],
    ...partial,
    unassignedReservationIds: reservations
      .filter((reservation) => reservation.tableIds.length === 0)
      .map((reservation) => reservation.id),
    totals: calculateDemoTotals(partial),
    operations: {
      adminMutationEnabled: true,
      webhookProcessingEnabled: false,
      publicBookingEnabled: false,
    },
    waitlist: makeWaitlist(businessDate),
    staff: makeStaff(businessDate),
    customers: makeCustomers(businessDate, reservations),
    auditHistory: [{
      id: `demo-audit-seed-${businessDate}`,
      operation: "seed",
      actorMode: "demo",
      at: seededAt,
      businessDate,
      entityId: null,
      beforeVersion: null,
      afterVersion: null,
      boardRevision: 1,
      summary: "デモ：決定論的な合成台帳を作成",
    }],
    idempotency: {},
  };
}
