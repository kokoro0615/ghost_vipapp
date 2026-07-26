import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = read("src/app/api/admin/vip-floor/observability/route.ts");
const hook = read("src/components/admin/vip-floor-v2/state/useVipFloorWorkspace.ts");
const panel = read("src/components/admin/vip-floor-v2/observability/ObservabilityPanel.tsx");

test("observability adapter is Owner-only, bounded and PII-free", () => {
  assert.ok(route.includes('session.actor.role !== "owner"'));
  assert.ok(route.includes("/api/admin/v2/observability/slo"));
  assert.ok(route.includes("/api/admin/v2/observability/events"));
  assert.ok(route.includes('"realtime_gap"'));
  assert.ok(route.includes('"realtime_unavailable"'));
  assert.equal(/customer|email|phone|note|payload/iu.test(route), false);
});

test("revision faults emit durable metrics and SLO panel renders alert thresholds", () => {
  assert.ok(hook.includes('event: "realtime_gap"'));
  assert.ok(hook.includes('event: "realtime_unavailable"'));
  assert.ok(hook.includes("gapSize: Math.max"));
  assert.ok(panel.includes("commandErrorRate"));
  assert.ok(panel.includes("commandP95Ms"));
  assert.ok(panel.includes("outboxDeadCount"));
  assert.ok(panel.includes("realtimeGapCount"));
  assert.ok(panel.includes("閾値超過"));
});

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}
