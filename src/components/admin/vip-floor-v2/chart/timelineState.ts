export const ARRIVAL_SOON_MINUTES = 15;
export const CLOSING_SOON_MINUTES = 15;

export const TIMELINE_PHASE_ORDER = [
  "scheduled",
  "arrival_soon",
  "active",
  "closing_soon",
  "overdue",
  "resolved",
] as const;

export type TimelinePhaseKey = (typeof TIMELINE_PHASE_ORDER)[number];

export const TIMELINE_PHASE_META: Record<TimelinePhaseKey, {
  shortLabel: string;
  glyph: string;
}> = {
  scheduled: { shortLabel: "予定", glyph: "○" },
  arrival_soon: { shortLabel: "来店前", glyph: "◉" },
  active: { shortLabel: "接客中", glyph: "▶" },
  closing_soon: { shortLabel: "残り15分", glyph: "◫" },
  overdue: { shortLabel: "超過", glyph: "!" },
  resolved: { shortLabel: "完了", glyph: "✓" },
};

export type TimelinePhase = {
  key: TimelinePhaseKey;
  label: string;
  description: string;
};

const MINUTE_MS = 60_000;
const TERMINAL_STATUSES = new Set(["paid", "completed", "no_show"]);
const NOT_SEATED_STATUSES = new Set(["expected", "late", "no_contact"]);

function minutesUntil(timestampMs: number, nowMs: number) {
  return Math.max(1, Math.ceil((timestampMs - nowMs) / MINUTE_MS));
}

function minutesSince(timestampMs: number, nowMs: number) {
  return Math.max(1, Math.floor((nowMs - timestampMs) / MINUTE_MS));
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

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return {
      key: "scheduled",
      label: "時刻確認",
      description: "予約時刻を確認してください",
    };
  }

  if (serviceStatus && TERMINAL_STATUSES.has(serviceStatus)) {
    return {
      key: "resolved",
      label: "完了",
      description: "この予約の接客記録は完了しています",
    };
  }

  if (nowMs < startMs) {
    const remaining = minutesUntil(startMs, nowMs);
    if (remaining <= ARRIVAL_SOON_MINUTES) {
      return {
        key: "arrival_soon",
        label: `来店まで${remaining}分`,
        description: `予約開始まで残り${remaining}分です`,
      };
    }
    return {
      key: "scheduled",
      label: "来店予定",
      description: `予約開始まで${remaining}分です`,
    };
  }

  if (nowMs >= endMs) {
    const overtime = minutesSince(endMs, nowMs);
    return {
      key: "overdue",
      label: `超過${overtime}分`,
      description: `予約終了時刻を${overtime}分超過しています`,
    };
  }

  const closingAtMs = endMs - CLOSING_SOON_MINUTES * MINUTE_MS;
  if (nowMs >= closingAtMs) {
    const remaining = minutesUntil(endMs, nowMs);
    return {
      key: "closing_soon",
      label: `残り${remaining}分`,
      description: `予約終了まで残り${remaining}分です`,
    };
  }

  if (!serviceStatus || NOT_SEATED_STATUSES.has(serviceStatus)) {
    const delay = minutesSince(startMs, nowMs);
    return {
      key: "overdue",
      label: `開始超過${delay}分`,
      description: `予約開始時刻を${delay}分過ぎています`,
    };
  }

  return {
    key: "active",
    label: "接客中",
    description: `予約終了まで${minutesUntil(endMs, nowMs)}分です`,
  };
}

export function getClosingWindowPercent(startAt: string, endAt: string) {
  const durationMinutes = (new Date(endAt).getTime() - new Date(startAt).getTime()) / MINUTE_MS;
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return 0;
  return Math.min(100, (CLOSING_SOON_MINUTES / durationMinutes) * 100);
}
