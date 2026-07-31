import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("Walk-in attribution is selectable, persisted, and visible after creation", async () => {
  const [types, operationCenter, inspector, proxy, demoRepository, qa] = await Promise.all([
    read("src/components/admin/vip-floor-v2/contract/uiTypes.ts"),
    read("src/components/admin/vip-floor-v2/operations/OperationCenter.tsx"),
    read("src/components/admin/vip-floor-v2/inspector/Inspector.tsx"),
    read("src/app/api/admin/vip-floor/operations/route.ts"),
    read("src/lib/demo/repository.ts"),
    read("scripts/a11y-visual.mjs"),
  ]);

  assert.match(types, /bookingStaffMemberId: string \| null/u);
  assert.match(operationCenter, /集客担当/u);
  assert.match(operationCenter, /店舗へ直接来店/u);
  assert.match(operationCenter, /プロモーター／集客担当/u);
  assert.doesNotMatch(operationCenter, /name="offeringId"/u);
  assert.match(operationCenter, /offeringId: offering\.id/u);
  assert.match(operationCenter, /bookingStaffMemberId: walkInBookingStaffMemberId \|\| null/u);
  assert.match(proxy, /bookingStaffMemberId/u);
  assert.match(demoRepository, /bookingStaffMemberId: draft\.payload\.bookingStaffMemberId/u);
  assert.match(inspector, /集客担当/u);
  assert.match(qa, /デモスタッフA/u);
});
