import assert from "node:assert/strict";
import test from "node:test";

import { adaptLegacyVipBoard } from "../../src/lib/vipFloorLegacy.ts";

const expectedGeometry = new Map([
  ["royal-vip-1", [72.8, 17.9, 4.7, 0]],
  ["prime-vip-2", [71.6, 71.9, 4.45, -6]],
  ["regular-vip-3", [50.9, 71.6, 4.45, 0]],
  ["regular-vip-4", [40.8, 71.6, 4.45, 0]],
  ["floor-vip-5", [42.5, 53.3, 4.3, 0]],
  ["floor-vip-6", [51.9, 53.3, 4.3, 0]],
  ["floor-vip-7", [51.8, 16.1, 4.15, 0]],
  ["floor-vip-8", [44.2, 16.1, 4.15, 0]],
]);

function seat(publicResourceCode, name = publicResourceCode) {
  return {
    publicResourceCode,
    name,
    capacityMin: 2,
    capacityMax: 8,
    occupancy: "available",
    reservation: null,
  };
}

test("legacy fallback resolves shuffled official resources to canonical v2 geometry", () => {
  const seats = [
    seat("floor-vip-8"),
    seat("regular-vip-3"),
    seat("royal-vip-1"),
    seat("floor-vip-6"),
    seat("prime-vip-2"),
    seat("floor-vip-7"),
    seat("regular-vip-4"),
    seat("floor-vip-5"),
  ];
  const board = adaptLegacyVipBoard({
    businessDate: "2026-07-31",
    reservations: [],
    seats,
    totals: {},
  }, "2026-07-31");

  for (const table of board.tables) {
    const expected = expectedGeometry.get(table.id);
    assert.ok(expected, `missing expected geometry for ${table.id}`);
    assert.deepEqual(
      [
        table.geometry.xPercent,
        table.geometry.yPercent,
        table.geometry.widthPercent,
        table.geometry.rotationDegrees,
      ],
      expected,
    );
  }
});

test("legacy fallback does not infer VIP-1 from an unrelated VIP-101 code", () => {
  const board = adaptLegacyVipBoard({
    businessDate: "2026-07-31",
    reservations: [],
    seats: [
      seat("VIP-101"),
      seat("royal-vip-1"),
    ],
    totals: {},
  }, "2026-07-31");

  const official = board.tables.find((table) => table.id === "royal-vip-1");
  assert.deepEqual(
    [official?.geometry.xPercent, official?.geometry.yPercent],
    [72.8, 17.9],
  );
  const unrelated = board.tables.find((table) => table.id === "VIP-101");
  assert.notDeepEqual(
    [unrelated?.geometry.xPercent, unrelated?.geometry.yPercent],
    [72.8, 17.9],
  );
});
