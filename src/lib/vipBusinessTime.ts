/** VIP labels use an explicit saved business date; stored instants never change.
 * Kept identical in Website and ghost_vipapp, which deploy independently. */
export type VipTimeLocale = "ja" | "en" | "pt" | "ko";

const JST_MS = 9 * 3_600_000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const LOCAL_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u;
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const WORDS = {
  ja: { business: "営業日", actual: "実際", zone: "日本時間", unset: "未設定" },
  en: { business: "Business day", actual: "Actual date/time", zone: "JST", unset: "Not set" },
  pt: { business: "Dia de funcionamento", actual: "Data/horário real", zone: "JST", unset: "Não definido" },
  ko: { business: "영업일", actual: "실제 날짜/시간", zone: "일본 시간", unset: "미설정" },
} as const;

export function readVipBusinessDate(value: unknown): string | null {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return null;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value ? value : null;
}

function tokyoParts(value: string | null) {
  if (!value) return null;
  const ms = Date.parse(LOCAL_TIMESTAMP.test(value) ? `${value}:00+09:00` : value);
  if (!Number.isFinite(ms)) return null;
  const local = new Date(ms + JST_MS).toISOString();
  return { ms, date: local.slice(0, 10), clock: local.slice(11, 16) };
}

export function vipBusinessDateLabel(businessDate: string, locale: VipTimeLocale = "ja") {
  const date = readVipBusinessDate(businessDate);
  if (!date) return WORDS[locale].unset;
  const value = new Date(`${date}T12:00:00+09:00`);
  if (locale === "ja") return `${date.replaceAll("-", "/")}(${WEEKDAYS[value.getUTCDay()]})`;
  return new Intl.DateTimeFormat({ en: "en-GB", pt: "pt-BR", ko: "ko-KR" }[locale], {
    timeZone: "Asia/Tokyo", year: "numeric", month: "short", day: "numeric", weekday: "short",
  }).format(value);
}

/** A label only: never pass extended hours to a timestamp parser or API. */
export function vipBusinessTimeLabel(value: string | null, businessDate: string | null) {
  const parts = tokyoParts(value);
  if (!parts) return "未設定";
  const date = readVipBusinessDate(businessDate);
  if (!date) return `${parts.date} ${parts.clock}`;
  const offset = Math.floor((parts.ms - Date.parse(`${date}T00:00:00+09:00`)) / 60_000);
  // GHOST's operating night is 22:00–29:00, including the closing endpoint.
  // Unexpected historical/out-of-window data retain their actual calendar date.
  if (offset < 22 * 60 || offset > 29 * 60) return `${parts.date} ${parts.clock}`;
  return `${String(Math.floor(offset / 60)).padStart(2, "0")}:${String(offset % 60).padStart(2, "0")}`;
}

export function vipScheduleLabels(
  businessDate: string | null | undefined,
  startAt: string | null,
  endAt: string | null,
  locale: VipTimeLocale = "ja",
) {
  const words = WORDS[locale];
  const start = tokyoParts(startAt);
  const end = tokyoParts(endAt);
  const date = readVipBusinessDate(businessDate);
  const dateLabel = date ? `${vipBusinessDateLabel(date, locale)}（${words.business}）` : start ? vipBusinessDateLabel(start.date, locale) : words.unset;
  if (!start) return { dateLabel, timeLabel: words.unset, actualLabel: null, text: words.unset };
  const validEnd = end && end.ms > start.ms ? end : null;
  const timeLabel = date
    ? `${vipBusinessTimeLabel(startAt, date)}${validEnd ? `〜${vipBusinessTimeLabel(endAt, date)}` : ""}`
    : `${start.clock}${validEnd ? `〜${validEnd.date !== start.date ? `${vipBusinessDateLabel(validEnd.date, locale)} ` : ""}${validEnd.clock}` : ""}`;
  const actualLabel = date && (start.date !== date || (validEnd && validEnd.date !== date))
    ? `${words.actual}：${vipBusinessDateLabel(start.date, locale)} ${start.clock}${validEnd ? `〜${validEnd.date !== start.date ? `${vipBusinessDateLabel(validEnd.date, locale)} ` : ""}${validEnd.clock}` : ""}（${words.zone}）`
    : null;
  return { dateLabel, timeLabel, actualLabel, text: `${dateLabel} ${timeLabel}${actualLabel ? `\n${actualLabel}` : ""}` };
}
