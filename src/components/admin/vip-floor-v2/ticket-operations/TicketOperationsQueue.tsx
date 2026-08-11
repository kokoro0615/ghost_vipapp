"use client";

import { RefreshCw, Search } from "lucide-react";

import type {
  TicketOperationKind,
  TicketOperationQueueItem,
  TicketOperationsCapabilities,
  TicketOperationsQueueResponse,
} from "@/lib/ticketOperationsContract";

import {
  filterTicketOperationItems,
  type TicketQueueFilter,
  ticketOperationKindLabel,
} from "./state";
import styles from "./TicketOperations.module.css";

const PUBLIC_CODE_PATTERN = /^GT-[A-Z0-9]{8,24}$/u;
const FILTERS: Array<{ value: TicketQueueFilter; label: string; managerOnly?: boolean }> = [
  { value: "all", label: "すべて" },
  { value: "admission", label: "入場", managerOnly: true },
  { value: "refund_review", label: "返金確認" },
  { value: "checkout_review", label: "Checkout確認" },
  { value: "email_delivery", label: "メール", managerOnly: true },
  { value: "wallet_session", label: "Wallet", managerOnly: true },
];

function formatJst(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(new Date(value));
}

function priorityTone(priority: TicketOperationQueueItem["priority"]) {
  if (priority === "urgent") return "danger";
  if (priority === "attention") return "warning";
  return "neutral";
}

type Props = {
  queue: TicketOperationsQueueResponse | null;
  capabilities: TicketOperationsCapabilities;
  selectedPublicCode: string | null;
  query: string;
  filter: TicketQueueFilter;
  pending: boolean;
  onQuery: (query: string) => void;
  onFilter: (filter: TicketQueueFilter) => void;
  onSelect: (publicCode: string) => void;
  onRefresh: () => void;
};

export function TicketOperationsQueue({
  queue,
  capabilities,
  selectedPublicCode,
  query,
  filter,
  pending,
  onQuery,
  onFilter,
  onSelect,
  onRefresh,
}: Props) {
  const items = filterTicketOperationItems(queue?.items ?? [], query, filter, capabilities);
  const normalizedCode = query.trim().toUpperCase();
  const canLookup = PUBLIC_CODE_PATTERN.test(normalizedCode);

  return (
    <section className={styles.queuePane} aria-labelledby="ticket-queue-title">
      <header className={styles.paneHeader}>
        <div>
          <h3 id="ticket-queue-title">対応キュー</h3>
          <span className="tabular-nums">{items.length}件</span>
        </div>
        <button type="button" onClick={onRefresh} disabled={pending} aria-label="チケット対応キューを再読込">
          <RefreshCw size={18} aria-hidden />
        </button>
      </header>

      <form
        className={styles.queueSearch}
        onSubmit={(event) => {
          event.preventDefault();
          if (canLookup) onSelect(normalizedCode);
        }}
      >
        <label>
          <Search size={16} aria-hidden />
          <span className="sr-only">公開注文番号、メールの一部、イベント、入場状態で検索</span>
          <input
            type="search"
            value={query}
            placeholder="注文番号 / メール / イベント / 状態"
            autoComplete="off"
            onChange={(event) => onQuery(event.target.value)}
          />
        </label>
        <button type="submit" disabled={!canLookup}>注文を開く</button>
      </form>

      <div className={styles.queueFilters} role="group" aria-label="対応種別">
        {FILTERS.filter((item) => !item.managerOnly || capabilities.managerOperationsEnabled).map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={filter === item.value}
            data-active={filter === item.value || undefined}
            onClick={() => onFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={styles.queueScroll}>
        {items.length === 0 ? (
          <div className={styles.queueEmpty}>
            <strong>{query ? "一致する対応はありません" : "現在の対応はありません"}</strong>
            <span>{canLookup ? "注文を開くで直接確認できます。" : "検索条件を変えるか、再読込してください。"}</span>
          </div>
        ) : (
          <ol className={styles.queueList}>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  data-selected={selectedPublicCode === item.publicCode || undefined}
                  onClick={() => onSelect(item.publicCode)}
                >
                  <span className={styles.queueItemLead}>
                    <span className={styles.statusLabel} data-tone={priorityTone(item.priority)}>
                      <span aria-hidden />{ticketOperationKindLabel(item.kind as TicketOperationKind)} · {item.statusLabel}
                    </span>
                    <time className="tabular-nums" dateTime={item.updatedAt}>{formatJst(item.updatedAt)}</time>
                  </span>
                  <strong className="tabular-nums">{item.publicCode}</strong>
                  <span className={styles.queueIdentity}>
                    <span>{item.maskedEmail}</span>
                    <span>{item.environment === "live" ? "LIVE" : "TEST"}</span>
                  </span>
                  <span className={styles.queueEvent}>{item.eventTitle} · {item.eventDate}</span>
                  <span className={styles.queueSummary}>{item.summary}</span>
                </button>
              </li>
            ))}
          </ol>
        )}

        {capabilities.managerOperationsEnabled ? (
          <section className={styles.recentAdmissions} aria-labelledby="recent-admissions-title">
            <header>
              <h4 id="recent-admissions-title">最近の入場</h4>
              <span className="tabular-nums">{queue?.recentAdmissions.length ?? 0}件</span>
            </header>
            {(queue?.recentAdmissions.length ?? 0) === 0 ? (
              <p>確定済みの入場はありません。</p>
            ) : (
              <ol>
                {queue?.recentAdmissions.map((admission) => (
                  <li key={admission.admissionId}>
                    <span className={styles.statusLabel} data-tone="live"><span aria-hidden />入場済み</span>
                    <strong className="tabular-nums">{admission.publicCode}</strong>
                    <span className="tabular-nums">{admission.admittedCount}枚 · {formatJst(admission.admittedAt)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        ) : null}
      </div>
    </section>
  );
}
