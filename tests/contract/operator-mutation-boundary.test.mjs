import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

// Complete coverage of the operator BFF boundary: every src/app/api route file
// and every exported handler is classified here. Adding a route without
// updating the inventory fails the completeness test, so mutation coverage
// cannot silently drift.

const API_ROOT = new URL("../../src/app/api/", import.meta.url);

// Handler classifications:
// - "json-mutation": must run assertOperatorMutation(request) (JSON required)
//   before any auth check or body read, and may only read the body through the
//   bounded helpers (or readTicketOperationCommand for ticket operations).
// - "cookie-mutation": state-changing without a request body (cookie install /
//   clear); must run assertOperatorMutation(request, { requireJsonBody: false })
//   before auth/lock checks.
// - "read": read-only handler; must not read a request body at all.
const ROUTE_INVENTORY = new Map([
  ["admin/demo/lease/route.ts", { GET: "read" }],
  ["admin/session/route.ts", { GET: "cookie-mutation", POST: "json-mutation", DELETE: "cookie-mutation" }],
  ["admin/vip-floor/route.ts", { GET: "cookie-mutation" }],
  ["admin/vip-floor/business-days/route.ts", { GET: "read", POST: "json-mutation" }],
  ["admin/vip-floor/commands/route.ts", { POST: "json-mutation" }],
  ["admin/vip-floor/customers/[customerId]/route.ts", { GET: "read", PATCH: "json-mutation" }],
  ["admin/vip-floor/events/route.ts", { GET: "read" }],
  ["admin/vip-floor/observability/route.ts", { GET: "read", POST: "json-mutation" }],
  ["admin/vip-floor/operations/route.ts", { POST: "json-mutation" }],
  ["admin/vip-floor/options/route.ts", { GET: "read" }],
  ["admin/vip-floor/reservations/[reservationId]/customer-link/route.ts", { PATCH: "json-mutation" }],
  ["admin/vip-floor/staff/route.ts", { GET: "read", POST: "json-mutation" }],
  ["admin/vip-floor/waitlist/route.ts", { GET: "read", POST: "json-mutation" }],
  ["admin/vip-floor/tickets/admissions/assist/route.ts", { POST: "json-mutation" }],
  ["admin/vip-floor/tickets/capabilities/route.ts", { GET: "read" }],
  ["admin/vip-floor/tickets/email-jobs/retry/route.ts", { POST: "json-mutation" }],
  ["admin/vip-floor/tickets/entry/[action]/route.ts", { POST: "json-mutation" }],
  ["admin/vip-floor/tickets/orders/[orderPublicCode]/route.ts", { GET: "read" }],
  ["admin/vip-floor/tickets/queue/route.ts", { GET: "read" }],
  ["admin/vip-floor/tickets/refund-reviews/resolve/route.ts", { POST: "json-mutation" }],
  ["admin/vip-floor/tickets/search/route.ts", { POST: "json-mutation" }],
  ["admin/vip-floor/tickets/sessions/revoke/route.ts", { POST: "json-mutation" }],
  ["internal/ticket-wallet/canary-evidence/route.ts", { GET: "read" }],
]);

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

// Raw request-body APIs that must never appear in a route file; all body reads
// go through readBounded* helpers or readTicketOperationCommand.
const RAW_BODY_PATTERN = /request\.(?:json|text|formData|arrayBuffer|blob)\s*\(|request\.body\s*(?:\.|\?)/u;

async function listRouteFiles(dir, prefix = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...await listRouteFiles(new URL(`${entry.name}/`, dir), rel));
    } else if (entry.name === "route.ts") {
      files.push(rel);
    }
  }
  return files;
}

function readRoute(rel) {
  return readFile(new URL(rel, API_ROOT), "utf8");
}

// Splits a route file into top-level function blocks keyed by function name so
// per-handler ordering can be asserted (e.g. session POST delegates to
// unlockAccess, where the gate actually lives).
function functionBlocks(source) {
  const blocks = new Map();
  const pattern = /^(?:export\s+)?async function (\w+)\s*\(/gmu;
  const matches = [...source.matchAll(pattern)];
  matches.forEach((match, index) => {
    const end = index + 1 < matches.length ? matches[index + 1].index : source.length;
    blocks.set(match[1], source.slice(match.index, end));
  });
  return blocks;
}

function assertBefore(block, earlier, later, context) {
  const earlierIndex = block.indexOf(earlier);
  const laterIndex = block.indexOf(later);
  assert.notEqual(earlierIndex, -1, `${context}: expected ${JSON.stringify(earlier)} in handler`);
  if (laterIndex !== -1) {
    assert.ok(earlierIndex < laterIndex, `${context}: ${earlier} must run before ${later}`);
  }
}

async function routeSources() {
  const files = (await listRouteFiles(API_ROOT)).sort();
  const sources = new Map();
  for (const file of files) {
    sources.set(file, await readRoute(file));
  }
  return { files, sources };
}

test("route inventory is complete — every src/app/api route file is classified", async () => {
  const { files } = await routeSources();
  assert.deepEqual(files, [...ROUTE_INVENTORY.keys()].sort());
});

test("route files never read request bodies directly", async () => {
  const { sources } = await routeSources();
  for (const [file, source] of sources) {
    assert.doesNotMatch(
      source,
      RAW_BODY_PATTERN,
      `${file}: body reads must go through readBounded*/readTicketOperationCommand`,
    );
  }
});

test("every exported handler matches its boundary classification", async () => {
  const { sources } = await routeSources();

  for (const [file, expected] of ROUTE_INVENTORY) {
    const source = sources.get(file);
    assert.ok(source, `missing route file ${file}`);
    const blocks = functionBlocks(source);

    const exported = [...blocks.keys()].filter((name) => HTTP_METHODS.has(name));
    assert.deepEqual(exported.sort(), Object.keys(expected).sort(), `${file}: exported handlers differ`);

    for (const [method, kind] of Object.entries(expected)) {
      const block = blocks.get(method);
      const context = `${file} ${method}`;

      if (kind === "read") {
        assert.doesNotMatch(block, RAW_BODY_PATTERN, `${context}: read handler must not read a body`);
        continue;
      }

      // Mutation handlers: the gate may live in a delegate (session POST →
      // unlockAccess); resolve the block that performs the work only when the
      // exported handler itself does not carry the gate.
      let impl = block;
      if (!impl.includes("assertOperatorMutation")) {
        const delegate = /return (\w+)\(request\)/u.exec(block);
        if (delegate && blocks.has(delegate[1])) {
          impl = blocks.get(delegate[1]);
        }
      }

      if (kind === "json-mutation") {
        assert.match(impl, /assertOperatorMutation\(request\)/u, `${context}: missing same-origin JSON gate`);
      } else {
        assert.match(
          impl,
          /assertOperatorMutation\(request, \{\s*requireJsonBody:\s*false\s*\}\)/u,
          `${context}: missing cookie-mutation gate`,
        );
      }

      // The gate must run before any authentication or lock check.
      for (const authMarker of [
        "requireAdminOperation",
        "readAdminToken",
        "readTicketOperationCommand",
        "TRUSTED_ACCESS_LOCK_HEADER",
        "TRUSTED_ACCESS_LANE_HEADER",
        "resolveExplicitAccessCredentials",
        "requireVipTicketCapability",
      ]) {
        assertBefore(impl, "assertOperatorMutation", authMarker, context);
      }

      if (kind === "json-mutation") {
        // Bounded reads only, via the shared helpers or the ticket command
        // reader, always with an explicit byte ceiling.
        const boundedRead = /readBoundedJsonObject\(request, [A-Z_]+_MAX_BYTES\)/u.test(impl)
          || /readBoundedText\(request, [A-Z_]+_MAX_BYTES\)/u.test(impl)
          || /readTicketOperationCommand\(request/u.test(block)
          || /readBoundedCommandBody\(request\)/u.test(block);
        assert.ok(boundedRead, `${context}: no bounded body read found`);
      }
    }
  }
});

test("bounded-read byte ceilings stay within the reviewed caps", async () => {
  const { sources } = await routeSources();
  const expectations = new Map([
    ["admin/session/route.ts", /UNLOCK_BODY_MAX_BYTES = 4 \* 1024/u],
    ["admin/vip-floor/commands/route.ts", /COMMAND_BODY_MAX_BYTES = 8 \* 1024/u],
    ["admin/vip-floor/observability/route.ts", /METRIC_BODY_MAX_BYTES = 4 \* 1024/u],
    ["admin/vip-floor/operations/route.ts", /OPERATION_BODY_MAX_BYTES = 8 \* 1024/u],
    ["admin/vip-floor/staff/route.ts", /STAFF_BODY_MAX_BYTES = 8 \* 1024/u],
    ["admin/vip-floor/waitlist/route.ts", /WAITLIST_BODY_MAX_BYTES = 8 \* 1024/u],
    ["admin/vip-floor/customers/[customerId]/route.ts", /CUSTOMER_BODY_MAX_BYTES = 8 \* 1024/u],
    ["admin/vip-floor/reservations/[reservationId]/customer-link/route.ts", /LINK_BODY_MAX_BYTES = 8 \* 1024/u],
  ]);
  for (const [file, pattern] of expectations) {
    assert.match(sources.get(file), pattern, `${file}: expected byte ceiling missing`);
  }
});

test("ticket command bodies share the reviewed bounded reader", async () => {
  const proxy = await readFile(
    new URL("../../src/lib/server/ticketOperationsProxy.ts", import.meta.url),
    "utf8",
  );
  const boundary = await readFile(
    new URL("../../src/lib/server/httpBoundary.ts", import.meta.url),
    "utf8",
  );

  // One canonical implementation: the proxy delegates to httpBoundary instead
  // of maintaining its own Content-Length/reader loop.
  assert.match(proxy, /from "@\/lib\/server\/httpBoundary"|from "\.\/httpBoundary"/u);
  const readerMatch = /(?:export\s+)?async function readBoundedCommandBody[\s\S]*?\n\}/u.exec(proxy);
  assert.ok(readerMatch, "readBoundedCommandBody not found");
  const readerBody = readerMatch[0];
  assert.match(readerBody, /readBoundedJsonObject\(request, MAX_COMMAND_BODY_BYTES\)/u);
  assert.doesNotMatch(readerBody, /\.getReader\(\)/u, "reader loop must live in httpBoundary");
  assert.match(readerBody, /isHttpBodyError/u, "HttpBodyError must map to null (invalid_request/400)");

  // Idempotency key validation stays first in readTicketOperationCommand.
  const commandMatch = /export async function readTicketOperationCommand[\s\S]*?idempotency-key/u.exec(proxy);
  assert.ok(commandMatch, "idempotency-key check must lead readTicketOperationCommand");

  // The shared helper keeps its strict contract.
  assert.match(boundary, /\^\\d\{1,15\}\$/u, "Content-Length sanity regex missing");
  assert.match(boundary, /reader\.cancel\(\)/u);
  assert.match(boundary, /releaseLock\(\)/u);
  assert.match(boundary, /fatal: true/u);
});
