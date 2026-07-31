"use client";

import { ArrowDownAZ, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";

import { getStatusMeta } from "../contract/statusModel";
import type { UiReservation } from "../contract/uiTypes";
import styles from "../VipFloorWorkspace.module.css";

type ListProps = {
  reservations: UiReservation[];
  selectedReservationId: string | null;
  density: "compact" | "comfortable";
  emptyMessage: string;
  onDensity: (density: "compact" | "comfortable") => void;
  onSelect: (id: string) => void;
};

export default function ReservationListView({
  reservations,
  selectedReservationId,
  density,
  emptyMessage,
  onDensity,
  onSelect,
}: ListProps) {
  const attentionCount = reservations.filter((item) => item.exceptionLabel).length;

  return (
    <section className={styles.listView} aria-labelledby="list-view-title" data-density={density}>
      <div className={styles.viewStrip}>
        <h2 id="list-view-title">来店台帳</h2>
        <span className="tabular-nums">{reservations.length}件</span>
        {attentionCount > 0 ? <span className={styles.exceptionText}>要対応 {attentionCount}</span> : null}
        <span className={styles.stripSpacer} />
        <button type="button" className={styles.secondaryButton} onClick={() => onDensity(density === "compact" ? "comfortable" : "compact")}>
          <ArrowDownAZ size={15} aria-hidden /> {density === "compact" ? "ゆったり表示" : "コンパクト表示"}
        </button>
      </div>

      <div className={styles.listScroller} tabIndex={0}>
        <table className={styles.reservationTable}>
          <caption className="sr-only">VIP予約一覧。来店時刻の昇順。</caption>
          <thead>
            <tr>
              <th scope="col" aria-sort="ascending">時刻 <ChevronsUpDown size={11} aria-hidden /></th>
              <th scope="col">状態</th>
              <th scope="col">予約番号</th>
              <th scope="col">ゲスト</th>
              <th scope="col">人数</th>
              <th scope="col">席</th>
              <th scope="col">経路</th>
            </tr>
          </thead>
          <tbody>
            {reservations.length === 0 ? (
              <tr className={styles.emptyTableRow}>
                <td colSpan={7}>{emptyMessage}</td>
              </tr>
            ) : null}
            {reservations.map((reservation) => {
              const meta = getStatusMeta(reservation.serviceStatus);
              return (
                <tr
                  key={reservation.id}
                  data-selected={reservation.id === selectedReservationId || undefined}
                  data-attention={reservation.exceptionLabel ? "" : undefined}
                >
                  <td className={styles.timeCell}>
                    <button
                      type="button"
                      className={styles.rowOpen}
                      onClick={() => onSelect(reservation.id)}
                      aria-label={`${reservation.publicCode}の詳細を開く`}
                    >
                      <strong>{reservation.startLabel}</strong>
                      <small>{reservation.endLabel}まで</small>
                    </button>
                  </td>
                  <td>
                    <span className={styles.statusBadge} data-tone={meta.tone} data-cue={meta.cue}>
                      {reservation.exceptionLabel ?? meta.label}
                    </span>
                  </td>
                  <td className={styles.codeCell}>{reservation.publicCode}</td>
                  <td><span className={styles.guestCell} title={reservation.guestLabel}>{reservation.guestLabel}</span></td>
                  <td className={styles.numberCell}>{reservation.guestCount}</td>
                  <td className={styles.seatCell}>
                    {reservation.tableCodes.length
                      ? reservation.tableCodes.join(" + ")
                      : <span className={styles.exceptionText}>未割当</span>}
                  </td>
                  <td className={styles.mutedText}>{reservation.sourceLabel}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className={styles.listFooter}>
        <span>
          {reservations.length === 0
            ? "全 0 件"
            : `全 ${reservations.length} 件中 1–${reservations.length} 件を表示`}
        </span>
        <div aria-label="予約一覧ページ">
          <button type="button" disabled aria-label="前のページ"><ChevronLeft size={15} /></button>
          <strong aria-current="page">1</strong>
          <button type="button" disabled aria-label="次のページ"><ChevronRight size={15} /></button>
        </div>
      </footer>
    </section>
  );
}
