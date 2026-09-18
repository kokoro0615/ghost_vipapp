import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  isValidVipManagerIdempotencyKey,
  readVipManagerBusinessDayEnsure,
} from "../../src/generated/vipManagerRuntimeContract.ts";

const route = readFileSync(
  "src/app/api/admin/vip-floor/business-days/route.ts",
  "utf8",
);

const VALID_PAYLOAD = {
  ok: true,
  action: "business_day.ensured",
  reused: false,
  entityVersion: 1,
  boardRevision: 3,
  auditLogId: "8b8f2a90-7d7a-4f2e-9a4f-5d9d5c1a0001",
  eventDayId: "de71626a-0000-4000-8000-000000000000",
  businessDate: "2026-09-22",
  created: true,
  slotsCreated: 6,
  operatingStatus: "open",
};

test("business-day ensure POST keeps the operator mutation boundary in order", () => {
  const post = route.slice(route.indexOf("export async function POST"));
  assert.ok(
    post.indexOf("assertOperatorMutation(request)") < post.indexOf("requireAdminOperation(request"),
    "the mutation gate must run before auth",
  );
  assert.ok(
    post.indexOf("requireAdminOperation(request, { ownerOnly: true })") < post.indexOf("readBoundedJsonObject("),
    "owner-only auth must run before any body read",
  );
  assert.match(post, /isValidVipManagerIdempotencyKey\(idempotencyKey\)/u);
  assert.match(post, /readBoundedJsonObject\(request, BUSINESS_DAY_ENSURE_BODY_MAX_BYTES\)/u);
  assert.match(post, /request_body_too_large/u);
  assert.doesNotMatch(route, /request\.json\(/u, "the body must go through the bounded reader");
});

test("business-day ensure POST validates a strict command and proxies it", () => {
  const post = route.slice(route.indexOf("export async function POST"));
  assert.match(post, /key !== "businessDate" && key !== "reason"/u, "unknown fields must be rejected");
  assert.match(post, /isBusinessDate\(businessDate\)/u, "the canonical date primitive is required");
  assert.match(post, /reason === "" \|\| reason\.length > REASON_MAX_LENGTH/u);
  assert.match(route, /const REASON_MAX_LENGTH = 240/u);
  assert.match(post, /"\/api\/admin\/v2\/vip-floor\/business-days"/u);
  assert.match(post, /"idempotency-key": idempotencyKey/u);
  assert.match(post, /JSON\.stringify\(\{ businessDate, reason \}\)/u);
  assert.match(post, /readVipManagerBusinessDayEnsure\(payload\)/u);
  assert.match(post, /business_day_ensure_contract_mismatch/u);
  assert.match(post, /"Cache-Control": "no-store"/u);
});

test("the generated reader accepts the complete action-response shape", () => {
  assert.deepEqual(readVipManagerBusinessDayEnsure(VALID_PAYLOAD), {
    action: "business_day.ensured",
    reused: false,
    entityVersion: 1,
    boardRevision: 3,
    auditLogId: "8b8f2a90-7d7a-4f2e-9a4f-5d9d5c1a0001",
    eventDayId: "de71626a-0000-4000-8000-000000000000",
    businessDate: "2026-09-22",
    created: true,
    slotsCreated: 6,
    operatingStatus: "open",
  });
});

test("the generated reader rejects malformed or partial responses", () => {
  for (const payload of [
    null,
    {},
    { ...VALID_PAYLOAD, ok: false },
    { ...VALID_PAYLOAD, action: "reservation.created" },
    { ...VALID_PAYLOAD, reused: "false" },
    { ...VALID_PAYLOAD, entityVersion: 0 },
    { ...VALID_PAYLOAD, boardRevision: -1 },
    { ...VALID_PAYLOAD, auditLogId: "not-a-uuid" },
    { ...VALID_PAYLOAD, eventDayId: 42 },
    { ...VALID_PAYLOAD, created: "yes" },
    { ...VALID_PAYLOAD, slotsCreated: -1 },
    { ...VALID_PAYLOAD, operatingStatus: "preparing" },
  ]) {
    assert.equal(readVipManagerBusinessDayEnsure(payload), null);
  }
});

test("the route idempotency-key gate accepts only the canonical key shape", () => {
  assert.equal(isValidVipManagerIdempotencyKey("business-day-ensure-2026-09-22"), true);
  assert.equal(isValidVipManagerIdempotencyKey(null), false);
  assert.equal(isValidVipManagerIdempotencyKey(""), false);
  assert.equal(isValidVipManagerIdempotencyKey("  padded  "), false);
});
