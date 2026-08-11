import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  assertVipCanaryBackendUrl,
  readVipCanaryRuntimeAuthority,
} from "../../src/lib/server/ticketCanaryRuntimeGuard.ts";

const runId = "11111111-1111-4111-8111-111111111111";

function canaryEnv(overrides = {}) {
  return {
    GHOST_TICKET_CANARY_RUN_ID: runId,
    GHOST_TICKET_CANARY_WEBSITE_ORIGIN: "https://ghost-wallet-canary.vercel.app",
    GHOST_ADMIN_API_ORIGIN: "https://ghost-wallet-canary.vercel.app",
    ...overrides,
  };
}

test("VIP canary binds the shared runtime run ID to the exact aliasless Website origin", () => {
  assert.deepEqual(readVipCanaryRuntimeAuthority({}), { enabled: false });
  assert.deepEqual(readVipCanaryRuntimeAuthority(canaryEnv()), {
    enabled: true,
    runId,
    websiteOrigin: "https://ghost-wallet-canary.vercel.app",
  });
});

test("VIP canary rejects fixed Production and mismatched Website authorities at runtime", () => {
  for (const env of [
    canaryEnv({
      GHOST_TICKET_CANARY_WEBSITE_ORIGIN: "https://ghost-ruby-one.vercel.app",
      GHOST_ADMIN_API_ORIGIN: "https://ghost-ruby-one.vercel.app",
    }),
    canaryEnv({ GHOST_ADMIN_API_ORIGIN: "https://different-canary.vercel.app" }),
    canaryEnv({ GHOST_TICKET_CANARY_RUN_ID: "not-a-uuid" }),
  ]) {
    assert.throws(
      () => readVipCanaryRuntimeAuthority(env),
      /vip_canary_runtime_authority_invalid/u,
    );
  }
  assert.throws(
    () => assertVipCanaryBackendUrl("https://ghost-ruby-one.vercel.app/api/admin/v2/tickets/queue", canaryEnv()),
    /vip_canary_production_authority_rejected/u,
  );
  assert.equal(
    assertVipCanaryBackendUrl("https://ghost-wallet-canary.vercel.app/api/admin/v2/tickets/queue", canaryEnv()).runId,
    runId,
  );
});

test("ghostAdminFetch enforces the canary guard and forwards the shared run ID", () => {
  const source = readFileSync("src/lib/server/ghostAdminProxy.ts", "utf8");
  assert.match(source, /ticketCanaryRuntimeGuard/u);
  assert.match(source, /assertVipCanaryBackendUrl\(backendUrl/u);
  assert.match(source, /x-ghost-ticket-canary-run-id/u);
});
