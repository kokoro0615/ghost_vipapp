"use client";

import { useEffect, useMemo, useRef } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, LockKeyhole, X } from "lucide-react";

import type { VipFloorBoardV2, VipServiceStatus } from "@/lib/vipFloorV2Contract";

import type { CommandKind, FixtureCommandDraft, FixtureResultMode, UiReservation } from "../contract/uiTypes";
import styles from "../VipFloorWorkspace.module.css";

const commandLabels: Record<CommandKind, string> = {
  service_status: "接客状態を変更",
  check_in: "チェックイン",
  assignment: "席割当を変更",
  schedule: "予約時間を変更",
  seat_extension: "利用時間を延長",
  block: "予約ブロック",
  note: "フロアメモ",
  walk_in: "店頭VIPを作成",
  cancel_refund: "取消・返金判断",
  customer: "顧客情報を編集",
};

type Props = {
  open: boolean;
  kind: CommandKind;
  step: 1 | 2;
  resultMode: FixtureResultMode;
  pending: boolean;
  board: VipFloorBoardV2;
  reservation: UiReservation | null;
  selectedTableId: string | null;
  conflict: { ok: false; code: string; message: string; recovery: string } | null;
  onClose: () => void;
  onStep: (step: 1 | 2) => void;
  onResultMode: (mode: FixtureResultMode) => void;
  onRun: (draft: FixtureCommandDraft) => void;
};

function localInputValue(value: string) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("sv-SE", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Tokyo" }).format(date);
  return parts.replace(" ", "T");
}

function toFixtureTimestamp(value: FormDataEntryValue | null, fallback: string) {
  const text = String(value ?? "").trim();
  return text ? `${text}:00+09:00` : fallback;
}

export function CommandCenter({ open, kind, step, resultMode, pending, board, reservation, selectedTableId, conflict, onClose, onStep, onResultMode, onRun }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const source = reservation ? board.reservations.find((item) => item.id === reservation.id) ?? null : null;
  const existingNote = source ? board.notes.find((item) => item.reservationId === source.id) ?? null : null;
  const existingBlock = board.blocks.find((item) => selectedTableId ? item.targets.tableIds.includes(selectedTableId) : false) ?? board.blocks[0] ?? null;
  const defaultStart = reservation?.startAt ?? "2026-07-23T22:30:00+09:00";
  const defaultEnd = reservation?.endAt ?? "2026-07-24T00:30:00+09:00";
  const impact = useMemo(() => {
    if (kind === "cancel_refund") return "予約を終了し、選択した返金判断をfixture履歴へ記録します。元に戻せません。";
    if (kind === "assignment") return "現在の席割当を更新し、floor・timeline・listへ即時反映します。";
    if (kind === "block") return "対象席またはsectionの販売・現場運用を指定時間だけ制限します。";
    return "変更はこのブラウザのmemory fixtureだけに反映されます。";
  }, [kind]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("button, input, select, textarea")?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  function trapFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...(panelRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])") ?? [])];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function buildDraft(formData: FormData): FixtureCommandDraft | null {
    const reservationId = source?.id ?? null;
    const expectedVersion = source?.version ?? 1;
    const reason = String(formData.get("reason") ?? "fixture_ui_operation").trim() || "fixture_ui_operation";
    if (!reservationId && !["block", "walk_in"].includes(kind)) return null;
    switch (kind) {
      case "service_status":
      case "check_in": return { kind, reservationId: reservationId!, payload: { expectedVersion, reason, toStatus: (kind === "check_in" ? "seated" : String(formData.get("serviceStatus"))) as VipServiceStatus, occurredAt: board.generatedAt } };
      case "assignment": return { kind, reservationId: reservationId!, payload: { expectedVersion, reason, operation: String(formData.get("assignmentOperation")) as "replace" | "add" | "remove" | "unassign", tableIds: formData.getAll("tableIds").map(String), capacityOverride: formData.get("capacityOverride") === "on" } };
      case "schedule": return { kind, reservationId: reservationId!, payload: { expectedVersion, reason, scheduledStartAt: toFixtureTimestamp(formData.get("startAt"), defaultStart), scheduledEndAt: toFixtureTimestamp(formData.get("endAt"), defaultEnd) } };
      case "seat_extension": return { kind, reservationId: reservationId!, payload: { expectedVersion, reason, extendMinutes: Number(formData.get("extendMinutes")) || 30 } };
      case "block": return { kind, operation: String(formData.get("blockOperation")) as "create" | "edit" | "remove", reservationId, blockId: existingBlock?.id ?? null, payload: { eventDayId: board.businessDay.id, scope: String(formData.get("blockScope")) as "online_only" | "all_operations", kind: String(formData.get("blockKind")) as "manual" | "maintenance" | "owner_hold" | "event" | "unassignment_guard", startAt: toFixtureTimestamp(formData.get("startAt"), defaultStart), endAt: toFixtureTimestamp(formData.get("endAt"), defaultEnd), memo: String(formData.get("memo") ?? "").trim() || null, seatResourceIds: formData.getAll("tableIds").map(String), floorSectionIds: [], venueWide: formData.get("venueWide") === "on", reason } };
      case "note": return { kind, operation: String(formData.get("noteOperation")) as "create" | "edit" | "pin", reservationId: reservationId!, payload: { expectedVersion, reason, noteId: existingNote?.id ?? null, expectedNoteVersion: existingNote?.version ?? null, kind: String(formData.get("noteKind")) as "floor" | "booking" | "private", body: String(formData.get("noteBody") ?? "").trim(), pinned: formData.get("notePinned") === "on" } };
      case "walk_in": return { kind, reservationId: null, payload: { eventDayId: board.businessDay.id, offeringId: "fixture-vip-offering", scheduledStartAt: toFixtureTimestamp(formData.get("startAt"), defaultStart), scheduledEndAt: toFixtureTimestamp(formData.get("endAt"), defaultEnd), guestCount: Number(formData.get("guestCount")) || 2, tableIds: formData.getAll("tableIds").map(String), guestLabel: String(formData.get("guestLabel") ?? "").trim() || null, operatorNote: String(formData.get("memo") ?? "").trim() || null, expectedTableVersions: formData.getAll("tableIds").map(String).map((tableId) => ({ tableId, expectedVersion: board.tables.find((table) => table.id === tableId)?.version ?? 1 })), capacityOverride: formData.get("capacityOverride") === "on", reason } };
      case "cancel_refund": return { kind, reservationId: reservationId!, payload: { expectedVersion, reasonCode: String(formData.get("reasonCode")) as "customer_request" | "duplicate" | "venue_decision" | "no_contact" | "other", reasonNote: reason, refundDecision: String(formData.get("refundDecision")) as "none" | "full" | "partial" | "review", refundAmountYen: Number(formData.get("refundAmountYen")) || null, notifyCustomer: formData.get("notifyCustomer") === "on" } };
      case "customer": return { kind, reservationId: reservationId!, payload: { expectedVersion, eventDayId: board.businessDay.id, reservationId, displayName: String(formData.get("displayName") ?? "").trim() || null, nameKana: String(formData.get("nameKana") ?? "").trim() || null, phone: String(formData.get("phone") ?? "").trim() || null, email: String(formData.get("email") ?? "").trim() || null, languageCode: String(formData.get("languageCode") ?? "ja"), allergies: String(formData.get("allergies") ?? "").trim() || null, preferences: String(formData.get("preferences") ?? "").trim() || null, reason } };
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 1) { onStep(2); return; }
    const draft = buildDraft(new FormData(event.currentTarget));
    if (draft) onRun(draft);
  }

  return (
    <div className={styles.dialogBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={panelRef} className={styles.commandDialog} role="dialog" aria-modal="true" aria-labelledby="command-title" onKeyDown={trapFocus}>
        <header className={styles.commandHeader}>
          <div><span>FIXTURE COMMAND</span><h2 id="command-title">{commandLabels[kind]}</h2></div>
          <button type="button" onClick={onClose} aria-label="操作画面を閉じる"><X size={19} /></button>
        </header>
        <div className={styles.stepRail} aria-label="操作ステップ"><span data-current={step === 1 || undefined}>入力</span><ArrowRight size={14} /><span data-current={step === 2 || undefined}>確認</span></div>

        <form ref={formRef} className={styles.commandForm} onSubmit={submit}>
          <div className={styles.commandContext}><strong>{reservation?.publicCode ?? "新規操作"}</strong><span>{reservation ? `${reservation.guestLabel} / v${reservation.version}` : "GHOST OSAKA / fixture"}</span></div>
          <fieldset disabled={step === 2 || pending}>
            <legend>{commandLabels[kind]}</legend>
            {(kind === "service_status") ? <label>次の状態<select name="serviceStatus" defaultValue="bottle_served"><option value="expected">来店予定</option><option value="late">遅延</option><option value="no_contact">連絡未達</option><option value="arrived">到着済み</option><option value="partial_arrival">一部到着</option><option value="seated">着席中</option><option value="bottle_pending">ボトル待ち</option><option value="bottle_served">提供済み</option><option value="bill_requested">会計依頼</option><option value="paid">支払済み</option><option value="resetting">リセット中</option><option value="no_show">無断不来店</option></select></label> : null}
            {(kind === "assignment") ? <><label>割当操作<select name="assignmentOperation" defaultValue="replace"><option value="replace">置換</option><option value="add">席を追加</option><option value="remove">席を外す</option><option value="unassign">未割当へ戻す</option></select></label><div className={styles.checkGrid}>{board.tables.map((table) => <label key={table.id}><input type="checkbox" name="tableIds" value={table.id} defaultChecked={table.id === selectedTableId} />{table.displayCode}<small>{table.capacityMax}名</small></label>)}</div><label className={styles.checkRow}><input type="checkbox" name="capacityOverride" />定員overrideを責任者理由付きで許可</label></> : null}
            {(["schedule", "block", "walk_in"] as CommandKind[]).includes(kind) ? <div className={styles.formColumns}><label>開始<input type="datetime-local" name="startAt" defaultValue={localInputValue(defaultStart)} required /></label><label>終了<input type="datetime-local" name="endAt" defaultValue={localInputValue(defaultEnd)} required /></label></div> : null}
            {kind === "seat_extension" ? <label>延長時間<select name="extendMinutes" defaultValue="30"><option value="15">15分</option><option value="30">30分</option><option value="60">60分</option><option value="90">90分</option></select></label> : null}
            {kind === "block" ? <><div className={styles.formColumns}><label>処理<select name="blockOperation" defaultValue={existingBlock ? "edit" : "create"}><option value="create">作成</option><option value="edit">編集</option><option value="remove">解除</option></select></label><label>範囲<select name="blockScope" defaultValue="all_operations"><option value="all_operations">全運用</option><option value="online_only">オンラインのみ</option></select></label><label>種別<select name="blockKind" defaultValue="maintenance"><option value="manual">手動</option><option value="maintenance">メンテナンス</option><option value="owner_hold">Owner hold</option><option value="event">イベント</option></select></label></div><div className={styles.checkGrid}>{board.tables.map((table) => <label key={table.id}><input type="checkbox" name="tableIds" value={table.id} defaultChecked={table.id === selectedTableId} />{table.displayCode}</label>)}</div><label className={styles.checkRow}><input type="checkbox" name="venueWide" />会場全体</label><label>メモ<textarea name="memo" defaultValue={existingBlock?.memo ?? ""} /></label></> : null}
            {kind === "note" ? <><div className={styles.formColumns}><label>処理<select name="noteOperation" defaultValue={existingNote ? "edit" : "create"}><option value="create">作成</option><option value="edit">編集</option><option value="pin">固定</option></select></label><label>種別<select name="noteKind" defaultValue={existingNote?.kind ?? "floor"}><option value="floor">フロア</option><option value="booking">予約</option><option value="private">限定</option></select></label></div><label>内容<textarea name="noteBody" defaultValue={existingNote?.body ?? "入口担当からフロア責任者へ連携"} required /></label><label className={styles.checkRow}><input type="checkbox" name="notePinned" defaultChecked={existingNote?.pinned} />重要メモとして固定</label></> : null}
            {kind === "walk_in" ? <><div className={styles.formColumns}><label>ゲスト表示名<input name="guestLabel" defaultValue="店頭ゲスト" required /></label><label>人数<input name="guestCount" type="number" min="1" max="20" defaultValue="4" required /></label></div><div className={styles.checkGrid}>{board.tables.map((table) => <label key={table.id}><input type="checkbox" name="tableIds" value={table.id} defaultChecked={table.id === selectedTableId} />{table.displayCode}<small>{table.capacityMax}名</small></label>)}</div><label>担当メモ<textarea name="memo" defaultValue="入口受付から登録" /></label><label className={styles.checkRow}><input type="checkbox" name="capacityOverride" />定員override</label></> : null}
            {kind === "cancel_refund" ? <><div className={styles.formColumns}><label>取消理由<select name="reasonCode" defaultValue="customer_request"><option value="customer_request">顧客依頼</option><option value="duplicate">重複</option><option value="venue_decision">店舗判断</option><option value="no_contact">連絡未達</option><option value="other">その他</option></select></label><label>返金判断<select name="refundDecision" defaultValue="review"><option value="none">返金なし</option><option value="full">全額</option><option value="partial">一部</option><option value="review">要確認</option></select></label><label>返金額<input name="refundAmountYen" type="number" min="0" step="1000" defaultValue="0" /></label></div><label className={styles.checkRow}><input type="checkbox" name="notifyCustomer" />顧客通知を予定</label></> : null}
            {kind === "customer" ? <><div className={styles.formColumns}><label>表示名<input name="displayName" defaultValue={reservation?.guestLabel ?? "マスク済みゲスト"} /></label><label>カナ<input name="nameKana" /></label><label>電話<input name="phone" type="tel" autoComplete="off" /></label><label>メール<input name="email" type="email" autoComplete="off" /></label><label>言語<select name="languageCode" defaultValue="ja"><option value="ja">日本語</option><option value="en">English</option></select></label></div><label>アレルギー<textarea name="allergies" /></label><label>希望<textarea name="preferences" /></label><p className={styles.helperText}>入力値はmemory fixture内だけで扱い、表示時は再びマスクします。</p></> : null}
            {!["note", "walk_in", "block", "customer"].includes(kind) ? <label>操作理由<textarea name="reason" defaultValue={kind === "cancel_refund" ? "顧客依頼を確認" : "フロア責任者によるfixture操作"} required={kind === "cancel_refund"} /></label> : <input type="hidden" name="reason" value="fixture_ui_operation" />}
            {kind === "check_in" ? <p className={styles.helperText}>到着時刻をfixture clockで記録し、状態を着席中へ進めます。</p> : null}
          </fieldset>

          {step === 2 ? <section className={styles.confirmation}><LockKeyhole size={18} /><div><strong>影響を確認</strong><p>{impact}</p><small>外部送信なし。fixture resultは下で選択できます。</small></div></section> : null}
          <label className={styles.fixtureMode}>Fixture result<select value={resultMode} onChange={(event) => onResultMode(event.target.value as FixtureResultMode)} disabled={pending}><option value="success">成功</option><option value="validation">入力エラー</option><option value="permission">権限なし</option><option value="version_conflict">版競合</option><option value="time_conflict">時間競合</option><option value="block_conflict">Block競合</option><option value="capacity_override">定員override必要</option></select></label>

          {conflict ? <div className={styles.conflictBox} role="alert"><AlertTriangle size={18} /><div><strong>{conflict.code}</strong><p>{conflict.message}</p><small>{conflict.recovery}</small></div></div> : null}

          <footer className={styles.commandFooter}>
            {step === 2 ? <button type="button" className={styles.secondaryButton} onClick={() => onStep(1)} disabled={pending}><ArrowLeft size={16} />戻る</button> : <button type="button" className={styles.secondaryButton} onClick={onClose}>取消</button>}
            <button type="submit" className={kind === "cancel_refund" ? styles.dangerButton : styles.primaryButton} disabled={pending}>{pending ? "反映中" : step === 1 ? <>確認へ<ArrowRight size={16} /></> : <><Check size={16} />fixtureへ反映</>}</button>
          </footer>
        </form>
      </div>
    </div>
  );
}
