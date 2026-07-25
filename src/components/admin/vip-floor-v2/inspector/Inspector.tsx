"use client";

import { useState } from "react";
import { CalendarClock, ChevronLeft, ChevronRight, CircleDollarSign, ClipboardList, MapPin, NotebookPen, ShieldCheck, UserRound, UsersRound } from "lucide-react";

import type { VipFloorBoardV2 } from "@/lib/vipFloorV2Contract";

import { getStatusMeta } from "../contract/statusModel";
import type { CommandKind, HistoryEntry, UiReservation } from "../contract/uiTypes";
import styles from "../VipFloorWorkspace.module.css";

const tabs = ["overview", "guest", "service", "payment", "notes", "history"] as const;
type Tab = (typeof tabs)[number];

const commandButtons: Array<{ kind: CommandKind; label: string }> = [
  { kind: "check_in", label: "Check in" },
  { kind: "arrival_time", label: "到着時刻" },
  { kind: "service_status", label: "接客状態" },
  { kind: "assignment", label: "席割当" },
  { kind: "seat_extension", label: "30分延長" },
  { kind: "note", label: "メモ" },
];

type Props = {
  board: VipFloorBoardV2;
  reservation: UiReservation | null;
  selectedTableId: string | null;
  history: HistoryEntry[];
  collapsed?: boolean;
  instance: "desktop" | "mobile";
  readOnly: boolean;
  onCollapse?: (value: boolean) => void;
  onCommand: (kind: CommandKind) => void;
};

export function Inspector({ board, reservation, selectedTableId, history, collapsed = false, instance, readOnly, onCollapse, onCommand }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const table = board.tables.find((item) => item.id === selectedTableId) ?? null;
  const meta = getStatusMeta(reservation?.serviceStatus);
  const StatusIcon = meta.icon;
  const notes = reservation ? board.notes.filter((note) => note.reservationId === reservation.id) : [];

  if (collapsed) {
    return <aside className={styles.inspectorCollapsed}><button type="button" onClick={() => onCollapse?.(false)} aria-label="inspectorを開く"><ChevronLeft size={18} /></button><span>DETAIL</span></aside>;
  }

  return (
    <aside className={styles.inspector} aria-label="予約inspector" data-instance={instance}>
      <div className={styles.inspectorHeader}>
        <div><span>INSPECTOR</span><strong>{reservation?.publicCode ?? table?.displayCode ?? "NO SELECTION"}</strong></div>
        {onCollapse ? <button type="button" onClick={() => onCollapse(true)} aria-label="inspectorを閉じる"><ChevronRight size={17} /></button> : null}
      </div>

      {reservation ? (
        <>
          <div className={styles.focusSummary} data-tone={meta.tone} data-cue={meta.cue}>
            <StatusIcon size={18} aria-hidden />
            <div><strong>{meta.label}</strong><span>{reservation.startLabel}-{reservation.endLabel} / {reservation.guestCount}名</span></div>
            <span className={styles.focusTable}>{reservation.tableCodes.join(" + ") || "未割当"}</span>
          </div>

          <div className={styles.inspectorTabs} role="tablist" aria-label="予約詳細">
            {tabs.map((item) => <button key={item} type="button" role="tab" id={`${instance}-${item}-tab`} aria-controls={`${instance}-${item}-panel`} aria-selected={tab === item} onClick={() => setTab(item)}>{item}</button>)}
          </div>

          <div className={styles.inspectorPanel} role="tabpanel" id={`${instance}-${tab}-panel`} aria-labelledby={`${instance}-${tab}-tab`}>
            {tab === "overview" ? <dl className={styles.detailList}>
              <div><dt><CalendarClock size={14} /> 時間</dt><dd>{reservation.startLabel}-{reservation.endLabel}</dd></div>
              <div><dt><UsersRound size={14} /> 人数</dt><dd>{reservation.guestCount}名</dd></div>
              <div><dt><MapPin size={14} /> 席</dt><dd>{reservation.tableCodes.join(" + ") || "未割当"}</dd></div>
              <div><dt><ShieldCheck size={14} /> 版</dt><dd>v{reservation.version}</dd></div>
              <div><dt><ClipboardList size={14} /> 例外</dt><dd>{reservation.exceptionLabel ?? "なし"}</dd></div>
            </dl> : null}
            {tab === "guest" ? <div className={styles.detailStack}><p className={styles.maskedName}><UserRound size={17} />{reservation.guestLabel}</p><p>この端末では業務に必要なマスク済み表示名のみ扱います。</p><small>電話・メール・個人情報exportは対象外です。</small></div> : null}
            {tab === "service" ? <div className={styles.detailStack}><p><StatusIcon size={16} /> {meta.label}</p><p>source: {reservation.sourceLabel}</p><p>table lock: {table?.operationalLocked ? table.lockReason : "なし"}</p><p>flags: {reservation.flags.join(", ") || "なし"}</p></div> : null}
            {tab === "payment" ? <div className={styles.detailStack}><p><CircleDollarSign size={16} /> 対象外</p><p>決済・返金操作はこのVIP Floorアプリでは行いません。</p><small>必要な場合はGHOST本体の承認済み手順を使用してください。</small></div> : null}
            {tab === "notes" ? <div className={styles.noteList}>{notes.length ? notes.map((note) => <article key={note.id}><strong><NotebookPen size={14} />{note.pinned ? "固定メモ" : "メモ"}</strong><p>{note.body}</p><small>v{note.version} / {note.kind}</small></article>) : <p>メモはありません。</p>}</div> : null}
            {tab === "history" ? <ol className={styles.historyList}>{history.map((item) => <li key={item.id}><span>{new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" }).format(new Date(item.at))}</span><div><strong>{item.label}</strong><p>{item.detail}</p><small>{item.actor}</small></div></li>)}</ol> : null}
          </div>

          <div className={styles.commandGrid} aria-label="予約操作">
            {commandButtons.map((command) => {
              const unavailableForState =
                (command.kind === "check_in" && reservation.lifecycleStatus === "checked_in")
                || (command.kind === "seat_extension" && reservation.lifecycleStatus !== "checked_in")
                || (command.kind === "assignment" && reservation.lifecycleStatus === "checked_in");
              return <button key={command.kind} type="button" onClick={() => onCommand(command.kind)} disabled={readOnly || unavailableForState}>{command.label}</button>;
            })}
          </div>
        </>
      ) : table ? (
        <div className={styles.noSelection}><MapPin size={24} /><h2>{table.displayCode}</h2><p>{table.name} / {table.capacityMin}-{table.capacityMax}名</p><p>{table.operationalLocked ? table.lockReason : "空席。予約を選択すると、この卓へ割り当てできます。"}</p></div>
      ) : (
        <div className={styles.noSelection}><MapPin size={24} /><h2>席または予約を選択</h2><p>floor node、timeline bar、list row、queue itemのいずれからでも同じinspectorを開けます。</p></div>
      )}
    </aside>
  );
}
