"use client";

import Image from "next/image";
import { Link2, LockKeyhole, MapPinned, MoveRight } from "lucide-react";

import type { VipFloorBoardV2 } from "@/lib/vipFloorV2Contract";

import { getStatusMeta } from "../contract/statusModel";
import type { StaffWorkspaceData, UiReservation } from "../contract/uiTypes";
import styles from "../VipFloorWorkspace.module.css";

type FloorViewProps = {
  board: VipFloorBoardV2;
  reservations: UiReservation[];
  selectedReservationId: string | null;
  selectedTableId: string | null;
  onSelectTable: (tableId: string, reservationId: string | null) => void;
  onSelectReservation: (reservationId: string) => void;
  onOpenAssignment: () => void;
  staffData: StaffWorkspaceData | null;
  staffFilter: string;
};

const LEGEND = [
  { label: "来店予定", tone: "neutral" },
  { label: "着席中", tone: "active" },
  { label: "遅延・未達", tone: "danger" },
  { label: "会計依頼", tone: "warning" },
  { label: "完了", tone: "success", optional: true },
] as const;

export default function FloorView({
  board,
  reservations,
  selectedReservationId,
  selectedTableId,
  onSelectTable,
  onOpenAssignment,
  staffData,
  staffFilter,
}: FloorViewProps) {
  const reservationById = new Map(reservations.map((item) => [item.id, item]));
  const occupied = board.tables.filter((table) => table.reservationIds.length > 0).length;
  const unassignedCount = reservations.filter((item) => item.tableIds.length === 0).length;
  const selectedTable = board.tables.find((table) => table.id === selectedTableId) ?? null;

  return (
    <section className={styles.floorView} aria-labelledby="floor-view-title">
      <div className={styles.viewStrip}>
        <h2 id="floor-view-title">VIPフロア</h2>
        <span className="tabular-nums">稼働 {occupied}/{board.tables.length}</span>
        {unassignedCount > 0 ? <span className={styles.exceptionText}>未割当 {unassignedCount}</span> : null}
        <span className={styles.stripSpacer} />
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onOpenAssignment}
          disabled={!selectedReservationId}
        >
          <MoveRight aria-hidden size={15} /> 席割当先を選択
        </button>
      </div>

      <div className={styles.floorCanvas}>
        {/* The plan keeps its true aspect ratio so table geometry lands on the room. */}
        <div className={styles.floorPlan}>
          <Image
            src="/media/images/vipmapv3.9239fd2174.webp"
            alt="GHOST Osaka VIPフロア座席図"
            width={1672}
            height={940}
            priority
            sizes="(min-width: 1280px) 900px, (min-width: 768px) 72vw, 100vw"
            className={styles.floorImage}
          />
          <div className={styles.mapIdentity}>
            <MapPinned size={14} aria-hidden />
            <span>GHOST OSAKA / 1F VIP</span>
          </div>

          {board.tables.map((table) => {
            const reservation = table.reservationIds.map((id) => reservationById.get(id)).find(Boolean) ?? null;
            const meta = getStatusMeta(reservation?.serviceStatus);
            const blocked = table.blockIds.length > 0;
            const selected = table.id === selectedTableId || reservation?.id === selectedReservationId;
            const staffAssignment = staffData?.tableAssignments.find(
              (assignment) => assignment.tableId === table.id,
            );
            const staff = staffData?.staffMembers.find(
              (member) => member.id === staffAssignment?.staffMemberId,
            );
            const filteredOut = staffFilter === "unassigned"
              ? Boolean(staffAssignment)
              : Boolean(staffFilter && staffAssignment?.staffMemberId !== staffFilter);
            return (
              <button
                key={table.id}
                type="button"
                className={styles.tableNode}
                data-tone={blocked || table.operationalLocked ? "danger" : reservation ? meta.tone : undefined}
                data-cue={blocked ? "double" : reservation ? meta.cue : undefined}
                data-empty={!reservation && !blocked && !table.operationalLocked ? "" : undefined}
                data-selected={selected || undefined}
                data-staff-filtered={filteredOut || undefined}
                style={{
                  left: `${table.geometry.xPercent}%`,
                  top: `${table.geometry.yPercent}%`,
                  width: `${table.geometry.widthPercent}%`,
                  height: `${table.geometry.heightPercent}%`,
                  transform: `translate(-50%, -50%) rotate(${table.geometry.rotationDegrees}deg)`,
                }}
                onClick={() => onSelectTable(table.id, reservation?.id ?? null)}
                aria-pressed={selected}
                aria-label={`${table.displayCode}、${table.name}、担当${staff?.displayName ?? "なし"}、${blocked ? "予約ブロック" : table.operationalLocked ? "席ロック" : reservation ? meta.label : "空席"}${reservation ? `、${reservation.publicCode}、${reservation.startLabel}` : ""}`}
                title={table.operationalLocked ? table.lockReason ?? "席ロック" : reservation?.guestLabel ?? "空席"}
              >
                <span className={styles.nodeCode}>{table.displayCode}</span>
                <span className={styles.nodeStatus}>
                  {table.operationalLocked ? <LockKeyhole size={11} aria-hidden /> : blocked ? <Link2 size={11} aria-hidden /> : null}
                  {blocked ? "ブロック" : table.operationalLocked ? "ロック" : reservation ? meta.label : "空席"}
                </span>
                <span className={styles.nodeDetail}>
                  {reservation
                    ? `${reservation.startLabel}–${reservation.endLabel} / ${reservation.guestCount}名`
                    : `${table.capacityMin}–${table.capacityMax}名`}
                </span>
                {staff ? <span className={styles.nodeStaff}>担当 {staff.displayName}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.floorLegend} aria-label="座席状態の凡例">
        {LEGEND.map((item) => (
          <span key={item.label} data-tone={item.tone} data-optional={"optional" in item ? "" : undefined}>
            {item.label}
          </span>
        ))}
      </div>

      <div className={styles.floorContextAction}>
        <span>{selectedTable ? `${selectedTable.displayCode} を選択中` : "VIP席を選択してください"}</span>
        <button type="button" className={styles.primaryButton} onClick={onOpenAssignment} disabled={!selectedReservationId}>
          <MoveRight aria-hidden size={16} />割当を確認
        </button>
      </div>
    </section>
  );
}
