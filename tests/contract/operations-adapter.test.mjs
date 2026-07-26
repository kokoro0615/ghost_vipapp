import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("Owner operation adapters expose only canonical Walk-in and block routes", async () => {
  const [operations, options, workspace, hook, operationCenter] = await Promise.all([
    read("src/app/api/admin/vip-floor/operations/route.ts"),
    read("src/app/api/admin/vip-floor/options/route.ts"),
    read("src/components/admin/vip-floor-v2/VipFloorWorkspace.tsx"),
    read("src/components/admin/vip-floor-v2/state/useVipFloorWorkspace.ts"),
    read("src/components/admin/vip-floor-v2/operations/OperationCenter.tsx"),
  ]);

  assert.match(operations, /session\.actor\.role !== "owner"/u);
  assert.match(options, /session\.actor\.role !== "owner"/u);
  assert.match(operations, /"\/api\/admin\/v2\/walk-ins"/u);
  assert.match(operations, /"\/api\/admin\/v2\/vip-blocks"/u);
  assert.match(operations, /token,\n\s+"PATCH"/u);
  assert.match(operations, /token,\n\s+"DELETE"/u);
  assert.match(operations, /expectedVersion/u);
  assert.match(options, /\/api\/admin\/v2\/vip-floor\/options\?businessDate=/u);
  assert.match(operations, /const FIXED_REASON = "管理画面操作"/u);
  assert.match(operations, /readInteger\(payload\.repeatDays, 1, 14\)/u);
  assert.match(operations, /completedCount: results\.length/u);
  assert.ok(operations.includes("idempotencyKey}:${String(index + 1)"));
  assert.doesNotMatch(operations, /vipapp-command/u);

  assert.match(hook, /Date\.now\(\) - 5 \* 60 \* 60 \* 1000/u);
  assert.match(hook, /await loadBoard\(businessDate\)/u);
  assert.match(workspace, /新規オペレーション/u);
  assert.match(workspace, /予約・Walk-in/u);
  assert.match(operationCenter, /expectedTableVersions/u);
  assert.match(operationCenter, /7営業日/u);
  assert.match(operationCenter, /14営業日/u);
  assert.match(operationCenter, /ACTIVE BLOCKS/u);
  assert.match(operationCenter, /block_cancel/u);
  assert.doesNotMatch(operationCenter, /name="reason"/u);
});
