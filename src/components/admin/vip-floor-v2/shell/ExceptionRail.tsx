"use client";

import { AlertTriangle, ChevronLeft, ChevronRight, CircleAlert, Search } from "lucide-react";

import type { QueueGroup, UiReservation } from "../contract/uiTypes";
import { getStatusMeta } from "../contract/statusModel";
import styles from "../VipFloorWorkspace.module.css";

type Props = {
  groups: QueueGroup[];
  reservations: UiReservation[];
  selectedId: string | null;
  collapsed: boolean;
  query: string;
  onQuery: (value: string) => void;
  onSelect: (id: string) => void;
  onCollapse: (value: boolean) => void;
};

export function ExceptionRail({ groups, reservations, selectedId, collapsed, query, onQuery, onSelect, onCollapse }: Props) {
  const byId = new Map(reservations.map((item) => [item.id, item]));
  return (
    <aside className={styles.exceptionRail} data-collapsed={collapsed || undefined} aria-label="例外と到着queue">
      <div className={styles.railHeader}>
        <div><strong>要対応・来店予定</strong><span>本日の予約 {reservations.length}件</span></div>
        <button type="button" onClick={() => onCollapse(!collapsed)} aria-label={collapsed ? "例外queueを開く" : "例外queueを閉じる"}>
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        </button>
      </div>
      {collapsed ? (
        <div className={styles.collapsedCount}><AlertTriangle size={17} /><span>{groups.slice(0, 3).reduce((count, group) => count + group.reservationIds.length, 0)}</span></div>
      ) : (
        <>
          <label className={styles.searchField}>
            <span className="sr-only">予約を検索</span>
            <Search size={15} aria-hidden />
            <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="予約番号・ゲスト・席" />
          </label>
          <div className={styles.queueScroll}>
            {groups.map((group) => (
              <section key={group.key} className={styles.queueGroup} data-severity={group.severity}>
                <header><span>{group.severity === "critical" ? <CircleAlert size={14} /> : <AlertTriangle size={14} />}{group.label}</span><strong>{group.reservationIds.length}</strong></header>
                {group.reservationIds.length ? group.reservationIds.map((id) => {
                  const item = byId.get(id);
                  if (!item) return null;
                  const meta = getStatusMeta(item.serviceStatus);
                  const Icon = meta.icon;
                  return (
                    <button key={id} type="button" className={styles.queueItem} data-selected={id === selectedId || undefined} onClick={() => onSelect(id)}>
                      <span className={styles.queueTime}>{item.startLabel}</span>
                      <span className={styles.queueMain}><strong>{item.publicCode}</strong><small title={item.guestLabel}>{item.guestLabel}</small></span>
                      <span className={styles.queueCue} data-tone={meta.tone}><Icon size={13} />{item.exceptionLabel ?? meta.shortLabel}</span>
                    </button>
                  );
                }) : <p className={styles.queueEmpty}>対象なし</p>}
              </section>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}
