"use client";

import type { CSSProperties } from "react";
import { Clock3, Minus, Plus, TriangleAlert } from "lucide-react";

import type { VipFloorBoardV2 } from "@/lib/vipFloorV2Contract";

import { getStatusMeta } from "../contract/statusModel";
import type { UiReservation } from "../contract/uiTypes";
import styles from "../VipFloorWorkspace.module.css";

type ChartProps = {
  board: VipFloorBoardV2;
  reservations: UiReservation[];
  selectedReservationId: string | null;
  zoom: 15 | 30 | 60;
  onZoom: (zoom: 15 | 30 | 60) => void;
  onSelect: (id: string) => void;
};

function positionStyle(startAt: string, endAt: string, operatingStartAt: string, operatingEndAt: string) {
  const startMs = new Date(operatingStartAt).getTime();
  const totalMinutes = Math.max(60, (new Date(operatingEndAt).getTime() - startMs) / 60_000);
  const offset = Math.max(0, (new Date(startAt).getTime() - startMs) / 60_000);
  const duration = Math.max(15, (new Date(endAt).getTime() - new Date(startAt).getTime()) / 60_000);
  return {
    "--bar-start": `${(offset / totalMinutes) * 100}%`,
    "--bar-width": `${Math.min(100 - (offset / totalMinutes) * 100, (duration / totalMinutes) * 100)}%`,
  } as CSSProperties;
}

export default function ChartView({ board, reservations, selectedReservationId, zoom, onZoom, onSelect }: ChartProps) {
  const operatingStart = new Date(board.businessDay.operatingStartAt);
  const operatingEnd = new Date(board.businessDay.operatingEndAt);
  const totalMinutes = Math.max(60, (operatingEnd.getTime() - operatingStart.getTime()) / 60_000);
  const tickCount = Math.floor(totalMinutes / 30) + 1;
  const ticks = Array.from({ length: tickCount }, (_, index) => {
    const value = new Date(operatingStart.getTime() + index * 30 * 60_000);
    return new Intl.DateTimeFormat("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Tokyo",
    }).format(value);
  });
  const nowStyle = positionStyle(
    new Date().toISOString(),
    new Date(Date.now() + 60_000).toISOString(),
    board.businessDay.operatingStartAt,
    board.businessDay.operatingEndAt,
  );
  const unassigned = reservations.filter((item) => item.tableIds.length === 0);

  return (
    <section className={styles.timelineView} aria-labelledby="chart-view-title">
      <div className={styles.viewHeading}>
        <div>
          <h2 id="chart-view-title">Chart</h2>
          <p>15分単位の滞在、入替、ブロック、競合を空間で確認します。</p>
        </div>
        <div className={styles.zoomControl} role="group" aria-label="時間軸ズーム">
          <button type="button" onClick={() => onZoom(zoom === 60 ? 30 : 15)} aria-label="時間軸を拡大"><Plus size={15} /></button>
          <span className="tabular-nums">{zoom}m</span>
          <button type="button" onClick={() => onZoom(zoom === 15 ? 30 : 60)} aria-label="時間軸を縮小"><Minus size={15} /></button>
        </div>
      </div>

      <div className={styles.timelineScroller} tabIndex={0} aria-label="VIP席の時間軸。左右にスクロールできます。" data-zoom={zoom}>
        <div className={styles.timelineGrid}>
          <div className={styles.timelineCorner}><Clock3 size={14} aria-hidden /> 席 / 時刻</div>
          <div className={styles.timelineTicks} style={{ gridTemplateColumns: `repeat(${tickCount}, 1fr)` }}>{ticks.map((tick) => <span key={tick}>{tick}</span>)}</div>
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
                    const Icon = meta.icon;
                    return (
                      <button
                        key={reservation.id}
                        type="button"
                        className={styles.timelineBar}
                        style={positionStyle(reservation.startAt, reservation.endAt, board.businessDay.operatingStartAt, board.businessDay.operatingEndAt)}
                        data-tone={meta.tone}
                        data-cue={meta.cue}
                        data-selected={reservation.id === selectedReservationId || undefined}
                        onClick={() => onSelect(reservation.id)}
                        aria-label={`${reservation.publicCode}、${reservation.guestLabel}、${reservation.startLabel}から${reservation.endLabel}、${meta.label}`}
                      >
                        <Icon size={12} aria-hidden />
                        <span>{reservation.publicCode}</span>
                        <small>{reservation.startLabel}</small>
                      </button>
                    );
                  })}
                  {board.blocks.filter((block) => block.targets.tableIds.includes(table.id)).map((block) => (
                  <span key={block.id} className={styles.timelineBlock} style={positionStyle(block.startAt, block.endAt, board.businessDay.operatingStartAt, board.businessDay.operatingEndAt)}>ブロック</span>
                  ))}
                  <span className={styles.nowLine} style={nowStyle} aria-label="現在時刻" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.unassignedTray}>
        <span><TriangleAlert size={15} aria-hidden /> 未割当 {unassigned.length}</span>
        <div>{unassigned.map((item) => <button type="button" key={item.id} onClick={() => onSelect(item.id)}>{item.startLabel} {item.publicCode}</button>)}</div>
      </div>
    </section>
  );
}
