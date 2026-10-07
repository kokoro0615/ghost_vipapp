import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";

// The block form offers every table: VIP-1..VIP-8 plus WEST/EAST behind the DJ
// booth (2026-10-08). Run the real BFF parsers so a subset of nine or all ten
// tables is accepted, as the canonical v2 block parser (up to 100) does.
async function loadBlockParsers() {
  const source = await readFile(
    new URL("../../src/app/api/admin/vip-floor/operations/route.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(
    `${source}\nexport const __blockParsers = { parseBlock, parseBlockMutation };`,
    { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  const context = {
    URL,
    exports: {},
    module: { exports: {} },
    require(identifier) {
      if (identifier === "next/server") return { NextResponse: { json: (body, init) => ({ body, init }) } };
      if (identifier === "@/lib/ghostOperatingHours") return { isGhostOperatingInterval: () => true };
      if (identifier === "@/lib/server/ownerCapacityOverride") return { parseOwnerCapacityOverride: () => null };
      if (identifier === "@/generated/vipManagerRuntimeContract") {
        return { isValidVipManagerIdempotencyKey: () => true, isVipManagerReservationProvenance: () => true };
      }
      if (identifier === "@/lib/server/ghostAdminProxy") return { copyJson: () => null, ghostAdminFetch: () => null, requireAdminOperation: () => null };
      if (identifier === "@/lib/server/httpBoundary") {
        return { assertOperatorMutation: () => null, isHttpBodyError: () => false, readBoundedJsonObject: () => null };
      }
      throw new Error(`unexpected module ${identifier}`);
    },
  };
  context.module.exports = context.exports;
  vm.runInNewContext(compiled, context);
  return context.module.exports.__blockParsers;
}

const tableIds = Array.from(
  { length: 10 },
  (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
);

const blockPayload = (seatResourceIds) => ({
  eventDayId: "10000000-0000-4000-8000-000000000001",
  businessDate: "2026-10-09",
  scope: "all_operations",
  blockKind: "manual",
  startAt: "2026-10-09T13:00:00.000Z",
  endAt: "2026-10-09T15:00:00.000Z",
  memo: null,
  seatResourceIds,
  venueWide: false,
  repeatDays: 1,
});

test("a block can target nine or all ten tables on create and update", async () => {
  const { parseBlock, parseBlockMutation } = await loadBlockParsers();
  for (const ids of [tableIds.slice(1), tableIds, tableIds.slice(8)]) {
    const created = parseBlock(blockPayload(ids));
    assert.equal(created.ok, true, `create ${ids.length}`);
    assert.equal(created.value.seatResourceIds.length, ids.length);
    const updated = parseBlockMutation(
      { ...blockPayload(ids), blockId: "20000000-0000-4000-8000-000000000001", expectedVersion: 3 },
      true,
    );
    assert.equal(updated.ok, true, `update ${ids.length}`);
  }
  assert.equal(parseBlock(blockPayload([])).ok, false);
  assert.equal(parseBlock(blockPayload([tableIds[0], tableIds[0]])).ok, false);
});
