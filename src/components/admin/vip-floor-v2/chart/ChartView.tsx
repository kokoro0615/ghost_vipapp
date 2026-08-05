"use client";

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { Clock3, Minus, Plus } from "lucide-react";

import { getGhostOperatingWindow } from "@/lib/ghostOperatingHours";
import type { VipFloorBoardV2 } from "@/lib/vipFloorV2Contract";

import { getStatusMeta } from "../contract/statusModel";
import type { UiReservation } from "../contract/uiTypes";
import styles from "../VipFloorWorkspace.module.css";
import {
  getClosingWindowPercent,
  getTimelinePhase,
  TIMELINE_PHASE_META,
  TIMELINE_PHASE_ORDER,
} from "./timelineState";

type ChartProps = {
  board: VipFloorBoardV2;
  reservations: UiReservation[];
  selectedReservationId: string | null;
  zoom: 15 | 30 | 60;
  onZoom: (zoom: 15 | 30 | 60) => void;
  onSelect: (id: string) => void;
};

function positionStyle(startAt: string, endAt: string, operatingStartAt: string, operatingEndAt: string) {
  const operatingStartMs = new Date(operatingStartAt).getTime();
  const operatingEndMs = new Date(operatingEndAt).getTime();
  const totalMinutes = Math.max(60, (operatingEndMs - operatingStartMs) / 60_000);
  const clippedStartMs = Math.min(
    operatingEndMs,
    Math.max(operatingStartMs, new Date(startAt).getTime()),
  );
  const clippedEndMs = Math.min(
    operatingEndMs,
    Math.max(operatingStartMs, new Date(endAt).getTime()),
  );
  const offset = (clippedStartMs - operatingStartMs) / 60_000;
  const duration = Math.max(0, (clippedEndMs - clippedStartMs) / 60_000);
  return {
    "--bar-start": `${(offset / totalMinutes) * 100}%`,
    "--bar-width": `${(duration / totalMinutes) * 100}%`,
    "--closing-window": `${getClosingWindowPercent(startAt, endAt)}%`,
  } as CSSProperties;
}

export default function ChartView({ board, reservations, selectedReservationId, zoom, onZoom, onSelect }: ChartProps) {
  const [renderedAt, setRenderedAt] = useState(() => Date.now());
  const [motionPaused, setMotionPaused] = useState(false);
  const [phaseAnnouncement, setPhaseAnnouncement] = useState("");
  const previousPhaseByReservation = useRef<Map<string, string> | null>(null);
  useEffect(() => {
    /* The 15-minute thresholds are the whole point of the band, so the clock
     * has to be finer than the window it guards. At 10s a band can be at most
     * ten seconds late turning its alarm on — the tick is local arithmetic and
     * issues no request, so the only cost is re-rendering eight rows. */
    let timer = 0;
    const syncMotion = () => {
      const hidden = document.hidden;
      setMotionPaused(hidden);
      window.clearInterval(timer);
      /* A backgrounded iPad runs all night. Stop the clock with the animations
       * and resynchronise the moment the board comes back on screen. */
      if (hidden) return;
      setRenderedAt(Date.now());
      timer = window.setInterval(() => setRenderedAt(Date.now()), 10_000);
    };
    syncMotion();
    document.addEventListener("visibilitychange", syncMotion);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", syncMotion);
    };
  }, []);
  const operatingWindow = getGhostOperatingWindow(board.businessDay.businessDate);
  const operatingStart = new Date(operatingWindow.startAt);
  const operatingEnd = new Date(operatingWindow.endAt);
  const totalMinutes = Math.max(60, (operatingEnd.getTime() - operatingStart.getTime()) / 60_000);
  /*
   * The ruler is built from half-hour *intervals*, not from labelled points.
   * Laying N labels out as N equal columns offsets every one of them by half a
   * column — measured on this window, up to 14 minutes at either end, zero
   * mid-chart — on a chart whose whole job is minutes. Intervals of exactly
   * 1/tickCount also give the track a grid that lands on the labels instead of
   * near them; the 6.25% gradient this replaced drew a line every 26.3 minutes,
   * which corresponded to nothing.
   */
  const tickCount = Math.max(1, Math.round(totalMinutes / 30));
  const timeFormatter = new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  });
  const ticks = Array.from({ length: tickCount }, (_, index) =>
    timeFormatter.format(new Date(operatingStart.getTime() + index * 30 * 60_000)));
  const showNowLine = renderedAt >= operatingStart.getTime()
    && renderedAt <= operatingEnd.getTime();
  const nowStyle = showNowLine
    ? positionStyle(
        new Date(renderedAt).toISOString(),
        new Date(renderedAt + 60_000).toISOString(),
        operatingWindow.startAt,
        operatingWindow.endAt,
      )
    : null;
  const unassigned = reservations.filter((item) => item.tableIds.length === 0);
  const delayed = reservations.filter((item) => item.serviceStatus === "late");
  /*
   * The board carries two ends, and only one of them is the floor's. A seat
   * extension moves `expectedReleaseAt` and deliberately leaves the booked
   * `scheduledEndAt` where it is, so a band drawn from the view model's `endAt`
   * counts down to a release time that no longer exists — and would raise its
   * last-fifteen-minutes alarm while the table is still legitimately occupied.
   * The raw board row is also the only place the service status is still
   * honestly nullable; the view model coerces null to `expected`.
   */
  const bandByReservation = useMemo(() => {
    const rawById = new Map(board.reservations.map((item) => [item.id, item]));
    return new Map(reservations.map((reservation) => {
      const raw = rawById.get(reservation.id);
      const endAt = raw?.expectedReleaseAt ?? reservation.endAt;
      const serviceStatus = raw ? raw.serviceStatus : reservation.serviceStatus;
      return [reservation.id, {
        endAt,
        serviceStatus,
        phase: getTimelinePhase({
          nowMs: renderedAt,
          startAt: reservation.startAt,
          endAt,
          serviceStatus,
        }),
      }] as const;
    }));
  }, [board.reservations, renderedAt, reservations]);
  const bandEnd = (reservation: UiReservation) =>
    bandByReservation.get(reservation.id)?.endAt ?? reservation.endAt;
  useEffect(() => {
    const current = new Map(
      reservations.map((reservation) => [
        reservation.id,
        bandByReservation.get(reservation.id)?.phase.key ?? "scheduled",
      ]),
    );
    const previous = previousPhaseByReservation.current;
    if (previous) {
      const changes = reservations.flatMap((reservation) => {
        const band = bandByReservation.get(reservation.id);
        if (!band || previous.get(reservation.id) === band.phase.key) return [];
        return [`${reservation.publicCode}、${band.phase.label}`];
      });
      if (changes.length > 0) {
        const visibleChanges = changes.slice(0, 2).join("。 ");
        const remainder = changes.length > 2 ? `。ほか${changes.length - 2}件` : "";
        setPhaseAnnouncement(`時間帯が変化しました。${visibleChanges}${remainder}`);
      }
    }
    previousPhaseByReservation.current = current;
  }, [bandByReservation, reservations]);
  const conflicts = reservations.filter((item, index) => reservations.some((other, otherIndex) =>
    otherIndex !== index
    && item.tableIds.some((tableId) => other.tableIds.includes(tableId))
    && new Date(item.startAt).getTime() < new Date(bandEnd(other)).getTime()
    && new Date(other.startAt).getTime() < new Date(bandEnd(item)).getTime(),
  ));
  const phaseCounts = TIMELINE_PHASE_ORDER.reduce<Record<string, number>>((counts, phase) => {
    counts[phase] = reservations.filter((reservation) =>
      bandByReservation.get(reservation.id)?.phase.key === phase).length;
    return counts;
  }, {});

  return (
    <section
      className={styles.timelineView}
      aria-labelledby="chart-view-title"
      data-motion={motionPaused ? "paused" : "running"}
    >
      <p className="sr-only" role="status" aria-atomic="true">{phaseAnnouncement}</p>
      <div className={styles.viewStrip}>
        <h1 id="chart-view-title">席の時間軸</h1>
        <span className="tabular-nums">{board.tables.length}席 / {reservations.length}件</span>
        {conflicts.length > 0 ? <span className={styles.exceptionText}>競合 {conflicts.length}</span> : null}
        <span className={styles.stripSpacer} />
        <div className={styles.zoomControl} role="group" aria-label="時間軸ズーム">
          <button type="button" onClick={() => onZoom(zoom === 60 ? 30 : 15)} aria-label="時間軸を拡大"><Plus size={16} /></button>
          <span className="tabular-nums">{zoom}m</span>
          <button type="button" onClick={() => onZoom(zoom === 15 ? 30 : 60)} aria-label="時間軸を縮小"><Minus size={16} /></button>
        </div>
      </div>

      <div className={styles.timelineLegend} aria-label="予約帯ステータス">
        <strong>運行帯</strong>
        {/* The swatch is a miniature of the real band — the phase frame with
            its light on the same edge the chart puts it on — so the key teaches
            where to look instead of naming a colour. */}
        {TIMELINE_PHASE_ORDER.map((phase) => (
          <span
            key={phase}
            data-phase={phase}
            data-signal={TIMELINE_PHASE_META[phase].signal}
            data-edge={TIMELINE_PHASE_META[phase].edge ?? undefined}
          >
            <i aria-hidden />
            {TIMELINE_PHASE_META[phase].shortLabel}
            <b className="tabular-nums">{phaseCounts[phase]}</b>
          </span>
        ))}
      </div>

      <div className={styles.timelineScroller} tabIndex={0} aria-label="VIP席の時間軸。左右にスクロールできます。" data-zoom={zoom}>
        <div
          className={styles.timelineGrid}
          style={{
            "--tick-count": tickCount,
            /* Everything left of this cannot be acted on any more. */
            "--elapsed": showNowLine ? nowStyle?.["--bar-start" as keyof CSSProperties] ?? "0%" : "0%",
          } as CSSProperties}
        >
          <div className={styles.timelineCorner}><Clock3 size={14} aria-hidden /> 席 / 時刻</div>
          <div className={styles.timelineTicks} style={{ gridTemplateColumns: `repeat(${tickCount}, 1fr)` }}>
            {ticks.map((tick, index) => (
              <span key={tick} data-hour={index % 2 === 0 || undefined}>{tick}</span>
            ))}
            {showNowLine && nowStyle ? (
              <span className={styles.nowMarker} style={nowStyle}>
                {timeFormatter.format(renderedAt)}
              </span>
            ) : null}
          </div>
          {board.tables.map((table) => {
            const items = reservations.filter((reservation) => reservation.tableIds.includes(table.id));
            return (
              <div className={styles.timelineRow} key={table.id}>
                <div className={styles.timelineTableLabel}>
                  <strong>{table.displayCode}</strong>
                  <span>{table.capacityMax}名</span>
                  {table.operationalLocked ? <small>ロック</small> : null}
                </div>
                <div className={styles.timelineTrack}>
                  {items.map((reservation) => {
                    const band = bandByReservation.get(reservation.id);
                    const endAt = band?.endAt ?? reservation.endAt;
                    const serviceStatus = band ? band.serviceStatus : reservation.serviceStatus;
                    const meta = getStatusMeta(serviceStatus);
                    const phase = band?.phase
                      ?? getTimelinePhase({
                        nowMs: renderedAt,
                        startAt: reservation.startAt,
                        endAt,
                        serviceStatus,
                      });
                    return (
                      <button
                        key={reservation.id}
                        type="button"
                        className={styles.timelineBar}
                        style={positionStyle(reservation.startAt, endAt, operatingWindow.startAt, operatingWindow.endAt)}
                        data-tone={meta.tone}
                        data-cue={meta.cue}
                        data-service-status={serviceStatus ?? "not_set"}
                        data-phase={phase.key}
                        data-signal={phase.signal}
                        data-acknowledged={phase.acknowledged || undefined}
                        data-selected={reservation.id === selectedReservationId || undefined}
                        onClick={() => onSelect(reservation.id)}
                        aria-label={`${reservation.publicCode}、${reservation.guestLabel}、${reservation.guestCount}名、${reservation.startLabel}から${timeFormatter.format(new Date(endAt))}、${meta.label}。${phase.description}`}
                      >
                        <i className={styles.timelineClosingWindow} aria-hidden />
                        <span className={styles.timelineBarTime}>{reservation.startLabel}</span>
                        <strong className={styles.timelineBarPhase}>{phase.label}</strong>
                        <span className={`${styles.timelineBarGuests} tabular-nums`}>{reservation.guestCount}名</span>
                        {/* 来店予定/予定 and 完了/完了 are the same fact twice. The status
                            word earns its slot only when it says something the
                            countdown does not — ボトル待ち, 会計依頼, 一部到着. */}
                        {phase.label.includes(meta.shortLabel) ? null : (
                          <span className={styles.timelineBarStatus}>{meta.shortLabel}</span>
                        )}
                        <small>{reservation.publicCode}</small>
                      </button>
                    );
                  })}
                  {/* The alarm, drawn on the track rather than around the band.
                      A rectangle that flashes says only "something here"; a
                      light standing on the minute that is running out says
                      which minute, and stays out of the band's text entirely so
                      the label's contrast can never depend on the phase of an
                      animation (§7.1). Head for arrivals, tail for releases. */}
                  {items.map((reservation) => {
                    const band = bandByReservation.get(reservation.id);
                    const edge = band ? TIMELINE_PHASE_META[band.phase.key].edge : null;
                    if (!band || !edge) return null;
                    return (
                      <span
                        key={`deadline-${reservation.id}`}
                        className={styles.timelineDeadline}
                        style={positionStyle(
                          reservation.startAt,
                          band.endAt,
                          operatingWindow.startAt,
                          operatingWindow.endAt,
                        )}
                        data-phase={band.phase.key}
                        data-signal={band.phase.signal}
                        data-edge={edge}
                        data-acknowledged={band.phase.acknowledged || undefined}
                        aria-hidden="true"
                      />
                    );
                  })}
                  {board.blocks.filter((block) => block.targets.tableIds.includes(table.id)).map((block) => (
                    <span
                      key={block.id}
                      className={styles.timelineBlock}
                      style={positionStyle(block.startAt, block.endAt, operatingWindow.startAt, operatingWindow.endAt)}
                    >
                      ブロック
                    </span>
                  ))}
                  {nowStyle ? (
                    <span
                      className={styles.nowLine}
                      style={nowStyle}
                      data-label={`現在 ${timeFormatter.format(renderedAt)}`}
                      aria-hidden="true"
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
          {board.tables.length === 0 ? (
            <div className={`${styles.timelineRow} ${styles.timelineEmptyRow}`}>
              <div className={styles.timelineTableLabel}>
                <strong>予約受付</strong>
                <span>対象外</span>
              </div>
              <div className={styles.timelineTrack}>
                <p className={styles.timelineEmptyMessage} role="status">
                  定休日または営業日未登録です。予約受付日へ切り替えてください。
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <section
        className={styles.chartExceptions}
        aria-label="時間軸の要対応"
        data-idle={unassigned.length + conflicts.length + delayed.length === 0 || undefined}
      >
        {([
          ["未割当", unassigned, "席を割当"],
          ["処理競合", conflicts, "競合"],
          ["到着遅延", delayed, "遅延"],
        ] as const).map(([label, items, cue]) => (
          <div key={label}>
            <header><strong>{label}</strong><span className="tabular-nums">{items.length}</span></header>
            <div role="group" aria-label={`${label} ${items.length}件`} tabIndex={0}>
              {items.map((item) => (
                <button type="button" key={item.id} onClick={() => onSelect(item.id)}>
                  {item.startLabel} {item.publicCode}<small>{cue}</small>
                </button>
              ))}
              {items.length === 0 ? <p>対象なし</p> : null}
            </div>
          </div>
        ))}
      </section>
    </section>
  );
}
