"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, LockKeyhole, X } from "lucide-react";

import { getGhostTimeOptions } from "@/lib/ghostOperatingHours";
import type { VipFloorBoardV2, VipServiceStatus } from "@/lib/vipFloorV2Contract";

import type {
  CommandKind,
  LiveCommandDraft,
  UiReservation,
  WalkInCancellationReason,
} from "../contract/uiTypes";
import { DemoCue, useDemoMode } from "../demo/DemoMode";
import styles from "../VipFloorWorkspace.module.css";

const commandLabels: Record<CommandKind, string> = {
  service_status: "接客状態を変更",
  check_in: "チェックイン",
  arrival_time: "到着時刻を記録",
  assignment: "卓割当を変更",
  seat_extension: "利用時間を延長",
  note: "スタッフメモ",
  walk_in_cancel: "Walk-inを取り消す",
};

type Props = {
  open: boolean;
  kind: CommandKind;
  step: 1 | 2;
  pending: boolean;
  board: VipFloorBoardV2;
  reservation: UiReservation | null;
  selectedTableId: string | null;
  conflict: { ok: false; code: string; message: string; recovery: string } | null;
  onClose: () => void;
  onStep: (step: 1 | 2) => void;
  onRun: (draft: LiveCommandDraft) => void;
};

function toTokyoTimestamp(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? `${text}:00+09:00` : new Date().toISOString();
}

export function CommandCenter({
  open,
  kind,
  step,
  pending,
  board,
  reservation,
  selectedTableId,
  conflict,
  onClose,
  onStep,
  onRun,
}: Props) {
  const demoMode = useDemoMode();
  const [renderedAt] = useState(() => Date.now());
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const source = reservation
    ? board.reservations.find((item) => item.id === reservation.id) ?? null
    : null;
  const existingNote = source
    ? board.notes.find((item) => item.reservationId === source.id) ?? null
    : null;
  const arrivalOptions = useMemo(() => {
    if (!open || kind !== "arrival_time") return [];
    return getGhostTimeOptions(board.businessDay.businessDate)
      .slice(0, -1)
      .filter((option) => Date.parse(`${option.value}:00+09:00`) <= renderedAt);
  }, [board.businessDay.businessDate, kind, open, renderedAt]);
  const arrivalDefault = arrivalOptions.at(-1)?.value ?? "";
  const impact = useMemo(() => {
    if (kind === "assignment") return demoMode.enabled
      ? "browser-local合成台帳の卓割当を置き換え、この端末の各viewへ反映します。"
      : "GHOST予約台帳の卓割当を置き換え、全端末の表示へ反映します。";
    if (kind === "check_in") return demoMode.enabled
      ? "合成来店を確定し、着席開始と利用期限をbrowser-local台帳へ記録します。"
      : "来店を確定し、着席開始と利用期限をGHOST予約台帳へ記録します。";
    if (kind === "arrival_time") return "22:00〜翌05:00の候補から選んだ到着時刻を予約へ記録します。未来時刻は保存できません。";
    if (kind === "seat_extension") return "現在の利用期限を15分単位、最大120分まで延長します。";
    if (kind === "note") return "500文字以内の現場共有メモを監査付きで保存します。";
    if (kind === "walk_in_cancel") return demoMode.enabled
      ? "合成Walk-inを取消済みにし、割当席をbrowser-local台帳で解放します。元記録と監査履歴は残ります。"
      : "Walk-inを取消済みにし、割当席を解放します。元記録と監査履歴は残り、返金・顧客通知は実行しません。";
    return "接客状態を更新し、Floor・Chart・Listへ反映します。";
  }, [demoMode.enabled, kind]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() =>
      panelRef.current?.querySelector<HTMLElement>("button, input, select, textarea")?.focus(),
    );
    return () => {
      window.cancelAnimationFrame(frame);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open || kind !== "walk_in_cancel" || step !== 2) return;
    const frame = window.requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLButtonElement>("[data-least-destructive]")
        ?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [kind, open, step]);

  if (!open || !source || !reservation) return null;

  function trapFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...(panelRef.current?.querySelectorAll<HTMLElement>(
      "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
    ) ?? [])];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function buildDraft(formData: FormData): LiveCommandDraft {
    const base = {
      kind,
      reservationId: source!.id,
      expectedVersion: source!.version,
    };

    switch (kind) {
      case "service_status":
        return {
          ...base,
          kind,
          payload: {
            occurredAt: new Date().toISOString(),
            serviceStatus: String(formData.get("serviceStatus")) as VipServiceStatus,
          },
        };
      case "check_in":
        return {
          ...base,
          kind,
          payload: { occurredAt: new Date().toISOString() },
        };
      case "arrival_time":
        return {
          ...base,
          kind,
          payload: { occurredAt: toTokyoTimestamp(formData.get("occurredAt")) },
        };
      case "assignment":
        return {
          ...base,
          kind,
          payload: {
            tableIds: formData
              .getAll("tableIds")
              .map(String)
              .filter(Boolean),
          },
        };
      case "seat_extension":
        return {
          ...base,
          kind,
          payload: { extendMinutes: Number(formData.get("extendMinutes")) },
        };
      case "note":
        return {
          ...base,
          kind,
          payload: { note: String(formData.get("note") ?? "").trim() },
        };
      case "walk_in_cancel":
        return {
          ...base,
          kind,
          payload: {
            sourceChannel: "walk_in",
            cancelReason: String(
              formData.get("cancelReason"),
            ) as WalkInCancellationReason,
            reasonNote: String(formData.get("reasonNote") ?? "").trim(),
          },
        };
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 1) {
      onStep(2);
      return;
    }
    onRun(buildDraft(new FormData(event.currentTarget)));
  }

  return (
    <div
      className={styles.dialogBackdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={styles.commandDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-title"
        onKeyDown={trapFocus}
      >
        <header className={styles.commandHeader}>
          <div><h2 id="command-title">{commandLabels[kind]}</h2></div>
          <button type="button" onClick={onClose} aria-label="操作画面を閉じる"><X size={20} /></button>
        </header>
        <DemoCue compact className={styles.dialogDemoCue} />
        <div className={styles.stepRail} aria-label="操作ステップ">
          <span data-current={step === 1 || undefined}>入力</span>
          <ArrowRight size={14} />
          <span data-current={step === 2 || undefined}>確認</span>
        </div>

        <form className={styles.commandForm} onSubmit={submit}>
          <div className={styles.commandContext}>
            <strong>{reservation.publicCode}</strong>
            <span>{reservation.guestLabel} / {reservation.startLabel} / 更新版 {reservation.version}</span>
          </div>
          <fieldset disabled={pending}>
            {/* The dialog is already titled with this text. The legend stays for
                the group's accessible name and stops printing it twice. */}
            <legend className="sr-only">{commandLabels[kind]}</legend>

            {kind === "service_status" ? (
              <label>
                次の状態
                <select name="serviceStatus" defaultValue={reservation.serviceStatus}>
                  <option value="expected">来店予定</option>
                  <option value="late">遅延</option>
                  <option value="no_contact">連絡未達</option>
                  <option value="arrived">到着済み</option>
                  <option value="partial_arrival">一部到着</option>
                  <option value="seated">着席中</option>
                  <option value="bottle_pending">ボトル待ち</option>
                  <option value="bottle_served">提供済み</option>
                  <option value="bill_requested">会計依頼</option>
                  <option value="paid">支払済み</option>
                  <option value="resetting">リセット中</option>
                  <option value="completed">完了</option>
                  <option value="no_show">無断不来店</option>
                </select>
              </label>
            ) : null}

            {kind === "arrival_time" ? (
              <label>
                到着時刻
                <select
                  name="occurredAt"
                  defaultValue={arrivalDefault}
                  disabled={arrivalOptions.length === 0}
                  required
                >
                  {arrivalOptions.length === 0 ? (
                    <option value="">営業時間内の過去時刻なし</option>
                  ) : arrivalOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <small className={styles.syntheticInputHint}>
                  営業日 {board.businessDay.businessDate} / 15分単位 / 未来時刻は除外
                </small>
              </label>
            ) : null}

            {kind === "assignment" ? (
              <div className={styles.assignmentOptions} role="group" aria-labelledby="assignment-options-label">
                <span id="assignment-options-label">割当卓（複数選択可）</span>
                {board.tables.map((table) => (
                  <label key={table.id}>
                    <input
                      type="checkbox"
                      name="tableIds"
                      value={table.id}
                      defaultChecked={
                        reservation.tableIds.includes(table.id)
                        || selectedTableId === table.id
                      }
                    />
                    <span>{table.displayCode} · {table.name} · {table.capacityMax}名</span>
                  </label>
                ))}
              </div>
            ) : null}

            {kind === "note" ? (
              <label>
                現場共有メモ
                <textarea
                  name="note"
                  defaultValue={existingNote?.body ?? ""}
                  maxLength={500}
                  placeholder={demoMode.enabled ? "例: デモ：入口で到着確認済み" : "入口・フロア・担当者間で共有する内容"}
                  required
                />
              </label>
            ) : null}

            {kind === "seat_extension" ? (
              <label>
                延長時間
                <select name="extendMinutes" defaultValue="60">
                  {[15, 30, 45, 60, 75, 90, 105, 120].map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes}分{minutes === 60 ? "（推奨）" : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {kind === "check_in" ? (
              <p className={styles.helperText}>現在時刻でチェックインし、120分の利用期限を開始します。</p>
            ) : null}
            {kind === "walk_in_cancel" ? (
              <>
                <label>
                  取消区分
                  <select name="cancelReason" defaultValue="mistake" required>
                    <option value="mistake">誤登録</option>
                    <option value="duplicate">重複登録</option>
                    <option value="guest_request">来店取り消し</option>
                    <option value="venue_decision">店舗判断</option>
                  </select>
                </label>
                <label>
                  取消理由メモ
                  <textarea
                    name="reasonNote"
                    defaultValue={
                      demoMode.enabled
                        ? "デモ：Walk-in誤登録"
                        : "Walk-in誤登録"
                    }
                    maxLength={500}
                    required
                    aria-describedby="walk-in-cancel-note-hint"
                  />
                </label>
                <p id="walk-in-cancel-note-hint" className={styles.helperText}>
                  個人情報は入力しないでください。取消後は席が解放され、元記録は監査履歴に残ります。
                </p>
              </>
            ) : null}

          </fieldset>

          {step === 2 ? (
            <section
              className={styles.confirmation}
              data-danger={kind === "walk_in_cancel" || undefined}
            >
              <LockKeyhole size={18} />
              <div>
                <strong>{demoMode.enabled ? "browser-local合成台帳への反映を確認" : "本番台帳への反映を確認"}</strong>
                <p>{impact}</p>
                <small>保存前に更新版を照合し、競合時は反映せず最新状態を再読込します。</small>
              </div>
            </section>
          ) : null}

          {conflict ? (
            <div className={styles.conflictBox} role="alert">
              <AlertTriangle size={18} />
              <div><strong>{conflict.code}</strong><p>{conflict.message}</p><small>{conflict.recovery}</small></div>
            </div>
          ) : null}

          <footer className={styles.commandFooter}>
            {step === 2 ? (
              <button
                type="button"
                className={styles.secondaryButton}
                data-least-destructive={kind === "walk_in_cancel" || undefined}
                onClick={() => onStep(1)}
                disabled={pending}
              >
                <ArrowLeft size={16} />戻る
              </button>
            ) : (
              <button type="button" className={styles.secondaryButton} onClick={onClose}>閉じる</button>
            )}
            <button
              type="submit"
              className={
                kind === "walk_in_cancel" && step === 2
                  ? styles.dangerButton
                  : styles.primaryButton
              }
              disabled={pending || (kind === "arrival_time" && arrivalOptions.length === 0)}
            >
              {pending ? "反映中" : step === 1
                ? <>確認へ<ArrowRight size={16} /></>
                : kind === "walk_in_cancel"
                  ? <><Check size={16} />Walk-inを取り消す</>
                  : <><Check size={16} />{demoMode.enabled ? "合成台帳へ反映" : "GHOSTへ反映"}</>}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
