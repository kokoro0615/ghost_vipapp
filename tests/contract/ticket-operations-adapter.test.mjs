import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");
const backendRoot = process.env.GHOST_BACKEND_ROOT
  ? path.resolve(process.env.GHOST_BACKEND_ROOT)
  : path.resolve(process.cwd(), "../ticket-wallet-production-backend");
const backendManagerOperations = path.join(
  backendRoot,
  "src/lib/server/tickets/ticketManagerOperations.ts",
);
let backendContractAvailable = true;
try {
  await access(backendManagerOperations);
} catch {
  backendContractAvailable = false;
}

async function loadProxy() {
  const source = await read("src/lib/server/ticketOperationsProxy.ts");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = {
    exports: {},
    module: { exports: {} },
    require(specifier) {
      if (specifier === "server-only") return {};
      if (specifier === "next/server") {
        return {
          NextResponse: {
            json(payload, init = {}) {
              return new Response(JSON.stringify(payload), {
                status: init.status ?? 200,
                headers: init.headers,
              });
            },
          },
        };
      }
      if (specifier === "./ghostAdminProxy") return { ghostAdminFetch() {} };
      if (specifier === "./ticketOperationsDisplayFlags") {
        return {
          readVipTicketOperationsDisplayCapabilities() {
            return { managerOperationsEnabled: true, refundReviewEnabled: true };
          },
        };
      }
      throw new Error(`unexpected module: ${specifier}`);
    },
    Headers,
    Request,
    Response,
    TextDecoder,
    Uint8Array,
  };
  context.module.exports = context.exports;
  vm.runInNewContext(compiled, context);
  return context.module.exports;
}

const ROUTES = Object.freeze({
  capabilities: "src/app/api/admin/vip-floor/tickets/capabilities/route.ts",
  queue: "src/app/api/admin/vip-floor/tickets/queue/route.ts",
  order: "src/app/api/admin/vip-floor/tickets/orders/[orderPublicCode]/route.ts",
  revoke: "src/app/api/admin/vip-floor/tickets/sessions/revoke/route.ts",
  assist: "src/app/api/admin/vip-floor/tickets/admissions/assist/route.ts",
  refund: "src/app/api/admin/vip-floor/tickets/refund-reviews/resolve/route.ts",
  email: "src/app/api/admin/vip-floor/tickets/email-jobs/retry/route.ts",
});

test("ticket operations BFF has seven fixed Owner-only Website v2 adapters", async () => {
  const sources = await Promise.all(Object.values(ROUTES).map(read));
  const plane = sources.join("\n");

  assert.equal(sources.length, 7);
  for (const source of sources) {
    assert.match(source, /requireAdminOperation\(request, \{ ownerOnly: true \}\)/u);
    assert.match(source, /ticketOperationsJson/u);
    assert.ok(
      source.indexOf("requireVipTicketCapability") < source.indexOf("ticketOperationsFetch("),
      "display capability must stop the request before the fixed upstream transport",
    );
    assert.doesNotMatch(source, /supabase|service[_-]?role|NEXT_PUBLIC_/iu);
  }

  for (const fixedPath of [
    "/api/admin/v2/tickets/capabilities",
    "/api/admin/v2/tickets/queue",
    "/api/admin/v2/tickets/orders/",
    "/api/admin/v2/tickets/sessions/revoke",
    "/api/admin/v2/tickets/admissions/assist",
    "/api/admin/v2/tickets/refund-reviews/resolve",
    "/api/admin/v2/tickets/email-jobs/retry",
  ]) {
    assert.match(plane, new RegExp(fixedPath.replaceAll("/", "\\/"), "u"));
  }
  assert.doesNotMatch(plane, /\[\.\.\.|catch-all|request\.url[\s\S]{0,120}ghostAdminFetch/iu);
});

test("BFF mutations enforce bounded bodies, version, reason and idempotency", async () => {
  const [routes, proxy] = await Promise.all([
    Promise.all([
    read(ROUTES.revoke),
    read(ROUTES.assist),
    read(ROUTES.refund),
    read(ROUTES.email),
    ]),
    read("src/lib/server/ticketOperationsProxy.ts"),
  ]);
  const mutationPlane = `${routes.join("\n")}\n${proxy}`;

  assert.match(mutationPlane, /readTicketOperationCommand/u);
  assert.match(mutationPlane, /expectedVersion/u);
  assert.match(mutationPlane, /reason/u);
  assert.match(mutationPlane, /idempotency-key/u);
  assert.match(mutationPlane, /projectTicketOperationMutation/u);
  assert.match(proxy, /MAX_COMMAND_BODY_BYTES/u);
  assert.match(proxy, /readBoundedCommandBody/u);
  assert.match(proxy, /ticketOperationsFetch/u);
  assert.match(proxy, /ticket_operations_upstream_path_not_allowed/u);
  assert.doesNotMatch(mutationPlane, /request\.nextUrl|searchParams\.get\(["'](?:id|order|review|session|job)/u);
});

test("assisted-admission parser accepts exactly 1-20 unique UUIDs and rejects over-broad bodies", async () => {
  const { readTicketOperationCommand } = await loadProxy();
  const admissionIds = Array.from(
    { length: 20 },
    (_, index) => `82000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  );
  const body = {
    orderPublicCode: "GT-QA20260811",
    environment: "test",
    eventSessionId: "82000000-0000-4000-8000-000000000099",
    admissionIds,
    expectedVersion: 7,
    reason: "入口で本人確認を実施しました",
  };
  const parse = (payload) => readTicketOperationCommand(new Request("https://vip.invalid", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": "82000000-0000-4000-8000-000000000100",
    },
    body: JSON.stringify(payload),
  }), "assisted_admission");

  const accepted = await parse(body);
  assert.equal(accepted.ok, true);
  assert.equal(accepted.command.admissionIds.length, 20);

  for (const rejectedBody of [
    { ...body, admissionIds: [...admissionIds, "82000000-0000-4000-8000-000000000101"] },
    { ...body, admissionIds: [admissionIds[0], admissionIds[0]] },
    { ...body, unexpectedAuthority: true },
  ]) {
    const rejected = await parse(rejectedBody);
    assert.equal(rejected.ok, false);
    assert.equal(rejected.response.status, 400);
  }
});

test("read projectors require an explicit success envelope", async () => {
  const { projectTicketOperationsCapabilities } = await loadProxy();
  assert.throws(() => projectTicketOperationsCapabilities({
    ok: false,
    serverNow: "2026-08-11T13:05:00.000Z",
    capabilities: { managerOperationsEnabled: true, refundReviewEnabled: true },
    readiness: { managerOperations: "ready", refundReview: "ready" },
  }, { managerOperationsEnabled: true, refundReviewEnabled: true }), {
    message: "ticket_operations_upstream_contract_invalid",
  });
});

test("checkout-review reasons are bounded and forward-compatible", async () => {
  const { projectTicketOperationsQueue } = await loadProxy();
  const response = {
    ok: true,
    serverNow: "2026-08-11T13:05:00.000Z",
    environment: "test",
    eventSessions: [],
    recentAdmissions: [],
    health: {
      emailProvider: "disabled",
      outboxRetryCount: 0,
      outboxDeadCount: 0,
      webhookFreshness: "unknown",
      lastWebhookAt: null,
    },
    items: [{
      id: "84000000-0000-4000-8000-000000000001",
      kind: "checkout_review",
      priority: "urgent",
      publicCode: "GT-QA20260811",
      maskedEmail: "qa•••@example.invalid",
      eventTitle: "GHOST QA",
      eventDate: "2026-08-11",
      environment: "test",
      status: "payment_webhook_missing",
      statusLabel: "Checkout確認",
      summary: "決済と発券の終端を確認します。",
      updatedAt: "2026-08-11T13:04:00.000Z",
      expectedVersion: 1,
    }],
  };

  assert.equal(projectTicketOperationsQueue(response).items[0].status, "payment_webhook_missing");
  assert.throws(() => projectTicketOperationsQueue({
    ...response,
    items: [{ ...response.items[0], status: "x".repeat(49) }],
  }), { message: "ticket_operations_upstream_contract_invalid" });
});

test("legacy-incomplete refund history is projected only as a non-resolvable safe fact", async () => {
  const { projectTicketOperationsOrder } = await loadProxy();
  const refundReview = {
    reviewId: "85000000-0000-4000-8000-000000000001",
    status: "pending",
    expectedVersion: 3,
    observationVersion: 2,
    observationHash: "a".repeat(64),
    amountMinor: 6500,
    currency: "JPY",
    providerEventId: "provider-event-safe-id",
    selectedAdmissionIds: [],
    conflictReason: "refund_observation_history_incomplete",
    moneyMayHaveMoved: true,
    authorityResolvable: false,
    observationHistoryState: "legacy_incomplete",
    observationHistoryReason: "legacy rows predate the complete observation ledger",
    resolutionOptions: [],
  };
  const response = {
    ok: true,
    serverNow: "2026-08-11T13:05:00.000Z",
    health: {
      emailProvider: "ready",
      outboxRetryCount: 0,
      outboxDeadCount: 0,
      webhookFreshness: "fresh",
      lastWebhookAt: "2026-08-11T13:04:00.000Z",
    },
    order: {
      publicCode: "GT-QA20260811",
      maskedEmail: "qa•••@example.invalid",
      environment: "test",
      expectedVersion: 4,
      eventSession: {
        eventSessionId: "85000000-0000-4000-8000-000000000002",
        eventTitle: "GHOST QA",
        eventDate: "2026-08-11",
        doorsAt: "2026-08-11T12:00:00.000Z",
        admissionOpensAt: "2026-08-11T12:30:00.000Z",
        admissionClosesAt: "2026-08-11T20:30:00.000Z",
        state: "open",
      },
      wallet: {
        state: "active",
        activeSessionCount: 0,
        activeSessions: [],
        lastVerifiedAt: null,
        freshAuthenticationUntil: null,
        otpDelivery: "delivered",
        otpRateLimit: "available",
        challengeState: "none",
      },
      admissions: [],
      refundReview,
      emailJobs: [],
      timeline: [],
      safeRecoveryInstruction: "Stripeの権威ある履歴を照合してください。",
    },
  };
  assert.equal(
    JSON.stringify(projectTicketOperationsOrder(response).order.refundReview),
    JSON.stringify(refundReview),
  );
  for (const invalid of [
    { ...refundReview, authorityResolvable: true },
    { ...refundReview, resolutionOptions: ["dismiss_no_money_moved"] },
    { ...refundReview, observationHistoryReason: null },
    { ...refundReview, observationVersion: 0 },
    { ...refundReview, observationHash: "not-a-sha256" },
  ]) {
    assert.throws(
      () => projectTicketOperationsOrder({
        ...response,
        order: { ...response.order, refundReview: invalid },
      }),
      { message: "ticket_operations_upstream_contract_invalid" },
    );
  }
});

test("refund parser requires unique allocations for void and admitted-exception resolution only", async () => {
  const { readTicketOperationCommand } = await loadProxy();
  const admissionId = "83000000-0000-4000-8000-000000000001";
  const parse = (resolution, allocations, overrides = {}) => readTicketOperationCommand(new Request("https://vip.invalid", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": "83000000-0000-4000-8000-000000000002",
    },
    body: JSON.stringify({
      reviewId: "83000000-0000-4000-8000-000000000003",
      resolution,
      allocations,
      expectedVersion: 2,
      observationVersion: 4,
      observationHash: "b".repeat(64),
      reason: "券別配分の重複確認を行いました",
      ...overrides,
    }),
  }), "refund_resolve");

  const allocation = [{ admissionId, amountMinor: 6500 }];
  assert.equal((await parse("apply_and_void", allocation)).ok, true);
  assert.equal((await parse("record_admitted_exception", allocation)).ok, true);
  assert.equal((await parse("record_admitted_exception", [])).ok, false);
  assert.equal((await parse("dismiss_no_money_moved", [])).ok, true);
  assert.equal((await parse("dismiss_no_money_moved", allocation)).ok, false);
  assert.equal((await parse("apply_and_void", allocation, { observationVersion: undefined })).ok, false);
  assert.equal((await parse("apply_and_void", allocation, { observationHash: "B".repeat(64) })).ok, false);

  const duplicated = await parse("apply_and_void", [
    { admissionId, amountMinor: 3000 },
    { admissionId, amountMinor: 3500 },
  ]);
  assert.equal(duplicated.ok, false);
  assert.equal(duplicated.response.status, 400);
});

test("VIP refund command is accepted by the actual Website parser contract", {
  skip: backendContractAvailable ? false : "ticket-wallet backend worktree is unavailable",
}, async () => {
  await import(pathToFileURL(path.join(backendRoot, "scripts/lib/server-only-shim.mjs")).href);
  const { readTicketManagerCommand } = await import(pathToFileURL(backendManagerOperations).href);
  const { readTicketOperationCommand, ticketOperationCommandBody } = await loadProxy();
  const idempotencyKey = "86000000-0000-4000-8000-000000000001";
  const requestBody = {
    reviewId: "86000000-0000-4000-8000-000000000002",
    resolution: "apply_and_void",
    allocations: [{
      admissionId: "86000000-0000-4000-8000-000000000003",
      amountMinor: 6500,
    }],
    expectedVersion: 3,
    observationVersion: 7,
    observationHash: "c".repeat(64),
    reason: "Stripe観測版と券別配分を照合しました",
  };
  const parsedVip = await readTicketOperationCommand(new Request("https://vip.invalid", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": idempotencyKey },
    body: JSON.stringify(requestBody),
  }), "refund_resolve");
  assert.equal(parsedVip.ok, true);
  const forwarded = ticketOperationCommandBody(parsedVip.command);
  assert.equal(JSON.stringify(forwarded), JSON.stringify(requestBody));

  const parsedWebsite = await readTicketManagerCommand(new Request("https://website.invalid", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": idempotencyKey },
    body: JSON.stringify(forwarded),
  }), "refund_resolve");
  assert.equal(
    JSON.stringify(parsedWebsite.command),
    JSON.stringify({ action: "refund_resolve", ...requestBody }),
  );
});

test("mirrored flags default false and stop disabled BFF requests before upstream", async () => {
  const [page, flags, proxy, capabilities, queue] = await Promise.all([
    read("src/app/page.tsx"),
    read("src/lib/server/ticketOperationsDisplayFlags.ts"),
    read("src/lib/server/ticketOperationsProxy.ts"),
    read(ROUTES.capabilities),
    read(ROUTES.queue),
  ]);

  assert.match(page, /export const dynamic = ["']force-dynamic["']/u);
  assert.match(flags, /FEATURE_TICKET_MANAGER_OPERATIONS_ENABLED/u);
  assert.match(flags, /FEATURE_TICKET_REFUND_REVIEW_ENABLED/u);
  assert.match(flags, /value === "true"/u);
  assert.doesNotMatch(flags, /\?\?\s*true|!==\s*["']false/u);
  assert.match(proxy, /ticket_operation_capability_disabled/u);
  assert.match(capabilities, /requireVipTicketCapability/u);
  assert.match(queue, /requireVipTicketCapability/u);
  assert.match(queue, /scope === "refund"/u);
});

test("BFF responses project a PII-safe allowlist and never relay upstream JSON wholesale", async () => {
  const proxy = await read("src/lib/server/ticketOperationsProxy.ts");

  for (const projector of [
    "projectTicketOperationsCapabilities",
    "projectTicketOperationsQueue",
    "projectTicketOperationsOrder",
    "projectTicketOperationMutation",
  ]) {
    assert.match(proxy, new RegExp(`export function ${projector}`, "u"));
  }
  assert.match(proxy, /maskedEmail/u);
  assert.match(proxy, /CURRENCY_PATTERN/u);
  assert.match(proxy, /safeRecoveryInstruction/u);
  assert.match(proxy, /"checkout_review"/u);
  assert.match(proxy, /authorityResolvable/u);
  assert.match(proxy, /observationHistoryState/u);
  assert.match(proxy, /observationHistoryReason/u);
  assert.match(proxy, /legacy_incomplete/u);
  assert.doesNotMatch(proxy, /rawEmail|admissionCode|otpCode|sessionToken|challengeToken/u);
  assert.doesNotMatch(proxy, /NextResponse\.json\(\s*await copyJson|return\s+payload\s*;/u);
});

test('all four entry recovery commands match the actual Website contract and reject authority overreach',{
 skip:backendContractAvailable?false:'ticket-wallet backend worktree is unavailable',
},async()=>{
 await import(pathToFileURL(path.join(backendRoot,'scripts/lib/server-only-shim.mjs')).href);
 const {readTicketManagerCommand}=await import(pathToFileURL(backendManagerOperations).href);
 const {readTicketOperationCommand,ticketOperationCommandBody}=await loadProxy();
 const key='86000000-0000-4000-8000-000000000001';
 for(const action of ['entry_rotate','entry_revoke','entry_resend','entry_exception']){
  const body={orderPublicCode:'GT-123456789A',environment:'test',expectedVersion:3,expectedGeneration:action==='entry_exception'?null:1,reason:'全員の本人確認と原記録を照合しました',
   originalOperationId:action==='entry_exception'?'86000000-0000-4000-8000-000000000003':null,guestCount:action==='entry_exception'?4:null,confirmation:action==='entry_exception'?'4名全員の集合・写真付き身分証・誤操作の原記録を確認しました':null};
  const request=b=>new Request('https://vip.invalid',{method:'POST',headers:{'content-type':'application/json','idempotency-key':key},body:JSON.stringify(b)});
  const vip=await readTicketOperationCommand(request(body),action);assert.equal(vip.ok,true,action);
  const website=await readTicketManagerCommand(request(ticketOperationCommandBody(vip.command)),action);
  assert.deepEqual(JSON.parse(JSON.stringify(website.command)),{action,...body});
  for(const patch of [{recipient:'another@example.test'},{reset:true},{secret:'forbidden'},{expectedVersion:0},...(action==='entry_exception'?[{guestCount:0},{confirmation:null},{originalOperationId:null}]:[{guestCount:1}])]){
   assert.equal((await readTicketOperationCommand(request({...body,...patch}),action)).ok,false,action+JSON.stringify(patch));
   await assert.rejects(readTicketManagerCommand(request({...body,...patch}),action));
  }
 }
});
