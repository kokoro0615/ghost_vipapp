import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("Waitlist adapter is Owner-only, versioned, fixed-reason, and five-state", async () => {
  const [route, hook, panel, workspace] = await Promise.all([
    read("src/app/api/admin/vip-floor/waitlist/route.ts"),
    read("src/components/admin/vip-floor-v2/state/useVipFloorWorkspace.ts"),
    read("src/components/admin/vip-floor-v2/waitlist/WaitlistPanel.tsx"),
    read("src/components/admin/vip-floor-v2/VipFloorWorkspace.tsx"),
  ]);

  assert.match(route, /session\.actor\.role !== "owner"/u);
  assert.match(route, /const FIXED_REASON = "管理画面操作"/u);
  assert.match(route, /\/api\/admin\/v2\/waitlist/u);
  for (const action of ["call", "expire", "seat", "cancel"]) {
    assert.match(route, new RegExp(`\"${action}\"`, "u"));
  }
  assert.match(route, /expectedVersion/u);
  assert.match(route, /idempotency-key/u);
  assert.doesNotMatch(panel, /name="reason"/u);
  assert.match(panel, /呼出（30分）/u);
  assert.match(panel, /再通知/u);
  assert.match(panel, /期限切れ/u);
  assert.match(panel, /着席/u);
  assert.match(hook, /Waitlistを再読込して最新version/u);
  assert.match(workspace, /<WaitlistPanel/u);
});
