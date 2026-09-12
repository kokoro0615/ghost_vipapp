"use client";

import { type KeyboardEvent, useLayoutEffect, useRef, useState } from "react";

import type { PreparedTicketOperation } from "./api";
import type { TicketOperationsErrorState } from "./useTicketOperations";
import styles from "./TicketOperations.module.css";

const ACTION_BOUNDARIES: Record<PreparedTicketOperation["action"], string> = {
  entry_rotate: "漏えいした注文リンクと派生した入場権限を失効し、新しいリンクを登録済みの購入先へ送信します。使用済みの券は復活しません。",
  entry_revoke: "この注文リンクからの表示・入場を停止します。正規Wallet認証は独立して維持され、使用履歴は残ります。",
  entry_resend: "同じ有効な注文リンクを登録済みの購入先へ再送します。鍵は交換せず、使用状態も変わりません。",
  entry_exception: "全員の集合・身分証・誤使用の申告と元記録を確認した場合だけ、一回の例外受付を記録します。原使用を取り消さず、通常の分割入場には使えません。転送先による先使用が疑われる場合は確定せず照会してください。",
  session_revoke: "現在のWallet sessionだけを失効します。購入記録と入場記録は変更しません。",
  assisted_admission: "選択した未使用券だけを入場済みにします。支払・返金・環境・入場枠の検証は省略されません。",
  refund_resolve: "返金確認の記録を解決します。この画面から金銭の返金は作成しません。",
  email_retry: "失敗した送信jobを再投入します。宛先の完全なメールアドレスは表示しません。",
};

type Props = {
  operation: PreparedTicketOperation;
  title: string;
  confirmLabel: string;
  danger?: boolean;
  pending: boolean;
  error: TicketOperationsErrorState | null;
  onCancel: () => void;
  onConfirm: (operation: PreparedTicketOperation) => Promise<boolean>;
};

export function TicketOperationConfirmDialog({
  operation,
  title,
  confirmLabel,
  danger = false,
  pending,
  error,
  onCancel,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState(operation.reason);
  const [submittedReason, setSubmittedReason] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(operation.action === "entry_exception" ? operation.confirmation ?? "" : "");
  const [submittedConfirmation, setSubmittedConfirmation] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const normalizedReason = reason.trim();
  const stale = error?.error === "version_conflict";

  useLayoutEffect(() => {
    cancelRef.current?.focus();
  }, []);

  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    event.stopPropagation();
    if (event.key === "Escape" && !pending) {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>(
      "button:not([disabled]), textarea:not([disabled])",
    ) ?? [])].filter((element) => element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className={styles.confirmBackdrop} role="presentation">
      <div
        ref={dialogRef}
        className={styles.confirmDialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ticket-operation-confirm-title"
        aria-describedby="ticket-operation-confirm-boundary"
        data-action={operation.action}
        onKeyDown={trapFocus}
      >
        <header>
          <h3 id="ticket-operation-confirm-title">{title}</h3>
          <span className="tabular-nums">v{operation.expectedVersion}</span>
        </header>
        <p id="ticket-operation-confirm-boundary" className={styles.confirmBoundary}>
          {ACTION_BOUNDARIES[operation.action]}
        </p>
        <label className={styles.reasonField}>
          <span>理由（8文字以上・監査履歴へ記録）</span>
          <textarea
            name="reason"
            value={reason}
            required
            minLength={8}
            maxLength={240}
            rows={3}
            autoComplete="off"
            readOnly={pending || submittedReason !== null}
            aria-invalid={reason.length > 0 && normalizedReason.length < 8 || undefined}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        {operation.action === "entry_exception" && <label className={styles.reasonField}>
          <span>{operation.guestCount}名全員の集合・身分証・誤使用の確認内容（8文字以上）</span>
          <textarea name="confirmation" value={confirmation} minLength={8} maxLength={400} required rows={3} autoComplete="off"
            readOnly={pending || submittedConfirmation !== null} onChange={event => setConfirmation(event.target.value)} />
        </label>}
        {error ? (
          <div className={styles.confirmError} role="alert">
            <strong>{stale ? "版が変わりました" : "確定できませんでした"}</strong>
            <span>{error.message}</span>
            {error.recovery ? <span>{error.recovery}</span> : null}
            {submittedReason !== null && !stale ? (
              <span>同じ操作の再試行では理由を保持します。変更する場合は戻って操作を作り直してください。</span>
            ) : null}
          </div>
        ) : null}
        <footer>
          <button
            ref={cancelRef}
            type="button"
            className={styles.secondaryButton}
            data-least-destructive
            disabled={pending}
            onClick={onCancel}
          >
            戻る
          </button>
          <button
            type="button"
            className={danger ? styles.dangerButton : styles.primaryButton}
            disabled={pending || stale || normalizedReason.length < 8 || (operation.action === "entry_exception" && confirmation.trim().length < 8)}
            onClick={() => {
              const lockedReason = submittedReason ?? normalizedReason;
              if (submittedReason === null) setSubmittedReason(lockedReason);
              const lockedConfirmation = submittedConfirmation ?? confirmation.trim();
              if (operation.action === "entry_exception") setSubmittedConfirmation(lockedConfirmation);
              void onConfirm({ ...operation, reason: lockedReason, ...(operation.action === "entry_exception" ? { confirmation: lockedConfirmation } : {}) });
            }}
          >
            {pending ? "確定中…" : confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
