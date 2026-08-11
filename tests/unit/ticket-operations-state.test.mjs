import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";

async function loadModule(relativePath) {
  const source = await readFile(new URL(`../../${relativePath}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { exports: {}, module: { exports: {} } };
  context.module.exports = context.exports;
  vm.runInNewContext(compiled, context);
  return context.module.exports;
}

async function loadModuleWithMocks(relativePath, mocks, globals = {}) {
  const source = await readFile(new URL(`../../${relativePath}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = {
    exports: {},
    module: { exports: {} },
    require(specifier) {
      if (specifier in mocks) return mocks[specifier];
      throw new Error(`unexpected module: ${specifier}`);
    },
    ...globals,
  };
  context.module.exports = context.exports;
  vm.runInNewContext(compiled, context);
  return context.module.exports;
}

test("queue filtering remains capability-scoped and searches only projected hints", async () => {
  const { filterTicketOperationItems } = await loadModule(
    "src/components/admin/vip-floor-v2/ticket-operations/state.ts",
  );
  const items = [
    { id: "one", kind: "admission", publicCode: "GT-ONE", maskedEmail: "a•••@example.invalid", eventTitle: "GHOST", statusLabel: "未入場" },
    { id: "two", kind: "refund_review", publicCode: "GT-TWO", maskedEmail: "b•••@example.invalid", eventTitle: "GHOST", statusLabel: "返金確認" },
    { id: "three", kind: "checkout_review", publicCode: "GT-THREE", maskedEmail: "c•••@example.invalid", eventTitle: "GHOST", statusLabel: "決済結果不明" },
  ];

  assert.deepEqual(
    JSON.parse(JSON.stringify(filterTicketOperationItems(items, "", "all", { managerOperationsEnabled: false, refundReviewEnabled: true }))),
    [items[1], items[2]],
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(filterTicketOperationItems(items, "GT-ONE", "all", { managerOperationsEnabled: true, refundReviewEnabled: true }))),
    [items[0]],
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(filterTicketOperationItems(items, "raw@example.com", "all", { managerOperationsEnabled: true, refundReviewEnabled: true }))),
    [],
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(filterTicketOperationItems(items, "", "checkout_review", { managerOperationsEnabled: false, refundReviewEnabled: true }))),
    [items[2]],
  );
});

test("typed failures turn stale versions and offline state into explicit recovery", async () => {
  const { describeTicketOperationFailure } = await loadModule(
    "src/components/admin/vip-floor-v2/ticket-operations/state.ts",
  );

  assert.match(describeTicketOperationFailure("version_conflict", 8), /v8/u);
  assert.match(describeTicketOperationFailure("offline", null), /再接続/u);
  assert.match(describeTicketOperationFailure("provider_disabled", null), /送信事業者/u);
});

test("ticket operation reducer fences capability, queue, detail and mutation states", async () => {
  const {
    INITIAL_TICKET_OPERATIONS_STATE,
    ticketOperationsReducer,
  } = await loadModule(
    "src/components/admin/vip-floor-v2/ticket-operations/state.ts",
  );
  const capabilities = {
    ok: true,
    serverNow: "2026-08-11T13:00:00.000Z",
    capabilities: { managerOperationsEnabled: true, refundReviewEnabled: true },
    readiness: { managerOperations: "ready", refundReview: "ready" },
  };
  const queue = {
    ok: true,
    serverNow: capabilities.serverNow,
    environment: "live",
    eventSessions: [],
    recentAdmissions: [],
    health: {},
    items: [],
  };

  let state = ticketOperationsReducer(INITIAL_TICKET_OPERATIONS_STATE, {
    type: "capabilities_pending",
  });
  assert.equal(state.capabilitiesReady, false);
  state = ticketOperationsReducer(state, { type: "capabilities_loaded", response: capabilities });
  assert.equal(state.capabilitiesReady, true);
  state = ticketOperationsReducer(state, { type: "queue_pending" });
  assert.equal(state.queuePending, true);
  state = ticketOperationsReducer(state, { type: "queue_loaded", response: queue });
  assert.equal(state.queuePending, false);
  state = ticketOperationsReducer(state, { type: "order_pending", publicCode: "GT-DEMO20260811" });
  assert.equal(state.selectedPublicCode, "GT-DEMO20260811");
  state = ticketOperationsReducer(state, { type: "mutation_pending" });
  assert.equal(state.mutationPending, true);
  state = ticketOperationsReducer(state, { type: "mutation_succeeded", message: "監査済み" });
  assert.equal(state.mutationPending, false);
  assert.equal(state.statusMessage, "監査済み");
  state = ticketOperationsReducer(state, { type: "selection_cleared" });
  assert.equal(state.selectedPublicCode, null);
});

test("demo API performs capabilities, refund-only reads and mutations with zero network calls", async () => {
  let networkCalls = 0;
  const sentinels = {
    capabilities: { ok: true, capabilities: {} },
    queue: { ok: true, items: [] },
    order: { ok: true, order: {} },
    mutation: { ok: true, action: "refund_resolve" },
  };
  const calls = [];
  const api = await loadModuleWithMocks(
    "src/components/admin/vip-floor-v2/ticket-operations/api.ts",
    {
      "./demo": {
        readDemoTicketCapabilities() {
          calls.push("capabilities");
          return sentinels.capabilities;
        },
        readDemoTicketQueue(_store, scope) {
          calls.push(`queue:${scope}`);
          return sentinels.queue;
        },
        readDemoTicketOrder() {
          calls.push("order");
          return sentinels.order;
        },
        applyDemoTicketOperation() {
          calls.push("mutation");
          return sentinels.mutation;
        },
      },
    },
    {
      fetch() {
        networkCalls += 1;
        throw new Error("demo_network_boundary_breached");
      },
    },
  );
  const context = { mode: "demo", demoStore: {} };

  assert.equal(await api.loadCapabilities(context), sentinels.capabilities);
  assert.equal(await api.loadTicketOperationsQueue(context, "refund"), sentinels.queue);
  assert.equal(await api.loadTicketOperationsOrder(context, "GT-DEMO20260811", "refund"), sentinels.order);
  assert.equal(await api.runTicketOperation(context, {
    action: "refund_resolve",
    reviewId: "10000000-0000-4000-8000-000000000002",
    resolution: "dismiss_no_money_moved",
    allocations: [],
    expectedVersion: 1,
    observationVersion: 1,
    observationHash: "a".repeat(64),
    reason: "合成データの確認理由",
    idempotencyKey: "10000000-0000-4000-8000-000000000012",
  }), sentinels.mutation);
  assert.equal(networkCalls, 0);
  assert.deepEqual(calls, ["capabilities", "queue:refund", "order", "mutation"]);
});
