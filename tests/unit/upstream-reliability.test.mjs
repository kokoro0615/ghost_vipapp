import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

async function load(relativePath, imports, globals = {}) {
  const source = await readFile(new URL(`../../${relativePath}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, module: { exports },
    require(name) {
      assert.ok(name in imports, `unexpected import ${name}`);
      return imports[name];
    },
    Request, Response, Headers, URL, TextEncoder, ReadableStream,
    AbortController, AbortSignal, Error, process: { env: {} },
    ...globals,
  });
  return exports;
}

async function loadProxy(fetch) {
  const deadlines = [];
  const proxy = await load("src/lib/server/ghostAdminProxy.ts", {
    "node:crypto": { randomUUID: () => "synthetic-request" },
    "server-only": {}, "next/server": {},
    "@/lib/adminPermissions": {}, "@/lib/demo/accessContract": {},
    "./adminOperationAccess": {},
    "./ticketCanaryRuntimeGuard": { assertVipCanaryBackendUrl: () => ({}) },
  }, {
    fetch,
    AbortSignal: {
      any: AbortSignal.any.bind(AbortSignal),
      timeout(ms) {
        const controller = new AbortController();
        deadlines.push({ ms, expire: () => controller.abort(new DOMException("expired", "TimeoutError")) });
        return controller.signal;
      },
    },
  });
  return { ...proxy, deadlines };
}

function stalledFetch(calls) {
  return async (url, init) => {
    calls.push({ url, init });
    return new Promise((resolve, reject) => {
      const aborted = () => reject(init.signal.reason);
      if (init.signal?.aborted) aborted();
      else init.signal?.addEventListener("abort", aborted, { once: true });
    });
  };
}

test("upstream read has a bounded deadline and aborts a stalled transport", async () => {
  const calls = [];
  const proxy = await loadProxy(stalledFetch(calls));
  const pending = proxy.ghostAdminFetch("/api/admin/session", {}, "synthetic-token");
  assert.equal(proxy.deadlines.length, 1, "upstream fetch must have a deadline");
  assert.ok(proxy.deadlines[0].ms > 0 && proxy.deadlines[0].ms <= 10_000);
  const rejected = assert.rejects(pending, { name: "TimeoutError" });
  proxy.deadlines[0].expire();
  await rejected;
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.signal.aborted, true);
});

test("caller cancellation is preserved and a mutation is never retried", async () => {
  const calls = [];
  const proxy = await loadProxy(stalledFetch(calls));
  const caller = new AbortController();
  const pending = proxy.ghostAdminFetch("/api/admin/v2/reservations", {
    method: "POST", signal: caller.signal,
    headers: { "idempotency-key": "synthetic-key", "x-request-id": "request-kept" },
    body: '{"expectedVersion":1}',
  }, "synthetic-token");
  const rejected = assert.rejects(pending, { name: "AbortError" });
  caller.abort();
  await rejected;
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.headers.get("idempotency-key"), "synthetic-key");
  assert.equal(calls[0].init.headers.get("authorization"), "Bearer synthetic-token");
  assert.equal(calls[0].init.headers.get("x-request-id"), "request-kept");
  assert.equal(calls[0].init.body, '{"expectedVersion":1}');
  assert.equal(calls[0].init.redirect, "error");
  assert.equal(calls[0].init.cache, "no-store");
});

test("deadline remains active while consuming a stalled response body", async () => {
  const proxy = await loadProxy(async (_url, init) => new Response(new ReadableStream({
    start(controller) {
      init.signal?.addEventListener("abort", () => controller.error(init.signal.reason), { once: true });
    },
  })));
  const response = await proxy.ghostAdminFetch("/api/admin/session");
  const pending = proxy.copyJson(response);
  assert.equal(proxy.deadlines.length, 1);
  const rejected = assert.rejects(pending, { name: "TimeoutError" });
  proxy.deadlines[0].expire();
  await rejected;
});

test("malformed JSON retains the existing safe empty-payload fallback", async () => {
  const proxy = await loadProxy(async () => new Response("invalid"));
  assert.equal(JSON.stringify(await proxy.copyJson(new Response("invalid"))), "{}");
});

async function streamHarness() {
  const calls = [];
  const timers = new Map();
  let timerId = 0;
  const schedule = (callback, ms) => { const id = ++timerId; timers.set(id, { callback, ms }); return id; };
  const route = await load("src/app/api/admin/vip-floor/events/route.ts", {
    "@/lib/server/ghostAdminProxy": {
      readAdminToken: () => "synthetic-token",
      readAdminSession: async () => ({ ok: true }),
      copyJson: (response) => response.json(),
      ghostAdminFetch: (_path, init) => new Promise((resolve, reject) => calls.push({ init, resolve, reject })),
    },
  }, { setTimeout: schedule, setInterval: schedule, clearTimeout: (id) => timers.delete(id), clearInterval: (id) => timers.delete(id) });
  const caller = new AbortController();
  const response = await route.GET(new Request("https://vip.test/api/admin/vip-floor/events?date=2026-09-06&since=0", { signal: caller.signal }));
  const reader = response.body.getReader();
  await reader.read(); // retry directive, before the upstream revision arrives
  return { calls, timers, caller, reader };
}

test("SSE upstream failure emits unavailable and closes without scheduling another poll", async () => {
  const harness = await streamHarness();
  harness.calls[0].reject(new DOMException("expired", "TimeoutError"));
  const event = new TextDecoder().decode((await harness.reader.read()).value);
  assert.match(event, /event: unavailable/);
  assert.match(event, /"status":503/);
  assert.equal((await harness.reader.read()).done, true);
  assert.equal(harness.timers.size, 0);
});

test("SSE keeps its ready and revision protocol and 1500ms sequential poll budget", async () => {
  const harness = await streamHarness();
  harness.calls[0].resolve(Response.json({ businessDate: "2026-09-06", revision: 0 }));
  assert.match(new TextDecoder().decode((await harness.reader.read()).value), /event: ready/);
  const [timerId, timer] = [...harness.timers].find(([, { ms }]) => ms === 1_500);
  harness.timers.delete(timerId);
  const polling = timer.callback();
  assert.equal(harness.calls.length, 2);
  harness.calls[1].resolve(Response.json({ businessDate: "2026-09-06", revision: 1 }));
  assert.match(new TextDecoder().decode((await harness.reader.read()).value), /event: revision/);
  await polling;
  await harness.reader.cancel();
  assert.equal(harness.timers.size, 0);
});

for (const reason of ["disconnect", "reader cancellation", "stream lifetime"]) {
  test(`SSE ${reason} aborts upstream work and clears scheduled work`, async () => {
    const harness = await streamHarness();
    if (reason === "disconnect") harness.caller.abort();
    else if (reason === "reader cancellation") await harness.reader.cancel();
    else [...harness.timers.values()].find(({ ms }) => ms === 25_000).callback();
    assert.equal(harness.calls[0].init.signal?.aborted, true, "closing SSE must cancel its in-flight revision read");
    assert.equal(harness.timers.size, 0);
    // A response that won the race with abort must not write into a closed stream.
    harness.calls[0].resolve(Response.json({ businessDate: "2026-09-06", revision: 1 }));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(harness.timers.size, 0);
    assert.equal((await harness.reader.read()).done, true);
  });
}
