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
                {order.admissions.map((admission) => {
                  const selectable = admission.status === "issued";
                  const checked = selectedAdmissionIds.includes(admission.admissionId);
                  return (
                    <label key={admission.admissionId} data-disabled={!selectable || undefined}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!selectable}
                        onChange={(event) => setSelectedAdmissionIds((current) => (
                          event.target.checked
                            ? [...current, admission.admissionId]
                            : current.filter((id) => id !== admission.admissionId)
                        ))}
                      />
                      <span className="tabular-nums">#{admission.serial}</span>
                      <strong>{admission.label}</strong>
                      <span className={styles.statusLabel} data-tone={statusTone(admission.status)}><span aria-hidden />{ADMISSION_LABELS[admission.status]}</span>
                      <small className="tabular-nums">{admission.admittedAt ? formatJst(admission.admittedAt) : "—"}</small>
                    </label>
                  );
                })}
              </fieldset>
              <div className={styles.sectionAction}>
                <span>{order.eventSession.state === "open" ? "入場枠内" : "入場枠外"} · {selectedAdmissionIds.length}枚選択</span>
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={pending || order.eventSession.state !== "open" || selectedAdmissionIds.length === 0}
                  onClick={() => onPrepare({
                    command: {
                      action: "assisted_admission",
                      orderPublicCode: order.publicCode,
                      environment: order.environment,
                      eventSessionId: order.eventSession.eventSessionId,
                      admissionIds: selectedAdmissionIds,
                      expectedVersion: order.expectedVersion,
                      reason: "",
                    },
                    title: "Owner補助入場を確定しますか",
                    confirmLabel: "選択券を入場済みにする",
                  })}
                >
                  <UserCheck size={16} aria-hidden />補助入場を確認
                </button>
              </div>
            </section>

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
                      <strong>{job.purpose === "otp" ? "OTP" : job.purpose === "wallet_access" ? "Wallet案内" : "復旧メール"}</strong>
                      <span className={styles.statusLabel} data-tone={statusTone(job.status)}><span aria-hidden />{job.status} · {job.attemptCount}回</span>
                    </div>
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
