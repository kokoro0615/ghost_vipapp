import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";

async function loadOccupancyModule() {
  const source = await readFile(
    new URL("../../src/components/admin/vip-floor-v2/operations/tableOccupancy.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { exports: {}, module: { exports: {} } };
  context.module.exports = context.exports;
  vm.runInNewContext(compiled, context);
  return context.module.exports;
}

// 2026-09-19 board as it stood when the 409s were reported (codes kept, ids shortened).
const board = {
  tables: [
    { id: "t1", displayCode: "VIP-1", sectionId: "vip-area" },
    { id: "t2", displayCode: "VIP-2", sectionId: "vip-area" },
    { id: "t3", displayCode: "VIP-3", sectionId: "vip-area" },
    { id: "t5", displayCode: "VIP-5", sectionId: "floor" },
    { id: "t7", displayCode: "VIP-7", sectionId: "stage" },
  ],
  reservations: [
    { id: "r1", publicCode: "M252059DAC6" },
    { id: "r2", publicCode: "G324B6AD953" },
    { id: "r3", publicCode: "MF16E0E7DAD" },
  ],
  assignments: [
    { reservationId: "r1", tableId: "t1", startAt: "2026-09-19T15:00:00+00:00", endAt: "2026-09-19T20:00:00+00:00" },
    { reservationId: "r2", tableId: "t2", startAt: "2026-09-19T16:00:00+00:00", endAt: "2026-09-19T18:00:00+00:00" },
    { reservationId: "r3", tableId: "t3", startAt: "2026-09-19T16:00:00+00:00", endAt: "2026-09-19T20:00:00+00:00" },
  ],
  blocks: [
    {
      scope: "all_operations",
      startAt: "2026-09-19T14:00:00+00:00",
      endAt: "2026-09-19T15:00:00+00:00",
      targets: { venueWide: false, sectionIds: ["floor"], tableIds: [] },
    },
    {
      scope: "online_only",
      startAt: "2026-09-19T13:00:00+00:00",
      endAt: "2026-09-19T20:00:00+00:00",
      targets: { venueWide: true, sectionIds: [], tableIds: [] },
    },
  ],
};

test("tables busy in the draft window are reported with the booking that holds them", async () => {
  const { tableOccupancy, occupancyLabel } = await loadOccupancyModule();
  const busy = tableOccupancy(board, "2026-09-20T01:00", "2026-09-20T03:00", null);

  assert.deepEqual([...busy.keys()].sort(), ["t1", "t2", "t3"]);
  assert.equal(occupancyLabel(busy.get("t2")), "予約 G324B6AD953 01:00–03:00");
  assert.equal(busy.has("t5"), false, "the floor block ended at 00:00");
  assert.equal(busy.has("t7"), false, "online-only blocks do not stop manager bookings");
});

test("windows that only touch an existing booking are free (half-open overlap)", async () => {
  const { tableOccupancy } = await loadOccupancyModule();
  const busy = tableOccupancy(board, "2026-09-19T22:00", "2026-09-20T00:00", null);

  assert.equal(busy.has("t1"), false, "VIP-1 starts at 00:00");
  assert.equal(busy.has("t2"), false);
});

test("all-operations blocks cover their section", async () => {
  const { tableOccupancy, occupancyLabel } = await loadOccupancyModule();
  const busy = tableOccupancy(board, "2026-09-19T23:00", "2026-09-20T00:30", null);

  assert.equal(occupancyLabel(busy.get("t5")), "受付ブロック 23:00–00:00");
  assert.equal(busy.has("t7"), false);
});

test("editing a reservation does not collide with its own table", async () => {
  const { tableOccupancy } = await loadOccupancyModule();
  const busy = tableOccupancy(board, "2026-09-20T01:00", "2026-09-20T03:00", "r3");

  assert.equal(busy.has("t3"), false);
  assert.equal(busy.has("t2"), true);
});

test("an incomplete or inverted window reports nothing", async () => {
  const { tableOccupancy } = await loadOccupancyModule();

  assert.equal(tableOccupancy(board, "2026-09-20T03:00", "2026-09-20T01:00", null).size, 0);
  assert.equal(tableOccupancy(board, "", "", null).size, 0);
});
