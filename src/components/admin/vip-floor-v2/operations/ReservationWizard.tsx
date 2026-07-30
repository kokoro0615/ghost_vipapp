"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, Mail, MapPin, ShieldCheck, UsersRound } from "lucide-react";

import type { VipFloorBoardV2, VipServiceStatus } from "@/lib/vipFloorV2Contract";

import type {
  OperationDraft,
  OperationOptions,
  StaffWorkspaceData,
  UiReservation,
} from "../contract/uiTypes";
import { useDemoMode } from "../demo/DemoMode";
import styles from "../VipFloorWorkspace.module.css";
import { useTrialMode } from "../TrialMode";

const STEPS = ["日付", "時刻", "人数", "卓", "顧客", "追加", "担当", "確認"] as const;

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
  const [step, setStep] = useState(0);
  const [dateError, setDateError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() => ({
    startAt: defaults.start,
    endAt: defaults.end,
    offeringId: reservation?.bookingOfferingId ?? options.offerings[0]?.id ?? "",
    guestCount: reservation?.guestCount ?? 2,
    tableIds: reservation?.tableIds ?? (selectedTableId ? [selectedTableId] : []),
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
  const selectedTables = board.tables.filter((table) => draft.tableIds.includes(table.id));
  const capacity = selectedTables.reduce((sum, table) => sum + table.capacityMax, 0);
  const canContinue = !datePending
    && !dateError
    && stepValid(step, draft, Boolean(reservation));

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
    <section className={styles.reservationWizard} aria-label={`予約${reservation ? "編集" : "作成"} ${step + 1}/8 ${STEPS[step]}`}>
      <ol className={styles.wizardRail} aria-label={`予約${reservation ? "編集" : "作成"}ステップ`}>
        {STEPS.map((label, index) => (
          <li key={label} data-current={index === step || undefined} data-complete={index < step || undefined}>
            <span>{index + 1}</span><small>{label}</small>
          </li>
        ))}
      </ol>
      <div className={styles.wizardBody}>
        <aside className={styles.wizardContext} aria-label="予約コンテキスト">
          <header>
            <span>DATE / TABLE</span>
            <strong>日時・席</strong>
          </header>
          <dl>
            <div><dt><Clock3 size={14} />営業日</dt><dd>{board.businessDay.businessDate}</dd></div>
            <div><dt>時間</dt><dd>{draft.startAt.slice(11)}–{draft.endAt.slice(11)}</dd></div>
            <div><dt><UsersRound size={14} />人数</dt><dd>{draft.guestCount}名</dd></div>
            <div><dt><MapPin size={14} />卓</dt><dd>{selectedTables.map((table) => table.displayCode).join(" + ") || "未選択"}</dd></div>
          </dl>
          <div className={styles.wizardMap}>
            <Image
              src="/media/images/vipmapv3.9239fd2174.webp"
              alt="選択中のVIP席を確認するGHOST Osakaフロア図"
              fill
              sizes="300px"
            />
          </div>
          <p>正式卓はVIP-1〜VIP-8のみ。保存時に版と席競合を再検証します。</p>
        </aside>
        <div className={styles.wizardActive}>
        {step === 0 ? (
          <div className={styles.wizardStatement}>
            <span>BUSINESS DATE</span>
            {reservation ? (
              <strong>{board.businessDay.businessDate}</strong>
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
            <p id="reservation-date-hint">
              {reservation
                ? "予約日の変更は新規事前予約から行います。"
                : datePending
                  ? "選択日の営業枠・プラン・卓状況を確認しています…"
                  : "ここで予約日を変更できます。外側の営業日も自動で切り替わります。"}
            </p>
            {dateError ? (
              <p id="reservation-date-error" className={styles.wizardDateError} role="alert">
                {dateError}
              </p>
            ) : null}
            <p>GHOST Osakaの営業日は22:00から翌05:00までです。</p>
          </div>
        ) : null}
        {step === 1 ? (
          <fieldset>
            <legend>予約時刻と滞在時間</legend>
            <div className={styles.formColumns}>
              <label>開始<input type="datetime-local" value={draft.startAt} onChange={(event) => patch({ startAt: event.target.value })} /></label>
              <label>終了<input type="datetime-local" value={draft.endAt} onChange={(event) => patch({ endAt: event.target.value })} /></label>
            </div>
            <p className={styles.wizardHint}>保存時に営業日範囲と卓の重複を再検証します。</p>
          </fieldset>
        ) : null}
        {step === 2 ? (
          <fieldset>
            <legend>プランと人数</legend>
            <div className={styles.formColumns}>
              <label>
                プラン
                <select value={draft.offeringId} onChange={(event) => patch({ offeringId: event.target.value })}>
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
            <legend>複数卓を選択</legend>
            <div className={styles.checkGrid} role="group" aria-label="予約卓">
              {board.tables.map((table) => (
                <label key={table.id}>
                  <input
                    type="checkbox"
                    checked={draft.tableIds.includes(table.id)}
                    onChange={(event) => patch({
                      tableIds: event.target.checked
                        ? [...draft.tableIds, table.id]
                        : draft.tableIds.filter((id) => id !== table.id),
                    })}
                  />
                  <span>{table.displayCode}</span><small>{table.capacityMax}名</small>
                </label>
              ))}
            </div>
            <p className={capacity < draft.guestCount ? styles.wizardWarning : styles.wizardHint}>
              選択 {selectedTables.length}卓 / 定員 {capacity}名 / 予約 {draft.guestCount}名
            </p>
          </fieldset>
        ) : null}
        {step === 4 ? (
          <fieldset>
            <legend>{demoMode.enabled ? "顧客（合成データ専用）" : "顧客（暗号化・Owner限定）"}</legend>
            {reservation ? (
              <div className={styles.wizardStatement}>
                <span>CUSTOMER LINK</span>
                <strong>{reservation.guestLabel}</strong>
                <p>{demoMode.enabled
                  ? reservation.customerId
                    ? "現在の合成顧客リンクをbrowser-localで保持します。"
                    : "合成顧客未紐付けのまま更新します。"
                  : reservation.customerId
                    ? "現在の暗号化顧客リンクを保持します。"
                    : "顧客未紐付けのまま更新します。"}</p>
              </div>
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
            <header><ShieldCheck size={20} /><div><span>FINAL VALIDATION</span><strong>予約内容を確認</strong></div></header>
            <dl>
              <div><dt>営業日</dt><dd>{board.businessDay.businessDate}</dd></div>
              <div><dt>時刻</dt><dd>{draft.startAt.slice(11)}–{draft.endAt.slice(11)}</dd></div>
              <div><dt>人数 / 卓</dt><dd>{draft.guestCount}名 / {selectedTables.map((table) => table.displayCode).join("・")}</dd></div>
              <div><dt>顧客</dt><dd>{(reservation?.guestLabel ?? draft.displayName) || "匿名"}</dd></div>
            </dl>
            <fieldset>
              <legend>顧客通知</legend>
              <label className={styles.choiceRow}><input type="radio" name="notify" checked={draft.notificationPreference === "none"} onChange={() => patch({ notificationPreference: "none" })} />送信しない</label>
              <label className={styles.choiceRow}><input type="radio" name="notify" checked={draft.notificationPreference === "email"} disabled={demoMode.enabled} onChange={() => patch({ notificationPreference: "email" })} /><Mail size={15} />{demoMode.enabled ? "DEMOでは外部送信なし" : "Eメール送信"}</label>
            </fieldset>
            {draft.notificationPreference === "email" && !reservation && !draft.email ? <p className={styles.wizardWarning}>Eメール送信には顧客Eメールが必要です。</p> : null}
          </div>
        ) : null}
        </div>
        <aside className={styles.wizardChecks} aria-label="保存前チェック">
          <header>
            <span>PRE-SAVE CHECK</span>
            <strong>保存前チェック</strong>
          </header>
          <ul>
            <li data-ok={Boolean(draft.startAt && draft.endAt && draft.startAt < draft.endAt) || undefined}>
              <CheckCircle2 size={15} />日時
              <strong>{draft.startAt && draft.endAt && draft.startAt < draft.endAt ? "OK" : "要確認"}</strong>
            </li>
            <li data-ok={draft.guestCount > 0 || undefined}>
              <CheckCircle2 size={15} />人数
              <strong>{draft.guestCount > 0 ? "OK" : "要確認"}</strong>
            </li>
            <li data-ok={draft.tableIds.length > 0 || undefined}>
              <CheckCircle2 size={15} />席選択
              <strong>{draft.tableIds.length > 0 ? "OK" : "未選択"}</strong>
            </li>
            <li data-ok={syntheticMode || undefined}>
              <CheckCircle2 size={15} />データ境界
              <strong>{syntheticMode ? "合成のみ" : "Owner"}</strong>
            </li>
          </ul>
          <section>
            <span>版情報</span>
            <strong>{reservation ? `v${reservation.version}を更新` : "新規"}</strong>
          </section>
          <section>
            <span>監査プレビュー</span>
            <p>{reservation ? "予約変更を監査へ記録" : "新規予約作成を監査へ記録"}</p>
          </section>
        </aside>
      </div>
      <footer className={styles.wizardFooter}>
        <button type="button" className={styles.secondaryButton} disabled={step === 0 || pending} onClick={() => setStep((current) => current - 1)}>
          <ArrowLeft size={16} />戻る
        </button>
        <span>{step + 1} / 8 · {STEPS[step]}</span>
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

function stepValid(step: number, draft: Draft, editing: boolean) {
  if (step === 1) return Boolean(draft.startAt && draft.endAt && draft.startAt < draft.endAt);
  if (step === 2) return Boolean(draft.offeringId && draft.guestCount >= 1);
  if (step === 3) return draft.tableIds.length > 0;
  if (step === 7) {
    return draft.notificationPreference !== "email" || editing || Boolean(draft.email);
  }
  return true;
}

function scheduleDefaults(board: VipFloorBoardV2) {
  const startAt = Date.parse(board.businessDay.operatingStartAt);
  return {
    start: localInput(new Date(startAt).toISOString()),
    end: localInput(new Date(startAt + 120 * 60_000).toISOString()),
  };
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
