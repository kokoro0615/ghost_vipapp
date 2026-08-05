import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";

async function loadRealtimeModule() {
  const source = await readFile(
    new URL("../../src/lib/vipFloorRealtime.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const storage = new Map();
  const localStorage = {
    get length() { return storage.size; },
    getItem: (key) => storage.get(key) ?? null,
    key: (index) => [...storage.keys()][index] ?? null,
    removeItem: (key) => storage.delete(key),
    setItem: (key, value) => storage.set(key, value),
  };
  const context = {
    exports: {},
    module: { exports: {} },
    Date,
    JSON,
    Number,
    window: {
      localStorage,
    },
  };
  context.module.exports = context.exports;
  vm.runInNewContext(compiled, context);
  return { api: context.module.exports, storage };
}

test("revision reducer rejects duplicates, old events, and another business day", async () => {
  const { api } = await loadRealtimeModule();
  const base = {
    currentBusinessDate: "2026-07-26",
    currentRevision: 12,
    incomingBusinessDate: "2026-07-26",
  };

  assert.equal(api.classifyBoardRevision({ ...base, incomingRevision: 12 }), "ignore");
  assert.equal(api.classifyBoardRevision({ ...base, incomingRevision: 11 }), "ignore");
  assert.equal(
    api.classifyBoardRevision({
      ...base,
      incomingBusinessDate: "2026-07-27",
      incomingRevision: 13,
    }),
    "ignore",
  );
  assert.equal(api.classifyBoardRevision({ ...base, incomingRevision: 13 }), "refresh");
  assert.equal(api.classifyBoardRevision({ ...base, incomingRevision: 15 }), "gap_refresh");
});

test("offline cache drops reservation data and mutation capability", async () => {
  const { api, storage } = await loadRealtimeModule();
  const board = {
    schemaVersion: "vip-floor.v2",
    generatedAt: "2026-07-26T13:00:00.000Z",
    boardRevision: 7,
    businessDay: { businessDate: "2026-07-26" },
    sections: [],
    tables: [],
    reservations: [{
      customer: { email: "must-not-persist@example.invalid" },
      payment: { provider: "must-not-persist" },
      notes: [{ body: "must-not-persist" }],
    }],
    notes: [{ body: "must-not-persist" }],
    operations: { adminMutationEnabled: true },
  };

  api.writeSafeBoardCache(board);
  const serialized = [...storage.values()].join("");

  assert.doesNotMatch(serialized, /must-not-persist/u);
  const cached = api.readSafeBoardCache("2026-07-26");
  assert.equal(cached.operations.adminMutationEnabled, false);
  assert.equal(cached.reservations.length, 0);
  assert.equal(cached.assignments.length, 0);
  assert.equal(cached.blocks.length, 0);
  assert.equal(cached.notes.length, 0);
});

test("offline cache persists only floor geometry and can be purged at the session boundary", async () => {
  const { api, storage } = await loadRealtimeModule();
  const board = {
    schemaVersion: "vip-floor.v2",
    generatedAt: "2026-07-26T13:00:00.000Z",
    boardRevision: 19,
    businessDay: {
      id: "event-day-internal-id",
      businessDate: "2026-07-26",
      venueTimezone: "Asia/Tokyo",
      operatingStartAt: "2026-07-26T22:00:00+09:00",
      operatingEndAt: "2026-07-27T05:00:00+09:00",
    },
    capabilities: {
      readCustomerPii: true,
      changeServiceStatus: true,
      changeAssignments: true,
      changeSchedule: true,
      manageBlocks: true,
      cancelReservation: true,
    },
    sections: [{ id: "section-internal-id", code: "MAIN", name: "1F", sortOrder: 1 }],
    tables: [{
      id: "table-internal-id",
      version: 8,
      publicResourceCode: "public-table-code",
      displayCode: "V1",
      name: "VIP 1",
      sectionId: "section-internal-id",
      capacityMin: 2,
      capacityMax: 6,
      onlineEligible: true,
      geometry: { shape: "rect", xPercent: 10, yPercent: 20, widthPercent: 12, heightPercent: 8, rotationDegrees: 0 },
      operationalLocked: true,
      lockReason: "must-not-persist-lock-reason",
      reservationIds: ["reservation-internal-id"],
      blockIds: ["block-internal-id"],
    }],
    reservations: [{
      id: "reservation-internal-id",
      publicCode: "VIP-SECRET-CODE",
      operatorNote: "must-not-persist-operator-note",
      scheduledStartAt: "2026-07-26T22:30:00+09:00",
    }],
    assignments: [{ id: "assignment-internal-id", reservationId: "reservation-internal-id", tableId: "table-internal-id" }],
    unassignedReservationIds: ["reservation-internal-id"],
    blocks: [{ id: "block-internal-id", memo: "must-not-persist-block-memo" }],
    notes: [{ id: "note-internal-id", body: "must-not-persist-note" }],
    totals: { tableCount: 1, reservationCount: 1 },
    operations: { adminMutationEnabled: true, webhookProcessingEnabled: true, publicBookingEnabled: true },
  };

  storage.set("unrelated-origin-key", "keep-me");
  api.writeSafeBoardCache(board);
  const serialized = [...storage.entries()]
    .filter(([key]) => key !== "unrelated-origin-key")
    .map(([, value]) => value)
    .join("");

  assert.doesNotMatch(
    serialized,
    /internal-id|VIP-SECRET-CODE|must-not-persist|scheduledStartAt|operatingStartAt/u,
  );
  const cached = api.readSafeBoardCache("2026-07-26");
  assert.equal(cached.reservations.length, 0);
  assert.equal(cached.assignments.length, 0);
  assert.equal(cached.blocks.length, 0);
  assert.equal(cached.notes.length, 0);
  assert.equal(cached.tables[0].displayCode, "V1");
  assert.equal(cached.tables[0].id, "cached-table-0");
  assert.equal(cached.operations.adminMutationEnabled, false);

  api.purgeSafeBoardCache();
  assert.deepEqual([...storage.entries()], [["unrelated-origin-key", "keep-me"]]);
});
