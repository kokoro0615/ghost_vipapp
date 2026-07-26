"use client";

import { useEffect, useRef, useState } from "react";
import {
  BellRing,
  Check,
  Clock3,
  RefreshCw,
  UserRoundPlus,
  X,
} from "lucide-react";

import type { VipFloorBoardV2 } from "@/lib/vipFloorV2Contract";

import type {
  WaitlistAction,
  WaitlistEntry,
} from "../contract/uiTypes";
import styles from "../VipFloorWorkspace.module.css";

type Props = {
  open: boolean;
  pending: boolean;
  board: VipFloorBoardV2;
  entries: WaitlistEntry[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onAction: (action: WaitlistAction) => Promise<boolean>;
};

export function WaitlistPanel({
  open,
  pending,
  board,
  entries,
  onClose,
  onRefresh,
  onAction,
}: Props) {
  const [mode, setMode] = useState<"queue" | "create">("queue");
  const [now, setNow] = useState(() => Date.now());
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const focusFrame = window.requestAnimationFrame(() =>
      panelRef.current?.querySelector<HTMLElement>("button, input, select")?.focus(),
    );
    const clock = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.clearInterval(clock);
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
    const focusable = [...(panelRef.current?.querySelectorAll<HTMLElement>(
      "button:not([disabled]), input:not([disabled]), select:not([disabled])",
    ) ?? [])];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const saved = await onAction({
      action: "create",
      payload: {
        eventDayId: board.businessDay.id,
        guestCount: Number(data.get("guestCount")),
        guestLabel: nullableText(data.get("guestLabel")),
        email: nullableText(data.get("email")),
      },
    });
    if (saved) {
      event.currentTarget.reset();
      setMode("queue");
      await onRefresh();
    }
  }

  async function transition(
    entry: WaitlistEntry,
    action: "call" | "expire" | "cancel" | "seat",
    reservationId: string | null = null,
  ) {
    if (await onAction({
      action,
      payload: {
        waitlistEntryId: entry.id,
        expectedVersion: entry.version,
        reservationId,
      },
    })) {
      await onRefresh();
    }
  }

  return (
    <div className={styles.dialogBackdrop} role="presentation">
      <div
        ref={panelRef}
        className={styles.commandDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="waitlist-title"
        onKeyDown={trapFocus}
      >
        <header className={styles.commandHeader}>
          <div>
            <span>GHOST ARRIVAL QUEUE</span>
            <h2 id="waitlist-title">Waitlist</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Waitlistを閉じる">
            <X size={19} />
          </button>
        </header>

        <div className={styles.operationTabs}>
          <div role="tablist" aria-label="Waitlist表示">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "queue"}
              data-active={mode === "queue" || undefined}
              onClick={() => setMode("queue")}
            >
              <Clock3 size={16} />待機・呼出 {entries.filter((entry) =>
                entry.status === "waiting" || entry.status === "called").length}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "create"}
              data-active={mode === "create" || undefined}
              onClick={() => setMode("create")}
            >
              <UserRoundPlus size={16} />新規登録
            </button>
          </div>
          <button type="button" onClick={() => void onRefresh()} disabled={pending}>
            <RefreshCw size={16} />再読込
          </button>
        </div>

        {mode === "create" ? (
          <form className={styles.commandForm} onSubmit={create}>
            <div className={styles.commandContext}>
              <strong>待機へ追加</strong>
              <span>{board.businessDay.businessDate} / 連絡は任意</span>
            </div>
            <fieldset disabled={pending}>
              <legend>連絡先は暗号化し、Owner以外へ表示しません</legend>
              <div className={styles.formColumns}>
                <label>
                  表示名（任意）
                  <input name="guestLabel" maxLength={80} placeholder="入口で識別できる名前" />
                </label>
                <label>
                  人数
                  <input type="number" name="guestCount" min="1" max="99" defaultValue="2" required />
                </label>
              </div>
              <label>
                Eメール（呼出通知・任意）
                <input type="email" name="email" maxLength={254} autoComplete="off" />
              </label>
            </fieldset>
            <footer className={styles.commandFooter}>
              <button type="button" className={styles.secondaryButton} onClick={() => setMode("queue")}>
                戻る
              </button>
              <button type="submit" className={styles.primaryButton} disabled={pending}>
                <Check size={16} />Waitlistへ登録
              </button>
            </footer>
          </form>
        ) : (
          <div className={styles.waitlistBody}>
            {entries.length === 0 ? (
              <div className={styles.centerState}>
                <Clock3 size={26} />
                <h2>待機ゲストはいません</h2>
                <p>新規登録から入口待機を追加できます。</p>
              </div>
            ) : entries.map((entry) => (
              <WaitlistRow
                key={entry.id}
                entry={entry}
                now={now}
                pending={pending}
                reservations={board.reservations}
                onTransition={transition}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WaitlistRow({
  entry,
  now,
  pending,
  reservations,
  onTransition,
}: {
  entry: WaitlistEntry;
  now: number;
  pending: boolean;
  reservations: VipFloorBoardV2["reservations"];
  onTransition: (
    entry: WaitlistEntry,
    action: "call" | "expire" | "cancel" | "seat",
    reservationId?: string | null,
  ) => Promise<void>;
}) {
  const [reservationId, setReservationId] = useState("");
  const remaining = entry.callExpiresAt
    ? Math.max(0, Math.ceil((Date.parse(entry.callExpiresAt) - now) / 60_000))
    : null;
  const actionable = entry.storedStatus === "waiting" || entry.storedStatus === "called";

  return (
    <article className={styles.waitlistRow} data-status={entry.status}>
      <header>
        <div>
          <strong>{entry.guestLabel || "表示名なし"} · {entry.guestCount}名</strong>
          <span>{entry.email ? "Eメール通知可" : "連絡先なし"}</span>
        </div>
        <span className={styles.waitlistStatus}>
          {entry.status === "waiting" ? "待機"
            : entry.status === "called" ? `呼出中 · 残${remaining}分`
              : entry.status === "expired" ? "期限切れ"
                : entry.status === "seated" ? "着席済み"
                  : "取消済み"}
        </span>
      </header>
      {actionable ? (
        <div className={styles.waitlistActions}>
          <button
            type="button"
            onClick={() => void onTransition(entry, "call")}
            disabled={pending}
          >
            <BellRing size={15} />{entry.storedStatus === "called" ? "再通知" : "呼出（30分）"}
          </button>
          {entry.storedStatus === "called" ? (
            <>
              <label>
                着席予約
                <select value={reservationId} onChange={(event) => setReservationId(event.target.value)}>
                  <option value="">選択</option>
                  {reservations.map((reservation) => (
                    <option key={reservation.id} value={reservation.id}>
                      {reservation.publicCode} · {reservation.guestCount.total}名
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={pending || !reservationId}
                onClick={() => void onTransition(entry, "seat", reservationId)}
              >
                着席
              </button>
              <button type="button" disabled={pending} onClick={() => void onTransition(entry, "expire")}>
                期限切れ
              </button>
            </>
          ) : null}
          <button type="button" disabled={pending} onClick={() => void onTransition(entry, "cancel")}>
            取消
          </button>
        </div>
      ) : null}
    </article>
  );
}

function nullableText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}
