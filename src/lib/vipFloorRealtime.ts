import type { VipFloorBoardV2 } from "./vipFloorV2Contract";

const CACHE_PREFIX = "ghost.vip-manager.safe-board.v1";
const CACHE_TTL_MS = 15 * 60 * 1000;

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
  const safeBoard: VipFloorBoardV2 = {
    ...board,
    reservations: board.reservations.map((reservation) => ({
      ...reservation,
      customer: null,
      payment: null,
      notes: [],
    })),
    notes: [],
    operations: {
      ...board.operations,
      adminMutationEnabled: false,
    },
  };

  try {
    window.localStorage.setItem(
      cacheKey(board.businessDay.businessDate),
      JSON.stringify({
        expiresAt: Date.now() + CACHE_TTL_MS,
        board: safeBoard,
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
      board?: unknown;
    };

    if (
      typeof parsed.expiresAt !== "number"
      || parsed.expiresAt < Date.now()
      || !isSafeCachedBoard(parsed.board, businessDate)
    ) {
      window.localStorage.removeItem(cacheKey(businessDate));
      return null;
    }

    return parsed.board;
  } catch {
    return null;
  }
}

function cacheKey(businessDate: string) {
  return `${CACHE_PREFIX}:${businessDate}`;
}

function isSafeCachedBoard(
  value: unknown,
  businessDate: string,
): value is VipFloorBoardV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const board = value as Partial<VipFloorBoardV2>;

  return board.schemaVersion === "vip-floor.v2"
    && board.businessDay?.businessDate === businessDate
    && board.operations?.adminMutationEnabled === false
    && Array.isArray(board.reservations)
    && board.reservations.every((reservation) =>
      reservation.customer === null
      && reservation.payment === null
      && Array.isArray(reservation.notes)
      && reservation.notes.length === 0)
    && Array.isArray(board.notes)
    && board.notes.length === 0;
}
