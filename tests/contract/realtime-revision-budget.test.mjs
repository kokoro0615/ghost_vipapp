import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("SSE polls a revision-only backend and never uses the full board as a heartbeat", async () => {
  const route = await read("src/app/api/admin/vip-floor/events/route.ts");

  assert.match(route, /\/api\/admin\/v2\/vip-floor\/revision\?businessDate=/u);
  assert.doesNotMatch(route, /\/api\/admin\/v2\/vip-floor\?businessDate=/u);
  assert.match(route, /setTimeout\(poll,\s*1_500\)/u);
  assert.match(route, /event:\s*revision/u);
});

test("SSE reconnect waits for the revision signal instead of forcing a board reload", async () => {
  const hook = await read(
    "src/components/admin/vip-floor-v2/state/useVipFloorWorkspace.ts",
  );
  const openStart = hook.indexOf('events.addEventListener("open"');
  const revisionStart = hook.indexOf('events.addEventListener("revision"', openStart);

  assert.ok(openStart >= 0 && revisionStart > openStart);
  assert.doesNotMatch(hook.slice(openStart, revisionStart), /loadBoard\(/u);
  assert.match(hook, /if \(revisionRefreshPending\) return/u);
  assert.match(hook, /revisionRefreshPending = false/u);
  assert.match(hook, /events\.close\(\)/u);
});
