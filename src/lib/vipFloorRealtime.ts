import type { VipFloorBoardV2 } from "./vipFloorV2Contract";

const CACHE_PREFIX = "ghost.vip-manager.safe-board.v1";
const CACHE_TTL_MS = 15 * 60 * 1000;

type SafeFloorGeometry = {
  businessDate: string;
  sections: Array<{
    code: string;
    name: string;
    sortOrder: number;
  }>;
  tables: Array<{
    displayCode: string;
    name: string;
    sectionIndex: number;
    capacityMin: number;
    capacityMax: number;
    geometry: VipFloorBoardV2["tables"][number]["geometry"];
  }>;
};

export type RevisionDecision = "ignore" | "refresh" | "gap_refresh";

export function classifyBoardRevision({
  currentBusinessDate,
  currentRevision,
  incomingBusinessDate,
  incomingRevision,
}: {
  currentBusinessDate: string;
  currentRevision: number;
  incomingBusinessDate: string;
  incomingRevision: number;
}): RevisionDecision {
  if (
    incomingBusinessDate !== currentBusinessDate
    || !Number.isSafeInteger(incomingRevision)
    || incomingRevision <= currentRevision
  ) {
    return "ignore";
  }

  return incomingRevision === currentRevision + 1 ? "refresh" : "gap_refresh";
}

export function writeSafeBoardCache(board: VipFloorBoardV2) {
  if (typeof window === "undefined") return;
  const sectionIndexes = new Map(board.sections.map((section, index) => [section.id, index]));
  const geometry: SafeFloorGeometry = {
    businessDate: board.businessDay.businessDate,
    sections: board.sections.map((section) => ({
      code: section.code,
      name: section.name,
      sortOrder: section.sortOrder,
    })),
    tables: board.tables.map((table) => ({
      displayCode: table.displayCode,
      name: table.name,
      sectionIndex: sectionIndexes.get(table.sectionId) ?? -1,
      capacityMin: table.capacityMin,
      capacityMax: table.capacityMax,
      geometry: {
        shape: table.geometry.shape,
        xPercent: table.geometry.xPercent,
        yPercent: table.geometry.yPercent,
        widthPercent: table.geometry.widthPercent,
        heightPercent: table.geometry.heightPercent,
        rotationDegrees: table.geometry.rotationDegrees,
      },
    })),
  };

  try {
    window.localStorage.setItem(
      cacheKey(board.businessDay.businessDate),
      JSON.stringify({
        expiresAt: Date.now() + CACHE_TTL_MS,
        geometry,
      }),
    );
  } catch {
    // Storage denial or quota failure must not affect the live board.
  }
}

export function readSafeBoardCache(businessDate: string): VipFloorBoardV2 | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(cacheKey(businessDate));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      expiresAt?: unknown;
      geometry?: unknown;
    };

    if (
      typeof parsed.expiresAt !== "number"
      || parsed.expiresAt < Date.now()
      || !isSafeFloorGeometry(parsed.geometry, businessDate)
    ) {
      window.localStorage.removeItem(cacheKey(businessDate));
      return null;
    }

    return restoreSafeBoard(parsed.geometry);
  } catch {
    return null;
  }
}

export function purgeSafeBoardCache() {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(`${CACHE_PREFIX}:`)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // A denied storage surface is already unavailable to the application.
  }
}

function cacheKey(businessDate: string) {
  return `${CACHE_PREFIX}:${businessDate}`;
}

function isSafeFloorGeometry(
  value: unknown,
  businessDate: string,
): value is SafeFloorGeometry {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const geometry = value as Partial<SafeFloorGeometry>;
  return geometry.businessDate === businessDate
    && Array.isArray(geometry.sections)
    && geometry.sections.every((section) => (
      typeof section.code === "string"
      && typeof section.name === "string"
      && Number.isSafeInteger(section.sortOrder)
    ))
    && Array.isArray(geometry.tables)
    && geometry.tables.every((table) => (
      typeof table.displayCode === "string"
      && typeof table.name === "string"
      && Number.isSafeInteger(table.sectionIndex)
      && table.sectionIndex >= 0
      && table.sectionIndex < geometry.sections!.length
      && Number.isFinite(table.capacityMin)
      && Number.isFinite(table.capacityMax)
      && table.geometry
      && typeof table.geometry.shape === "string"
      && Number.isFinite(table.geometry.xPercent)
      && Number.isFinite(table.geometry.yPercent)
      && Number.isFinite(table.geometry.widthPercent)
      && Number.isFinite(table.geometry.heightPercent)
      && Number.isFinite(table.geometry.rotationDegrees)
    ));
}

function restoreSafeBoard(geometry: SafeFloorGeometry): VipFloorBoardV2 {
  const sections = geometry.sections.map((section, index) => ({
    id: `cached-section-${index}`,
    ...section,
  }));
  const tables = geometry.tables.map((table, index) => ({
    id: `cached-table-${index}`,
    version: 0,
    publicResourceCode: null,
    displayCode: table.displayCode,
    name: table.name,
    sectionId: sections[table.sectionIndex]?.id ?? sections[0]?.id ?? "cached-section-0",
    capacityMin: table.capacityMin,
    capacityMax: table.capacityMax,
    onlineEligible: null,
    geometry: table.geometry,
    operationalLocked: false,
    lockReason: null,
    reservationIds: [],
    blockIds: [],
  }));
  const operatingStartAt = `${geometry.businessDate}T22:00:00+09:00`;
  const nextDate = new Date(`${geometry.businessDate}T12:00:00+09:00`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const nextBusinessDate = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(nextDate);

  return {
    schemaVersion: "vip-floor.v2",
    generatedAt: new Date().toISOString(),
    boardRevision: 0,
    businessDay: {
      id: "",
      businessDate: geometry.businessDate,
      venueTimezone: "Asia/Tokyo",
      operatingStartAt,
      operatingEndAt: `${nextBusinessDate}T05:00:00+09:00`,
    },
    capabilities: {
      readCustomerPii: false,
      changeServiceStatus: false,
      changeAssignments: false,
      changeSchedule: false,
      manageBlocks: false,
      cancelReservation: false,
    },
    sections,
    tables,
    reservations: [],
    assignments: [],
    unassignedReservationIds: [],
    blocks: [],
    notes: [],
    totals: {
      tableCount: tables.length,
      reservationCount: 0,
      activeReservationCount: 0,
      assignmentCount: 0,
      unassignedReservationCount: 0,
      activeBlockCount: 0,
      noteCount: 0,
      guestCount: 0,
      serviceStatusCounts: {},
    },
    operations: {
      adminMutationEnabled: false,
      webhookProcessingEnabled: false,
      publicBookingEnabled: false,
    },
  };
}
