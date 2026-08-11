import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("VIP canary evidence proves the runtime rejects fixed Production", async () => {
  const source = await readFile(new URL(
    "../../src/app/api/internal/ticket-wallet/canary-evidence/route.ts",
    import.meta.url,
  ), "utf8");
  assert.match(source, /WORKER_RUN_SECRET/u);
  assert.match(source, /timingSafeEqual/u);
  assert.match(source, /readVipCanaryRuntimeAuthority/u);
  assert.doesNotMatch(source, /readVipCanaryRuntimeCounters|productionBusinessRequests|productionAliasRequests/u);
  assert.match(source, /egressEvidenceAuthority:\s*"source_attested_runtime_authority"/u);
  assert.match(source, /private, no-store/u);
});
