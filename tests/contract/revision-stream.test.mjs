import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("revision stream is authenticated, day-scoped, PII-free, and bounded", async () => {
  const [stream, hook, cache] = await Promise.all([
    read("src/app/api/admin/vip-floor/events/route.ts"),
    read("src/components/admin/vip-floor-v2/state/useVipFloorWorkspace.ts"),
    read("src/lib/vipFloorRealtime.ts"),
  ]);

  assert.match(stream, /readAdminToken\(request\)/u);
  assert.match(stream, /readAdminSession\(token\)/u);
  assert.match(stream, /businessDate=/u);
  assert.match(stream, /setTimeout\(poll, 1_500\)/u);
  assert.match(stream, /setTimeout\(close, 25_000\)/u);
  assert.match(stream, /text\/event-stream/u);
  assert.match(stream, /x-accel-buffering/u);
  assert.doesNotMatch(stream, /customer|email|phone|reservationId|notes/u);

  assert.match(hook, /new EventSource/u);
  assert.match(hook, /classifyBoardRevision/u);
  assert.match(hook, /decision === "gap_refresh"/u);
  assert.match(hook, /const workspaceMutationBlocked = offline/u);
  assert.match(hook, /const mutationBlocked = workspaceMutationBlocked/u);
  assert.match(hook, /"stale", "reconnecting", "error", "read_only"/u);
  assert.match(hook, /STALE_READ_ONLY/u);
  assert.match(hook, /readSafeBoardCache/u);
  assert.match(hook, /writeSafeBoardCache/u);
  assert.match(cache, /customer: null/u);
  assert.match(cache, /payment: null/u);
  assert.match(cache, /adminMutationEnabled: false/u);
});
