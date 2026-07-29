"use client";

import { useState } from "react";

import VipFloorWorkspace from "@/components/admin/vip-floor-v2/VipFloorWorkspace";

const businessDate = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Tokyo",
}).format(new Date());

function at(hour: number, minute = 0) {
  const dayOffset = hour >= 24 ? 1 : 0;
  const base = new Date(`${businessDate}T12:00:00+09:00`);
  base.setDate(base.getDate() + dayOffset);
  const isoDate = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(base);
  const h = String(hour % 24).padStart(2, "0");
  const m = String(minute).padStart(2, "0");
  return `${isoDate}T${h}:${m}:00+09:00`;
}

const seatCodes = ["01", "02", "03", "04", "05", "06", "07", "08"];

const guests = [
  "K. 佐々木 様",
  "R. 高橋 様",
  "MIZUKI 様",
  "T. 中村 様",
  "A. LAWRENCE 様",
  "S. 井上 様",
  "H. 渡辺 様",
  "Y. 岡田 様",
  "N. 藤井 様",
  "D. MORENO 様",
];

const statuses = [
  "seated",
  "late",
  "expected",
  "bill_requested",
  "bottle_pending",
  "arrived",
  "no_contact",
  "paid",
  "expected",
  "partial_arrival",
] as const;

const reservations = guests.map((guestLabel, index) => {
  const startHour = 21 + Math.floor(index / 2);
  const startMinute = index % 2 === 0 ? 0 : 30;
  const assigned = index < 8 ? [seatCodes[index]] : [];
  return {
    id: `res-${index + 1}`,
    publicCode: `VIP-${String(1024 + index * 7)}`,
    status: index === 7 ? "checked_in" : "confirmed",
    sourceChannel: index % 3 === 0 ? "online" : index % 3 === 1 ? "walk_in" : "admin_hold",
    serviceStatus: statuses[index],
    guestLabel,
    operatorNote: index % 4 === 0 ? "シャンパンタワー21:40手配。ホスト側と連携済み。" : null,
    guestCount: 2 + (index % 5),
    slot: { startAt: at(startHour, startMinute), endAt: at(startHour + 2, startMinute) },
    seats: assigned.map((code) => ({ publicResourceCode: code, name: `VIP ${code}` })),
    checkedInAt: ["seated", "arrived", "bill_requested", "paid", "bottle_pending"].includes(statuses[index])
      ? at(startHour, startMinute + 10 > 59 ? 59 : startMinute + 10)
      : null,
    seatDueAt: at(startHour + 2, startMinute),
    seatExtendedUntilAt: null,
    seatOverdue: index === 3,
    seatOverdueMinutes: index === 3 ? 18 : 0,
    updatedAt: new Date().toISOString(),
  };
});

const board = {
  ok: true,
  businessDate,
  eventDay: {
    id: "event-day-preview",
    businessDate,
    salesOpenAt: at(21),
    salesCloseAt: at(29),
    venueTimezone: "Asia/Tokyo",
  },
  slots: [{ startAt: at(21), endAt: at(29) }],
  reservations,
  seats: seatCodes.map((code, index) => ({
    publicResourceCode: code,
    name: index === 0 ? "ROYAL VIP" : `VIP BOOTH ${code}`,
    capacityMin: 2,
    capacityMax: index === 0 ? 12 : 8,
    active: index !== 6,
    occupancy: index < 6 ? "occupied" : "available",
    reservation: reservations[index] ?? null,
  })),
  totals: { reservations: reservations.length, availableSeats: 2, occupiedSeats: 6 },
  operations: { adminMutationEnabled: true },
};

let patched = false;
function patchFetch() {
  if (patched || typeof window === "undefined") return;
  patched = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes("/api/admin/session")) {
      return new Response(JSON.stringify({ ok: true, role: "floor_manager", displayName: "FLOOR / 山本" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("/api/admin/vip-floor")) {
      return new Response(JSON.stringify(board), { status: 200, headers: { "content-type": "application/json" } });
    }
    return original(input, init);
  };
}

export default function PreviewHarness() {
  const [ready] = useState(() => {
    patchFetch();
    return true;
  });
  if (!ready) return null;
  return <VipFloorWorkspace />;
}
