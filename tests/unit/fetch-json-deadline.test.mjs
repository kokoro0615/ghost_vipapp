import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import http from "node:http";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../../src/lib/fetchJsonWithDeadline.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function load(fetchImpl = fetch) {
  const context = { exports: {}, fetch: fetchImpl, AbortController, DOMException, SyntaxError, TypeError, setTimeout, clearTimeout };
  vm.runInNewContext(compiled, context);
  return context.exports.fetchJsonWithDeadline;
}

for (const phase of ["headers", "body"]) {
  for (const method of ["GET", "POST"]) {
    test(`${method} ${phase} stall expires, aborts the socket and never retries`, async (t) => {
      let count = 0;
      let closed;
      const socketClosed = new Promise((resolve) => { closed = resolve; });
      const server = http.createServer((req, res) => {
        count++;
        res.on("close", closed);
        if (phase === "body") {
          res.writeHead(200, { "content-type": "application/json" });
          res.write('{"ok":');
        }
      });
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      t.after(() => { server.closeAllConnections(); server.close(); });
      const start = Date.now();
      await assert.rejects(load()(`http://127.0.0.1:${server.address().port}`, { method, deadlineMs: 100 }), { name: "TimeoutError" });
      assert.ok(Date.now() - start < 1000);
      assert.equal(count, 1);
      await Promise.race([socketClosed, new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error("socket was not aborted")), 1000); timer.unref(); })]);
    });
  }
}

test("headers and JSON consumption share one budget even if the transport ignores abort", async () => {
  let signal;
  const request = load(async (_, init) => {
    signal = init.signal;
    await new Promise((resolve) => setTimeout(resolve, 60));
    return { ok: true, status: 200, json: () => new Promise(() => {}) };
  });
  const start = Date.now();
  await assert.rejects(request("/synthetic", { deadlineMs: 100 }), { name: "TimeoutError" });
  assert.ok(Date.now() - start < 150);
  assert.equal(signal.aborted, true);
});

test("complete JSON preserves status/payload and clears its timer", async () => {
  let signal;
  const request = load(async (_, init) => { signal = init.signal; return Response.json({ ok: true, value: 7 }, { status: 201 }); });
  const { response, payload } = await request("/synthetic", { deadlineMs: 30 });
  assert.equal(response.status, 201);
  assert.equal(payload.value, 7);
  await new Promise((resolve) => setTimeout(resolve, 45));
  assert.equal(signal.aborted, false);
});

test("an incomplete successful body is not converted into an empty success", async () => {
  const request = load(async () => new Response('{"ok":', { status: 200 }));
  await assert.rejects(request("/synthetic", { deadlineMs: 100 }), SyntaxError);
});

test("non-JSON HTTP failures retain status classification; empty 204 remains valid", async () => {
  const failed = await load(async () => new Response("unauthorized", { status: 401 }))("/synthetic", { deadlineMs: 100 });
  assert.equal(failed.response.status, 401);
  assert.equal(Object.keys(failed.payload).length, 0);
  const empty = await load(async () => new Response(null, { status: 204 }))("/synthetic", { deadlineMs: 100 });
  assert.equal(empty.response.status, 204);
});
