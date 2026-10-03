"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Mail } from "lucide-react";

import {
  formatGhostTimeRange,
  ghostActualTimeLabel,
  isGhostOperatingInterval,
} from "@/lib/ghostOperatingHours";
import type { VipFloorBoardV2, VipServiceStatus } from "@/lib/vipFloorV2Contract";

import type {
  CommandOutcome,
  OperationDraft,
  OperationOptions,
  StaffWorkspaceData,
  UiReservation,
} from "../contract/uiTypes";
import { useDemoMode } from "../demo/DemoMode";
import { BusinessDateField, formatBusinessDateWithWeekday } from "../shell/BusinessDateField";
import { BusinessTimeFields } from "./BusinessTimeFields";
import { occupancyLabel, tableOccupancy } from "./tableOccupancy";
import styles from "../VipFloorWorkspace.module.css";
import { useTrialMode } from "../TrialMode";

const SOURCE_LABELS: Record<Draft["sourceChannel"], string> = {
  phone: "電話受付",
  admin: "管理者作成",
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
  operatorNote: string;
  sourceChannel: "online" | "phone" | "admin";
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
  /** The last save failure. The wizard shows it itself: the page-level status
   * line sits behind this dialog, so a rejected save used to look like a dead
   * button. */
  failure?: CommandOutcome | null;
  /** Reservation label, independent from the encrypted customer profile. */
  guestLabel: string;
  onGuestLabelChange: (guestLabel: string) => void;
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
  failure = null,
  guestLabel,
  onGuestLabelChange,
  onRun,
  onDone,
  onBusinessDateChange,
}: Props) {
  const trialMode = useTrialMode();
  const demoMode = useDemoMode();
  const syntheticMode = trialMode || demoMode.enabled;
  const initialOfferingId = reservation?.bookingOfferingId
    ?? options.offerings.find((offering) =>
      selectedTableId
      && (
        offering.compatibleTableIds === null
        || offering.compatibleTableIds === undefined
        || offering.compatibleTableIds.includes(selectedTableId)
      ))?.id
    ?? options.offerings[0]?.id
    ?? "";
  const initialOffering = options.offerings.find((offering) => offering.id === initialOfferingId);
  const initialTableIds = (reservation?.tableIds ?? (selectedTableId ? [selectedTableId] : []))
    .filter((tableId) =>
      initialOffering?.compatibleTableIds === null
      || initialOffering?.compatibleTableIds === undefined
      || initialOffering?.compatibleTableIds.includes(tableId));
  const [reviewing, setReviewing] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  // A failure stays on screen until the operator moves to fix it; a later
  // failure is a new object and shows again.
  const [acknowledgedFailure, setAcknowledgedFailure] = useState<CommandOutcome | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [capacityOverrideConfirmed, setCapacityOverrideConfirmed] = useState(false);
  const [capacityOverrideReason, setCapacityOverrideReason] = useState("");
  const [draft, setDraft] = useState<Draft>(() => ({
    startAt: reservation ? localInput(reservation.startAt) : "",
    endAt: reservation ? localInput(reservation.endAt) : "",
    offeringId: initialOfferingId,
    guestCount: reservation?.guestCount ?? 0,
    tableIds: initialTableIds,
    displayName: "",
    phone: "",
    email: "",
    languageCode: "ja",
    operatorNote: reservation?.operatorNote ?? "",
    sourceChannel: reservation?.sourceChannel === "online"
      || reservation?.sourceChannel === "phone"
      || reservation?.sourceChannel === "admin"
      ? reservation.sourceChannel
      : "phone",
    serviceStatus: (reservation?.serviceStatus ?? "expected") as VipServiceStatus,
    bookingStaffMemberId: reservation?.bookingStaffMemberId ?? "",
    notificationPreference: reservation?.notificationPreference ?? "none",
  }));
  const selectedOffering = options.offerings.find((offering) => offering.id === draft.offeringId);
  const compatibleTableIds = selectedOffering?.compatibleTableIds === null
    || selectedOffering?.compatibleTableIds === undefined
    ? null
    : new Set(selectedOffering?.compatibleTableIds ?? []);
  const hasTableMismatch = draft.tableIds.some((tableId) =>
    compatibleTableIds !== null && !compatibleTableIds.has(tableId));
  const selectedTables = board.tables.filter((table) => draft.tableIds.includes(table.id));
  const capacity = selectedTables.reduce((sum, table) => sum + table.capacityMax, 0);
  const capacityShort = selectedTables.length > 0 && capacity < draft.guestCount;
  const capacityOverrideReady = !capacityShort
    || (capacityOverrideConfirmed && capacityOverrideReason.trim().length > 0);
  const occupancy = tableOccupancy(board, draft.startAt, draft.endAt, reservation?.id ?? null);
  const occupiedSelection = selectedTables.filter((table) => occupancy.has(table.id));
  const nameValid = guestLabel.trim().length > 0 && guestLabel.trim().length <= 80;
  const countValid = Number.isInteger(draft.guestCount) && draft.guestCount >= 1 && draft.guestCount <= 99;
  const timeValid = isGhostOperatingInterval(draft.startAt, draft.endAt, options.businessDay.businessDate);
  const canContinue = !datePending && !dateError && nameValid && countValid && timeValid
    && Boolean(draft.offeringId) && draft.tableIds.length > 0 && !hasTableMismatch
    && capacityOverrideReady && occupiedSelection.length === 0
    && (draft.notificationPreference !== "email" || Boolean(reservation) || /^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(draft.email));
  const visibleFailure = failure && !failure.ok && failure !== acknowledgedFailure ? failure : null;
  const failureNeedsTableOrTime = visibleFailure !== null && TABLE_OR_TIME_FAILURES.has(visibleFailure.code);

  const tableCodes = selectedTables.map((table) => table.displayCode).join("・");
  const staffName = (staffData?.staffMembers ?? [])
    .find((member) => member.id === draft.bookingStaffMemberId)?.displayName ?? null;
  const emailMissing = draft.notificationPreference === "email" && !reservation && !draft.email;
  // What gets saved: `nullable()` trims, so the receipt shows the trimmed name.
  const savedGuestLabel = guestLabel.trim();
  /* The customer profile is a separate encrypted record and never feeds the
   * ledger, so its row states the profile — the optional profile name, or the
   * link an edit keeps — and never repeats the reservation name. */
  const customerSummary = reservation
    ? reservation.customerId ? "紐付け済み" : "未紐付け"
    : draft.displayName.trim() || null;

  function editFields() {
    setAcknowledgedFailure(failure);
    setReviewing(false);
  }

  function review(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    if (canContinue) {
      setReviewing(true);
      window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("h3")?.focus());
    } else {
      window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
    }
  }

  function patch(next: Partial<Draft>) {
    if (next.guestCount !== undefined || next.tableIds !== undefined || next.offeringId !== undefined) {
      setCapacityOverrideConfirmed(false);
      setCapacityOverrideReason("");
    }
    setDraft((current) => ({ ...current, ...next }));
  }

  async function save() {
    if (!canContinue || pending || !reviewing) return;
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
        guestLabel: nullable(guestLabel),
        operatorNote: nullable(draft.operatorNote),
        sourceChannel: draft.sourceChannel,
        serviceStatus: draft.serviceStatus,
        bookingStaffMemberId: nullable(draft.bookingStaffMemberId),
        notificationPreference: draft.notificationPreference,
        ...(capacityShort && capacityOverrideConfirmed
          ? {
              confirmedCapacityOverride: true as const,
              capacityOverrideReason: capacityOverrideReason.trim(),
            }
          : {}),
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
      setDateError("この日は予約受付対象外です。定休日または営業日未登録の可能性があるため、別の日を選んでください。");
      return;
    }
    // Personal fields stay in this form. Date-specific choices must be made
    // against the new day's offerings and occupancy, never an old table version.
    setDraft((current) => ({ ...current, startAt: "", endAt: "", tableIds: [], offeringId: "" }));
    setCapacityOverrideConfirmed(false);
    setCapacityOverrideReason("");
    setAttempted(false);
  }

  return (
    <form
      ref={formRef}
      id="operation-panel"
      className={styles.reservationWizard}
      aria-label={`予約${reservation ? "編集" : "作成"} ${reviewing ? "確認" : "入力"}`}
      noValidate
      onSubmit={review}
    >
      <dl className={styles.wizardSummaryBar} aria-label="入力済みの予約内容">
        <div>
          <dt>日付</dt>
          {/* The venue's order with its weekday, matching the control the
            * operator just used. An ISO string beside a picker that reads
            * 2026/07/31(金) is two spellings of the same night. */}
          <dd className="tabular-nums">
            {formatBusinessDateWithWeekday(board.businessDay.businessDate)}
          </dd>
        </div>
        <div>
          <dt>時刻</dt>
          <dd className="tabular-nums">
            {timeValid ? formatGhostTimeRange(draft.startAt, draft.endAt, options.businessDay.businessDate) : "未選択"}
                  {timeValid && ghostActualTimeLabel(draft.startAt, draft.endAt, options.businessDay.businessDate) ? <small className={styles.actualTimeLabel}>{ghostActualTimeLabel(draft.startAt, draft.endAt, options.businessDay.businessDate)}</small> : null}
          </dd>
        </div>
        <div>
          <dt>人数</dt>
          <dd className="tabular-nums">{draft.guestCount ? `${draft.guestCount}名` : "未入力"}</dd>
        </div>
        <div>
          <dt>卓</dt>
          <dd data-empty={selectedTables.length === 0 || undefined}>{tableCodes || "未選択"}</dd>
        </div>
      </dl>

      <div className={`${styles.wizardBody} ${styles.reservationFormBody}`} data-single>
        <div className={`${styles.wizardActive} ${styles.reservationFields}`} data-reviewing={reviewing || undefined}
          tabIndex={reviewing ? 0 : undefined} role={reviewing ? "region" : undefined} aria-label={reviewing ? "予約内容の確認" : undefined}>
        {!reviewing ? (
          <fieldset disabled={pending || datePending}>
            <legend>予約名と予約日</legend>
            <div className={styles.wizardField}>
              <label>
                予約名（必須）
                <input
                  value={guestLabel}
                  required
                  aria-invalid={attempted && !nameValid}
                  maxLength={80}
                  autoComplete="off"
                  placeholder={demoMode.enabled ? "例: デモ予約001" : trialMode ? "例: TRIAL-予約01" : "例: 山田様"}
                  aria-describedby="reservation-guest-label-hint"
                  onChange={(event) => onGuestLabelChange(event.target.value)}
                />
              </label>
              <p id="reservation-guest-label-hint" className={styles.wizardHint}>
                予約一覧の「ゲスト」に表示されます。
                {demoMode.enabled ? "DEMOでは「デモ」または「DEMO」を含む架空名だけを入力してください。" : null}
              </p>
            </div>
            {attempted && !nameValid ? <p className={styles.wizardFieldError} role="alert">予約名を入力してください（80文字以内）。</p> : null}
            {reservation ? (
              <p className={styles.wizardLockedValue}>
                <span className="tabular-nums">
                  {formatBusinessDateWithWeekday(board.businessDay.businessDate)}
                </span>
              </p>
            ) : (
              <div className={styles.wizardDateControl}>
                <BusinessDateField
                  label="予約日"
                  value={options.businessDay.businessDate}
                  disabled={pending || datePending}
                  describedBy={`reservation-date-hint${dateError ? " reservation-date-error" : ""}`}
                  onChange={(next) => void changeBusinessDate(next)}
                />
              </div>
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

          </fieldset>
        ) : null}
        {!reviewing ? (
          <fieldset disabled={pending || datePending}>
            <legend>予約時刻と滞在時間</legend>
            <BusinessTimeFields
              businessDate={options.businessDay.businessDate}
              showErrors={attempted}
              value={{ startAt: draft.startAt, endAt: draft.endAt }}
              disabled={pending || datePending}
              onChange={(value) => patch(value)}
            />
          </fieldset>
        ) : null}
        {!reviewing ? (
          <fieldset disabled={pending || datePending}>
            <legend>プランと人数</legend>
            <div className={styles.formColumns}>
              <label>
                プラン
                <select
                  required
                  aria-invalid={attempted && !draft.offeringId}
                  aria-label="プラン"
                  value={draft.offeringId}
                  onChange={(event) => {
                    const offeringId = event.target.value;
                    const offering = options.offerings.find((item) => item.id === offeringId);
                    patch({
                      offeringId,
                      tableIds: draft.tableIds.filter((tableId) =>
                        offering?.compatibleTableIds === null
                        || offering?.compatibleTableIds === undefined
                        || offering?.compatibleTableIds.includes(tableId)),
                    });
                  }}
                >
                  <option value="" disabled>プランを選択</option>
                  {options.offerings.map((offering) => (
                    <option key={offering.id} value={offering.id}>{offering.name} / {offering.minGuests}–{offering.maxGuests}名</option>
                  ))}
                </select>
              </label>
              <label>人数（必須）<input type="number" inputMode="numeric" required min="1" max="99" step="1" aria-invalid={attempted && !countValid} value={draft.guestCount || ""} placeholder="人数を入力" onChange={(event) => patch({ guestCount: Number(event.target.value) })} /></label>
              {attempted && !countValid ? <p className={styles.wizardFieldError} role="alert">人数を1〜99名の整数で入力してください。</p> : null}
            </div>
          </fieldset>
        ) : null}
        {!reviewing ? (
          <fieldset disabled={pending || datePending}>
            <legend>卓を選ぶ</legend>
            {attempted && draft.tableIds.length === 0 ? <p className={styles.wizardFieldError} role="alert">予約卓を選択してください。</p> : null}
            <div className={styles.checkGrid} role="group" aria-label="予約卓">
              {board.tables.map((table) => {
                const compatible = compatibleTableIds === null || compatibleTableIds.has(table.id);
                const occupied = occupancy.get(table.id);
                const selected = draft.tableIds.includes(table.id);
                return (
                <label
                  key={table.id}
                  data-selected={selected || undefined}
                  data-unavailable={!compatible || Boolean(occupied) || undefined}
                  data-occupied={compatible && occupied ? true : undefined}
                >
                  <input
                    type="checkbox"
                    aria-invalid={attempted && draft.tableIds.length === 0}
                    // A table that became busy after it was picked stays
                    // uncheckable, so the operator can clear it.
                    disabled={!compatible || (Boolean(occupied) && !selected)}
                    checked={draft.tableIds.includes(table.id)}
                    onChange={(event) => patch({
                      tableIds: event.target.checked
                        ? [...draft.tableIds, table.id]
                        : draft.tableIds.filter((id) => id !== table.id),
                    })}
                  />
                  <span>{table.displayCode}</span>
                  <small className="tabular-nums">
                    {table.capacityMax}名{!compatible ? " / プラン外" : occupied ? ` / ${occupancyLabel(occupied, board.businessDay.businessDate)}` : ""}
                  </small>
                </label>
                );
              })}
            </div>
            <p className={styles.wizardHint}>
              全卓を表示しています。選択中プランで登録できない卓と、この時間帯に予約・受付ブロックがある卓は理由つきで無効になります。
            </p>
            {occupiedSelection.length > 0 ? (
              <p className={styles.wizardWarning} role="alert">
                {occupiedSelection.map((table) => `${table.displayCode}は${occupancyLabel(occupancy.get(table.id)!, board.businessDay.businessDate)}`).join("、")}と重なっています。別の卓を選ぶか、時刻を変更してください。
              </p>
            ) : null}
            <p className={capacityShort ? styles.wizardWarning : styles.wizardHint}>
              選択 <span className="tabular-nums">{selectedTables.length}</span>卓 / 定員{" "}
              <span className="tabular-nums">{selectedTables.length > 0 ? capacity : "—"}</span>{selectedTables.length > 0 ? "名" : ""} / 予約{" "}
              <span className="tabular-nums">{draft.guestCount}</span>名
              {capacityShort ? " — 定員が不足しています。卓を追加してください。" : null}
            </p>
            {capacityShort ? (
              <section className={styles.capacityOverrideRail} aria-label="Owner定員超過確認">
                <strong>定員超過 — 監査確認が必要</strong>
                <p>卓を追加できない場合だけ、理由を記録してOwner権限で続行できます。</p>
                <label className={styles.choiceRow}>
                  <input
                    type="checkbox"
                    checked={capacityOverrideConfirmed}
                    onChange={(event) => setCapacityOverrideConfirmed(event.target.checked)}
                  />
                  定員超過をOwner権限で承認
                </label>
                <label>
                  承認理由
                  <textarea
                    value={capacityOverrideReason}
                    maxLength={240}
                    disabled={!capacityOverrideConfirmed}
                    required={capacityOverrideConfirmed}
                    placeholder="例: V1を6名で利用、導線と補助椅子を確認済み"
                    onChange={(event) => setCapacityOverrideReason(event.target.value)}
                  />
                </label>
              </section>
            ) : null}
            {/* The plan is a working instrument alongside the table selection: real venue
              * geometry, real colour, and the selection actually marked. */}
            <details className={styles.reservationMapDetails}>
              <summary>フロア図を確認</summary>
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
            </details>
          </fieldset>
        ) : null}
        {!reviewing ? (
          <fieldset disabled={pending || datePending}>
            <legend>{demoMode.enabled ? "顧客（合成データ専用）" : "顧客（暗号化・Owner限定）"}</legend>
            {reservation ? (
              <>
                <p className={styles.wizardLockedValue}>{customerSummary}</p>
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
                <label>顧客氏名<input value={draft.displayName} maxLength={120} autoComplete="off" placeholder={demoMode.enabled ? "例: デモゲスト001" : trialMode ? "例: TRIAL-ゲスト01" : undefined} onChange={(event) => patch({ displayName: event.target.value })} /></label>
                <div className={styles.formColumns}>
                  <label>電話<input type="tel" value={draft.phone} maxLength={40} autoComplete="off" disabled={syntheticMode} aria-describedby={syntheticMode ? "synthetic-phone-rule" : undefined} onChange={(event) => patch({ phone: event.target.value })} /></label>
                  <label>Eメール<input type="email" aria-invalid={attempted && draft.notificationPreference === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(draft.email)} value={draft.email} maxLength={254} autoComplete="off" placeholder={demoMode.enabled ? "demo-001@example.invalid" : trialMode ? "trial-01@example.com" : undefined} pattern={demoMode.enabled ? "^[^@\\s]+@example\\.invalid$" : trialMode ? "^[^@\\s]+@example\\.com$" : undefined} onChange={(event) => patch({ email: event.target.value })} /></label>
                </div>
                {syntheticMode ? (
                  <p id="synthetic-phone-rule" className={styles.trialInputHint}>
                    {demoMode.enabled
                      ? "DEMOでは電話番号を保存できません。顧客氏名はデモ cue必須、Eメールは@example.invalidだけ使用できます。"
                      : "TRIALでは電話番号は入力できません。Eメールは@example.comのみ使用できます。"}
                  </p>
                ) : null}
                <label>言語<select value={draft.languageCode} onChange={(event) => patch({ languageCode: event.target.value })}><option value="ja">日本語</option><option value="en">English</option><option value="zh">中文</option><option value="ko">한국어</option></select></label>
                <p className={styles.wizardHint}>電話の完全一致を優先し、電話がない場合だけEメールで自動集約します。</p>
              </>
            )}
          </fieldset>
        ) : null}
        {!reviewing ? (
          <fieldset disabled={pending || datePending}>
            <legend>追加情報</legend>
            <div className={styles.formColumns}>
              <label>経路<select value={draft.sourceChannel} onChange={(event) => patch({ sourceChannel: event.target.value as Draft["sourceChannel"] })}><option value="phone">電話受付</option><option value="admin">管理者作成</option><option value="online">GHOST Web</option></select></label>
              <label>状態<select value={draft.serviceStatus} onChange={(event) => patch({ serviceStatus: event.target.value as VipServiceStatus })}><option value="expected">来店予定</option><option value="late">遅刻</option><option value="arrived">到着</option><option value="seated">着席</option></select></label>
            </div>
            <label>現場共有メモ<textarea aria-label="現場共有メモ" value={draft.operatorNote} maxLength={500} onChange={(event) => patch({ operatorNote: event.target.value })} /></label>
          </fieldset>
        ) : null}
        {!reviewing ? (
          <fieldset disabled={pending || datePending}>
            <legend>予約担当者</legend>
            <label>
              担当スタッフ
              <select aria-label="担当スタッフ" value={draft.bookingStaffMemberId} onChange={(event) => patch({ bookingStaffMemberId: event.target.value })}>
                <option value="">未指定</option>
                {(staffData?.staffMembers ?? []).filter((member) => member.active).map((member) => (
                  <option key={member.id} value={member.id}>{member.displayName}</option>
                ))}
              </select>
            </label>
            <p className={styles.wizardHint}>予約担当者は営業日ごとの卓担当者とは別に保存します。</p>
          </fieldset>
        ) : null}
        {!reviewing ? (
            <fieldset disabled={pending || datePending}>
              <legend>顧客通知</legend>
              {attempted && emailMissing ? <p role="alert" className={styles.wizardFieldError}>Eメール送信には顧客Eメールが必要です。</p> : null}
              <label className={styles.choiceRow}><input type="radio" name="notify" checked={draft.notificationPreference === "none"} onChange={() => patch({ notificationPreference: "none" })} />送信しない</label>
              <label className={styles.choiceRow}><input type="radio" name="notify" checked={draft.notificationPreference === "email"} disabled={demoMode.enabled} onChange={() => patch({ notificationPreference: "email" })} /><Mail size={16} />{demoMode.enabled ? "DEMOでは外部送信なし" : "Eメール送信"}</label>
            </fieldset>
        ) : null}
        {reviewing ? (
          <div className={styles.wizardConfirm}>
            <h3 tabIndex={-1}>この内容で{reservation ? "更新" : "作成"}します</h3>
            <dl>
              <div><dt>予約名</dt><dd data-empty={savedGuestLabel ? undefined : true}>{savedGuestLabel || "未設定"}</dd></div>
              <div><dt>営業日</dt><dd className="tabular-nums">{formatBusinessDateWithWeekday(board.businessDay.businessDate)}</dd></div>
              <div>
                <dt>時刻</dt>
                <dd className="tabular-nums">
                  {timeValid ? formatGhostTimeRange(draft.startAt, draft.endAt, options.businessDay.businessDate) : "未選択"}
                  {timeValid && ghostActualTimeLabel(draft.startAt, draft.endAt, options.businessDay.businessDate) ? <small className={styles.actualTimeLabel}>{ghostActualTimeLabel(draft.startAt, draft.endAt, options.businessDay.businessDate)}</small> : null}
                </dd>
              </div>
              <div><dt>人数</dt><dd className="tabular-nums">{draft.guestCount ? `${draft.guestCount}名` : "未入力"}</dd></div>
              <div>
                <dt>卓</dt>
                <dd data-empty={selectedTables.length === 0 || undefined}>
                  {tableCodes || "未選択"}
                  {selectedTables.length > 0 ? <span className="tabular-nums"> / 定員{capacity}名</span> : null}
                </dd>
              </div>
              <div><dt>顧客</dt><dd data-empty={customerSummary ? undefined : true}>{customerSummary ?? "未入力"}</dd></div>
              <div><dt>経路 / 状態</dt><dd>{SOURCE_LABELS[draft.sourceChannel]} / {SERVICE_STATUS_LABELS[draft.serviceStatus] ?? draft.serviceStatus}</dd></div>
              <div><dt>担当</dt><dd data-empty={staffName ? undefined : true}>{staffName ?? "未指定"}</dd></div>
              <div><dt>通知</dt><dd>{draft.notificationPreference === "email" ? "Eメール送信" : "送信しない"}</dd></div>
              <div><dt>現場メモ</dt><dd data-empty={draft.operatorNote ? undefined : true}>{draft.operatorNote || "なし"}</dd></div>
                  <div><dt>版</dt><dd>{reservation ? `v${reservation.version}を更新` : "新規作成"}</dd></div>
                  {capacityShort ? (
                    <div><dt>定員超過</dt><dd>{capacityOverrideConfirmed ? `Owner承認 / ${capacityOverrideReason}` : "未承認"}</dd></div>
                  ) : null}
            </dl>
            {emailMissing ? <p className={styles.wizardFieldError} role="alert">Eメール送信には顧客Eメールが必要です。入力画面でEメールを入力してください。</p> : null}
            {occupiedSelection.length > 0 ? (
              <p className={styles.wizardFieldError} role="alert">
                {occupiedSelection.map((table) => `${table.displayCode}は${occupancyLabel(occupancy.get(table.id)!, board.businessDay.businessDate)}`).join("、")}と重なっているため作成できません。入力画面で卓を選び直してください。
              </p>
            ) : null}
            <p className={styles.wizardHint}>
              保存時に版と席競合を再検証し、{reservation ? "予約変更" : "新規予約作成"}を監査へ記録します。
            </p>

          </div>
        ) : null}
        </div>
      </div>
      {visibleFailure ? (
        <div className={`${styles.conflictBox} ${styles.wizardFailure}`} role="alert">
          <AlertTriangle size={18} aria-hidden />
          <div>
            <strong>{reservation ? "予約を更新できませんでした" : "予約を作成できませんでした"}</strong>
            <p>{visibleFailure.message}</p>
            <small>{visibleFailure.recovery}（{visibleFailure.code}）</small>
            {failureNeedsTableOrTime ? (
              <div className={styles.wizardFailureActions}>
                <button type="button" className={styles.secondaryButton} disabled={pending} onClick={() => editFields()}>
                  卓を選び直す
                </button>
                <button type="button" className={styles.secondaryButton} disabled={pending} onClick={() => editFields()}>
                  時刻を変更
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      <footer className={styles.wizardFooter}>
        <button type="button" className={styles.secondaryButton} disabled={pending || datePending} onClick={reviewing ? editFields : onDone}>
          <ArrowLeft size={16} aria-hidden />{reviewing ? "入力に戻る" : "キャンセル"}
        </button>
        <span>{reviewing ? "保存前の最終確認" : "予約名・時刻・人数は必須"}</span>
        {reviewing ? (
          <button type="button" className={styles.primaryButton} disabled={!canContinue || pending} onClick={() => void save()}>
            <Check size={16} aria-hidden />{pending ? "保存中…" : `競合確認して${reservation ? "更新" : "作成"}`}
          </button>
        ) : (
          <button type="submit" className={styles.primaryButton} disabled={pending || datePending}>
            内容を確認<ArrowRight size={16} aria-hidden />
          </button>
        )}
      </footer>
    </form>
  );
}

/* Error codes whose fix is a different table or window. */
const TABLE_OR_TIME_FAILURES = new Set([
  "TABLE_TIME_CONFLICT",
  "BLOCK_CONFLICT",
  "TABLE_LOCKED",
  "VERSION_CONFLICT",
  "OFFERING_TABLE_MISMATCH",
  "SLOT_COMPATIBILITY_MISSING",
  "outside_operating_hours",
]);

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
