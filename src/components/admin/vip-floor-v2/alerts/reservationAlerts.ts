import type { VipFloorBoardV2 } from "@/lib/vipFloorV2Contract";

const MINUTE = 60_000;
const ARRIVING = new Set(["expected", "late", "no_contact"]);
const OCCUPIED = new Set(["arrived", "partial_arrival", "seated", "bottle_pending", "bottle_served"]);

export type ReservationAlert = {
  key: string;
  reservationId: string;
  kind: "arrival" | "extension";
  dueAt: string;
  targetAt: string;
  businessDate: string;
};

export function alertBusinessDate(nowMs: number) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(nowMs - 5 * 60 * MINUTE));
}

/** Keys contain only opaque identity and timing, never guest information. */
export function reservationAlerts(board: VipFloorBoardV2, nowMs: number): ReservationAlert[] {
  const businessDate = alertBusinessDate(nowMs);
  if (board.businessDay.businessDate !== businessDate) return [];
  return board.reservations.flatMap((reservation): ReservationAlert[] => {
    if (reservation.lifecycleStatus !== "confirmed" || reservation.completedAt) return [];
    const status = reservation.serviceStatus ?? "expected";
    const kind = ARRIVING.has(status) ? "arrival" : OCCUPIED.has(status) ? "extension" : null;
    if (!kind || (kind === "arrival" && reservation.sourceChannel === "walk_in")) return [];
    const targetAt = kind === "arrival"
      ? reservation.scheduledStartAt
      : reservation.expectedReleaseAt || reservation.scheduledEndAt;
    const targetMs = Date.parse(targetAt);
    const dueMs = targetMs - 15 * MINUTE;
    if (!Number.isFinite(targetMs) || nowMs < dueMs) return [];
    // Opening/reconnecting after the threshold still delivers the outstanding
    // check. It stays due until acknowledged or the floor records its outcome.
    return [{
      key: `${businessDate}:${reservation.id}:${kind}:${targetMs}`,
      reservationId: reservation.id, kind, targetAt,
      dueAt: new Date(dueMs).toISOString(), businessDate,
    }];
  }).sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.key.localeCompare(b.key));
}
