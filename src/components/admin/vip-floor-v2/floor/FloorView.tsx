"use client";

import Image from "next/image";
import { Link2, LockKeyhole, MapPinned, MoveRight } from "lucide-react";

import type { VipFloorBoardV2 } from "@/lib/vipFloorV2Contract";

import { getStatusMeta } from "../contract/statusModel";
import type { UiReservation } from "../contract/uiTypes";
import styles from "../VipFloorWorkspace.module.css";

type FloorViewProps = {
  board: VipFloorBoardV2;
  reservations: UiReservation[];
  selectedReservationId: string | null;
  selectedTableId: string | null;
  sectionId: string;
  onSelectTable: (tableId: string, reservationId: string | null) => void;
  onOpenAssignment: () => void;
};

export default function FloorView({ board, reservations, selectedReservationId, selectedTableId, sectionId, onSelectTable, onOpenAssignment }: FloorViewProps) {
  const reservationById = new Map(reservations.map((item) => [item.id, item]));
  const visibleTables = board.tables.filter((table) => sectionId === "all" || table.sectionId === sectionId);

  return (
    <section className={styles.floorView} aria-labelledby="floor-view-title">
      <div className={styles.viewHeading}>
        <div>
          <h2 id="floor-view-title">フロア図</h2>
          <p>座席を選択すると、キュー・時間軸・一覧・インスペクタが同一予約へ同期します。</p>
        </div>
        <button type="button" className={styles.secondaryButton} onClick={onOpenAssignment} disabled={!selectedReservationId}>
          <MoveRight aria-hidden size={16} /> 席割当先を選択
        </button>
      </div>

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

        {visibleTables.map((table) => {
          const reservation = table.reservationIds.map((id) => reservationById.get(id)).find(Boolean) ?? null;
          const meta = getStatusMeta(reservation?.serviceStatus);
          const Icon = meta.icon;
          const blocked = table.blockIds.length > 0;
          const selected = table.id === selectedTableId || reservation?.id === selectedReservationId;
          return (
            <button
              key={table.id}
              type="button"
              className={styles.tableNode}
              data-tone={blocked || table.operationalLocked ? "danger" : meta.tone}
              data-cue={blocked ? "double" : meta.cue}
              data-selected={selected || undefined}
              style={{
                left: `${table.geometry.xPercent}%`,
                top: `${table.geometry.yPercent}%`,
                width: `${table.geometry.widthPercent}%`,
                minHeight: `${table.geometry.heightPercent}%`,
                transform: `translate(-50%, -50%) rotate(${table.geometry.rotationDegrees}deg)`,
              }}
              onClick={() => onSelectTable(table.id, reservation?.id ?? null)}
              aria-pressed={selected}
              aria-label={`${table.displayCode}、${table.name}、${blocked ? "予約ブロック" : table.operationalLocked ? "席ロック" : meta.label}${reservation ? `、${reservation.publicCode}、${reservation.startLabel}` : "、空席"}`}
              title={table.operationalLocked ? table.lockReason ?? "席ロック" : reservation?.guestLabel ?? "空席"}
            >
              <span className={styles.nodeCode}>{table.displayCode}</span>
              <span className={styles.nodeStatus}>
                {table.operationalLocked ? <LockKeyhole size={12} aria-hidden /> : blocked ? <Link2 size={12} aria-hidden /> : <Icon size={12} aria-hidden />}
                {blocked ? "ブロック" : table.operationalLocked ? "ロック" : meta.shortLabel}
              </span>
              <span className={styles.nodeDetail}>{reservation ? `${reservation.startLabel} / ${reservation.guestCount}名` : `${table.capacityMax}名 / 空席`}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.floorLegend} aria-label="座席状態の凡例">
        {["来店予定", "遅延", "着席中", "会計依頼", "空席", "ブロック / ロック"].map((label, index) => (
          <span key={label} data-cue={["line", "stripe", "solid", "double", "dash", "double"][index]}>{label}</span>
        ))}
      </div>
    </section>
  );
}
