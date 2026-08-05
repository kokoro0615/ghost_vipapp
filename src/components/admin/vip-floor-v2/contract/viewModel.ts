import type { VipFloorBoardV2, VipFloorReservationV2 } from "@/lib/vipFloorV2Contract";

import { getStatusMeta } from "./statusModel";
import type { QueueGroup, UiReservation } from "./uiTypes";

function readGuestLabel(reservation: VipFloorReservationV2) {
  const customer = reservation.customer;
  if (!customer) return "ゲスト情報なし";
  const value = customer.displayLabel ?? customer.displayNameMasked ?? customer.guestLabel;
  return typeof value === "string" && value.trim() ? value : "マスク済みゲスト";
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  }).format(new Date(value));
}

export function toUiReservations(board: VipFloorBoardV2): UiReservation[] {
  const tableCodeById = new Map(board.tables.map((table) => [table.id, table.displayCode]));

  return board.reservations
    .map((reservation) => {
      const status = getStatusMeta(reservation.serviceStatus);
      const exceptionLabel = reservation.flags.includes("no_contact")
        ? "連絡未達"
        : reservation.flags.includes("capacity_warning")
          ? "定員確認"
          : reservation.flags.includes("time_conflict")
            ? "時間競合"
            : reservation.serviceStatus === "late"
              ? "遅延"
              : null;

      return {
        id: reservation.id,
        publicCode: reservation.publicCode,
        guestLabel: readGuestLabel(reservation),
        serviceStatus: reservation.serviceStatus ?? "expected",
        serviceLabel: status.label,
        lifecycleStatus: reservation.lifecycleStatus,
        startAt: reservation.scheduledStartAt,
        endAt: reservation.scheduledEndAt,
        startLabel: formatTime(reservation.scheduledStartAt),
        endLabel: formatTime(reservation.scheduledEndAt),
        guestCount: reservation.guestCount.total,
        tableIds: reservation.tableIds,
        tableCodes: reservation.tableIds.map((id) => tableCodeById.get(id) ?? "未割当"),
        sourceChannel: reservation.sourceChannel,
        sourceLabel: reservation.sourceChannel === "walk_in"
          ? "店頭"
          : reservation.sourceChannel === "phone"
            ? "電話"
            : reservation.sourceChannel === "admin"
              ? "管理者"
              : "オンライン",
        exceptionLabel,
        flags: reservation.flags,
        version: reservation.version,
        customerMasked: reservation.customer?.masked !== false,
        customerId: typeof reservation.customer?.customerId === "string"
          ? reservation.customer.customerId
          : null,
        bookingOfferingId: reservation.bookingOfferingId ?? null,
        bookingStaffMemberId: reservation.bookingStaffMemberId ?? null,
        notificationPreference: reservation.notificationPreference ?? "none",
        operatorNote: reservation.operatorNote ?? null,
      } satisfies UiReservation;
    })
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export function buildQueueGroups(reservations: UiReservation[]): QueueGroup[] {
  const critical = reservations.filter((item) => item.serviceStatus === "late" || item.serviceStatus === "no_contact");
  const unassigned = reservations.filter((item) => item.tableIds.length === 0);
  const review = reservations.filter((item) => item.flags.some((flag) => ["capacity_warning", "time_conflict"].includes(flag)));
  const arrivals = reservations.filter((item) => ["expected", "arrived", "partial_arrival"].includes(item.serviceStatus));

  return [
    { key: "critical", label: "至急対応", severity: "critical", reservationIds: critical.map((item) => item.id) },
    { key: "unassigned", label: "未割当", severity: "warning", reservationIds: unassigned.map((item) => item.id) },
    { key: "review", label: "確認待ち", severity: "warning", reservationIds: review.map((item) => item.id) },
    { key: "arrivals", label: "到着予定", severity: "routine", reservationIds: arrivals.map((item) => item.id) },
  ];
}

export function matchesReservation(item: UiReservation, query: string) {
  const normalized = query.trim().toLocaleLowerCase("ja-JP");
  if (!normalized) return true;
  return [item.publicCode, item.guestLabel, item.serviceLabel, item.exceptionLabel ?? "", ...item.tableCodes]
    .join(" ")
    .toLocaleLowerCase("ja-JP")
    .includes(normalized);
}
