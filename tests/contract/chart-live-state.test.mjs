import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("chart advances its now line, exposes live phases and includes both sides of a conflict", async () => {
  const source = await readFile(
    new URL("../../src/components/admin/vip-floor-v2/chart/ChartView.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /setInterval\(\(\) => setRenderedAt\(Date\.now\(\)\), 30_000\)/u);
  assert.match(source, /data-phase=\{phase\.key\}/u);
  assert.match(source, /timelineClosingWindow/u);
  assert.match(source, /TIMELINE_PHASE_ORDER/u);
  assert.match(source, /document\.addEventListener\("visibilitychange", syncMotion\)/u);
  assert.match(source, /otherIndex !== index/u);
  assert.doesNotMatch(source, /otherIndex > index/u);
});
