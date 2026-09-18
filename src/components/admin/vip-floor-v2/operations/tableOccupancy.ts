import type { VipFloorBoardV2 } from "@/lib/vipFloorV2Contract";

export type TableOccupancy = {
  kind: "reservation" | "block";
  startAt: string;
  endAt: string;
  publicCode: string | null;
};

const TOKYO_CLOCK = new Intl.DateTimeFormat("ja-JP", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Tokyo",
});

/*
 * Mirrors the server's save-time check so a busy table is visible before the
 * save instead of as a 409 after it: an active assignment on the table whose
 * half-open window overlaps the draft, or an active all-operations block on the
 * table, its section, or the whole venue. The board already carries only
 * active assignments and blocks. The server stays authoritative.
 *
 * `startAt` / `endAt` are the wizard's naive Tokyo inputs (YYYY-MM-DDTHH:mm).
 */
export function tableOccupancy(
  board: Pick<VipFloorBoardV2, "assignments" | "blocks" | "reservations" | "tables">,
  startAt: string,
  endAt: string,
  editingReservationId: string | null,
) {
  const occupied = new Map<string, TableOccupancy>();
  const start = Date.parse(`${startAt}:00+09:00`);
  const end = Date.parse(`${endAt}:00+09:00`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) return occupied;
  const overlaps = (from: string, to: string) => Date.parse(from) < end && Date.parse(to) > start;

  for (const assignment of board.assignments) {
    if (
      assignment.reservationId === editingReservationId
      || occupied.has(assignment.tableId)
      || !overlaps(assignment.startAt, assignment.endAt)
    ) {
      continue;
    }
    occupied.set(assignment.tableId, {
      kind: "reservation",
      startAt: assignment.startAt,
      endAt: assignment.endAt,
      publicCode: board.reservations.find((item) => item.id === assignment.reservationId)?.publicCode ?? null,
    });
  }

  for (const block of board.blocks) {
    if (block.scope !== "all_operations" || !overlaps(block.startAt, block.endAt)) continue;
    for (const table of board.tables) {
      if (occupied.has(table.id)) continue;
      if (
        block.targets.venueWide
        || block.targets.tableIds.includes(table.id)
        || block.targets.sectionIds.includes(table.sectionId)
      ) {
        occupied.set(table.id, { kind: "block", startAt: block.startAt, endAt: block.endAt, publicCode: null });
      }
    }
  }
  return occupied;
}

export function occupancyLabel(occupancy: TableOccupancy) {
  const window = `${TOKYO_CLOCK.format(Date.parse(occupancy.startAt))}–${TOKYO_CLOCK.format(Date.parse(occupancy.endAt))}`;
  if (occupancy.kind === "block") return `受付ブロック ${window}`;
  return occupancy.publicCode ? `予約 ${occupancy.publicCode} ${window}` : `予約あり ${window}`;
}
