"use client";

import { useEffect, useRef, useState } from "react";
import { Check, UserRoundPlus, UsersRound, X } from "lucide-react";

import type { VipFloorBoardV2 } from "@/lib/vipFloorV2Contract";

import type {
  StaffAction,
  StaffWorkspaceData,
} from "../contract/uiTypes";
import { DemoCue, useDemoMode } from "../demo/DemoMode";
import styles from "../VipFloorWorkspace.module.css";
import { useTrialMode } from "../TrialMode";

type Props = {
  open: boolean;
  pending: boolean;
  board: VipFloorBoardV2;
  data: StaffWorkspaceData | null;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onAction: (action: StaffAction) => Promise<boolean>;
};

export function StaffPanel({ open, pending, board, data, onClose, onRefresh, onAction }: Props) {
  const trialMode = useTrialMode();
  const demoMode = useDemoMode();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [mode, setMode] = useState<"assignments" | "master">("assignments");

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() =>
      panelRef.current?.querySelector<HTMLElement>("button, input, select")?.focus(),
    );
    return () => {
      cancelAnimationFrame(frame);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const displayName = String(new FormData(form).get("displayName") ?? "").trim();
    if (displayName && await onAction({ action: "create", payload: { displayName } })) {
      form.reset();
      await onRefresh();
    }
  }

  async function assign(tableId: string, staffMemberId: string | null) {
    if (!data) return;
    const current = data.tableAssignments.find((item) => item.tableId === tableId);
    if (await onAction({
      action: "assign",
      payload: {
        eventDayId: data.eventDayId,
        tableId,
        staffMemberId,
        expectedAssignmentVersion: current?.version ?? null,
      },
    })) {
      await onRefresh();
    }
  }

  function trapFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const items = [...(panelRef.current?.querySelectorAll<HTMLElement>(
      "button:not([disabled]), input:not([disabled]), select:not([disabled])",
    ) ?? [])];
    const first = items[0];
    const last = items.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const activeStaff = data?.staffMembers.filter((member) => member.active) ?? [];

  return (
    <div className={styles.dialogBackdrop} role="presentation">
      <div
        ref={panelRef}
        className={styles.commandDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-title"
        onKeyDown={trapFocus}
      >
        <header className={styles.commandHeader}>
          <div><h2 id="staff-title">スタッフ担当卓</h2></div>
          <button type="button" onClick={onClose} aria-label="スタッフ担当卓を閉じる"><X size={20} /></button>
        </header>
        <DemoCue compact className={styles.dialogDemoCue} />
        <div className={styles.operationTabs} role="tablist" aria-label="スタッフ管理">
          <button type="button" role="tab" aria-selected={mode === "assignments"} data-active={mode === "assignments" || undefined} onClick={() => setMode("assignments")}>
            <UsersRound size={16} />担当卓
          </button>
          <button type="button" role="tab" aria-selected={mode === "master"} data-active={mode === "master" || undefined} onClick={() => setMode("master")}>
            <UserRoundPlus size={16} />Master
          </button>
          <button type="button" role="tab" aria-selected="false" disabled>
            REV {board.boardRevision}
          </button>
        </div>

        {mode === "master" ? (
          <div className={styles.staffBody}>
            <form className={styles.staffCreate} onSubmit={create}>
              <label>
                表示名
                <input name="displayName" maxLength={80} required placeholder={demoMode.enabled ? "例: デモスタッフD" : trialMode ? "例: TRIAL-スタッフ01" : "Ownerが初期スタッフを登録"} />
              </label>
              <button type="submit" className={styles.primaryButton} disabled={pending}>
                <Check size={16} />登録
              </button>
            </form>
            {(data?.staffMembers ?? []).map((member) => (
              <div className={styles.staffMemberRow} key={member.id}>
                <strong>{member.displayName}</strong>
                <small>REV {member.version} / {member.active ? "ACTIVE" : "停止中"}</small>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void (async () => {
                    if (await onAction({
                      action: "update",
                      payload: {
                        staffMemberId: member.id,
                        expectedVersion: member.version,
                        displayName: member.displayName,
                        active: !member.active,
                      },
                    })) await onRefresh();
                  })()}
                >
                  {member.active ? "停止" : "再開"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.staffAssignmentGrid}>
            {board.tables.map((table) => {
              const assignment = data?.tableAssignments.find((item) => item.tableId === table.id);
              return (
                <label key={table.id}>
                  <span><strong>{table.displayCode}</strong></span>
                  <select
                    aria-label={`${table.displayCode}の担当スタッフ`}
                    value={assignment?.staffMemberId ?? ""}
                    onChange={(event) => void assign(table.id, event.target.value || null)}
                    disabled={pending || !data}
                  >
                    <option value="">担当なし</option>
                    {activeStaff.map((member) => (
                      <option key={member.id} value={member.id}>{member.displayName}</option>
                    ))}
                  </select>
                  <small>{assignment ? `ASSIGN REV ${assignment.version}` : "卓未定"}</small>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
