import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("staff master and table assignments are Owner-only, versioned, and floor-visible", async () => {
  const [proxy, hook, workspace, floor, panel] = await Promise.all([
    read("src/app/api/admin/vip-floor/staff/route.ts"),
    read("src/components/admin/vip-floor-v2/state/useVipFloorWorkspace.ts"),
    read("src/components/admin/vip-floor-v2/VipFloorWorkspace.tsx"),
    read("src/components/admin/vip-floor-v2/floor/FloorView.tsx"),
    read("src/components/admin/vip-floor-v2/staff/StaffPanel.tsx"),
  ]);

  assert.match(proxy, /session\.actor\.role !== "owner"/u);
  assert.match(proxy, /const FIXED_REASON = "管理画面操作"/u);
  assert.match(proxy, /expectedAssignmentVersion/u);
  assert.match(proxy, /\/api\/admin\/v2\/staff\/assignments/u);
  assert.match(hook, /mutationBlocked \|\| auth\.session\?\.role !== "owner"/u);
  assert.match(workspace, /担当スタッフでFloorを絞り込み/u);
  assert.match(floor, /data-staff-filtered/u);
  assert.match(floor, /担当\$\{staff\?\.displayName/u);
  assert.match(panel, /ASSIGN REV/u);
  assert.match(panel, /expectedAssignmentVersion: current\?\.version \?\? null/u);
  assert.doesNotMatch(panel, /name="reason"/u);
});
