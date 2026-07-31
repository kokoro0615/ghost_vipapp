"use client";

import { type KeyboardEvent, useEffect, useRef } from "react";
import { RotateCcw, X } from "lucide-react";

import styles from "../VipFloorWorkspace.module.css";

type Props = {
  open: boolean;
  pending: boolean;
  businessDate: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
};

export function DemoResetDialog({
  open,
  pending,
  businessDate,
  onCancel,
  onConfirm,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const frame = window.requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLButtonElement>("[data-safe-action]")?.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !pending) {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = [...(dialogRef.current?.querySelectorAll<HTMLButtonElement>(
      "button:not([disabled])",
    ) ?? [])];
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
    <div className={styles.dialogBackdrop} role="presentation">
      <div
        ref={dialogRef}
        className={styles.demoResetDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-reset-title"
        aria-describedby="demo-reset-description"
        onKeyDown={trapFocus}
      >
        <header className={styles.commandHeader}>
          <div>
            <span>DEMO · LOCAL WORKSPACE</span>
            <h2 id="demo-reset-title">合成データを初期状態へ戻す</h2>
          </div>
          <button type="button" onClick={onCancel} disabled={pending} aria-label="リセット確認を閉じる">
            <X size={20} />
          </button>
        </header>
        <div className={styles.demoResetBody}>
          <RotateCcw size={22} aria-hidden />
          <p id="demo-reset-description">
            {businessDate} のbrowser-local合成台帳だけを決定論的な初期状態へ戻します。
            Owner session、Production予約、公開予約、通知には触れません。
          </p>
        </div>
        <footer className={styles.commandFooter}>
          <button
            type="button"
            className={styles.secondaryButton}
            data-safe-action
            onClick={onCancel}
            disabled={pending}
          >
            取消
          </button>
          <button
            type="button"
            className={styles.dangerButton}
            onClick={() => void onConfirm()}
            disabled={pending}
          >
            <RotateCcw size={16} />
            {pending ? "初期化中…" : "合成データだけ初期化"}
          </button>
        </footer>
      </div>
    </div>
  );
}

