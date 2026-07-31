"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
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
  useEffect(() => {
    const timer = window.setInterval(() => setRenderedAt(Date.now()), 30_000);
    const syncMotion = () => setMotionPaused(document.hidden);
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
  const tickCount = Math.floor(totalMinutes / 30) + 1;
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
  const conflicts = reservations.filter((item, index) => reservations.some((other, otherIndex) =>
    otherIndex !== index
    && item.tableIds.some((tableId) => other.tableIds.includes(tableId))
    && new Date(item.startAt).getTime() < new Date(other.endAt).getTime()
    && new Date(other.startAt).getTime() < new Date(item.endAt).getTime(),
  ));
  const phaseByReservation = useMemo(() => new Map(reservations.map((reservation) => [
    reservation.id,
    getTimelinePhase({
      nowMs: renderedAt,
      startAt: reservation.startAt,
      endAt: reservation.endAt,
      serviceStatus: reservation.serviceStatus,
    }),
  ])), [renderedAt, reservations]);
  const phaseCounts = TIMELINE_PHASE_ORDER.reduce<Record<string, number>>((counts, phase) => {
    counts[phase] = reservations.filter((reservation) =>
      phaseByReservation.get(reservation.id)?.key === phase).length;
    return counts;
  }, {});

  return (
    <section
      className={styles.timelineView}
      aria-labelledby="chart-view-title"
      data-motion={motionPaused ? "paused" : "running"}
    >
      <div className={styles.viewStrip}>
        <h2 id="chart-view-title">席の時間軸</h2>
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
        {TIMELINE_PHASE_ORDER.map((phase) => (
          <span key={phase} data-phase={phase}>
            <i aria-hidden>{TIMELINE_PHASE_META[phase].glyph}</i>
            {TIMELINE_PHASE_META[phase].shortLabel}
            <b className="tabular-nums">{phaseCounts[phase]}</b>
          </span>
        ))}
      </div>

      <div className={styles.timelineScroller} tabIndex={0} aria-label="VIP席の時間軸。左右にスクロールできます。" data-zoom={zoom}>
        <div className={styles.timelineGrid}>
          <div className={styles.timelineCorner}><Clock3 size={14} aria-hidden /> 席 / 時刻</div>
          <div className={styles.timelineTicks} style={{ gridTemplateColumns: `repeat(${tickCount}, 1fr)` }}>
            {ticks.map((tick) => <span key={tick}>{tick}</span>)}
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
                    const meta = getStatusMeta(reservation.serviceStatus);
                    const phase = phaseByReservation.get(reservation.id)
                      ?? getTimelinePhase({
                        nowMs: renderedAt,
                        startAt: reservation.startAt,
                        endAt: reservation.endAt,
                        serviceStatus: reservation.serviceStatus,
                      });
                    return (
                      <button
                        key={reservation.id}
                        type="button"
                        className={styles.timelineBar}
                        style={positionStyle(reservation.startAt, reservation.endAt, operatingWindow.startAt, operatingWindow.endAt)}
                        data-tone={meta.tone}
                        data-cue={meta.cue}
                        data-phase={phase.key}
                        data-selected={reservation.id === selectedReservationId || undefined}
                        onClick={() => onSelect(reservation.id)}
                        aria-label={`${reservation.publicCode}、${reservation.guestLabel}、${reservation.startLabel}から${reservation.endLabel}、${meta.label}。${phase.description}`}
                      >
                        <i className={styles.timelineClosingWindow} aria-hidden />
                        <i className={styles.timelineBarSignal} aria-hidden />
                        <span className={styles.timelineBarTime}>{reservation.startLabel}</span>
                        <strong className={styles.timelineBarPhase}>{phase.label}</strong>
                        <small>{meta.shortLabel} · {reservation.publicCode}</small>
                      </button>
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
        </div>
      </div>

      <section className={styles.chartExceptions} aria-label="時間軸の要対応">
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
