"use client";

import Image from "next/image";
import { Link2, LockKeyhole, MapPinned, MoveRight, Search, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";

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

export default function FloorView({
  board,
  reservations,
  selectedReservationId,
  selectedTableId,
  onSelectTable,
  onSelectReservation,
  onOpenAssignment,
  staffData,
  staffFilter,
}: FloorViewProps) {
  const [taskMode, setTaskMode] = useState<"reservations" | "waitlist" | "finished" | "blocks">("reservations");
  const [query, setQuery] = useState("");
  const reservationById = new Map(reservations.map((item) => [item.id, item]));
  const railReservations = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ja-JP");
    return reservations.filter((item) => {
      const finished = item.serviceStatus === "completed" || item.lifecycleStatus === "cancelled";
      if (taskMode === "finished" && !finished) return false;
      if (taskMode === "reservations" && finished) return false;
      if (taskMode === "waitlist" && item.tableIds.length > 0) return false;
      if (taskMode === "blocks") return false;
      return !normalized || [
        item.publicCode,
        item.guestLabel,
        item.tableCodes.join(" "),
        item.startLabel,
      ].join(" ").toLocaleLowerCase("ja-JP").includes(normalized);
    });
  }, [query, reservations, taskMode]);
  const selectedReservation = reservations.find((item) => item.id === selectedReservationId) ?? null;
  const finishedCount = reservations.filter(
    (item) => item.serviceStatus === "completed" || item.lifecycleStatus === "cancelled",
  ).length;
  const unassignedCount = reservations.filter((item) => item.tableIds.length === 0).length;

  return (
    <section className={styles.floorView} aria-labelledby="floor-view-title">
      <div className={styles.viewHeading}>
        <div>
          <h2 id="floor-view-title">VIPフロア</h2>
          <p>席を選ぶと予約詳細と操作を表示します。</p>
        </div>
        <button type="button" className={styles.secondaryButton} onClick={onOpenAssignment} disabled={!selectedReservationId}>
          <MoveRight aria-hidden size={16} /> 席割当先を選択
        </button>
      </div>

      <div className={styles.floorTaskTabs} role="tablist" aria-label="Floorタスク">
        {([
          ["reservations", "予約", reservations.length - finishedCount],
          ["waitlist", "未割当", unassignedCount],
          ["finished", "完了", finishedCount],
          ["blocks", "ブロック", board.blocks.length],
        ] as const).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={taskMode === key}
            data-active={taskMode === key || undefined}
            onClick={() => setTaskMode(key)}
          >
            {label} <span>{count}</span>
          </button>
        ))}
      </div>

      {selectedReservation ? (
        <section className={styles.floorMobileFocus} aria-label="席割当対象">
          <div>
            <strong>{selectedReservation.publicCode}</strong>
            <span>{selectedReservation.guestLabel}</span>
            <small>{selectedReservation.startLabel}–{selectedReservation.endLabel} · {selectedReservation.guestCount}名</small>
          </div>
          <dl>
            <div><dt>現在席</dt><dd>{selectedReservation.tableCodes.join(" + ") || "未割当"}</dd></div>
            <span aria-hidden>→</span>
            <div><dt>移動先</dt><dd>{board.tables.find((table) => table.id === selectedTableId)?.displayCode ?? "未選択"}</dd></div>
          </dl>
        </section>
      ) : null}

      <div className={styles.floorWorkArea}>
        <aside className={styles.floorTaskRail} aria-label="Floor予約タスク">
          <label>
            <Search size={14} aria-hidden />
            <span className="sr-only">Floorタスクを検索</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="番号 / ゲスト / 席" />
          </label>
          <div className={styles.floorTaskList}>
            {taskMode === "blocks" ? board.blocks.map((block) => (
              <button
                key={block.id}
                type="button"
                onClick={() => onSelectTable(block.targets.tableIds[0] ?? board.tables[0]?.id ?? "", null)}
              >
                <TriangleAlert size={14} aria-hidden />
                <span><strong>{block.kind}</strong><small>{block.targets.tableIds.join(" + ") || "全席"} · {new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" }).format(new Date(block.startAt))}</small></span>
              </button>
            )) : railReservations.map((reservation) => {
              const meta = getStatusMeta(reservation.serviceStatus);
              const Icon = meta.icon;
              return (
                <button
                  key={reservation.id}
                  type="button"
                  data-selected={reservation.id === selectedReservationId || undefined}
                  onClick={() => onSelectReservation(reservation.id)}
                >
                  <Icon size={14} aria-hidden />
                  <span><strong>{reservation.startLabel} · {reservation.publicCode}</strong><small>{reservation.guestLabel} · {reservation.tableCodes.join(" + ") || "未割当"}</small></span>
                </button>
              );
            })}
            {(taskMode === "blocks" ? board.blocks.length === 0 : railReservations.length === 0) ? (
              <p>この条件に一致する項目はありません。</p>
            ) : null}
          </div>
        </aside>

        <div className={styles.floorCanvas}>
        <Image
          src="/media/images/vipmapv3.9239fd2174.webp"
          alt="GHOST Osaka VIPフロア座席図"
          fill
          priority
          sizes="(min-width: 1280px) 900px, (min-width: 768px) 72vw, 100vw"
          className={styles.floorImage}
        />
        <div className={styles.mapIdentity}>
          <MapPinned size={15} aria-hidden />
          <span>GHOST OSAKA / 1F VIP</span>
        </div>

        {board.tables.map((table) => {
          const reservation = table.reservationIds.map((id) => reservationById.get(id)).find(Boolean) ?? null;
          const meta = getStatusMeta(reservation?.serviceStatus);
          const Icon = meta.icon;
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
              data-tone={blocked || table.operationalLocked ? "danger" : meta.tone}
              data-cue={blocked ? "double" : meta.cue}
              data-selected={selected || undefined}
              data-staff-filtered={filteredOut || undefined}
              style={{
                left: `${table.geometry.xPercent}%`,
                top: `${table.geometry.yPercent}%`,
                width: `${table.geometry.widthPercent}%`,
                minHeight: `${table.geometry.heightPercent}%`,
                transform: `translate(-50%, -50%) rotate(${table.geometry.rotationDegrees}deg)`,
              }}
              onClick={() => onSelectTable(table.id, reservation?.id ?? null)}
              aria-pressed={selected}
              aria-label={`${table.displayCode}、${table.name}、担当${staff?.displayName ?? "なし"}、${blocked ? "予約ブロック" : table.operationalLocked ? "席ロック" : meta.label}${reservation ? `、${reservation.publicCode}、${reservation.startLabel}` : "、空席"}`}
              title={table.operationalLocked ? table.lockReason ?? "席ロック" : reservation?.guestLabel ?? "空席"}
            >
              <span className={styles.nodeCode}>{table.displayCode}</span>
              <span className={styles.nodeStatus}>
                {table.operationalLocked ? <LockKeyhole size={12} aria-hidden /> : blocked ? <Link2 size={12} aria-hidden /> : <Icon size={12} aria-hidden />}
                {blocked ? "ブロック" : table.operationalLocked ? "ロック" : meta.shortLabel}
              </span>
              <span className={styles.nodeDetail}>{reservation ? `${reservation.startLabel} / ${reservation.guestCount}名` : `${table.capacityMax}名 / 空席`}</span>
              {staff ? <span className={styles.nodeStaff}>担当 {staff.displayName}</span> : null}
            </button>
          );
        })}
        </div>
      </div>

      <div className={styles.floorLegend} aria-label="座席状態の凡例">
        {["来店予定", "遅延", "着席中", "会計依頼", "空席", "ブロック / ロック"].map((label, index) => (
          <span key={label} data-cue={["line", "stripe", "solid", "double", "dash", "double"][index]}>{label}</span>
        ))}
      </div>
      <div className={styles.floorContextAction}>
        <span>{selectedTableId
          ? `${board.tables.find((table) => table.id === selectedTableId)?.displayCode ?? "VIP席"} を選択中`
          : "VIP席を選択してください"}</span>
        <button type="button" className={styles.primaryButton} onClick={onOpenAssignment} disabled={!selectedReservationId}>
          <MoveRight aria-hidden size={16} />割当を確認
        </button>
      </div>
    </section>
  );
}
