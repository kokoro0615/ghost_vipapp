"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
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
  { label: "空席", kind: "vacant" },
  { label: "来店予定", kind: "expected" },
  { label: "着席中", kind: "seated" },
  { label: "要対応", kind: "alert" },
  { label: "会計", kind: "billing" },
  { label: "BLOCK / LOCK", kind: "locked", optional: true },
] as const;

const BOOTH_CLUSTER_CENTER = 0.58;

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
  const canvasRef = useRef<HTMLDivElement>(null);
  const pannedByUserRef = useRef(false);
  const reservationById = new Map(reservations.map((item) => [item.id, item]));
  const occupied = board.tables.filter((table) => table.reservationIds.length > 0).length;
  const unassignedCount = reservations.filter((item) => item.tableIds.length === 0).length;
  const selectedTable = board.tables.find((table) => table.id === selectedTableId) ?? null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const centerBooths = () => {
      if (pannedByUserRef.current) return;
      const overflow = canvas.scrollWidth - canvas.clientWidth;
      if (overflow <= 0) return;
      canvas.scrollLeft = canvas.scrollWidth * BOOTH_CLUSTER_CENTER - canvas.clientWidth / 2;
    };

    centerBooths();
    const observer = new ResizeObserver(centerBooths);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

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
          <MoveRight aria-hidden size={16} /> 席割当先を選択
        </button>
      </div>

      <div
        ref={canvasRef}
        className={styles.floorCanvas}
        onPointerDown={() => {
          pannedByUserRef.current = true;
        }}
        onWheel={() => {
          pannedByUserRef.current = true;
        }}
      >
        {/* The plan keeps its true aspect ratio so table geometry lands on the room. */}
        <div className={styles.floorPlan}>
          <Image
            src="/media/images/vipmapv3.9239fd2174.webp"
            alt="GHOST Osaka VIPフロアのカラー座席図"
            width={1672}
            height={940}
            priority
            unoptimized
            sizes="(min-width: 1280px) 900px, (min-width: 768px) 72vw, 100vw"
            className={styles.floorImage}
          />
          <div className={styles.mapIdentity}>
            <MapPinned size={14} aria-hidden />
            <span>GHOST OSAKA / 1F VIP</span>
          </div>

          {board.tables.map((table, index) => {
            const reservation = table.reservationIds.map((id) => reservationById.get(id)).find(Boolean) ?? null;
            const meta = getStatusMeta(reservation?.serviceStatus);
            const blocked = table.blockIds.length > 0;
            const held = blocked || table.operationalLocked;
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
            const tone = held ? "danger" : reservation ? meta.tone : "vacant";
            const vital = held ? "still" : reservation ? meta.vital : "still";
            const shortLabel = blocked
              ? "BLOCK"
              : table.operationalLocked
                ? "LOCK"
                : reservation
                  ? meta.shortLabel
                  : "空席";
            const statusLabel = blocked
              ? "予約ブロック"
              : table.operationalLocked
                ? table.lockReason ?? "席ロック"
                : reservation
                  ? meta.label
                  : "空席";
            const Icon = held ? (blocked ? Link2 : LockKeyhole) : meta.icon;
            return (
              <div
                key={table.id}
                className={styles.tableAnchor}
                data-tone={tone}
                data-occupied={reservation ? "" : undefined}
                data-selected={selected || undefined}
                data-staff-filtered={filteredOut || undefined}
                style={{
                  left: `${table.geometry.xPercent}%`,
                  top: `${table.geometry.yPercent}%`,
                  width: `${table.geometry.widthPercent}%`,
                  height: `${table.geometry.heightPercent}%`,
                  ["--table-rotation" as string]: `${table.geometry.rotationDegrees}deg`,
                  ["--seat-index" as string]: index,
                }}
              >
                <span className={styles.boothSignal} data-vital={vital} aria-hidden />
                <button
                  type="button"
                  className={styles.tableNode}
                  data-cue={held ? "double" : reservation ? meta.cue : "dash"}
                  data-vital={vital}
                  data-status={reservation?.serviceStatus ?? (held ? "held" : "vacant")}
                  data-held={held ? "" : undefined}
                  data-occupied={reservation ? "" : undefined}
                  data-selected={selected || undefined}
                  onClick={() => onSelectTable(table.id, reservation?.id ?? null)}
                  aria-pressed={selected}
                  aria-label={`${table.displayCode}、${table.name}、担当${staff?.displayName ?? "なし"}、${statusLabel}${reservation ? `、${reservation.publicCode}、${reservation.startLabel}から${reservation.guestCount}名` : `、定員${table.capacityMin}から${table.capacityMax}名`}`}
                  title={table.operationalLocked ? table.lockReason ?? "席ロック" : reservation?.guestLabel ?? "空席"}
                >
                  <span className={styles.nodeGlyph} aria-hidden>
                    <Icon size={11} strokeWidth={2.25} />
                  </span>
                  <span className={styles.nodeCode}>{table.displayCode}</span>
                  <span className={styles.nodeState}>{shortLabel}</span>
                  <span className={styles.nodeRail} aria-hidden />
                  <span className={styles.nodeBrackets} aria-hidden />
                </button>
                <span
                  className={styles.nodeCard}
                  data-flip={table.geometry.yPercent < 38 ? "" : undefined}
                  aria-hidden
                >
                  <span className={styles.nodeCardHead}>
                    <b>{table.displayCode}</b>
                    <em>{statusLabel}</em>
                  </span>
                  <span className={styles.nodeCardGuest}>{reservation?.guestLabel ?? table.name}</span>
                  <span className={styles.nodeCardMeta}>
                    {reservation ? (
                      <>
                        <span className="tabular-nums">{reservation.startLabel}–{reservation.endLabel}</span>
                        <span className="tabular-nums">{reservation.guestCount}名</span>
                        <span>{reservation.publicCode}</span>
                      </>
                    ) : (
                      <>
                        <span className="tabular-nums">定員 {table.capacityMin}–{table.capacityMax}名</span>
                        <span>{held ? "配席不可" : "配席可能"}</span>
                      </>
                    )}
                    <span>担当 {staff?.displayName ?? "なし"}</span>
                  </span>
                  {reservation?.exceptionLabel ? (
                    <span className={styles.nodeCardFlag}>{reservation.exceptionLabel}</span>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.floorLegend} aria-label="座席状態の凡例">
        {LEGEND.map((item) => (
          <span key={item.label} data-kind={item.kind} data-optional={"optional" in item ? "" : undefined}>
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
