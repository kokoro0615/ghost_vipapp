"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Mail } from "lucide-react";

import {
  formatGhostTimeRange,
  getGhostOperatingWindow,
  isGhostOperatingInterval,
} from "@/lib/ghostOperatingHours";
import type { VipFloorBoardV2, VipServiceStatus } from "@/lib/vipFloorV2Contract";

import type {
  OperationDraft,
  OperationOptions,
  StaffWorkspaceData,
  UiReservation,
} from "../contract/uiTypes";
import { useDemoMode } from "../demo/DemoMode";
import { BusinessTimeFields } from "./BusinessTimeFields";
import styles from "../VipFloorWorkspace.module.css";
import { useTrialMode } from "../TrialMode";

const STEPS = ["日付", "時刻", "人数", "卓", "顧客", "追加", "担当", "確認"] as const;

/*
 * Visual grouping only. All eight steps stay separate, keep their order, and
 * stay individually reachable and announced; this just tells the operator which
 * part of the job they are in so eight equal cells stop reading as eight equal
 * tasks.
 */
const PHASES = [
  { label: "日時・席", firstStep: 0, lastStep: 3 },
  { label: "顧客・詳細", firstStep: 4, lastStep: 6 },
  { label: "確認", firstStep: 7, lastStep: 7 },
] as const;

const SOURCE_LABELS: Record<Draft["sourceChannel"], string> = {
  admin_hold: "管理者作成",
  online: "GHOST Web",
};

const SERVICE_STATUS_LABELS: Record<string, string> = {
  expected: "来店予定",
  late: "遅刻",
  arrived: "到着",
  seated: "着席",
};

type Draft = {
  startAt: string;
  endAt: string;
  offeringId: string;
  guestCount: number;
  tableIds: string[];
  displayName: string;
  phone: string;
  email: string;
  languageCode: string;
  guestLabel: string;
  operatorNote: string;
  sourceChannel: "admin_hold" | "online";
  serviceStatus: VipServiceStatus;
  bookingStaffMemberId: string;
  notificationPreference: "none" | "email";
};

type Props = {
  board: VipFloorBoardV2;
  options: OperationOptions;
  staffData: StaffWorkspaceData | null;
  selectedTableId: string | null;
  reservation?: UiReservation | null;
  pending: boolean;
  datePending: boolean;
  onRun: (draft: OperationDraft) => Promise<boolean>;
  onDone: () => void;
  onBusinessDateChange: (businessDate: string) => Promise<boolean>;
};

export function ReservationWizard({
  board,
  options,
  staffData,
  selectedTableId,
  reservation = null,
  pending,
  datePending,
  onRun,
  onDone,
  onBusinessDateChange,
}: Props) {
  const trialMode = useTrialMode();
  const demoMode = useDemoMode();
  const syntheticMode = trialMode || demoMode.enabled;
  const defaults = useMemo(
    () => reservation
      ? {
          start: localInput(reservation.startAt),
          end: localInput(reservation.endAt),
        }
      : scheduleDefaults(board),
    [board, reservation],
  );
  const initialOfferingId = reservation?.bookingOfferingId
    ?? options.offerings.find((offering) =>
      selectedTableId
      && (
        offering.compatibleTableIds === null
        || offering.compatibleTableIds.includes(selectedTableId)
      ))?.id
    ?? options.offerings[0]?.id
    ?? "";
  const initialOffering = options.offerings.find((offering) => offering.id === initialOfferingId);
  const initialTableIds = (reservation?.tableIds ?? (selectedTableId ? [selectedTableId] : []))
    .filter((tableId) =>
      initialOffering?.compatibleTableIds === null
      || initialOffering?.compatibleTableIds.includes(tableId));
  const [step, setStep] = useState(0);
  const [dateError, setDateError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() => ({
    startAt: defaults.start,
    endAt: defaults.end,
    offeringId: initialOfferingId,
    guestCount: reservation?.guestCount ?? 2,
    tableIds: initialTableIds,
    displayName: reservation?.guestLabel ?? "",
    phone: "",
    email: "",
    languageCode: "ja",
    guestLabel: reservation?.guestLabel ?? "",
    operatorNote: reservation?.operatorNote ?? "",
    sourceChannel: reservation?.sourceChannel === "online" ? "online" : "admin_hold",
    serviceStatus: (reservation?.serviceStatus ?? "expected") as VipServiceStatus,
    bookingStaffMemberId: reservation?.bookingStaffMemberId ?? "",
    notificationPreference: reservation?.notificationPreference ?? "none",
  }));
  const selectedOffering = options.offerings.find((offering) => offering.id === draft.offeringId);
  const compatibleTableIds = selectedOffering?.compatibleTableIds === null
    ? null
    : new Set(selectedOffering?.compatibleTableIds ?? []);
  const availableTables = board.tables.filter((table) =>
    compatibleTableIds === null || compatibleTableIds.has(table.id));
  const hasTableMismatch = draft.tableIds.some((tableId) =>
    compatibleTableIds !== null && !compatibleTableIds.has(tableId));
  const selectedTables = board.tables.filter((table) => draft.tableIds.includes(table.id));
  const capacity = selectedTables.reduce((sum, table) => sum + table.capacityMax, 0);
  const canContinue = !datePending
    && !dateError
    && (step < 3 || !hasTableMismatch)
    && stepValid(step, draft, Boolean(reservation), options.businessDay.businessDate);

  const phase = PHASES.find((entry) => step >= entry.firstStep && step <= entry.lastStep) ?? PHASES[0];
  const tableCodes = selectedTables.map((table) => table.displayCode).join("・");
  const capacityShort = selectedTables.length > 0 && capacity < draft.guestCount;
  const staffName = (staffData?.staffMembers ?? [])
    .find((member) => member.id === draft.bookingStaffMemberId)?.displayName ?? null;
  const emailMissing = draft.notificationPreference === "email" && !reservation && !draft.email;
  const guestName = (reservation?.guestLabel ?? draft.displayName) || "匿名";

  function patch(next: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...next }));
  }

  async function save() {
    if (!canContinue) return;
    const shared = {
        eventDayId: options.businessDay.id,
        offeringId: draft.offeringId,
        scheduledStartAt: toTokyoTimestamp(draft.startAt),
        scheduledEndAt: toTokyoTimestamp(draft.endAt),
        guestCount: draft.guestCount,
        tableIds: draft.tableIds,
        expectedTableVersions: selectedTables.map((table) => ({
          tableId: table.id,
          expectedVersion: table.version,
        })),
        existingCustomerId: null,
        displayName: nullable(draft.displayName),
        phone: nullable(draft.phone),
        email: nullable(draft.email),
        languageCode: nullable(draft.languageCode),
        guestLabel: nullable(draft.guestLabel),
        operatorNote: nullable(draft.operatorNote),
        sourceChannel: draft.sourceChannel,
        serviceStatus: draft.serviceStatus,
        bookingStaffMemberId: nullable(draft.bookingStaffMemberId),
        notificationPreference: draft.notificationPreference,
    };
    const saved = await onRun(reservation
      ? {
          kind: "reservation_update",
          payload: {
            reservationId: reservation.id,
            expectedVersion: reservation.version,
            offeringId: shared.offeringId,
            scheduledStartAt: shared.scheduledStartAt,
            scheduledEndAt: shared.scheduledEndAt,
            guestCount: shared.guestCount,
            tableIds: shared.tableIds,
            expectedTableVersions: shared.expectedTableVersions,
            guestLabel: shared.guestLabel,
            operatorNote: shared.operatorNote,
            sourceChannel: shared.sourceChannel,
            serviceStatus: shared.serviceStatus,
            bookingStaffMemberId: shared.bookingStaffMemberId,
            notificationPreference: shared.notificationPreference,
          },
        }
      : {
          kind: "reservation_create",
          payload: shared,
        });
    if (saved) onDone();
  }

  async function changeBusinessDate(nextBusinessDate: string) {
    if (
      reservation
      || !nextBusinessDate
      || nextBusinessDate === options.businessDay.businessDate
    ) {
      return;
    }
    setDateError(null);
    const changed = await onBusinessDateChange(nextBusinessDate);
    if (!changed) {
      setDateError("この日の予約情報を取得できませんでした。別の日を選ぶか、営業日設定を確認してください。");
    }
  }

  return (
    <section
      id="operation-panel"
      className={styles.reservationWizard}
      aria-label={`予約${reservation ? "編集" : "作成"} ${step + 1}/8 ${STEPS[step]}`}
    >
      <div className={styles.wizardProgress}>
        <p className={styles.wizardPhase}>
          <strong>{phase.label}</strong>
          <span className="tabular-nums">{step + 1}/8</span>
          <em>{STEPS[step]}</em>
        </p>
        <ol className={styles.wizardRail} aria-label={`予約${reservation ? "編集" : "作成"}ステップ`}>
          {STEPS.map((label, index) => (
            <li
              key={label}
              data-state={index < step ? "done" : index === step ? "current" : "todo"}
              data-phase-start={PHASES.some((entry) => entry.firstStep === index) || undefined}
              aria-current={index === step ? "step" : undefined}
            >
              <span className={styles.wizardRailMark} aria-hidden>
                {index < step ? <Check size={11} strokeWidth={3} /> : index + 1}
              </span>
              <small>{label}</small>
              {/* State is never colour-only: it is also spoken. */}
              <span className="sr-only">
                {index < step ? "入力済み" : index === step ? "現在の段階" : "未入力"}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* The running record stays on screen at every width, so no step ever
        * hides what the operator already decided. */}
      <dl className={styles.wizardSummaryBar} aria-label="入力済みの予約内容">
        <div>
          <dt>日付</dt>
          <dd className="tabular-nums">{board.businessDay.businessDate}</dd>
        </div>
        <div>
          <dt>時刻</dt>
          <dd className="tabular-nums">
            {formatGhostTimeRange(draft.startAt, draft.endAt, options.businessDay.businessDate)}
          </dd>
        </div>
        <div>
          <dt>人数</dt>
          <dd className="tabular-nums">{draft.guestCount}名</dd>
        </div>
        <div>
          <dt>卓</dt>
          <dd data-empty={selectedTables.length === 0 || undefined}>{tableCodes || "未選択"}</dd>
        </div>
      </dl>

      <div className={styles.wizardBody} data-single={step === 7 || undefined}>
        <div className={styles.wizardActive}>
        {step === 0 ? (
          <fieldset>
            <legend>予約日を選ぶ</legend>
            {reservation ? (
              <p className={styles.wizardLockedValue}>
                <span className="tabular-nums">{board.businessDay.businessDate}</span>
              </p>
            ) : (
              <label className={styles.wizardDateControl}>
                予約日
                <input
                  type="date"
                  value={options.businessDay.businessDate}
                  disabled={pending || datePending}
                  aria-describedby={`reservation-date-hint${dateError ? " reservation-date-error" : ""}`}
                  onChange={(event) => void changeBusinessDate(event.target.value)}
                />
              </label>
            )}
            <p id="reservation-date-hint" className={styles.wizardHint}>
              {reservation
                ? "予約日の変更は新規事前予約から行います。"
                : datePending
                  ? "選択日の営業枠・プラン・卓状況を確認しています…"
                  : "外側の営業日も自動で切り替わります。"}
            </p>
            {dateError ? (
              <p id="reservation-date-error" className={styles.wizardFieldError} role="alert">
                {dateError}
              </p>
            ) : null}
            <dl className={styles.wizardFacts}>
              <div>
                <dt>営業枠</dt>
                <dd className="tabular-nums">22:00–翌05:00</dd>
              </div>
              <div>
                <dt>正式卓</dt>
                <dd className="tabular-nums">VIP-1〜VIP-{board.tables.length}</dd>
              </div>
            </dl>
          </fieldset>
        ) : null}
        {step === 1 ? (
          <fieldset>
            <legend>予約時刻と滞在時間</legend>
            <BusinessTimeFields
              businessDate={options.businessDay.businessDate}
              value={{ startAt: draft.startAt, endAt: draft.endAt }}
              disabled={pending || datePending}
              onChange={(value) => patch(value)}
            />
            <p className={styles.wizardReadout}>
              <span>この予約の時間帯</span>
              <strong className="tabular-nums">
                {formatGhostTimeRange(draft.startAt, draft.endAt, options.businessDay.businessDate)}
              </strong>
              <em className="tabular-nums">{stayLabel(draft.startAt, draft.endAt)}</em>
            </p>
            <p className={styles.wizardHint}>保存時にも22:00〜翌05:00の営業範囲と卓の重複を再検証します。</p>
          </fieldset>
        ) : null}
        {step === 2 ? (
          <fieldset>
            <legend>プランと人数</legend>
            <div className={styles.formColumns}>
              <label>
                プラン
                <select
                  value={draft.offeringId}
                  onChange={(event) => {
                    const offeringId = event.target.value;
                    const offering = options.offerings.find((item) => item.id === offeringId);
                    patch({
                      offeringId,
                      tableIds: draft.tableIds.filter((tableId) =>
                        offering?.compatibleTableIds === null
                        || offering?.compatibleTableIds.includes(tableId)),
                    });
                  }}
                >
                  {options.offerings.map((offering) => (
                    <option key={offering.id} value={offering.id}>{offering.name} / {offering.minGuests}–{offering.maxGuests}名</option>
                  ))}
                </select>
              </label>
              <label>人数<input type="number" min="1" max="99" value={draft.guestCount} onChange={(event) => patch({ guestCount: Number(event.target.value) })} /></label>
            </div>
          </fieldset>
        ) : null}
        {step === 3 ? (
          <fieldset>
            <legend>卓を選ぶ</legend>
            <div className={styles.checkGrid} role="group" aria-label="予約卓">
              {availableTables.map((table) => (
                <label key={table.id} data-selected={draft.tableIds.includes(table.id) || undefined}>
                  <input
                    type="checkbox"
                    checked={draft.tableIds.includes(table.id)}
                    onChange={(event) => patch({
                      tableIds: event.target.checked
                        ? [...draft.tableIds, table.id]
                        : draft.tableIds.filter((id) => id !== table.id),
                    })}
                  />
                  <span>{table.displayCode}</span>
                  <small className="tabular-nums">{table.capacityMax}名</small>
                </label>
              ))}
            </div>
            <p className={styles.wizardHint}>
              選択したプランで登録できる卓だけを表示しています。
            </p>
            <p className={capacityShort ? styles.wizardWarning : styles.wizardHint}>
              選択 <span className="tabular-nums">{selectedTables.length}</span>卓 / 定員{" "}
              <span className="tabular-nums">{capacity}</span>名 / 予約{" "}
              <span className="tabular-nums">{draft.guestCount}</span>名
              {capacityShort ? " — 定員が不足しています。卓を追加してください。" : null}
            </p>
            {/* The plan is a working instrument on this step only: real venue
              * geometry, real colour, and the selection actually marked. */}
            <figure className={styles.wizardMap}>
              <Image
                src="/media/images/vipmapv3.9239fd2174.webp"
                alt="GHOST Osaka VIPフロアのカラー座席図"
                width={1672}
                height={940}
                unoptimized
                sizes="(min-width: 1024px) 560px, 92vw"
                className={styles.wizardMapImage}
              />
              {/* The plan artwork already prints every table number, so the
                * overlay is a bracket around the selection rather than a second
                * set of labels — and it stays open so the printed code below it
                * is still readable. */}
              {selectedTables.map((table) => (
                <span
                  key={table.id}
                  className={styles.wizardMapNode}
                  style={{
                    left: `${table.geometry.xPercent}%`,
                    top: `${table.geometry.yPercent}%`,
                  }}
                  aria-hidden
                />
              ))}
              <figcaption>
                {selectedTables.length > 0
                  ? `座席図で強調しているのが選択中の${tableCodes}です。`
                  : "卓を選ぶと座席図の該当位置を強調します。"}
              </figcaption>
            </figure>
          </fieldset>
        ) : null}
        {step === 4 ? (
          <fieldset>
            <legend>{demoMode.enabled ? "顧客（合成データ専用）" : "顧客（暗号化・Owner限定）"}</legend>
            {reservation ? (
              <>
                <p className={styles.wizardLockedValue}>{reservation.guestLabel}</p>
                <p className={styles.wizardHint}>{demoMode.enabled
                  ? reservation.customerId
                    ? "現在の合成顧客リンクをbrowser-localで保持します。"
                    : "合成顧客未紐付けのまま更新します。"
                  : reservation.customerId
                    ? "現在の暗号化顧客リンクを保持します。"
                    : "顧客未紐付けのまま更新します。"}</p>
              </>
            ) : (
              <>
                <label>氏名<input value={draft.displayName} maxLength={120} autoComplete="off" placeholder={demoMode.enabled ? "例: デモゲスト001" : trialMode ? "例: TRIAL-ゲスト01" : undefined} onChange={(event) => patch({ displayName: event.target.value })} /></label>
                <div className={styles.formColumns}>
                  <label>電話<input type="tel" value={draft.phone} maxLength={40} autoComplete="off" disabled={syntheticMode} aria-describedby={syntheticMode ? "synthetic-phone-rule" : undefined} onChange={(event) => patch({ phone: event.target.value })} /></label>
                  <label>Eメール<input type="email" value={draft.email} maxLength={254} autoComplete="off" placeholder={demoMode.enabled ? "demo-001@example.invalid" : trialMode ? "trial-01@example.com" : undefined} pattern={demoMode.enabled ? "^[^@\\s]+@example\\.invalid$" : trialMode ? "^[^@\\s]+@example\\.com$" : undefined} onChange={(event) => patch({ email: event.target.value })} /></label>
                </div>
                {syntheticMode ? (
                  <p id="synthetic-phone-rule" className={styles.trialInputHint}>
                    {demoMode.enabled
                      ? "DEMOでは電話番号を保存できません。氏名はデモ cue必須、Eメールは@example.invalidだけ使用できます。"
                      : "TRIALでは電話番号は入力できません。Eメールは@example.comのみ使用できます。"}
                  </p>
                ) : null}
                <label>言語<select value={draft.languageCode} onChange={(event) => patch({ languageCode: event.target.value })}><option value="ja">日本語</option><option value="en">English</option><option value="zh">中文</option><option value="ko">한국어</option></select></label>
                <p className={styles.wizardHint}>電話の完全一致を優先し、電話がない場合だけEメールで自動集約します。</p>
              </>
            )}
          </fieldset>
        ) : null}
        {step === 5 ? (
          <fieldset>
            <legend>追加情報</legend>
            <div className={styles.formColumns}>
              <label>経路<select value={draft.sourceChannel} onChange={(event) => patch({ sourceChannel: event.target.value as Draft["sourceChannel"] })}><option value="admin_hold">管理者作成</option><option value="online">GHOST Web</option></select></label>
              <label>状態<select value={draft.serviceStatus} onChange={(event) => patch({ serviceStatus: event.target.value as VipServiceStatus })}><option value="expected">来店予定</option><option value="late">遅刻</option><option value="arrived">到着</option><option value="seated">着席</option></select></label>
            </div>
            <label>入口表示名<input value={draft.guestLabel} maxLength={80} onChange={(event) => patch({ guestLabel: event.target.value })} /></label>
            <label>現場共有メモ<textarea value={draft.operatorNote} maxLength={500} onChange={(event) => patch({ operatorNote: event.target.value })} /></label>
          </fieldset>
        ) : null}
        {step === 6 ? (
          <fieldset>
            <legend>予約担当者</legend>
            <label>
              担当スタッフ
              <select value={draft.bookingStaffMemberId} onChange={(event) => patch({ bookingStaffMemberId: event.target.value })}>
                <option value="">未指定</option>
                {(staffData?.staffMembers ?? []).filter((member) => member.active).map((member) => (
                  <option key={member.id} value={member.id}>{member.displayName}</option>
                ))}
              </select>
            </label>
            <p className={styles.wizardHint}>予約担当者は営業日ごとの卓担当者とは別に保存します。</p>
          </fieldset>
        ) : null}
        {step === 7 ? (
          <div className={styles.wizardConfirm}>
            <h3>この内容で{reservation ? "更新" : "作成"}します</h3>
            <dl>
              <div><dt>営業日</dt><dd className="tabular-nums">{board.businessDay.businessDate}</dd></div>
              <div>
                <dt>時刻</dt>
                <dd className="tabular-nums">
                  {formatGhostTimeRange(draft.startAt, draft.endAt, options.businessDay.businessDate)}
                </dd>
              </div>
              <div><dt>人数</dt><dd className="tabular-nums">{draft.guestCount}名</dd></div>
              <div>
                <dt>卓</dt>
                <dd data-empty={selectedTables.length === 0 || undefined}>
                  {tableCodes || "未選択"}
                  {selectedTables.length > 0 ? <span className="tabular-nums"> / 定員{capacity}名</span> : null}
                </dd>
              </div>
              <div><dt>顧客</dt><dd>{guestName}</dd></div>
              <div><dt>入口表示名</dt><dd data-empty={draft.guestLabel ? undefined : true}>{draft.guestLabel || "未設定"}</dd></div>
              <div><dt>経路 / 状態</dt><dd>{SOURCE_LABELS[draft.sourceChannel]} / {SERVICE_STATUS_LABELS[draft.serviceStatus] ?? draft.serviceStatus}</dd></div>
              <div><dt>担当</dt><dd data-empty={staffName ? undefined : true}>{staffName ?? "未指定"}</dd></div>
              <div><dt>通知</dt><dd>{draft.notificationPreference === "email" ? "Eメール送信" : "送信しない"}</dd></div>
              <div><dt>現場メモ</dt><dd data-empty={draft.operatorNote ? undefined : true}>{draft.operatorNote || "なし"}</dd></div>
              <div><dt>版</dt><dd>{reservation ? `v${reservation.version}を更新` : "新規作成"}</dd></div>
            </dl>
            <fieldset>
              <legend>顧客通知</legend>
              <label className={styles.choiceRow}><input type="radio" name="notify" checked={draft.notificationPreference === "none"} onChange={() => patch({ notificationPreference: "none" })} />送信しない</label>
              <label className={styles.choiceRow}><input type="radio" name="notify" checked={draft.notificationPreference === "email"} disabled={demoMode.enabled} onChange={() => patch({ notificationPreference: "email" })} /><Mail size={15} />{demoMode.enabled ? "DEMOでは外部送信なし" : "Eメール送信"}</label>
            </fieldset>
            {emailMissing ? <p className={styles.wizardFieldError} role="alert">Eメール送信には顧客Eメールが必要です。手順5でEメールを入力してください。</p> : null}
            <p className={styles.wizardHint}>
              保存時に版と席競合を再検証し、{reservation ? "予約変更" : "新規予約作成"}を監査へ記録します。
            </p>
          </div>
        ) : null}
        </div>
        {step === 7 ? null : (
          <aside className={styles.wizardAside} aria-label="この予約の控え">
            <dl>
              <div><dt>顧客</dt><dd>{guestName}</dd></div>
              <div><dt>入口表示名</dt><dd data-empty={draft.guestLabel ? undefined : true}>{draft.guestLabel || "未設定"}</dd></div>
              <div><dt>担当</dt><dd data-empty={staffName ? undefined : true}>{staffName ?? "未指定"}</dd></div>
              <div><dt>通知</dt><dd>{draft.notificationPreference === "email" ? "Eメール送信" : "送信しない"}</dd></div>
              <div><dt>版</dt><dd>{reservation ? `v${reservation.version}` : "新規"}</dd></div>
              <div>
                <dt>データ</dt>
                <dd>{syntheticMode ? "合成のみ" : "Owner"}</dd>
              </div>
            </dl>
          </aside>
        )}
      </div>
      <footer className={styles.wizardFooter}>
        <button type="button" className={styles.secondaryButton} disabled={step === 0 || pending} onClick={() => setStep((current) => current - 1)}>
          <ArrowLeft size={16} />戻る
        </button>
        <span>{step < 7 ? `次は ${STEPS[step + 1]}` : "保存前の最終確認"}</span>
        {step < 7 ? (
          <button type="button" className={styles.primaryButton} disabled={!canContinue || pending} onClick={() => setStep((current) => current + 1)}>
            次へ<ArrowRight size={16} />
          </button>
        ) : (
          <button type="button" className={styles.primaryButton} disabled={!canContinue || pending} onClick={() => void save()}>
            <Check size={16} />競合確認して{reservation ? "更新" : "作成"}
          </button>
        )}
      </footer>
    </section>
  );
}

function stepValid(step: number, draft: Draft, editing: boolean, businessDate: string) {
  if (step === 1) return isGhostOperatingInterval(draft.startAt, draft.endAt, businessDate);
  if (step === 2) return Boolean(draft.offeringId && draft.guestCount >= 1);
  if (step === 3) return draft.tableIds.length > 0;
  if (step === 7) {
    return isGhostOperatingInterval(draft.startAt, draft.endAt, businessDate)
      && Boolean(draft.offeringId && draft.guestCount >= 1)
      && draft.tableIds.length > 0
      && (draft.notificationPreference !== "email" || editing || Boolean(draft.email));
  }
  return true;
}

function scheduleDefaults(board: VipFloorBoardV2) {
  const window = getGhostOperatingWindow(board.businessDay.businessDate);
  const startAt = Date.parse(window.startAt);
  return {
    start: localInput(new Date(startAt).toISOString()),
    end: localInput(new Date(Math.min(
      startAt + 120 * 60_000,
      Date.parse(window.endAt),
    )).toISOString()),
  };
}

/* Presentational only: both inputs are naive local strings, so the difference is
 * timezone-independent. */
function stayLabel(startAt: string, endAt: string) {
  const minutes = Math.round((Date.parse(endAt) - Date.parse(startAt)) / 60_000);
  if (!Number.isFinite(minutes) || minutes <= 0) return "—";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}分`;
  return rest === 0 ? `${hours}時間` : `${hours}時間${rest}分`;
}

function localInput(value: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
    timeZone: "Asia/Tokyo",
  }).format(new Date(value)).replace(" ", "T");
}

function toTokyoTimestamp(value: string) {
  return `${value}:00+09:00`;
}

function nullable(value: string) {
  const normalized = value.trim();
  return normalized || null;
}
