"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import dateStyles from "./BusinessDateField.module.css";

/*
 * The authored business-date control.
 *
 * It replaces `<input type="date">` on every screen where the operator picks a
 * *business date* — the night the board is showing. Four reasons, in order of
 * how certain each one is:
 *
 *  1. **The weekday is missing.** A club floor is planned in 金/土, and the
 *     native control shows a bare numeric date, so the operator translated it
 *     in their head every time they changed nights.
 *  2. **Two calendar glyphs.** Safari draws its own affordance inside the
 *     field, so the ribbon carried the app's glyph and the browser's side by
 *     side.
 *  3. **It is chrome.** The native popover cannot be told which nights the
 *     venue is open, cannot be styled, and does not honour the 44px touch
 *     floor this app holds everywhere else.
 *  4. **Its format follows the device, not the document.** The QA browser runs
 *     en-US and rendered `07/26/2026`; a Japanese-locale iPad would render
 *     `2026/07/26`. So this was never proof that the venue sees US order — but
 *     it is proof that the order is outside the app's control, on a
 *     single-purpose console where a re-imaged or English-set device would
 *     silently change what a date means. The authored control states the
 *     venue's order unconditionally.
 *
 * This is deliberately NOT used for personal dates such as 生年月日 and 記念日.
 * A month grid is the wrong instrument for a birthday: reaching 1985 costs
 * hundreds of taps, and on iPadOS the native control gives a locale-correct
 * wheel that is genuinely better for that job.
 *
 * `openDates` is optional and additive: when a caller already knows which
 * business dates accept reservations it marks them, and when it does not the
 * grid stays neutral rather than guessing. Selecting a date the server rejects
 * is still handled where it always was — by the server, surfaced as the calling
 * screen's existing inline error. This control never fetches.
 */

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

/* All arithmetic runs on the calendar string through UTC, never through a local
 * Date. The value is a business date, not an instant, and reading it as an
 * instant is what makes a date control drift by a day either side of midnight. */
function partsOf(value: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function toValue(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function weekdayIndex(value: string): number {
  const p = partsOf(value);
  if (!p) return 0;
  return new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
}

function shiftDays(value: string, delta: number): string {
  const p = partsOf(value);
  if (!p) return value;
  const next = new Date(Date.UTC(p.y, p.m - 1, p.d + delta));
  return toValue(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

function shiftMonths(value: string, delta: number): string {
  const p = partsOf(value);
  if (!p) return value;
  const target = new Date(Date.UTC(p.y, p.m - 1 + delta, 1));
  const y = target.getUTCFullYear();
  const m = target.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return toValue(y, m, Math.min(p.d, lastDay));
}

/* "Today" is the venue's today, not the device's. */
function jstToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function formatBusinessDate(value: string): string {
  const p = partsOf(value);
  if (!p) return value;
  return `${p.y}/${String(p.m).padStart(2, "0")}/${String(p.d).padStart(2, "0")}`;
}

export function formatBusinessDateWithWeekday(value: string): string {
  const p = partsOf(value);
  if (!p) return value;
  return `${formatBusinessDate(value)}(${WEEKDAY_LABELS[weekdayIndex(value)]})`;
}

type Props = {
  value: string;
  onChange: (next: string) => void;
  label: string;
  name?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  describedBy?: string;
  openDates?: readonly string[];
  variant?: "ribbon" | "field";
};

export function BusinessDateField({
  value,
  onChange,
  label,
  name,
  id,
  disabled = false,
  required = false,
  describedBy,
  openDates,
  variant = "field",
}: Props) {
  const reactId = useId();
  const triggerId = id ?? `business-date-${reactId}`;
  const popoverId = `${triggerId}-popover`;
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(value);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const activeCellRef = useRef<HTMLButtonElement>(null);

  const today = useMemo(() => jstToday(), []);
  const openSet = useMemo(
    () => (openDates && openDates.length > 0 ? new Set(openDates) : null),
    [openDates],
  );

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  /* A pointer press outside the popover dismisses it without committing. */
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  useEffect(() => {
    if (open) activeCellRef.current?.focus();
  }, [open, cursor]);

  const cursorParts = partsOf(cursor) ?? partsOf(today)!;
  const monthStart = toValue(cursorParts.y, cursorParts.m, 1);
  const daysInMonth = new Date(Date.UTC(cursorParts.y, cursorParts.m, 0)).getUTCDate();
  const leadingBlanks = weekdayIndex(monthStart);

  /* A `role="grid"` must contain rows, and the rows must contain the cells —
   * gridcells parented directly by the grid is an ARIA structure error, and it
   * costs a screen-reader user the row/column navigation that is the only
   * reason to use grid semantics for a month at all. */
  const weeks: Array<Array<number | null>> = [];
  {
    let week: Array<number | null> = Array.from({ length: leadingBlanks }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      week.push(day);
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      weeks.push(week);
    }
  }

  const commit = (next: string) => {
    onChange(next);
    setCursor(next);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7,
    };
    if (event.key in moves) {
      event.preventDefault();
      setCursor((current) => shiftDays(current, moves[event.key]));
      return;
    }
    if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      setCursor((current) => shiftMonths(current, event.key === "PageUp" ? -1 : 1));
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setCursor((current) => {
        const p = partsOf(current);
        if (!p) return current;
        const last = new Date(Date.UTC(p.y, p.m, 0)).getUTCDate();
        return toValue(p.y, p.m, event.key === "Home" ? 1 : last);
      });
      return;
    }
  };

  return (
    <div className={dateStyles.dateField} data-variant={variant} data-disabled={disabled || undefined}>
      {/* In the masthead the word "営業日" costs ~54px next to a calendar glyph
        * that already says it, and the ribbon has no room to spare on the venue
        * iPad. The label stays in the accessible name either way. */}
      <span
        className={variant === "ribbon" ? "sr-only" : dateStyles.dateFieldLabel}
        id={`${triggerId}-label`}
      >
        {label}
        {required ? <em className={dateStyles.dateFieldRequired}>必須</em> : null}
      </span>
      {/* The committed value still posts with the surrounding form. `required`
        * is not mirrored onto the hidden input because browsers ignore it
        * there; the control is never empty, since it is always seeded from
        * state, so the constraint it used to express cannot be violated. */}
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        type="button"
        id={triggerId}
        ref={triggerRef}
        className={dateStyles.dateFieldTrigger}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popoverId}
        aria-labelledby={`${triggerId}-label ${triggerId}-value`}
        aria-describedby={describedBy}
        onClick={() => {
          /* The cursor is re-seeded here rather than in an effect: opening is
           * the only moment it needs to follow the committed value, and doing
           * it in an effect makes React re-render the closed popover for no
           * reason. */
          setCursor(value);
          setOpen((current) => !current);
        }}
      >
        <CalendarDays size={16} aria-hidden />
        <span id={`${triggerId}-value`} className={`${dateStyles.dateFieldValue} tabular-nums`}>
          {formatBusinessDate(value)}
          <i aria-hidden>({WEEKDAY_LABELS[weekdayIndex(value)]})</i>
          <span className="sr-only">
            {`${partsOf(value)?.y}年${partsOf(value)?.m}月${partsOf(value)?.d}日 ${WEEKDAY_LABELS[weekdayIndex(value)]}曜日`}
          </span>
        </span>
      </button>

      {open ? (
        <div
          ref={popoverRef}
          id={popoverId}
          className={dateStyles.datePopover}
          role="dialog"
          aria-modal="false"
          aria-label={`${label}を選ぶ`}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            close(true);
          }}
        >
          <div className={dateStyles.datePopoverHead}>
            <button
              type="button"
              aria-label="前の月"
              onClick={() => setCursor((current) => shiftMonths(current, -1))}
            >
              <ChevronLeft size={18} aria-hidden />
            </button>
            <strong className="tabular-nums" aria-live="polite">
              {cursorParts.y}年{cursorParts.m}月
            </strong>
            <button
              type="button"
              aria-label="次の月"
              onClick={() => setCursor((current) => shiftMonths(current, 1))}
            >
              <ChevronRight size={18} aria-hidden />
            </button>
          </div>

          <div
            className={dateStyles.dateGrid}
            role="grid"
            aria-label={`${cursorParts.y}年${cursorParts.m}月`}
            onKeyDown={onGridKeyDown}
          >
            <div className={dateStyles.dateWeekdays} role="row">
              {WEEKDAY_LABELS.map((day, index) => (
                <span
                  key={day}
                  role="columnheader"
                  aria-label={`${day}曜日`}
                  data-weekend={index === 0 ? "sun" : index === 6 ? "sat" : undefined}
                >
                  {day}
                </span>
              ))}
            </div>
            {weeks.map((week, weekIndex) => (
              <div className={dateStyles.dateWeek} role="row" key={`week-${weekIndex}`}>
                {week.map((day, dayIndex) => {
                  if (day === null) {
                    return (
                      <span
                        key={`blank-${weekIndex}-${dayIndex}`}
                        role="gridcell"
                        aria-disabled="true"
                        className={dateStyles.dateBlank}
                      />
                    );
                  }
                  const cellValue = toValue(cursorParts.y, cursorParts.m, day);
                  const isSelected = cellValue === value;
                  const isCursor = cellValue === cursor;
                  const weekday = weekdayIndex(cellValue);
                  return (
                    <span role="gridcell" key={cellValue}>
                      <button
                        type="button"
                        ref={isCursor ? activeCellRef : undefined}
                        className={dateStyles.dateCell}
                        tabIndex={isCursor ? 0 : -1}
                        aria-pressed={isSelected}
                        aria-current={cellValue === today ? "date" : undefined}
                        data-selected={isSelected || undefined}
                        data-today={cellValue === today || undefined}
                        data-open={openSet ? openSet.has(cellValue) || undefined : undefined}
                        data-weekend={weekday === 0 ? "sun" : weekday === 6 ? "sat" : undefined}
                        /* The name is authored rather than composed from the
                         * visible figure, so a screen reader announces
                         * "7月27日 月曜日" instead of "27 7月27日 月曜日". */
                        aria-label={`${cursorParts.m}月${day}日 ${WEEKDAY_LABELS[weekday]}曜日`
                          + `${cellValue === today ? " 本日" : ""}`
                          + `${openSet?.has(cellValue) ? " 予約受付中" : ""}`}
                        onClick={() => commit(cellValue)}
                      >
                        <span className="tabular-nums" aria-hidden>{day}</span>
                      </button>
                    </span>
                  );
                })}
              </div>
            ))}
          </div>

          <div className={dateStyles.datePopoverFoot}>
            <button type="button" onClick={() => commit(today)}>本日</button>
            {openSet ? <span className={dateStyles.dateLegend}>● 予約受付日</span> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
