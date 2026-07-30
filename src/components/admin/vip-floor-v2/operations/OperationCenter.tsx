"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Ban,
  CalendarPlus,
  Check,
  Footprints,
  X,
} from "lucide-react";

import { getGhostOperatingWindow } from "@/lib/ghostOperatingHours";
import type { VipFloorBoardV2 } from "@/lib/vipFloorV2Contract";
import {
  getSyntheticTextIssue,
  type SyntheticTextIssue,
} from "@/lib/demo/validation";

import type {
  OperationDraft,
  OperationOptions,
  CommandOutcome,
  StaffWorkspaceData,
  UiReservation,
} from "../contract/uiTypes";
import { DemoCue, useDemoMode } from "../demo/DemoMode";
import { BusinessTimeFormFields } from "./BusinessTimeFields";
import { ReservationWizard } from "./ReservationWizard";
import styles from "../VipFloorWorkspace.module.css";

type OperationKind = "walk_in" | "block_create" | "reservation_create";
type WalkInField = "guestLabel" | "operatorNote";
type WalkInErrors = Partial<Record<WalkInField, string>>;

type Props = {
  open: boolean;
  pending: boolean;
  board: VipFloorBoardV2;
  options: OperationOptions | null;
  datePending: boolean;
  selectedTableId: string | null;
  conflict: CommandOutcome | null;
  staffData: StaffWorkspaceData | null;
  editReservation?: UiReservation | null;
  onClose: () => void;
  onRun: (draft: OperationDraft) => Promise<boolean>;
  onBusinessDateChange: (businessDate: string) => Promise<boolean>;
};

export function OperationCenter({
  open,
  pending,
  board,
  options,
  datePending,
  selectedTableId,
  conflict,
  staffData,
  editReservation = null,
  onClose,
  onRun,
  onBusinessDateChange,
}: Props) {
  const demoMode = useDemoMode();
  const [kind, setKind] = useState<OperationKind>("walk_in");
  const [venueWide, setVenueWide] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [walkInErrors, setWalkInErrors] = useState<WalkInErrors>({});
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const defaults = useMemo(() => operationDefaults(board), [board]);
  const editingBlock = board.blocks.find((block) => block.id === editingBlockId) ?? null;

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() =>
      panelRef.current?.querySelector<HTMLElement>("button, input, select, textarea")?.focus(),
    );
    return () => {
      window.cancelAnimationFrame(frame);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  function trapFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closePanel();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...(panelRef.current?.querySelectorAll<HTMLElement>(
      "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
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

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!options) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const tableIds = data.getAll("tableIds").map(String).filter(Boolean);
    const startAt = toTokyoTimestamp(data.get("startAt"));
    const endAt = toTokyoTimestamp(data.get("endAt"));
    let draft: OperationDraft;

    if (kind === "walk_in") {
      const guestLabel = nullableText(data.get("guestLabel"));
      const operatorNote = nullableText(data.get("operatorNote"));
      if (demoMode.enabled) {
        const errors = validateSyntheticWalkIn(guestLabel, operatorNote);
        if (Object.keys(errors).length > 0) {
          setWalkInErrors(errors);
          const firstInvalidField = errors.guestLabel ? "guestLabel" : "operatorNote";
          window.requestAnimationFrame(() => {
            const field = form.elements.namedItem(firstInvalidField);
            if (field instanceof HTMLElement) field.focus();
          });
          return;
        }
      }
      setWalkInErrors({});
      draft = {
        kind,
        payload: {
          eventDayId: options.businessDay.id,
          offeringId: String(data.get("offeringId") ?? ""),
          scheduledStartAt: startAt,
          scheduledEndAt: endAt,
          guestCount: Number(data.get("guestCount")),
          tableIds,
          guestLabel,
          operatorNote,
          expectedTableVersions: tableIds.map((tableId) => ({
            tableId,
            expectedVersion: board.tables.find((table) => table.id === tableId)?.version ?? 0,
          })),
        },
      };
    } else {
      draft = {
        kind: editingBlock ? "block_update" : kind,
        payload: {
          ...(editingBlock
            ? {
                blockId: editingBlock.id,
                expectedVersion: editingBlock.version,
              }
            : {
                eventDayId: options.businessDay.id,
                businessDate: options.businessDay.businessDate,
                repeatDays: Number(data.get("repeatDays")),
              }),
          scope: String(data.get("scope")) as "online_only" | "all_operations",
          blockKind: String(data.get("blockKind")) as "manual",
          startAt,
          endAt,
          memo: nullableText(data.get("memo")),
          seatResourceIds: venueWide ? [] : tableIds,
          venueWide,
        },
      } as OperationDraft;
    }

    if (await onRun(draft)) {
      setEditingBlockId(null);
      closePanel();
    }
  }

  function closePanel() {
    setWalkInErrors({});
    onClose();
  }

  function clearWalkInError(field: WalkInField) {
    setWalkInErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function validateWalkInField(field: WalkInField, value: string) {
    if (!demoMode.enabled) return;
    const issue = getSyntheticTextIssue(value, {
      required: field === "guestLabel",
      maximum: field === "guestLabel" ? 80 : 500,
    });
    setWalkInErrors((current) => {
      const next = { ...current };
      if (issue) next[field] = syntheticWalkInMessage(field, issue);
      else delete next[field];
      return next;
    });
  }

  async function cancelBlock(blockId: string, expectedVersion: number) {
    if (await onRun({
      kind: "block_cancel",
      payload: { blockId, expectedVersion },
    })) {
      setEditingBlockId(null);
    }
  }

  return (
    <div
      className={styles.dialogBackdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closePanel();
      }}
    >
      <div
        ref={panelRef}
        className={`${styles.commandDialog} ${styles.operationDialog}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="operation-title"
        onKeyDown={trapFocus}
      >
        <header className={styles.commandHeader}>
          <div>
            {/* No English kicker over a Japanese title: the venue is already named
              * in the masthead, and the tabs below say which operation this is. */}
            <h2 id="operation-title">{editReservation ? "予約編集" : "新規予約"}</h2>
          </div>
          <button type="button" onClick={closePanel} aria-label="新規作成を閉じる">
            <X size={19} />
          </button>
        </header>
        <DemoCue compact className={styles.dialogDemoCue} />

        {!editReservation ? <div className={styles.operationTabs} role="tablist" aria-label="作成種別">
          <button
            type="button"
            role="tab"
            aria-selected={kind === "walk_in"}
            data-active={kind === "walk_in" || undefined}
            onClick={() => {
              setKind("walk_in");
              setWalkInErrors({});
            }}
          >
            <Footprints size={16} />Walk-in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={kind === "block_create"}
            data-active={kind === "block_create" || undefined}
            onClick={() => {
              setKind("block_create");
              setWalkInErrors({});
            }}
          >
            <Ban size={16} />受付ブロック
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={kind === "reservation_create"}
            data-active={kind === "reservation_create" || undefined}
            onClick={() => {
              setKind("reservation_create");
              setWalkInErrors({});
            }}
          >
            <CalendarPlus size={16} />事前予約
          </button>
        </div> : null}

        {(kind === "reservation_create" || editReservation) && options ? (
          <ReservationWizard
            key={`${editReservation ? "edit" : "create"}:${options.businessDay.id}`}
            board={board}
            options={options}
            staffData={staffData}
            selectedTableId={selectedTableId}
            reservation={editReservation}
            pending={pending}
            datePending={datePending}
            onRun={onRun}
            onDone={closePanel}
            onBusinessDateChange={onBusinessDateChange}
          />
        ) : (
          <form
            key={`${kind}:${editingBlockId ?? "new"}`}
            className={styles.commandForm}
            onSubmit={submit}
          >
          <div className={styles.commandContext}>
            <strong>{kind === "walk_in" ? "即時来店" : "販売・運用停止"}</strong>
            <span>{board.businessDay.businessDate} / 22:00–05:00</span>
          </div>

          {!options ? (
            <div className={styles.centerState} aria-busy="true">
              <p>営業日とプランを確認しています…</p>
            </div>
          ) : (
            <fieldset disabled={pending}>
              <legend>
                {kind === "walk_in"
                  ? "現在時刻・到着済みで登録します"
                  : "競合確認後、対象卓の受付を停止します"}
              </legend>

              <BusinessTimeFormFields
                key={`${kind}:${editingBlock?.id ?? "new"}:${options.businessDay.businessDate}`}
                businessDate={options.businessDay.businessDate}
                initialValue={{
                  startAt: editingBlock ? localInputValue(editingBlock.startAt) : defaults.start,
                  endAt: editingBlock ? localInputValue(editingBlock.endAt) : defaults.end,
                }}
                disabled={pending}
              />

              {kind === "walk_in" ? (
                <>
                  <div className={styles.formColumns}>
                    <label>
                      プラン
                      <select name="offeringId" required defaultValue={options.offerings[0]?.id}>
                        {options.offerings.map((offering) => (
                          <option key={offering.id} value={offering.id}>
                            {offering.name} / {offering.minGuests}–{offering.maxGuests}名
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      人数
                      <input type="number" name="guestCount" min="1" max="99" defaultValue="2" required />
                    </label>
                  </div>
                  <label>
                    ゲスト表示名{demoMode.enabled ? "（合成名のみ）" : "（任意）"}
                    <input
                      name="guestLabel"
                      maxLength={80}
                      required={demoMode.enabled}
                      defaultValue={demoMode.enabled ? "デモWalk-inゲスト" : undefined}
                      placeholder={demoMode.enabled ? "例: デモWalk-inゲスト" : "例: 入口ゲスト / 連絡先は入力しない"}
                      aria-invalid={Boolean(walkInErrors.guestLabel)}
                      aria-describedby={demoMode.enabled
                        ? `walk-in-guest-rule${walkInErrors.guestLabel ? " walk-in-guest-error" : ""}`
                        : undefined}
                      onInput={() => clearWalkInError("guestLabel")}
                      onBlur={(event) => validateWalkInField("guestLabel", event.currentTarget.value)}
                    />
                    {demoMode.enabled ? (
                      <small id="walk-in-guest-rule" className={styles.syntheticInputHint}>
                        「デモ」または「DEMO」を含む架空名だけを入力してください。電話番号・メール・秘密情報は入力できません。
                      </small>
                    ) : null}
                    {walkInErrors.guestLabel ? (
                      <small id="walk-in-guest-error" className={styles.fieldError} role="alert">
                        {walkInErrors.guestLabel}
                      </small>
                    ) : null}
                  </label>
                  <label>
                    現場メモ（任意）
                    <textarea
                      name="operatorNote"
                      maxLength={500}
                      placeholder={demoMode.enabled ? "例: デモ：入口で到着確認済み" : "到着時の共有事項"}
                      aria-invalid={Boolean(walkInErrors.operatorNote)}
                      aria-describedby={demoMode.enabled
                        ? `walk-in-note-rule${walkInErrors.operatorNote ? " walk-in-note-error" : ""}`
                        : undefined}
                      onInput={() => clearWalkInError("operatorNote")}
                      onBlur={(event) => validateWalkInField("operatorNote", event.currentTarget.value)}
                    />
                    {demoMode.enabled ? (
                      <small id="walk-in-note-rule" className={styles.syntheticInputHint}>
                        空欄は可。入力する場合は「デモ」または「DEMO」を含む合成メモにしてください。
                      </small>
                    ) : null}
                    {walkInErrors.operatorNote ? (
                      <small id="walk-in-note-error" className={styles.fieldError} role="alert">
                        {walkInErrors.operatorNote}
                      </small>
                    ) : null}
                  </label>
                </>
              ) : (
                <>
                  <div className={styles.formColumns}>
                    <label>
                      停止範囲
                      <select name="scope" defaultValue={editingBlock?.scope ?? "all_operations"}>
                        <option value="all_operations">全受付・現場運用</option>
                        <option value="online_only">オンライン受付のみ</option>
                      </select>
                    </label>
                    <label>
                      種別
                      <select name="blockKind" defaultValue={editingBlock?.kind ?? "manual"}>
                        <option value="manual">手動停止</option>
                        <option value="maintenance">メンテナンス</option>
                        <option value="owner_hold">Owner確保</option>
                        <option value="event">イベント運用</option>
                      </select>
                    </label>
                  </div>
                  <div className={styles.formColumns}>
                    {editingBlock ? (
                      <div className={styles.commandContext}>
                        <strong>REV {editingBlock.version}</strong>
                        <span>このブロックだけ更新</span>
                      </div>
                    ) : (
                      <label>
                        毎日繰返し
                        <select name="repeatDays" defaultValue="1">
                          <option value="1">なし（当日のみ）</option>
                          <option value="7">7営業日</option>
                          <option value="14">14営業日</option>
                        </select>
                      </label>
                    )}
                    <label className={styles.checkRow}>
                      <input
                        type="checkbox"
                        checked={venueWide}
                        onChange={(event) => setVenueWide(event.target.checked)}
                      />
                      会場全体を停止
                    </label>
                  </div>
                  <label>
                    監査メモ（任意）
                    <textarea
                      name="memo"
                      maxLength={1000}
                      defaultValue={editingBlock?.memo ?? ""}
                      placeholder={demoMode.enabled ? "例: デモ：機材確認のため一時停止" : "現場に必要な理由・解除条件"}
                    />
                  </label>
                </>
              )}

              {!venueWide ? (
                <div className={styles.checkGrid} role="group" aria-label="対象卓">
                  {board.tables.map((table) => (
                    <label key={table.id}>
                      <input
                        type="checkbox"
                        name="tableIds"
                        value={table.id}
                        defaultChecked={
                          editingBlock
                            ? editingBlock.targets.tableIds.includes(table.id)
                            : table.id === selectedTableId
                        }
                      />
                      <span>{table.displayCode}</span>
                      <small>{table.capacityMax}名</small>
                    </label>
                  ))}
                </div>
              ) : null}
            </fieldset>
          )}

          {conflict && !conflict.ok ? (
            <div className={styles.conflictBox} role="alert">
              <AlertTriangle size={18} aria-hidden />
              <div>
                <strong>{conflict.code}</strong>
                <p>{conflict.message}</p>
                <small>{conflict.recovery}</small>
              </div>
            </div>
          ) : null}

          <footer className={styles.commandFooter}>
            <button type="button" className={styles.secondaryButton} onClick={closePanel} disabled={pending}>
              取消
            </button>
            <button type="submit" className={styles.primaryButton} disabled={pending || !options}>
              <Check size={16} />{pending
                ? "保存中…"
                : editingBlock
                  ? "変更を保存"
                  : "競合確認して保存"}
            </button>
          </footer>
          </form>
        )}

        {kind === "block_create" && board.blocks.length > 0 ? (
          <section className={styles.blockLedger} aria-label="有効ブロック">
            <header>
              <strong>ACTIVE BLOCKS</strong>
              <span>{board.blocks.length}件</span>
            </header>
            {board.blocks.map((block) => (
              <div key={block.id}>
                <span>{formatClock(block.startAt)}–{formatClock(block.endAt)}</span>
                <strong>{block.targets.venueWide
                  ? "会場全体"
                  : block.targets.tableIds.map((tableId) =>
                    board.tables.find((table) => table.id === tableId)?.displayCode ?? "卓",
                  ).join(" / ")}</strong>
                <small>REV {block.version} / {block.scope === "online_only" ? "ONLINE" : "ALL"}</small>
                <button
                  type="button"
                  onClick={() => {
                    setEditingBlockId(block.id);
                    setVenueWide(block.targets.venueWide);
                  }}
                  disabled={pending}
                >
                  編集
                </button>
                <button
                  type="button"
                  onClick={() => void cancelBlock(block.id, block.version)}
                  disabled={pending}
                >
                  解除
                </button>
              </div>
            ))}
          </section>
        ) : null}
      </div>
    </div>
  );
}

function operationDefaults(board: VipFloorBoardV2) {
  const window = getGhostOperatingWindow(board.businessDay.businessDate);
  const openAt = Date.parse(window.startAt);
  const closeAt = Date.parse(window.endAt);
  const now = Date.now();
  const startAt = now >= openAt && now < closeAt
    ? Math.min(Math.ceil(now / 900_000) * 900_000, closeAt - 900_000)
    : openAt;
  const endAt = Math.min(startAt + 120 * 60_000, closeAt);
  return {
    start: localInputValue(new Date(startAt).toISOString()),
    end: localInputValue(new Date(endAt).toISOString()),
  };
}

function validateSyntheticWalkIn(
  guestLabel: string | null,
  operatorNote: string | null,
): WalkInErrors {
  const errors: WalkInErrors = {};
  const guestIssue = getSyntheticTextIssue(guestLabel, { required: true, maximum: 80 });
  const noteIssue = getSyntheticTextIssue(operatorNote, { maximum: 500 });
  if (guestIssue) errors.guestLabel = syntheticWalkInMessage("guestLabel", guestIssue);
  if (noteIssue) errors.operatorNote = syntheticWalkInMessage("operatorNote", noteIssue);
  return errors;
}

function syntheticWalkInMessage(field: WalkInField, issue: SyntheticTextIssue) {
  const label = field === "guestLabel" ? "ゲスト表示名" : "現場メモ";
  if (issue === "required") return "ゲスト表示名を入力してください。例: デモWalk-inゲスト";
  if (issue === "missing_synthetic_cue") {
    return `${label}に「デモ」または「DEMO」を含めてください。`;
  }
  if (issue === "phone_like" || issue === "email_like") {
    return `${label}に${issue === "phone_like" ? "電話番号らしい数字列" : "メールアドレス"}があります。連絡先を削除し、合成値だけを入力してください。`;
  }
  if (issue === "secret_like") {
    return `${label}に秘密情報らしい文字列があります。token・password・API key等を削除してください。`;
  }
  if (issue === "too_long") return `${label}が入力上限を超えています。短くしてください。`;
  return `${label}に使用できない制御文字があります。該当文字を削除してください。`;
}

function localInputValue(value: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  }).format(new Date(value)).replace(" ", "T");
}

function toTokyoTimestamp(value: FormDataEntryValue | null) {
  return `${String(value ?? "").trim()}:00+09:00`;
}

function nullableText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function formatClock(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  }).format(new Date(value));
}
