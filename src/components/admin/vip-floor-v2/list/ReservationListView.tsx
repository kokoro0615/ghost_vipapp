"use client";

import { ArrowDownAZ, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";

import { getStatusMeta } from "../contract/statusModel";
import type { UiReservation } from "../contract/uiTypes";
import styles from "../VipFloorWorkspace.module.css";

type ListProps = {
  reservations: UiReservation[];
  selectedReservationId: string | null;
  density: "compact" | "comfortable";
  onDensity: (density: "compact" | "comfortable") => void;
  onSelect: (id: string) => void;
};

export default function ReservationListView({ reservations, selectedReservationId, density, onDensity, onSelect }: ListProps) {
  return (
    <section className={styles.listView} aria-labelledby="list-view-title" data-density={density}>
      <div className={styles.viewHeading}>
        <div>
          <h2 id="list-view-title">来店予定・要対応</h2>
          <p>{reservations.length}件 / 来店時刻順</p>
        </div>
        <button type="button" className={styles.secondaryButton} onClick={() => onDensity(density === "compact" ? "comfortable" : "compact")}>
          <ArrowDownAZ size={16} aria-hidden /> {density === "compact" ? "ゆったり表示" : "コンパクト表示"}
        </button>
      </div>
      <div className={styles.listScroller} tabIndex={0}>
        <table className={styles.reservationTable}>
          <caption className="sr-only">VIP予約一覧</caption>
          <thead>
            <tr>
              <th scope="col" aria-sort="ascending">時刻 <ChevronsUpDown size={12} aria-hidden /></th>
              <th scope="col">状態</th>
              <th scope="col">予約番号</th>
              <th scope="col">ゲスト</th>
              <th scope="col">人数</th>
              <th scope="col">席</th>
              <th scope="col">例外</th>
              <th scope="col"><span className="sr-only">詳細</span></th>
            </tr>
          </thead>
          <tbody>
            {reservations.length === 0 ? (
              <tr className={styles.emptyTableRow}>
                <td colSpan={8}>一致する予約はありません。検索またはステータス条件を解除してください。</td>
              </tr>
            ) : null}
            {reservations.map((reservation) => {
              const meta = getStatusMeta(reservation.serviceStatus);
              const Icon = meta.icon;
              return (
                <tr key={reservation.id} data-selected={reservation.id === selectedReservationId || undefined}>
                  <td className={styles.timeCell}><button type="button" onClick={() => onSelect(reservation.id)}>{reservation.startLabel}</button><small>{reservation.endLabel}</small></td>
                  <td><span className={styles.statusBadge} data-tone={meta.tone} data-cue={meta.cue}><Icon size={13} aria-hidden />{meta.shortLabel}</span></td>
                  <td className={styles.codeCell}>{reservation.publicCode}</td>
                  <td><span className={styles.guestCell} title={reservation.guestLabel}>{reservation.guestLabel}</span></td>
                  <td className={styles.numberCell}>{reservation.guestCount}</td>
                  <td>{reservation.tableCodes.join(" + ") || "未割当"}</td>
                  <td>{reservation.exceptionLabel ? <span className={styles.exceptionText}>{reservation.exceptionLabel}</span> : <span className={styles.mutedText}>なし</span>}</td>
                  <td><button type="button" className={styles.rowAction} onClick={() => onSelect(reservation.id)} aria-label={`${reservation.publicCode}の詳細を開く`}><ChevronRight size={16} /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <footer className={styles.listFooter}>
        <span>全 {reservations.length} 件中 1–{reservations.length} 件を表示</span>
        <div aria-label="予約一覧ページ">
          <button type="button" disabled aria-label="前のページ"><ChevronLeft size={15} /></button>
          <strong aria-current="page">1</strong>
          <button type="button" disabled aria-label="次のページ"><ChevronRight size={15} /></button>
        </div>
        <span>20件 / ページ</span>
      </footer>
    </section>
  );
}
