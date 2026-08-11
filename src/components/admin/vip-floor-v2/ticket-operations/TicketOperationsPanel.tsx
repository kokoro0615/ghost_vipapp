"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";

import type { TicketOperationsCapabilities } from "@/lib/ticketOperationsContract";

import type { PreparedTicketOperation, TicketOperationsMode } from "./api";
import { TicketOperationConfirmDialog } from "./TicketOperationConfirmDialog";
import {
  TicketOperationsInspector,
  type TicketOperationIntent,
} from "./TicketOperationsInspector";
import { TicketOperationsQueue } from "./TicketOperationsQueue";
import type { TicketQueueFilter } from "./state";
import styles from "./TicketOperations.module.css";
import { useTicketOperations } from "./useTicketOperations";

function formatJstTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(new Date(value));
}

type Confirmation = Omit<TicketOperationIntent, "command"> & {
  operation: PreparedTicketOperation;
};

type Props = {
  open: boolean;
  mode: TicketOperationsMode;
  displayCapabilities: TicketOperationsCapabilities;
  onClose: () => void;
};

export function TicketOperationsPanel({
  open,
  mode,
  displayCapabilities,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TicketQueueFilter>("all");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const operations = useTicketOperations({ open, mode, displayCapabilities });

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus();
    };
  }, [open]);

  function closePanel() {
    setConfirmation(null);
    setQuery("");
    setFilter("all");
    onClose();
  }

  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (confirmation) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closePanel();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = [...(panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
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

  function prepare(intent: TicketOperationIntent) {
    operations.clearError();
    setConfirmation({
      operation: operations.prepareOperation(intent.command),
      title: intent.title,
      confirmLabel: intent.confirmLabel,
      danger: intent.danger,
    });
  }

  if (!open) return null;
  const noBackendCapability = operations.capabilitiesReady
    && !operations.capabilities.managerOperationsEnabled
    && !operations.capabilities.refundReviewEnabled;
  const environment = operations.queue?.environment ?? operations.order?.order.environment ?? "live";
  const checkoutReviewItem = operations.queue?.items.find((item) => (
    operations.capabilities.refundReviewEnabled
    && item.kind === "checkout_review"
    && item.publicCode === operations.selectedPublicCode
  ));

  return (
    <div className={styles.panelBackdrop} role="presentation">
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-operations-title"
        data-ticket-operations-root
        data-mode={mode}
        onKeyDown={trapFocus}
      >
        <header className={styles.panelHeader}>
          <div className={styles.panelIdentity}>
            <span>{mode === "demo" ? "合成台帳 · OWNER" : "OWNER"}</span>
            <h2 id="ticket-operations-title">チケット対応</h2>
          </div>
          <span className={styles.environmentMark} data-environment={environment}>
            {mode === "demo" ? "DEMO / TEST" : environment === "live" ? "LIVE" : "TEST"}
          </span>
          <div className={styles.panelReadiness} aria-label="機能状態">
            <span className={styles.statusLabel} data-tone={operations.capabilities.managerOperationsEnabled ? "live" : "neutral"}>
              <span aria-hidden />Recovery {operations.readiness?.managerOperations ?? "確認中"}
            </span>
            <span className={styles.statusLabel} data-tone={operations.capabilities.refundReviewEnabled ? "live" : "neutral"}>
              <span aria-hidden />返金確認 {operations.readiness?.refundReview ?? "確認中"}
            </span>
          </div>
          <button ref={closeRef} type="button" onClick={closePanel} aria-label="チケット対応を閉じる">
            <X size={20} aria-hidden />
          </button>
        </header>

        {operations.capabilities.managerOperationsEnabled ? (
          <section className={styles.sessionRail} aria-label="event sessionと入場枠">
            <header>
              <strong>入場枠</strong>
              <button
                type="button"
                onClick={() => void operations.refreshQueue()}
                disabled={operations.queuePending}
                aria-label="入場枠を再読込"
              >
                <RefreshCw size={16} aria-hidden />
              </button>
            </header>
            <div>
              {(operations.queue?.eventSessions.length ?? 0) === 0 ? (
                <span className={styles.statusLabel} data-tone="neutral"><span aria-hidden />対象sessionなし</span>
              ) : operations.queue?.eventSessions.map((session) => (
                <article key={session.eventSessionId}>
                  <span className={styles.statusLabel} data-tone={session.state === "open" ? "live" : session.state === "closed" ? "danger" : "warning"}>
                    <span aria-hidden />{session.state === "open" ? "受付中" : session.state === "closed" ? "終了" : "開始前"}
                  </span>
                  <strong>{session.eventTitle}</strong>
                  <time className="tabular-nums" dateTime={session.admissionOpensAt}>
                    {session.eventDate} · {formatJstTime(session.admissionOpensAt)}–{formatJstTime(session.admissionClosesAt)}
                  </time>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <div className={styles.refundOnlyRail} role="status">
            <span className={styles.statusLabel} data-tone="warning"><span aria-hidden />返金確認のみ</span>
            <strong>Wallet recovery・入場・メールの読込とpollingは行いません。</strong>
          </div>
        )}

        {noBackendCapability ? (
          <div className={styles.unavailableState} role="status">
            <strong>チケット対応はbackendで無効です</strong>
            <span>Owner設定を確認してから、この画面を開き直してください。</span>
          </div>
        ) : !operations.capabilitiesReady ? (
          <div className={styles.unavailableState} aria-busy="true">
            <strong>capabilityを確認中</strong>
            <span>対応キューより先にbackendの権限状態を確認しています。</span>
          </div>
        ) : (
          <div
            className={styles.operationsGrid}
            data-has-selection={Boolean(operations.selectedPublicCode)}
          >
            <TicketOperationsQueue
              queue={operations.queue}
              capabilities={operations.capabilities}
              selectedPublicCode={operations.selectedPublicCode}
              query={query}
              filter={filter}
              pending={operations.queuePending}
              onQuery={setQuery}
              onFilter={setFilter}
              onSelect={(publicCode) => void operations.loadOrder(publicCode)}
              onRefresh={() => void operations.refreshQueue()}
            />
            <TicketOperationsInspector
              key={operations.order
                ? `${operations.order.order.publicCode}:${operations.order.order.expectedVersion}:${operations.order.order.refundReview?.expectedVersion ?? "none"}:${operations.order.order.refundReview?.observationVersion ?? "none"}`
                : "empty"}
              response={operations.order}
              capabilities={operations.capabilities}
              checkoutReview={checkoutReviewItem ? {
                reason: checkoutReviewItem.status,
                label: checkoutReviewItem.statusLabel,
              } : null}
              pending={operations.orderPending || operations.mutationPending}
              error={operations.error}
              compact
              onBack={operations.clearSelection}
              onRefresh={() => void operations.refreshSelectedOrder()}
              onPrepare={prepare}
            />
          </div>
        )}

        <div className={styles.panelLiveRegion} role="status" aria-live="polite">
          {operations.statusMessage || (operations.error && !operations.order
            ? operations.error.message
            : "")}
        </div>

        {confirmation ? (
          <TicketOperationConfirmDialog
            operation={confirmation.operation}
            title={confirmation.title}
            confirmLabel={confirmation.confirmLabel}
            danger={confirmation.danger}
            pending={operations.mutationPending}
            error={operations.error}
            onCancel={() => {
              setConfirmation(null);
              operations.clearError();
            }}
            onConfirm={async (operation) => {
              const result = await operations.executeOperation(operation);
              if (result.ok) setConfirmation(null);
              return result.ok;
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
