"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Ban,
  CalendarPlus,
  Check,
  Footprints,
  X,
} from "lucide-react";

import type { VipFloorBoardV2 } from "@/lib/vipFloorV2Contract";

import type {
  OperationDraft,
  OperationOptions,
  StaffWorkspaceData,
  UiReservation,
} from "../contract/uiTypes";
import { DemoCue, useDemoMode } from "../demo/DemoMode";
import { ReservationWizard } from "./ReservationWizard";
import styles from "../VipFloorWorkspace.module.css";

type OperationKind = "walk_in" | "block_create" | "reservation_create";

type Props = {
  open: boolean;
  pending: boolean;
  board: VipFloorBoardV2;
  options: OperationOptions | null;
  selectedTableId: string | null;
  staffData: StaffWorkspaceData | null;
  editReservation?: UiReservation | null;
  onClose: () => void;
  onRun: (draft: OperationDraft) => Promise<boolean>;
};

export function OperationCenter({
  open,
  pending,
  board,
  options,
  selectedTableId,
  staffData,
  editReservation = null,
  onClose,
  onRun,
}: Props) {
  const demoMode = useDemoMode();
  const [kind, setKind] = useState<OperationKind>("walk_in");
  const [venueWide, setVenueWide] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
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
      onClose();
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
    const data = new FormData(event.currentTarget);
    const tableIds = data.getAll("tableIds").map(String).filter(Boolean);
    const startAt = toTokyoTimestamp(data.get("startAt"));
    const endAt = toTokyoTimestamp(data.get("endAt"));
    let draft: OperationDraft;

    if (kind === "walk_in") {
      draft = {
        kind,
        payload: {
          eventDayId: options.businessDay.id,
          offeringId: String(data.get("offeringId") ?? ""),
          scheduledStartAt: startAt,
          scheduledEndAt: endAt,
          guestCount: Number(data.get("guestCount")),
          tableIds,
          guestLabel: nullableText(data.get("guestLabel")),
          operatorNote: nullableText(data.get("operatorNote")),
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
      onClose();
    }
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
        if (event.target === event.currentTarget) onClose();
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
            <span>GHOST ARRIVAL CONTROL</span>
            <h2 id="operation-title">{editReservation ? "予約編集" : "新規オペレーション"}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="新規作成を閉じる">
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
            onClick={() => setKind("walk_in")}
          >
            <Footprints size={16} />Walk-in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={kind === "block_create"}
            data-active={kind === "block_create" || undefined}
            onClick={() => setKind("block_create")}
          >
            <Ban size={16} />受付ブロック
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={kind === "reservation_create"}
            data-active={kind === "reservation_create" || undefined}
            onClick={() => setKind("reservation_create")}
          >
            <CalendarPlus size={16} />8段階予約
          </button>
        </div> : null}

        {(kind === "reservation_create" || editReservation) && options ? (
          <ReservationWizard
            board={board}
            options={options}
            staffData={staffData}
            selectedTableId={selectedTableId}
            reservation={editReservation}
            pending={pending}
            onRun={onRun}
            onDone={onClose}
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

              <div className={styles.formColumns}>
                <label>
                  開始
                  <input
                    type="datetime-local"
                    name="startAt"
                    defaultValue={editingBlock ? localInputValue(editingBlock.startAt) : defaults.start}
                    required
                  />
                </label>
                <label>
                  終了
                  <input
                    type="datetime-local"
                    name="endAt"
                    defaultValue={editingBlock ? localInputValue(editingBlock.endAt) : defaults.end}
                    required
                  />
                </label>
              </div>

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
                    ゲスト表示名{demoMode.enabled ? "（デモ cue必須）" : "（任意）"}
                    <input name="guestLabel" maxLength={80} required={demoMode.enabled} placeholder={demoMode.enabled ? "例: デモゲストWalk-in001" : "例: 入口ゲスト / 連絡先は入力しない"} />
                  </label>
                  <label>
                    現場メモ（任意）
                    <textarea name="operatorNote" maxLength={500} placeholder={demoMode.enabled ? "例: デモ：入口で到着確認済み" : "到着時の共有事項"} />
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

          <footer className={styles.commandFooter}>
            <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={pending}>
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
  const openAt = Date.parse(board.businessDay.operatingStartAt);
  const closeAt = Date.parse(board.businessDay.operatingEndAt);
  const now = Date.now();
  const startAt = now >= openAt && now < closeAt
    ? Math.ceil(now / 900_000) * 900_000
    : openAt;
  const endAt = Math.min(startAt + 120 * 60_000, closeAt);
  return {
    start: localInputValue(new Date(startAt).toISOString()),
    end: localInputValue(new Date(endAt).toISOString()),
  };
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
