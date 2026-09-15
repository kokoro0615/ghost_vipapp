import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";

// Loads the real src/lib/server/httpBoundary.ts (dependency-free module) so the
// tested code is the shipping implementation, not a copy.
async function loadBoundary() {
  const source = await readFile(new URL("../../src/lib/server/httpBoundary.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { exports: {}, module: { exports: {} }, TextDecoder, URL };
  context.module.exports = context.exports;
  vm.runInNewContext(compiled, context);
  return context.module.exports;
}

const SELF = "https://vip.example.test";
const ROUTE_URL = `${SELF}/api/admin/vip-floor/commands`;

// Structural Request stand-in: the helpers only read .url, .headers.get(),
// and .body.getReader(). A plain Headers instance (guard "none") can carry a
// forged content-length, which a real fetch Request cannot express.
function makeRequest({ url = ROUTE_URL, headers = {}, chunks, stream } = {}) {
  let body = null;
  if (stream !== undefined) {
    body = stream;
  } else if (chunks !== undefined) {
    body = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk);
        }
        controller.close();
      },
    });
  }
  return { url, headers: new Headers(headers), body };
}

test("Content-Length must be a sane non-negative integer before any streaming", async () => {
  const { readBoundedRawBody } = await loadBoundary();

  // Exact declared length within budget streams to completion.
  const ok = await readBoundedRawBody(
    makeRequest({ headers: { "content-length": "5" }, chunks: ["{}abc"] }),
    64,
  );
  assert.equal(ok.byteLength, 5);

  // Malformed declarations are rejected outright.
  for (const bad of ["abc", "-1", "1.5", "1e4", "12 34", "+5", " ", "0x10"]) {
    await assert.rejects(
      () => readBoundedRawBody(makeRequest({ headers: { "content-length": bad }, chunks: ["{}"] }), 64),
      (error) => error?.code === "invalid_content_length",
      `content-length ${JSON.stringify(bad)} must be invalid_content_length`,
    );
  }

  // A declaration above the 64 MiB sanity ceiling is invalid even when the
  // route budget itself is larger.
  await assert.rejects(
    () => readBoundedRawBody(
      makeRequest({ headers: { "content-length": String(64 * 1024 * 1024 + 1) }, chunks: [] }),
      128 * 1024 * 1024,
    ),
    (error) => error?.code === "invalid_content_length",
  );

  // A declaration above the route budget is rejected without reading the body.
  await assert.rejects(
    () => readBoundedRawBody(
      makeRequest({ headers: { "content-length": "8193" }, chunks: [] }),
      8192,
    ),
    (error) => error?.code === "declared_length_too_large",
  );
});

test("streamed bytes are counted and the body is cancelled on overflow", async () => {
  const { readBoundedRawBody } = await loadBoundary();

  // Missing Content-Length: chunked stream is still counted. The mock stream
  // stays open — per spec, cancel() on an already-closed stream is a no-op and
  // never reaches the source's cancel callback.
  let cancelled = false;
  const unbounded = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(8192));
      controller.enqueue(new Uint8Array(8192));
    },
    cancel() { cancelled = true; },
  });
  await assert.rejects(
    () => readBoundedRawBody(makeRequest({ stream: unbounded }), 8192),
    (error) => error?.code === "body_too_large",
  );
  assert.equal(cancelled, true, "oversized stream must be cancelled");

  // Lying Content-Length (declared small, streams more) is caught by counting.
  let liedCancelled = false;
  const lying = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(8192));
      controller.enqueue(new Uint8Array(1));
    },
    cancel() { liedCancelled = true; },
  });
  await assert.rejects(
    () => readBoundedRawBody(
      makeRequest({ headers: { "content-length": "100" }, stream: lying }),
      8192,
    ),
    (error) => error?.code === "body_too_large",
  );
  assert.equal(liedCancelled, true);

  // Exact-ceiling streams succeed; one byte over fails.
  const atLimit = await readBoundedRawBody(
    makeRequest({ chunks: [new Uint8Array(4096), new Uint8Array(4096)] }),
    8192,
  );
  assert.equal(atLimit.byteLength, 8192);
  await assert.rejects(
    () => readBoundedRawBody(makeRequest({ chunks: [new Uint8Array(8193)] }), 8192),
    (error) => error?.code === "body_too_large",
  );

  // Bodyless requests return an empty buffer instead of throwing.
  const empty = await readBoundedRawBody(makeRequest({}), 8192);
  assert.equal(empty.byteLength, 0);
});

test("text bodies require strict (fatal) UTF-8, including across chunk splits", async () => {
  const { readBoundedText } = await loadBoundary();

  await assert.rejects(
    () => readBoundedText(makeRequest({ chunks: [new Uint8Array([0xff, 0xfe, 0xfd])] }), 64),
    (error) => error?.code === "invalid_utf8",
  );
  // Truncated multi-byte sequence at end of stream is fatal too.
  await assert.rejects(
    () => readBoundedText(makeRequest({ chunks: [new Uint8Array([0xe5, 0xb1])] }), 64),
    (error) => error?.code === "invalid_utf8",
  );

  // A valid multi-byte character split across chunks decodes correctly.
  const decoded = await readBoundedText(
    makeRequest({ chunks: [new Uint8Array([0xe5, 0xb1]), new Uint8Array([0xb1])] }),
    64,
  );
  assert.equal(decoded, "山");
});

test("JSON bodies must parse to a plain object", async () => {
  const { readBoundedJsonObject } = await loadBoundary();

  for (const body of ["[1,2]", '"x"', "42", "null", "true", "{bad", ""]) {
    await assert.rejects(
      () => readBoundedJsonObject(makeRequest({ chunks: [body] }), 8192),
      (error) => error?.code === "invalid_json",
      `body ${JSON.stringify(body)} must be invalid_json`,
    );
  }

  const parsed = await readBoundedJsonObject(makeRequest({ chunks: ['{"kind":"note"}'] }), 8192);
  assert.equal(parsed.kind, "note");

  // Bodyless request is invalid_json (not a silent empty object).
  await assert.rejects(
    () => readBoundedJsonObject(makeRequest({}), 8192),
    (error) => error?.code === "invalid_json",
  );
});

// Boundary results are plain objects created inside the vm realm, so compare
// fields instead of deep-strict object equality (prototype realms differ).
function expectBoundary(result, expected) {
  assert.equal(result?.ok, expected.ok);
  if (!expected.ok) {
    assert.equal(result.status, expected.status);
    assert.equal(result.error, expected.error);
  }
}

test("same-origin mutation gate: Origin, Sec-Fetch-Site, Content-Type ordering", async () => {
  const { assertOperatorMutation, assertSameOriginJsonMutation } = await loadBoundary();
  const req = (headers) => makeRequest({ headers });

  // No Origin/Sec-Fetch-Site = non-browser client (curl/server proxy): allowed,
  // but the JSON Content-Type requirement still applies.
  expectBoundary(
    assertOperatorMutation(req({ "content-type": "application/json" })),
    { ok: true },
  );

  // Same-origin browser mutation passes.
  expectBoundary(
    assertOperatorMutation(req({
      origin: SELF,
      "sec-fetch-site": "same-origin",
      "content-type": "application/json",
    })),
    { ok: true },
  );

  // Foreign Origin is rejected even when fetch metadata claims same-origin
  // (Origin is evaluated before Sec-Fetch-Site).
  expectBoundary(
    assertOperatorMutation(req({
      origin: "https://evil.example",
      "sec-fetch-site": "same-origin",
      "content-type": "application/json",
    })),
    { ok: false, status: 403, error: "origin_mismatch" },
  );

  // Origin: null never matches.
  expectBoundary(
    assertOperatorMutation(req({
      origin: "null",
      "sec-fetch-site": "none",
      "content-type": "application/json",
    })),
    { ok: false, status: 403, error: "origin_mismatch" },
  );

  // cross-site and same-site sibling contexts are blocked.
  for (const site of ["cross-site", "same-site"]) {
    expectBoundary(
      assertOperatorMutation(req({ "sec-fetch-site": site, "content-type": "application/json" })),
      { ok: false, status: 403, error: "cross_site_blocked" },
      `sec-fetch-site: ${site} must be blocked`,
    );
  }

  // "none" (direct navigation / user gesture) is allowed.
  expectBoundary(
    assertOperatorMutation(req({ "sec-fetch-site": "none", "content-type": "application/json" })),
    { ok: true },
  );

  // Non-JSON content types (incl. browser-simple form bodies) get 415.
  for (const contentType of ["text/plain", "application/x-www-form-urlencoded", "multipart/form-data; boundary=x"]) {
    expectBoundary(
      assertOperatorMutation(req({ "content-type": contentType })),
      { ok: false, status: 415, error: "unsupported_content_type" },
      `content-type ${contentType} must be rejected`,
    );
  }
  // Missing Content-Type defaults to requiring JSON.
  expectBoundary(
    assertOperatorMutation(req({ "sec-fetch-site": "same-origin" })),
    { ok: false, status: 415, error: "unsupported_content_type" },
  );

  // JSON media-type variants pass (charset suffix, case-insensitive).
  expectBoundary(
    assertOperatorMutation(req({ "content-type": "application/json; charset=utf-8" })),
    { ok: true },
  );
  expectBoundary(
    assertOperatorMutation(req({ "content-type": "APPLICATION/JSON" })),
    { ok: true },
  );

  // requireJsonBody:false permits body-less cookie mutations (logout/session).
  expectBoundary(
    assertOperatorMutation(req({ "sec-fetch-site": "same-origin" }), { requireJsonBody: false }),
    { ok: true },
  );
  expectBoundary(
    assertOperatorMutation(req({ "sec-fetch-site": "cross-site" }), { requireJsonBody: false }),
    { ok: false, status: 403, error: "cross_site_blocked" },
  );

  // requireOrigin and the explicit allowlist live on the shared helper.
  expectBoundary(
    assertSameOriginJsonMutation(req({}), { requireOrigin: true }),
    { ok: false, status: 403, error: "origin_required" },
  );
  expectBoundary(
    assertSameOriginJsonMutation(req({ origin: "https://sibling.example", "content-type": "application/json" }), {
      allowedOrigins: new Set(["https://sibling.example"]),
    }),
    { ok: true },
  );
  // The operator boundary itself configures no sibling allowlist.
  expectBoundary(
    assertOperatorMutation(req({ origin: "https://sibling.example", "content-type": "application/json" })),
    { ok: false, status: 403, error: "origin_mismatch" },
  );
});
