import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspace = readFileSync(
  "src/components/admin/vip-floor-v2/VipFloorWorkspace.tsx",
  "utf8",
);
const operationCenter = readFileSync(
  "src/components/admin/vip-floor-v2/operations/OperationCenter.tsx",
  "utf8",
);
const workspaceHook = readFileSync(
  "src/components/admin/vip-floor-v2/state/useVipFloorWorkspace.ts",
  "utf8",
);
const optionsRoute = readFileSync(
  "src/app/api/admin/vip-floor/options/route.ts",
  "utf8",
);
const staffRoute = readFileSync(
  "src/app/api/admin/vip-floor/staff/route.ts",
  "utf8",
);
const chart = readFileSync(
  "src/components/admin/vip-floor-v2/chart/ChartView.tsx",
  "utf8",
);
const styles = readFileSync(
  "src/components/admin/vip-floor-v2/VipFloorWorkspace.module.css",
  "utf8",
);

test("an Owner can open intake from an event-day-missing read-only board", () => {
  assert.match(workspace, /const operationEntryBlocked = offline/u);
  assert.match(
    workspace,
    /const operationEntryBlocked = offline\s*\|\| \["loading", "error"\]/u,
    "a missing-day stale stream must not hide the read-only date recovery entry",
  );
  assert.match(workspace, /if \(operationEntryBlocked\) return;/u);
  assert.equal(
    workspace.match(/disabled=\{operationEntryBlocked\}/gu)?.length,
    2,
    "desktop and tablet/phone intake entries must share the recovery gate",
  );
  assert.match(
    workspaceHook,
    /if \(operationOptionsBlocked \|\| !operatorAuthorized\) return null;/u,
  );
  assert.match(
    workspaceHook,
    /const operationOptionsBlocked = offline\s*\|\| \["loading", "error"\]/u,
    "stale and reconnecting boards must still permit future-date option reads",
  );
  assert.match(
    workspace,
    /!operationDatePending[\s\S]*?date !== businessDate[\s\S]*?setBusinessDate\(date\)/u,
    "the old URL must not abort an in-flight phone-reservation date switch",
  );
});

test("the intake dialog can recover by selecting a phone reservation date", () => {
  assert.match(operationCenter, /name="businessDate"/u);
  assert.match(operationCenter, /事前予約は、お電話で確認した来店日を選んで続けてください。/u);
  assert.match(
    operationCenter,
    /conflict\.code === "event_day_not_found"\s*\? "営業日未登録"/u,
  );
  assert.match(
    operationCenter,
    /if \(!options\) \{\s*await onBusinessDateChange\(String\(data\.get\("businessDate"\)/u,
  );
  assert.match(operationCenter, /"この日を開く"/u);
  assert.match(styles, /\.operationDateRecovery\s*\{/u);
  assert.match(
    optionsRoute,
    /response\.status === 404[\s\S]*?payload\.error === "event_day_not_found"[\s\S]*?status: 200/u,
  );
  assert.match(
    staffRoute,
    /response\.status === 404[\s\S]*?payload\.error === "event_day_not_found"[\s\S]*?status: 200/u,
    "the parallel staff read must not turn the same missing-day outcome into a console error",
  );
  assert.match(workspaceHook, /const eventDayMissing = payload\.error === "event_day_not_found";/u);
});

test("the chart retains its true time grid when a day has no table payload", () => {
  assert.match(chart, /board\.tables\.length === 0/u);
  assert.match(chart, /timelineEmptyRow/u);
  assert.match(chart, /この日は席データがありません。営業日を切り替えてください。/u);
  assert.match(styles, /\.timelineEmptyRow \.timelineTrack \{ display: grid; place-items: center; \}/u);
  assert.match(
    styles,
    /\.timelineTrack\s*\{[\s\S]*?repeating-linear-gradient\(90deg, var\(--rule-strong\)/u,
  );
});
