export const ARRIVAL_SOON_MINUTES = 15;
export const CLOSING_SOON_MINUTES = 15;

export const TIMELINE_PHASE_ORDER = [
  "scheduled",
  "arrival_soon",
  "arrival_overdue",
  "active",
  "closing_soon",
  "overdue",
  "resolved",
] as const;

export type TimelinePhaseKey = (typeof TIMELINE_PHASE_ORDER)[number];

/*
 * Signal tiers, not just colours. A floor operator reads this chart from across
 * the room and out of the corner of an eye, where hue is the first thing to go
 * and rhythm is the last. IEC 60601-1-8 — the clinical alarm standard — encodes
 * priority the same way: the faster and harder the burst repeats, the sooner
 * someone has to move. We borrow the ladder, not the frequencies. The fastest
 * light here repeats at ~1.1Hz, comfortably under the three-flashes-per-second
 * threshold of WCAG 2.3.1, and every tier keeps an authored still state (§7).
 *
 *   low    → the guest is due               → one slow swell
 *   medium → the table is due back          → a double pulse
 *   high   → the clock has already run out  → a beacon: hard strike, long decay
 */
export const TIMELINE_SIGNAL_ORDER = ["none", "low", "medium", "high"] as const;

export type TimelineSignal = (typeof TIMELINE_SIGNAL_ORDER)[number];

/* A lane can hold several bookings across the night, and the lane's own alarm
 * has to be the worst one on it — an unanswered arrival outranks a release the
 * floor has already acknowledged. */
export function signalRank(signal: TimelineSignal) {
  return TIMELINE_SIGNAL_ORDER.indexOf(signal);
}

/*
 * Which end of the booking is running out. This is the whole reason the alarm
 * is legible at a glance: an arrival exception is a problem at the band's
 * *head* — the start time the party has not answered — and a release exception
 * is a problem at its *tail*. The light is drawn on the track at exactly that
 * instant, so the operator's eye lands on the minute, not on a rectangle.
 */
export type TimelineEdge = "head" | "tail";

/*
 * One table, so the legend and the bands can never drift into describing
 * different rhythms. The legend swatch is drawn in the band's own language —
 * the phase frame with its light on the correct edge — so the key teaches the
 * code instead of merely naming it. The meaning never lives in the movement
 * alone: every band also spells its phase out in words.
 */
export const TIMELINE_PHASE_META: Record<TimelinePhaseKey, {
  shortLabel: string;
  signal: TimelineSignal;
  edge: TimelineEdge | null;
}> = {
  scheduled: { shortLabel: "予定", signal: "none", edge: null },
  arrival_soon: { shortLabel: "来店前", signal: "low", edge: "head" },
  arrival_overdue: { shortLabel: "未着", signal: "high", edge: "head" },
  active: { shortLabel: "接客中", signal: "none", edge: null },
  closing_soon: { shortLabel: "延長確認", signal: "medium", edge: "tail" },
  overdue: { shortLabel: "解放超過", signal: "high", edge: "tail" },
  resolved: { shortLabel: "完了", signal: "none", edge: null },
};

export type TimelinePhase = {
  key: TimelinePhaseKey;
  label: string;
  description: string;
  signal: TimelineSignal;
  /*
   * A band that keeps blinking after the floor has already dealt with it
   * teaches operators to ignore blinking. `acknowledged` is what turns the
   * alarm off while leaving the state on screen: the frame keeps its phase
   * colour and the label keeps counting, only the motion stops.
   */
  acknowledged: boolean;
};

const MINUTE_MS = 60_000;
/*
 * Terminal for the *table*, not for the bill. The backend releases a seat
 * assignment on `completed` and `no_show` only — a paid party is still sitting
 * there, and `paid` can still advance to `resetting`. Muting a paid band to
 * "完了" would hide an occupied table from the one view whose whole job is
 * turnover. `paid` is settlement, and settlement is acknowledgement (below).
 */
const TERMINAL_STATUSES = new Set(["completed", "no_show"]);
const NOT_SEATED_STATUSES = new Set(["expected", "late", "no_contact"]);
/* Someone from the party is in the room, so "due to arrive" has been answered. */
const ARRIVED_STATUSES = new Set([
  "arrived",
  "partial_arrival",
  "seated",
  "bottle_pending",
  "bottle_served",
  "bill_requested",
  "paid",
  "resetting",
  "completed",
]);
/* The floor has recorded why the table is sitting past its start time. */
const DELAY_RECORDED_STATUSES = new Set(["late", "no_contact"]);
/* Settlement is underway, so "this table is due back" has been answered. */
const SETTLING_STATUSES = new Set(["bill_requested", "paid", "resetting", "completed"]);

function minutesUntil(timestampMs: number, nowMs: number) {
  return Math.max(1, Math.ceil((timestampMs - nowMs) / MINUTE_MS));
}

function minutesSince(timestampMs: number, nowMs: number) {
  return Math.max(0, Math.ceil((nowMs - timestampMs) / MINUTE_MS));
}

function phase(
  key: TimelinePhaseKey,
  label: string,
  description: string,
  acknowledged = false,
): TimelinePhase {
  return {
    key,
    label,
    description: acknowledged
      ? `${description}。対応済みのため点滅は停止しています`
      : description,
    signal: TIMELINE_PHASE_META[key].signal,
    acknowledged,
  };
}

export function getTimelinePhase({
  nowMs,
  startAt,
  endAt,
  serviceStatus,
}: {
  nowMs: number;
  startAt: string;
  endAt: string;
  serviceStatus: string | null | undefined;
}): TimelinePhase {
  const startMs = new Date(startAt).getTime();
  const endMs = new Date(endAt).getTime();
  const status = serviceStatus ?? "";

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return phase("scheduled", "時刻確認", "予約時刻を確認してください");
  }

  if (status && TERMINAL_STATUSES.has(status)) {
    return phase("resolved", "完了", "この予約の接客記録は完了しています");
  }

  if (nowMs < startMs) {
    const remaining = minutesUntil(startMs, nowMs);
    if (remaining <= ARRIVAL_SOON_MINUTES) {
      return phase(
        "arrival_soon",
        `来店まで${remaining}分`,
        `予約開始まで残り${remaining}分です`,
        ARRIVED_STATUSES.has(status),
      );
    }
    return phase("scheduled", "来店予定", `予約開始まで${remaining}分です`);
  }

  /* Arrival truth outranks the booked end. An expected/late/no-contact party
   * that never came does not become a table-release problem when the original
   * two-hour window ends; it remains an arrival exception until the floor
   * records no-show or another terminal outcome. */
  if (!status || NOT_SEATED_STATUSES.has(status)) {
    const delay = minutesSince(startMs, nowMs);
    return phase(
      "arrival_overdue",
      delay === 0 ? "到着確認" : `未着${delay}分`,
      delay === 0
        ? "予約開始時刻です。到着を確認してください"
        : `予約開始時刻を${delay}分過ぎています。到着を確認してください`,
      DELAY_RECORDED_STATUSES.has(status),
    );
  }

  if (nowMs >= endMs) {
    const overtime = minutesSince(endMs, nowMs);
    return phase(
      "overdue",
      overtime === 0 ? "終了時刻" : `解放超過${overtime}分`,
      overtime === 0
        ? "利用終了時刻です。延長または退店を確認してください"
        : `利用終了時刻を${overtime}分超過しています。延長または退店を確認してください`,
      SETTLING_STATUSES.has(status),
    );
  }

  const closingAtMs = endMs - CLOSING_SOON_MINUTES * MINUTE_MS;
  if (nowMs >= closingAtMs) {
    const remaining = minutesUntil(endMs, nowMs);
    return phase(
      "closing_soon",
      `延長確認 ${remaining}分`,
      `利用終了まで残り${remaining}分です。延長の要否を確認してください`,
      SETTLING_STATUSES.has(status),
    );
  }

  return phase("active", "接客中", `予約終了まで${minutesUntil(endMs, nowMs)}分です`);
}

export function getClosingWindowPercent(startAt: string, endAt: string) {
  const durationMinutes = (new Date(endAt).getTime() - new Date(startAt).getTime()) / MINUTE_MS;
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return 0;
  return Math.min(100, (CLOSING_SOON_MINUTES / durationMinutes) * 100);
}
