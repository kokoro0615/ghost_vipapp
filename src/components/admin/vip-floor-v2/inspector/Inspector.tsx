"use client";

import { Armchair, BellRing, CalendarClock, ChevronLeft, ChevronRight, CircleX, ClipboardList, Clock3, MapPin, NotebookPen, Pencil, Route, ShieldCheck, Ticket, TimerReset, UserRound, UsersRound } from "lucide-react";

import type { VipFloorBoardV2 } from "@/lib/vipFloorV2Contract";

import { getStatusMeta } from "../contract/statusModel";
import type { CommandKind, HistoryEntry, UiReservation } from "../contract/uiTypes";
import { useDemoMode } from "../demo/DemoMode";
import styles from "../VipFloorWorkspace.module.css";

export const INSPECTOR_TABS = [
  { key: "overview", label: "概要" },
  { key: "guest", label: "ゲスト" },
  { key: "service", label: "接客" },
  { key: "notes", label: "メモ" },
  { key: "history", label: "履歴" },
] as const;
export type InspectorTab = (typeof INSPECTOR_TABS)[number]["key"];

const commandButtons: Array<{ kind: CommandKind; label: string; icon: typeof Clock3 }> = [
  { kind: "check_in", label: "チェックイン", icon: ShieldCheck },
  { kind: "arrival_time", label: "到着時刻", icon: Clock3 },
  { kind: "service_status", label: "接客状態", icon: BellRing },
  { kind: "assignment", label: "席割当", icon: Armchair },
  { kind: "seat_extension", label: "利用延長", icon: TimerReset },
  { kind: "note", label: "メモ", icon: NotebookPen },
];

type Props = {
  board: VipFloorBoardV2;
  reservation: UiReservation | null;
  selectedTableId: string | null;
  history: HistoryEntry[];
  collapsed?: boolean;
  instance: "desktop" | "mobile";
  readOnly: boolean;
  activeTab: InspectorTab;
  canCommand: (kind: CommandKind) => boolean;
  onTabChange: (tab: InspectorTab) => void;
  onCollapse?: (value: boolean) => void;
  onCommand: (kind: CommandKind) => void;
  onEdit: () => void;
  onCustomerDetails: () => void;
};

export function Inspector({
  board,
  reservation,
  selectedTableId,
  history,
  collapsed = false,
  instance,
  readOnly,
  activeTab,
  canCommand,
  onTabChange,
  onCollapse,
  onCommand,
  onEdit,
  onCustomerDetails,
}: Props) {
  const demoMode = useDemoMode();
  const table = board.tables.find((item) => item.id === selectedTableId) ?? null;
  const meta = getStatusMeta(reservation?.serviceStatus);
  const StatusIcon = meta.icon;
  const notes = reservation ? board.notes.filter((note) => note.reservationId === reservation.id) : [];
  const visibleFlags = reservation?.flags.filter((flag) => !flag.includes("payment") && !flag.includes("stripe")) ?? [];

  function moveTabFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    const currentIndex = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (currentIndex < 0) return;
    event.preventDefault();
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabs.length - 1
        : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    tabs[nextIndex]?.focus();
    tabs[nextIndex]?.click();
  }

  if (collapsed) {
    return <aside className={styles.inspectorCollapsed}><button type="button" onClick={() => onCollapse?.(false)} aria-label="インスペクターを開く"><ChevronLeft size={18} /></button><span>詳細</span></aside>;
  }

  return (
    <aside className={styles.inspector} aria-label="予約インスペクター" data-instance={instance}>
      <div className={styles.inspectorHeader}>
        <div><span>予約詳細</span><strong>{reservation?.publicCode ?? table?.displayCode ?? "予約を選択"}</strong></div>
        {onCollapse ? <button type="button" onClick={() => onCollapse(true)} aria-label="インスペクターを閉じる"><ChevronRight size={17} /></button> : null}
      </div>

      {reservation ? (
        <>
          <div className={styles.focusSummary} data-tone={meta.tone} data-cue={meta.cue}>
            <StatusIcon size={18} aria-hidden />
            <div><strong>{meta.label}</strong><span>{reservation.startLabel}-{reservation.endLabel} / {reservation.guestCount}名</span></div>
            <span className={styles.focusTable}>{reservation.tableCodes.join(" + ") || "未割当"}</span>
          </div>

          {/* Actions sit directly under the identity block so they never strand
              below the fold on a short laptop screen. */}
          <div className={styles.commandGrid} aria-label="予約操作">
            <button
              type="button"
              onClick={onEdit}
              disabled={readOnly || reservation.sourceChannel === "walk_in"}
            >
              <Pencil size={14} aria-hidden />予約編集
            </button>
            {commandButtons.map((command) => {
              const CommandIcon = command.icon;
              const unavailableForState =
                (command.kind === "check_in" && reservation.lifecycleStatus === "checked_in")
                || (command.kind === "seat_extension" && reservation.lifecycleStatus !== "checked_in")
                || (command.kind === "assignment" && reservation.lifecycleStatus === "checked_in");
              return <button
                key={command.kind}
                type="button"
                onClick={() => onCommand(command.kind)}
                disabled={readOnly || unavailableForState || !canCommand(command.kind)}
              >
                <CommandIcon size={14} aria-hidden />{command.label}
              </button>;
            })}
            {reservation.sourceChannel === "walk_in" ? (
              <button
                type="button"
                data-danger
                onClick={() => onCommand("walk_in_cancel")}
                disabled={
                  readOnly
                  || reservation.lifecycleStatus === "cancelled"
                  || reservation.serviceStatus === "completed"
                  || reservation.serviceStatus === "no_show"
                  || !canCommand("walk_in_cancel")
                }
              >
                <CircleX size={14} aria-hidden />Walk-in取消
              </button>
            ) : null}
          </div>

          <div className={styles.inspectorTabs} role="tablist" aria-label="予約詳細" onKeyDown={moveTabFocus}>
            {INSPECTOR_TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                id={`${instance}-${item.key}-tab`}
                aria-controls={`${instance}-${item.key}-panel`}
                aria-selected={activeTab === item.key}
                tabIndex={activeTab === item.key ? 0 : -1}
                onClick={() => onTabChange(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div
            className={styles.inspectorPanel}
            role="tabpanel"
            id={`${instance}-${activeTab}-panel`}
            aria-labelledby={`${instance}-${activeTab}-tab`}
            tabIndex={0}
          >
            {activeTab === "overview" ? <>
              <dl className={styles.detailList}>
                <div><dt><CalendarClock size={14} aria-hidden /> 時間</dt><dd>{reservation.startLabel}–{reservation.endLabel}</dd></div>
                <div><dt><UsersRound size={14} aria-hidden /> 人数</dt><dd>{reservation.guestCount}名</dd></div>
                <div><dt><MapPin size={14} aria-hidden /> 席</dt><dd>{reservation.tableCodes.join(" + ") || "未割当"}</dd></div>
                <div><dt><UserRound size={14} aria-hidden /> ゲスト</dt><dd>{reservation.guestLabel}</dd></div>
                <div><dt><Ticket size={14} aria-hidden /> 予約番号</dt><dd>{reservation.publicCode}</dd></div>
                <div><dt><Route size={14} aria-hidden /> 経路</dt><dd>{reservation.sourceLabel}</dd></div>
                <div><dt><ShieldCheck size={14} aria-hidden /> 版</dt><dd>v{reservation.version}</dd></div>
                <div><dt><ClipboardList size={14} aria-hidden /> 例外</dt><dd>{reservation.exceptionLabel ?? "なし"}</dd></div>
              </dl>
              {reservation.operatorNote ? (
                <div className={styles.noteList}>
                  <article>
                    <strong><NotebookPen size={14} aria-hidden />現場メモ</strong>
                    <p>{reservation.operatorNote}</p>
                  </article>
                </div>
              ) : null}
            </> : null}
            {activeTab === "guest" ? <div className={styles.detailStack}><p className={styles.maskedName}><UserRound size={17} />{reservation.guestLabel}</p><p>{demoMode.enabled ? "合成profileはこのbrowser-local workspaceだけで利用します。" : "Ownerは暗号化profileを必要時だけ復号できます。"}</p><small>閲覧、属性変更、解除・再紐付けはすべて監査対象です。</small><button type="button" className={styles.secondaryButton} onClick={onCustomerDetails} disabled={readOnly}>顧客詳細を開く</button></div> : null}
            {activeTab === "service" ? <div className={styles.detailStack}><p><StatusIcon size={16} /> {meta.label}</p><p>元データ: {reservation.sourceLabel}</p><p>席ロック: {table?.operationalLocked ? table.lockReason : "なし"}</p><p>フラグ: {visibleFlags.join(", ") || "なし"}</p></div> : null}
            {activeTab === "notes" ? <div className={styles.noteList}>{notes.length ? notes.map((note) => <article key={note.id}><strong><NotebookPen size={14} />{note.pinned ? "固定メモ" : "メモ"}</strong><p>{note.body}</p><small>v{note.version} / {note.kind}</small></article>) : <p>メモはありません。</p>}</div> : null}
            {activeTab === "history" ? <ol className={styles.historyList}>{history.map((item) => <li key={item.id}><span>{new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" }).format(new Date(item.at))}</span><div><strong>{item.label}</strong><p>{item.detail}</p><small>{item.actor}</small></div></li>)}</ol> : null}
          </div>
        </>
      ) : table ? (
        <div className={styles.noSelection}><MapPin size={24} /><h2>{table.displayCode}</h2><p>{table.name} / {table.capacityMin}-{table.capacityMax}名</p><p>{table.operationalLocked ? table.lockReason : "空席。予約を選択すると、この卓へ割り当てできます。"}</p></div>
      ) : (
        <div className={styles.noSelection}><MapPin size={24} /><h2>予約を選択してください</h2><p>一覧、要対応、フロアのいずれからでも詳細と操作を開けます。</p></div>
      )}
    </aside>
  );
}
