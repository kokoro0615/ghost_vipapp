import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [workspace, inspector, workspaceHook, demoRepository, styles] = await Promise.all([
  readFile(new URL("../../src/components/admin/vip-floor-v2/VipFloorWorkspace.tsx", import.meta.url), "utf8"),
  readFile(new URL("../../src/components/admin/vip-floor-v2/inspector/Inspector.tsx", import.meta.url), "utf8"),
  readFile(new URL("../../src/components/admin/vip-floor-v2/state/useVipFloorWorkspace.ts", import.meta.url), "utf8"),
  readFile(new URL("../../src/lib/demo/repository.ts", import.meta.url), "utf8"),
  readFile(new URL("../../src/components/admin/vip-floor-v2/VipFloorWorkspace.module.css", import.meta.url), "utf8"),
]);

test("paid reservations expose one direct departure and seat-release action", () => {
  assert.match(workspace, /selectedReservation\?\.serviceStatus === "paid"[\s\S]*selectedReservation\.tableIds\.length > 0[\s\S]*"release"/u);
  assert.match(inspector, /退店・席を開放/u);
  assert.match(inspector, /会計済み · 完了と席解放を同時反映/u);
  assert.match(workspace, /kind: "service_status"[\s\S]*serviceStatus: "completed"/u);
  assert.match(styles, /\.turnoverAction button \{[\s\S]*min-height:\s*56px/u);
});

test("successful release selects the next confirmed reservation on the same table", () => {
  assert.match(workspace, /function findNextTurnoverReservation/u);
  assert.match(workspace, /item\.lifecycleStatus === "confirmed"/u);
  assert.match(workspace, /item\.tableIds\.some\(\(tableId\) => releasedTableIds\.has\(tableId\)\)/u);
  assert.match(workspace, /setTurnoverContext\(next \? \{ \.\.\.next, businessDate \} : null\)/u);
  assert.match(workspace, /reservationId: next\.nextReservationId/u);
});

test("the selected next reservation checks in with one action and keeps conflict recovery", () => {
  assert.match(inspector, /次のお客様をチェックイン/u);
  assert.match(workspace, /quickAction === "next_check_in"[\s\S]*kind: "check_in"/u);
  assert.match(workspaceHook, /const runCommand = useCallback\(async[\s\S]*return true/u);
  assert.match(workspaceHook, /if \(response\.status === 409\) await loadBoard\(businessDate\)/u);
});

test("demo completion releases table references like the canonical backend", () => {
  assert.match(
    demoRepository,
    /status === "completed"[\s\S]*reservation\.tableIds = \[\][\s\S]*this\.bumpTables\(envelope, priorTables\)/u,
  );
});
