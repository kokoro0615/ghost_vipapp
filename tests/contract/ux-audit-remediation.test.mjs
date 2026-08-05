import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("each primary workspace view owns the document heading", async () => {
  const [list, floor, chart] = await Promise.all([
    read("src/components/admin/vip-floor-v2/list/ReservationListView.tsx"),
    read("src/components/admin/vip-floor-v2/floor/FloorView.tsx"),
    read("src/components/admin/vip-floor-v2/chart/ChartView.tsx"),
  ]);

  assert.match(list, /<h1 id="list-view-title">来店台帳<\/h1>/u);
  assert.match(floor, /<h1 id="floor-view-title">VIPフロア<\/h1>/u);
  assert.match(chart, /<h1 id="chart-view-title">席の時間軸<\/h1>/u);
});

test("the 44px control gate includes semantic and ARIA controls", async () => {
  const [styles, harness] = await Promise.all([
    read("src/components/admin/vip-floor-v2/VipFloorWorkspace.module.css"),
    read("scripts/a11y-visual.mjs"),
  ]);

  assert.match(styles, /\.skipLink\s*\{[\s\S]*?min-height: var\(--h-control\)/u);
  for (const selector of ["a[href]", '[role="button"]', "summary"]) {
    assert.ok(harness.includes(selector), `touch-target selector must include ${selector}`);
  }
});

test("business-day suggestions remain owner-only and bounded", async () => {
  const route = await read("src/app/api/admin/vip-floor/business-days/route.ts");

  assert.match(route, /requireAdminOperation\(request, \{ ownerOnly: true \}\)/u);
  assert.match(route, /VIP_MANAGER_MAX_BUSINESS_DAY_SUGGESTIONS/u);
  assert.match(route, /Cache-Control": "no-store"/u);
  assert.match(route, /\/api\/admin\/v2\/vip-floor\/business-days/u);
});
