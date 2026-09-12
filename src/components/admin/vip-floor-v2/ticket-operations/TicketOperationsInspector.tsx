"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  MailPlus,
  RefreshCw,
  RotateCw,
  ShieldOff,
  UserCheck,
} from "lucide-react";

import type {
  TicketOperationCommand,
  TicketOperationsCapabilities,
  TicketOperationsOrderResponse,
  TicketRefundResolution,
} from "@/lib/ticketOperationsContract";

import type { TicketOperationsErrorState } from "./useTicketOperations";
import styles from "./TicketOperations.module.css";

export type TicketOperationIntent = {
  command: TicketOperationCommand;
  title: string;
  confirmLabel: string;
  danger?: boolean;
};

const REFUND_RESOLUTION_LABELS: Record<TicketRefundResolution, string> = {
  apply_and_void: "券別配分を記録して未使用券を無効化",
  record_admitted_exception: "入場済み例外として記録",
  dismiss_no_money_moved: "金銭移動なしとして終了",
};

const WALLET_STATE_LABELS = {
  not_started: "未開始",
  active: "有効",
  expired: "期限切れ",
  revoked: "失効済み",
} as const;

const OTP_DELIVERY_LABELS = {
  not_requested: "未要求",
  queued: "送信待ち",
  delivered: "配信済み",
  failed: "失敗",
  suppressed: "抑止",
} as const;

const OTP_RATE_LABELS = {
  available: "要求可能",
  cooldown: "再送待機",
  blocked: "制限中",
} as const;

const CHALLENGE_LABELS = {
  none: "なし",
  prepared: "提示待ち",
  expired: "期限切れ",
  committed: "確定済み",
} as const;

const ADMISSION_LABELS = {
  issued: "未入場",
  admitted: "入場済み",
  void: "無効",
} as const;

function formatJst(value: string | null) {
  if (!value) return "記録なし";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(new Date(value));
}

function formatAmount(amountMinor: number, currency: string) {
  const formatter = new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency,
  });
  const fractionDigits = formatter.resolvedOptions().maximumFractionDigits ?? 0;
  return formatter.format(amountMinor / (10 ** fractionDigits));
}

function statusTone(value: string) {
  if (["failed", "dead", "blocked", "void", "revoked", "closed", "stale"].includes(value)) return "danger";
  if (["cooldown", "retry", "queued", "pending", "degraded", "unknown"].includes(value)) return "warning";
  if (["active", "admitted", "delivered", "fresh", "ready", "open", "resolved"].includes(value)) return "live";
  return "neutral";
}

type Props = {
  response: TicketOperationsOrderResponse | null;
  capabilities: TicketOperationsCapabilities;
  checkoutReview: {
    reason: string;
    label: string;
  } | null;
  pending: boolean;
  error: TicketOperationsErrorState | null;
  compact: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onPrepare: (intent: TicketOperationIntent) => void;
};

export function TicketOperationsInspector({
  response,
  capabilities,
  checkoutReview,
  pending,
  error,
  compact,
  onBack,
  onRefresh,
  onPrepare,
}: Props) {
  const order = response?.order ?? null;
  const [selectedAdmissionIds, setSelectedAdmissionIds] = useState<string[]>([]);
  const wholeOrder = order?.entry?.admissionPolicy === "order_together_v1";
  const effectiveAdmissionIds = wholeOrder ? (order?.admissions.filter(a => a.status === "issued").map(a => a.admissionId) ?? []) : selectedAdmissionIds;
  const groupEligible = !wholeOrder || Boolean(order && !order.refundReview && order.admissions.every(a => a.status === "issued" || a.status === "void"));
  const [selectedRefundAdmissionIds, setSelectedRefundAdmissionIds] = useState<string[]>(
    () => order?.refundReview?.selectedAdmissionIds ?? [],
  );
  const [refundResolution, setRefundResolution] = useState<TicketRefundResolution | "">(
    () => order?.refundReview?.resolutionOptions[0] ?? "",
  );
  const [allocationAmounts, setAllocationAmounts] = useState<Record<string, string>>(
    () => Object.fromEntries(
      (order?.refundReview?.selectedAdmissionIds ?? []).map((admissionId) => [admissionId, ""]),
    ),
  );

  const refundEligibleAdmissions = useMemo(() => (
    order?.admissions.filter((admission) => admission.status !== "void") ?? []
  ), [order]);
  const selectedRefundAdmissions = useMemo(() => (
    refundEligibleAdmissions.filter((admission) => (
      selectedRefundAdmissionIds.includes(admission.admissionId)
    ))
  ), [refundEligibleAdmissions, selectedRefundAdmissionIds]);
  const allocations = selectedRefundAdmissions.map((admission) => ({
    admissionId: admission.admissionId,
    amountMinor: Number(allocationAmounts[admission.admissionId] ?? ""),
  }));
  const allocationTotal = allocations.reduce((sum, allocation) => (
    Number.isSafeInteger(allocation.amountMinor) ? sum + allocation.amountMinor : sum
  ), 0);
  const allocationRequired = refundResolution === "apply_and_void"
    || refundResolution === "record_admitted_exception";
  const refundReady = !allocationRequired
    || (allocations.length > 0
      && allocations.every((allocation) => Number.isSafeInteger(allocation.amountMinor) && allocation.amountMinor >= 1)
      && allocationTotal === order?.refundReview?.amountMinor);

  if (!response || !order) {
    return (
      <section className={styles.inspectorPane} aria-label="チケット注文詳細">
        {compact ? (
          <button type="button" className={styles.backButton} onClick={onBack}>
            <ArrowLeft size={18} aria-hidden />キューへ戻る
          </button>
        ) : null}
        <div className={styles.inspectorEmpty} aria-busy={pending || undefined}>
          <strong>{pending ? "注文を読込中" : "対応を選択してください"}</strong>
          <span>{pending ? "最新版を確認しています。" : "左のキューから注文を開きます。"}</span>
        </div>
      </section>
    );
  }

  const review = order.refundReview;
  const refundAuthorityBlocked = Boolean(review && (
    !review.authorityResolvable || review.observationHistoryState === "legacy_incomplete"
  ));
  const providerDisabled = response.health.emailProvider === "disabled";

  return (
    <article className={styles.inspectorPane} aria-labelledby="ticket-order-title">
      <header className={styles.inspectorHeader}>
        {compact ? (
          <button type="button" className={styles.backButton} onClick={onBack}>
            <ArrowLeft size={18} aria-hidden />キュー
          </button>
        ) : null}
        <div>
          <h3 id="ticket-order-title" className="tabular-nums">{order.publicCode}</h3>
          <span>{order.maskedEmail}</span>
        </div>
        <span className={styles.environmentMark} data-environment={order.environment}>
          {order.environment === "live" ? "LIVE" : "TEST"}
        </span>
        <button type="button" onClick={onRefresh} disabled={pending} aria-label="注文詳細を再読込">
          <RefreshCw size={18} aria-hidden />
        </button>
      </header>

      {error ? (
        <div className={styles.errorRail} role="alert">
          <strong>{error.error === "version_conflict" ? "更新競合" : "操作を確認できません"}</strong>
          <span>{error.message}</span>
          {error.recovery ? <span>{error.recovery}</span> : null}
          <button type="button" onClick={onRefresh}>最新版を再読込</button>
        </div>
      ) : null}

      <div className={styles.inspectorScroll}>
        <section className={styles.identityRail} aria-label="注文とイベント">
          <div>
            <span>イベント</span>
            <strong>{order.eventSession.eventTitle}</strong>
            <small className="tabular-nums">{order.eventSession.eventDate}</small>
          </div>
          <div>
            <span>入場枠</span>
            <strong className={styles.statusLabel} data-tone={statusTone(order.eventSession.state)}>
              <span aria-hidden />{order.eventSession.state === "open" ? "受付中" : order.eventSession.state === "closed" ? "終了" : "開始前"}
            </strong>
            <small className="tabular-nums">{formatJst(order.eventSession.admissionOpensAt)} – {formatJst(order.eventSession.admissionClosesAt)}</small>
          </div>
          <div>
            <span>注文版</span>
            <strong className="tabular-nums">v{order.expectedVersion}</strong>
            <small>SERVER CONFIRMED</small>
          </div>
        </section>

        <section className={styles.operationSection}>
          <header className={styles.sectionRule}>
            <h4>安全な案内</h4>
          </header>
          <p className={styles.recoveryInstruction}>{order.safeRecoveryInstruction}</p>
        </section>

        {checkoutReview ? (
          <section
            className={styles.operationSection}
            aria-label="Checkout確認（読み取り専用）"
          >
            <header className={styles.sectionRule}>
              <h4>Checkout確認</h4>
              <span className={styles.statusLabel} data-tone="warning">
                <span aria-hidden />要確認 · {checkoutReview.label}
              </span>
            </header>
            <div className={styles.checkoutReviewInstruction} role="status">
              <strong>Stripe Checkout / Payment の証跡を確認</strong>
              <p>
                実返金が必要な場合は Stripe でのみ実行し、この画面では金銭操作を行いません。
                生のメールアドレスを入力・収集しないでください。
              </p>
              <p>
                検証済みの決済終端・返金 webhook・復旧の事実が確認されるまで、この項目は対応キューに残ります。
              </p>
              <small className="tabular-nums">STATE {checkoutReview.reason}</small>
            </div>
          </section>
        ) : null}

        {capabilities.managerOperationsEnabled ? (
          <>
            <section className={styles.operationSection}>
              <header className={styles.sectionRule}>
                <h4>Wallet / OTP</h4>
              </header>
              <dl className={styles.factGrid}>
                <div><dt>Wallet</dt><dd className={styles.statusLabel} data-tone={statusTone(order.wallet.state)}><span aria-hidden />{WALLET_STATE_LABELS[order.wallet.state]}</dd></div>
                <div><dt>OTP送信</dt><dd className={styles.statusLabel} data-tone={statusTone(order.wallet.otpDelivery)}><span aria-hidden />{OTP_DELIVERY_LABELS[order.wallet.otpDelivery]}</dd></div>
                <div><dt>OTP制限</dt><dd className={styles.statusLabel} data-tone={statusTone(order.wallet.otpRateLimit)}><span aria-hidden />{OTP_RATE_LABELS[order.wallet.otpRateLimit]}</dd></div>
                <div><dt>challenge</dt><dd className={styles.statusLabel} data-tone={statusTone(order.wallet.challengeState)}><span aria-hidden />{CHALLENGE_LABELS[order.wallet.challengeState]}</dd></div>
                <div><dt>最終認証</dt><dd className="tabular-nums">{formatJst(order.wallet.lastVerifiedAt)}</dd></div>
                <div><dt>fresh期限</dt><dd className="tabular-nums">{formatJst(order.wallet.freshAuthenticationUntil)}</dd></div>
              </dl>
              {order.wallet.activeSessions.length ? (
                <ul className={styles.actionList}>
                  {order.wallet.activeSessions.map((session, index) => (
                    <li key={session.sessionId}>
                      <div>
                        <strong className="tabular-nums">有効session {index + 1}</strong>
                        <span className="tabular-nums">期限 {formatJst(session.expiresAt)}</span>
                      </div>
                      <button
                        type="button"
                        className={styles.dangerOutlineButton}
                        disabled={pending}
                        onClick={() => onPrepare({
                          command: {
                            action: "session_revoke",
                            orderPublicCode: order.publicCode,
                            sessionId: session.sessionId,
                            expectedVersion: session.expectedVersion,
                            reason: "",
                          },
                          title: "Wallet sessionを失効しますか",
                          confirmLabel: "sessionを失効",
                          danger: true,
                        })}
                      >
                        <ShieldOff size={16} aria-hidden />失効
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className={styles.emptyLine}>有効なWallet sessionはありません。</p>}
            </section>

            <section className={styles.operationSection}>
              <header className={styles.sectionRule}>
                <h4>入場券</h4>
                <span className="tabular-nums">{order.admissions.length}枚</span>
              </header>
              <fieldset className={styles.admissionList} disabled={pending}>
                <legend className="sr-only">Owner補助入場の対象券</legend>
                {wholeOrder && <p className={styles.emptyLine}>注文の全有効券を同時に受付します。全員の集合と身分証を確認してください。購入{order.entry?.originalCount}枚・取消{order.admissions.filter(a => a.status === "void").length}枚・有効{effectiveAdmissionIds.length}名。分割入場はできません。</p>}
                {order.admissions.map((admission) => {
                  const selectable = admission.status === "issued";
                  const checked = effectiveAdmissionIds.includes(admission.admissionId);
                  const Row = wholeOrder ? "div" : "label";
                  return (
                    <Row key={admission.admissionId} data-order-entry-row={wholeOrder || undefined} data-disabled={!selectable || undefined}>
                      {!wholeOrder && <input
                        type="checkbox"
                        checked={checked}
                        disabled={!selectable}
                        onChange={(event) => setSelectedAdmissionIds((current) => (
                          event.target.checked
                            ? [...current, admission.admissionId]
                            : current.filter((id) => id !== admission.admissionId)
                        ))}
                      />}
                      {wholeOrder && <span aria-label={selectable ? "全員同時受付の対象" : "受付対象外"}>{selectable ? "対象" : "—"}</span>}
                      <span className="tabular-nums">#{admission.serial}</span>
                      <strong>{admission.label}</strong>
                      <span className={styles.statusLabel} data-tone={statusTone(admission.status)}><span aria-hidden />{ADMISSION_LABELS[admission.status]}</span>
                      <small className="tabular-nums">{admission.admittedAt ? formatJst(admission.admittedAt) : "—"}</small>
                    </Row>
                  );
                })}
              </fieldset>
              <div className={styles.sectionAction}>
                <span>{order.eventSession.state === "open" ? "入場枠内" : "入場枠外"} · {effectiveAdmissionIds.length}枚{wholeOrder ? "全員対象" : "選択"}</span>
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={pending || order.eventSession.state !== "open" || effectiveAdmissionIds.length === 0 || !groupEligible}
                  onClick={() => onPrepare({
                    command: {
                      action: "assisted_admission",
                      orderPublicCode: order.publicCode,
                      environment: order.environment,
                      eventSessionId: order.eventSession.eventSessionId,
                      admissionIds: effectiveAdmissionIds,
                      expectedVersion: order.expectedVersion,
                      reason: "",
                    },
                    title: "Owner補助入場を確定しますか",
                    confirmLabel: wholeOrder ? `全員${effectiveAdmissionIds.length}名の入場を確定` : "選択券を入場済みにする",
                  })}
                >
                  <UserCheck size={16} aria-hidden />補助入場を確認
                </button>
              </div>
            </section>

            {order.entry && <section className={styles.operationSection}>
              <header className={styles.sectionRule}><h4>注文リンク・誤使用の救済</h4><span>全員同時入場</span></header>
              <p className={styles.emptyLine}>{order.entry.currentLink ? `注文リンク v${order.entry.currentLink.generation} · ${order.entry.currentLink.revokedAt ? "失効済み" : "発行済み"} · 受付終了 ${formatJst(order.entry.currentLink.expiresAt)}` : "購入メールのリンクを発行待ちです。"}</p>
              <div className={styles.sectionAction}>
                {(["entry_resend", "entry_rotate", "entry_revoke"] as const).map(action => <button type="button" className={styles.secondaryButton} key={action}
                  disabled={pending || !order.entry?.currentLink || (action !== "entry_rotate" && Boolean(order.entry.currentLink.revokedAt))}
                  onClick={() => onPrepare({ command: { action, orderPublicCode: order.publicCode, environment: order.environment, expectedVersion: order.expectedVersion,
                    expectedGeneration: order.entry?.currentLink?.generation ?? null, originalOperationId: null, guestCount: null, confirmation: null, reason: "" },
                    title: action === "entry_resend" ? "登録先に同じリンクを再送" : action === "entry_rotate" ? "漏えいしたリンクを交換" : "注文リンクを失効",
                    confirmLabel: action === "entry_resend" ? "再送を記録" : action === "entry_rotate" ? "失効・交換して送信" : "リンクを失効", danger: action !== "entry_resend" })}>
                  {action === "entry_resend" ? "登録先へ再送" : action === "entry_rotate" ? "漏えい時の交換" : "リンクを失効"}
                </button>)}
              </div>
              {order.entry.exception ? <p className={styles.emptyLine}>誤使用の例外受付を記録済み · {order.entry.exception.admittedCount}名 · {formatJst(order.entry.exception.createdAt)} · 再救済できません。</p> : <>
                <p className={styles.emptyLine}>誤スワイプの申告は、全員の集合・身分証・元の使用記録を確認して一回だけ判断します。欠席者や転送先の先使用が疑われる場合は確定せず照会してください。</p>
                <button type="button" className={styles.secondaryButton} disabled={pending || order.eventSession.state !== "open" || Boolean(order.refundReview)
                  || !order.entry.committedOperationId || order.admissions.some(a => a.status === "issued") || !order.admissions.some(a => a.status === "admitted")}
                  onClick={() => onPrepare({ command: { action: "entry_exception", orderPublicCode: order.publicCode, environment: order.environment, expectedVersion: order.expectedVersion,
                    expectedGeneration: null, originalOperationId: order.entry?.committedOperationId ?? null, guestCount: order.admissions.filter(a => a.status === "admitted").length, confirmation: "", reason: "" },
                    title: `誤使用を確認した全員${order.admissions.filter(a => a.status === "admitted").length}名の例外受付`, confirmLabel: "一回の例外受付を記録" })}>誤使用の例外受付を確認</button>
              </>}
            </section>}

            <section className={styles.operationSection}>
              <header className={styles.sectionRule}>
                <h4>送信状態</h4>
                <span className={styles.statusLabel} data-tone={statusTone(response.health.emailProvider)}><span aria-hidden />事業者 {response.health.emailProvider}</span>
              </header>
              <dl className={styles.healthLine}>
                <div><dt>再試行</dt><dd className="tabular-nums">{response.health.outboxRetryCount}</dd></div>
                <div><dt>dead</dt><dd className="tabular-nums">{response.health.outboxDeadCount}</dd></div>
                <div><dt>Webhook</dt><dd className={styles.statusLabel} data-tone={statusTone(response.health.webhookFreshness)}><span aria-hidden />{response.health.webhookFreshness}</dd></div>
                <div><dt>最終受信</dt><dd className="tabular-nums">{formatJst(response.health.lastWebhookAt)}</dd></div>
              </dl>
              {providerDisabled ? <p className={styles.warningLine}>送信事業者が無効です。再投入は復旧後に実行してください。</p> : null}
              <ul className={styles.actionList}>
                {order.emailJobs.map((job) => (
                  <li key={job.emailJobId}>
                    <div>
                      <strong>{job.purpose === "otp" ? "OTP" : job.purpose === "wallet_access" ? "購入案内" : "復旧メール"}</strong>
                      <span className={styles.statusLabel} data-tone={statusTone(job.status)}><span aria-hidden />{job.status} · {job.attemptCount}回</span>
                    </div>
                    {job.purpose === "wallet_access" ? <p className={styles.warningLine}>購入案内は自動で再送されます。配信停止・受付不明の場合は送信記録を確認し、本人認証によるチケット再取得をご案内ください。</p> : null}
                    <div className={styles.inlineActions}>
                      <button
                        type="button"
                        disabled={pending || !job.retryable || providerDisabled}
                        onClick={() => onPrepare({
                          command: {
                            action: "email_retry",
                            emailJobId: job.emailJobId,
                            issueRecoveryMail: false,
                            expectedVersion: job.expectedVersion,
                            reason: "",
                          },
                          title: "送信jobを再投入しますか",
                          confirmLabel: "再投入",
                        })}
                      >
                        <RotateCw size={16} aria-hidden />再投入
                      </button>
                      <button
                        type="button"
                        disabled={pending || !job.retryable || providerDisabled}
                        onClick={() => onPrepare({
                          command: {
                            action: "email_retry",
                            emailJobId: job.emailJobId,
                            issueRecoveryMail: true,
                            expectedVersion: job.expectedVersion,
                            reason: "",
                          },
                          title: "復旧メールを発行しますか",
                          confirmLabel: "復旧メールを発行",
                        })}
                      >
                        <MailPlus size={16} aria-hidden />復旧メール
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : null}

        {capabilities.refundReviewEnabled ? (
          <section className={styles.operationSection}>
            <header className={styles.sectionRule}>
              <h4>返金確認</h4>
              {review ? <span className={styles.statusLabel} data-tone={statusTone(review.status)}><span aria-hidden />{review.status === "pending" ? "要確認" : "解決済み"}</span> : null}
            </header>
            {!review ? <p className={styles.emptyLine}>この注文に返金確認はありません。</p> : (
              <>
                <dl className={styles.refundFacts}>
                  <div><dt>対象額</dt><dd className="tabular-nums">{formatAmount(review.amountMinor, review.currency)}</dd></div>
                  <div><dt>provider event</dt><dd className="tabular-nums">{review.providerEventId}</dd></div>
                  <div><dt>観測版</dt><dd className="tabular-nums">v{review.observationVersion}</dd></div>
                  <div><dt>金銭移動</dt><dd>{review.moneyMayHaveMoved ? "可能性あり" : "なし"}</dd></div>
                  <div><dt>競合理由</dt><dd>{review.observationHistoryState === "legacy_incomplete" ? "観測履歴が不完全" : review.conflictReason ?? "なし"}</dd></div>
                </dl>
                {refundAuthorityBlocked ? (
                  <div className={styles.refundAuthorityInstruction} role="status">
                    <strong>保存済みの観測履歴が不完全です</strong>
                    <p>保存済みの観測履歴が不完全なため、この画面では終端解決できません。Stripeの権威ある決済・返金履歴を照合し、forward fixで回復してください。</p>
                    <small>この確認は非破壊です。返金レーンには、権威ある事実が回復するまで表示され続けます。</small>
                  </div>
                ) : null}
                {!refundAuthorityBlocked ? <fieldset className={styles.refundAdmissions} disabled={pending || review.status !== "pending"}>
                  <legend>返金配分の対象券</legend>
                  {refundEligibleAdmissions.map((admission) => (
                    <label key={admission.admissionId}>
                      <input
                        type="checkbox"
                        checked={selectedRefundAdmissionIds.includes(admission.admissionId)}
                        onChange={(event) => setSelectedRefundAdmissionIds((current) => (
                          event.target.checked
                            ? [...current, admission.admissionId]
                            : current.filter((id) => id !== admission.admissionId)
                        ))}
                      />
                      <span className="tabular-nums">#{admission.serial}</span>
                      <span>{admission.label}</span>
                      <span className={styles.statusLabel} data-tone={statusTone(admission.status)}><span aria-hidden />{ADMISSION_LABELS[admission.status]}</span>
                    </label>
                  ))}
                  {refundEligibleAdmissions.length === 0 ? <span>選択できる券はありません。</span> : null}
                </fieldset> : null}
                {review.status === "pending" && !refundAuthorityBlocked ? (
                  <div className={styles.refundResolve}>
                    <label>
                      <span>解決方法</span>
                      <select
                        value={refundResolution}
                        onChange={(event) => setRefundResolution(event.target.value as TicketRefundResolution)}
                      >
                        {review.resolutionOptions.map((option) => (
                          <option key={option} value={option}>{REFUND_RESOLUTION_LABELS[option]}</option>
                        ))}
                      </select>
                    </label>
                    {allocationRequired ? (
                      <fieldset className={styles.allocationFields}>
                        <legend>券別配分</legend>
                        {selectedRefundAdmissions.map((admission) => (
                          <label key={admission.admissionId}>
                            <span className="tabular-nums">#{admission.serial} {admission.label}</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              min="0"
                              step="1"
                              value={allocationAmounts[admission.admissionId] ?? ""}
                              onChange={(event) => setAllocationAmounts((current) => ({
                                ...current,
                                [admission.admissionId]: event.target.value,
                              }))}
                            />
                            <span>円</span>
                          </label>
                        ))}
                        <p data-valid={refundReady || undefined}>
                          <span>配分合計</span>
                          <strong className="tabular-nums">{formatAmount(allocationTotal, review.currency)} / {formatAmount(review.amountMinor, review.currency)}</strong>
                        </p>
                      </fieldset>
                    ) : null}
                    <div className={styles.sectionAction}>
                      <span>この画面では金銭の返金を作成しません。</span>
                      <button
                        type="button"
                        className={refundResolution === "apply_and_void" ? styles.dangerButton : styles.primaryButton}
                        disabled={pending || !refundResolution || !refundReady}
                        onClick={() => onPrepare({
                          command: {
                            action: "refund_resolve",
                            reviewId: review.reviewId,
                            resolution: refundResolution as TicketRefundResolution,
                            allocations: allocationRequired ? allocations : [],
                            expectedVersion: review.expectedVersion,
                            observationVersion: review.observationVersion,
                            observationHash: review.observationHash,
                            reason: "",
                          },
                          title: "返金確認を解決しますか",
                          confirmLabel: "解決を記録",
                          danger: refundResolution === "apply_and_void",
                        })}
                      >
                        確認へ
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </section>
        ) : null}

        <section className={styles.operationSection}>
          <header className={styles.sectionRule}>
            <h4>監査履歴</h4>
            <span className="tabular-nums">{order.timeline.length}件</span>
          </header>
          <ol className={styles.auditTimeline}>
            {order.timeline.map((event) => (
              <li key={event.auditId}>
                <time className="tabular-nums" dateTime={event.occurredAt}>{formatJst(event.occurredAt)}</time>
                <strong>{event.label}</strong>
                <span>{event.actorLabel}</span>
                {event.reason ? <p>{event.reason}</p> : null}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </article>
  );
}
