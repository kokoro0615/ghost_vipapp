const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const LOCAL_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u;
const TOKYO_OFFSET = "+09:00";
const FIFTEEN_MINUTES_MS = 15 * 60_000;

export const GHOST_OPERATING_HOURS_LABEL = "22:00–翌05:00";
export const GHOST_OPERATING_STEP_MINUTES = 15;

export type GhostTimeOption = {
  value: string;
  label: string;
};

export type GhostOperatingWindow = {
  businessDate: string;
  startAt: string;
  endAt: string;
  startLocal: string;
  endLocal: string;
};

function assertBusinessDate(businessDate: string) {
  if (!BUSINESS_DATE_PATTERN.test(businessDate)) {
    throw new RangeError("Invalid GHOST business date");
  }
}

function shiftBusinessDate(businessDate: string, days: number) {
  assertBusinessDate(businessDate);
  const value = new Date(`${businessDate}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function localTimestamp(value: string) {
  return LOCAL_DATE_TIME_PATTERN.test(value)
    ? `${value}:00${TOKYO_OFFSET}`
    : value;
}

function localInputValue(value: string | number) {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  }).format(new Date(value)).replace(" ", "T");
}

function isQuarterHourBoundary(timestamp: number) {
  return timestamp % FIFTEEN_MINUTES_MS === 0;
}

export function getGhostOperatingWindow(businessDate: string): GhostOperatingWindow {
  assertBusinessDate(businessDate);
  const nextDate = shiftBusinessDate(businessDate, 1);
  return {
    businessDate,
    startAt: `${businessDate}T22:00:00${TOKYO_OFFSET}`,
    endAt: `${nextDate}T05:00:00${TOKYO_OFFSET}`,
    startLocal: `${businessDate}T22:00`,
    endLocal: `${nextDate}T05:00`,
  };
}

export function getGhostTimeOptions(businessDate: string): GhostTimeOption[] {
  const window = getGhostOperatingWindow(businessDate);
  const startMs = Date.parse(window.startAt);
  const endMs = Date.parse(window.endAt);
  const options: GhostTimeOption[] = [];

  for (let value = startMs; value <= endMs; value += FIFTEEN_MINUTES_MS) {
    const localValue = localInputValue(value);
    const nextDay = localValue.slice(0, 10) !== businessDate;
    options.push({
      value: localValue,
      label: `${nextDay ? "翌 " : ""}${localValue.slice(11)}`,
    });
  }

  return options;
}

export function formatGhostTimeValue(value: string, businessDate: string) {
  if (!LOCAL_DATE_TIME_PATTERN.test(value)) return "未選択";
  return `${value.slice(0, 10) === businessDate ? "" : "翌 "}${value.slice(11)}`;
}

export function formatGhostTimeRange(startAt: string, endAt: string, businessDate: string) {
  return `${formatGhostTimeValue(startAt, businessDate)}–${formatGhostTimeValue(endAt, businessDate)}`;
}

export function isGhostOperatingTimestamp(value: string, includeClose = false) {
  const timestamp = Date.parse(localTimestamp(value));
  if (!Number.isFinite(timestamp) || !isQuarterHourBoundary(timestamp)) return false;
  const localValue = localInputValue(timestamp);
  const clock = localValue.slice(11);
  return clock >= "22:00" || clock < "05:00" || (includeClose && clock === "05:00");
}

export function isGhostOperatingInterval(
  startAt: string,
  endAt: string,
  businessDate?: string,
) {
  const startMs = Date.parse(localTimestamp(startAt));
  const endMs = Date.parse(localTimestamp(endAt));
  if (
    !Number.isFinite(startMs)
    || !Number.isFinite(endMs)
    || !isQuarterHourBoundary(startMs)
    || !isQuarterHourBoundary(endMs)
    || startMs >= endMs
  ) {
    return false;
  }

  if (businessDate) {
    const window = getGhostOperatingWindow(businessDate);
    return startMs >= Date.parse(window.startAt) && endMs <= Date.parse(window.endAt);
  }

  if (!isGhostOperatingTimestamp(startAt)) return false;
  const startLocal = localInputValue(startMs);
  const inferredBusinessDate = startLocal.slice(11) >= "22:00"
    ? startLocal.slice(0, 10)
    : shiftBusinessDate(startLocal.slice(0, 10), -1);
  const window = getGhostOperatingWindow(inferredBusinessDate);
  return startMs >= Date.parse(window.startAt) && endMs <= Date.parse(window.endAt);
}

export function resolveGhostEndTime(
  businessDate: string,
  startAt: string,
  currentEndAt: string,
  preferredMinutes = 120,
) {
  const window = getGhostOperatingWindow(businessDate);
  const startMs = Date.parse(localTimestamp(startAt));
  const currentEndMs = Date.parse(localTimestamp(currentEndAt));
  const closeMs = Date.parse(window.endAt);
  if (
    Number.isFinite(currentEndMs)
    && currentEndMs > startMs
    && currentEndMs <= closeMs
  ) {
    return currentEndAt;
  }
  return localInputValue(Math.min(startMs + preferredMinutes * 60_000, closeMs));
}

export function normalizeGhostBusinessDay<T extends {
  businessDate: string;
  operatingStartAt: string;
  operatingEndAt: string;
}>(businessDay: T): T {
  const window = getGhostOperatingWindow(businessDay.businessDate);
  return {
    ...businessDay,
    operatingStartAt: window.startAt,
    operatingEndAt: window.endAt,
  };
}
