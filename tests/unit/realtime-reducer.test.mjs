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
  const context = {
    exports: {},
    module: { exports: {} },
    Date,
    JSON,
    Number,
    window: {
      localStorage: {
        getItem: (key) => storage.get(key) ?? null,
        removeItem: (key) => storage.delete(key),
        setItem: (key, value) => storage.set(key, value),
      },
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

test("offline cache strips customer, payment, notes, and mutation capability", async () => {
  const { api, storage } = await loadRealtimeModule();
  const board = {
    schemaVersion: "vip-floor.v2",
    generatedAt: "2026-07-26T13:00:00.000Z",
    boardRevision: 7,
    businessDay: { businessDate: "2026-07-26" },
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
  assert.equal(cached.reservations[0].customer, null);
  assert.equal(cached.reservations[0].payment, null);
  assert.deepEqual(cached.reservations[0].notes, []);
  assert.deepEqual(cached.notes, []);
});
