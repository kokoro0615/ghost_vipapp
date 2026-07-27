"use client";

import { useEffect, useRef, useState } from "react";
import { Link2, Save, Unlink, UserRound, X } from "lucide-react";

import type { CustomerDetail, UiReservation } from "../contract/uiTypes";
import { DemoCue, useDemoMode } from "../demo/DemoMode";
import styles from "../VipFloorWorkspace.module.css";

type CustomerPatch = {
  expectedVersion: number;
  eventDayId: string;
  reservationId: string;
  nationalityCode: string | null;
  birthDate: string | null;
  anniversaryDate: string | null;
  vipRank: string | null;
};

type Props = {
  open: boolean;
  eventDayId: string;
  reservation: UiReservation | null;
  pending: boolean;
  onClose: () => void;
  onLoadCustomer: (customerId: string) => Promise<CustomerDetail | null>;
  onSaveCustomer: (customerId: string, patch: CustomerPatch) => Promise<boolean>;
  onRelinkCustomer: (draft: {
    reservationId: string;
    expectedVersion: number;
    customerId: string | null;
  }) => Promise<boolean>;
  onChanged: () => Promise<void>;
};

export function CustomerPanel({
  open,
  eventDayId,
  reservation,
  pending,
  onClose,
  onLoadCustomer,
  onSaveCustomer,
  onRelinkCustomer,
  onChanged,
}: Props) {
  const { enabled: isDemo } = useDemoMode();
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [targetCustomerId, setTargetCustomerId] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open || !reservation?.customerId) return;
    let cancelled = false;
    onLoadCustomer(reservation.customerId)
      .then((customer) => {
        if (!cancelled && customer) {
          setDetail(customer);
          setLoading(false);
        } else if (!cancelled) {
          setMessage("顧客詳細を取得できませんでした。");
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMessage("顧客詳細を取得できませんでした。");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [onLoadCustomer, open, reservation?.customerId]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() =>
      panelRef.current?.querySelector<HTMLElement>("button, input")?.focus(),
    );
    return () => {
      window.cancelAnimationFrame(frame);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  function trapFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = [...(panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? [])].filter((element) => element.getClientRects().length > 0);
    if (!controls.length) return;
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!open || !reservation) return null;
  const activeReservation = reservation;

  async function saveAttributes(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeReservation.customerId || !detail?.profileVersion) return;
    const form = new FormData(event.currentTarget);
    const saved = await onSaveCustomer(activeReservation.customerId, {
      expectedVersion: detail.profileVersion,
      eventDayId,
      reservationId: activeReservation.id,
      nationalityCode: nullable(form.get("nationalityCode")),
      birthDate: nullable(form.get("birthDate")),
      anniversaryDate: nullable(form.get("anniversaryDate")),
      vipRank: nullable(form.get("vipRank")),
    });
    if (!saved) {
      setMessage("顧客profileが更新されているか、入力を保存できませんでした。");
      return;
    }
    setMessage("顧客属性を保存しました。");
    const next = await onLoadCustomer(activeReservation.customerId);
    if (next) setDetail(next);
  }

  async function relink(customerId: string | null) {
    const saved = await onRelinkCustomer({
      reservationId: activeReservation.id,
      expectedVersion: activeReservation.version,
      customerId,
    });
    if (!saved) {
      setMessage("予約が更新されているか、顧客リンクを保存できませんでした。");
      return;
    }
    await onChanged();
    onClose();
  }

  return (
    <div className={styles.dialogBackdrop} role="presentation">
      <div
        ref={panelRef}
        className={styles.customerDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-panel-title"
        onKeyDown={trapFocus}
      >
        <header className={styles.commandHeader}>
          <div>
            <span>{isDemo ? "DEMO · SYNTHETIC CUSTOMER" : "OWNER · ENCRYPTED CUSTOMER"}</span>
            <h2 id="customer-panel-title">顧客詳細と紐付け</h2>
          </div>
          <DemoCue compact />
          <button type="button" onClick={onClose} aria-label="顧客詳細を閉じる">
            <X size={19} />
          </button>
        </header>

        <div className={styles.customerBody}>
          {loading ? <p aria-busy="true">{isDemo ? "合成profileを読み込んでいます…" : "暗号化profileを復号しています…"}</p> : null}
          {detail ? (
            <>
              <section className={styles.customerIdentity}>
                <UserRound size={20} />
                <div>
                  <strong>{detail.displayName || reservation.guestLabel}</strong>
                  <span>{detail.phone || "電話なし"} · {detail.email || "Eメールなし"}</span>
                </div>
                <small>PROFILE v{detail.profileVersion ?? "—"}</small>
              </section>

              <form className={styles.customerAttributeForm} onSubmit={saveAttributes}>
                <fieldset disabled={pending || !detail.profileVersion}>
                  <legend>顧客属性</legend>
                  <div className={styles.formColumns}>
                    <label>国籍コード<input name="nationalityCode" maxLength={2} defaultValue={detail.attributes?.nationalityCode ?? ""} placeholder="JP" /></label>
                    <label>VIP Rank<input name="vipRank" maxLength={32} defaultValue={detail.attributes?.vipRank ?? ""} /></label>
                    <label>生年月日<input name="birthDate" type="date" disabled={isDemo} defaultValue={isDemo ? "" : detail.attributes?.birthDate ?? ""} /></label>
                    <label>記念日<input name="anniversaryDate" type="date" disabled={isDemo} defaultValue={isDemo ? "" : detail.attributes?.anniversaryDate ?? ""} /></label>
                  </div>
                  {isDemo ? <p className={styles.wizardHint}>DEMOでは個人日付を保存できません。国籍コードと「デモ」を含むVIP Rankだけを合成属性として保存できます。</p> : null}
                  <button type="submit" className={styles.primaryButton}><Save size={15} />属性を保存</button>
                </fieldset>
              </form>

              <section className={styles.customerHistory}>
                <h3>予約履歴</h3>
                <ol>
                  {detail.reservationHistory.map((item) => (
                    <li key={item.reservationId}>
                      <strong>{item.publicCode}</strong>
                      <span>{item.businessDate ?? "日付不明"} · {item.guestCount}名</span>
                      <small>{item.lifecycleStatus} / {item.serviceStatus ?? "状態なし"}</small>
                    </li>
                  ))}
                </ol>
                <h3>紐付け履歴</h3>
                <ol>
                  {detail.linkHistory.map((item) => (
                    <li key={item.eventId}>
                      <strong>{item.unlinked ? "解除" : "紐付け"}</strong>
                      <span>{item.resolutionMethod}</span>
                      <small>{new Intl.DateTimeFormat("ja-JP", {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone: "Asia/Tokyo",
                      }).format(new Date(item.createdAt))}</small>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          ) : reservation.customerId ? null : (
            <p>この予約には顧客profileが紐付いていません。</p>
          )}

          <section className={styles.customerLinkControl}>
            <h3>手動解除・再紐付け</h3>
            <p>誤集約を戻す操作です。予約versionと監査履歴を更新します。</p>
            <div>
              <input
                value={targetCustomerId}
                onChange={(event) => setTargetCustomerId(event.target.value.trim())}
                placeholder="顧客 UUID"
                aria-label="再紐付け先の顧客ID"
              />
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={!isUuid(targetCustomerId)}
                onClick={() => void relink(targetCustomerId)}
              >
                <Link2 size={15} />再紐付け
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                disabled={!reservation.customerId}
                onClick={() => void relink(null)}
              >
                <Unlink size={15} />解除
              </button>
            </div>
          </section>
          <p role="status" className={styles.wizardHint}>{message}</p>
        </div>
      </div>
    </div>
  );
}

function nullable(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}
