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
  /* One control for the whole roster. As radio rows, eleven promoters were
   * 584px of options inside an 810px screen — the receipt below them never
   * appeared, and the same subtitle printed once per row (§5.7c). The roster is
   * heading for ten-plus names, so the list belongs to the native picker. */
  assert.match(
    operationCenter,
    /<select\s+name="bookingStaffMemberId"[\s\S]{0,400}?activeStaffMembers\.map/u,
    "the walk-in promoter roster must be one select, not one row per promoter",
  );
  assert.doesNotMatch(operationCenter, /type="radio"\s*\n\s*name="bookingStaffMemberId"/u);
  /* The subtitle survives once, as the empty-roster hint. Printed per option it
   * said nothing eleven times over — the interface narrating itself (§5.7c). */
  assert.equal(
    operationCenter.match(/プロモーター／集客担当/gu)?.length,
    1,
    "the promoter subtitle belongs to the empty-roster hint, not to every row",
  );
  assert.doesNotMatch(operationCenter, /name="offeringId"/u);
  assert.match(operationCenter, /offeringId: offering\.id/u);
  assert.match(operationCenter, /bookingStaffMemberId: walkInBookingStaffMemberId \|\| null/u);
  assert.match(proxy, /bookingStaffMemberId/u);
  assert.match(demoRepository, /bookingStaffMemberId: draft\.payload\.bookingStaffMemberId/u);
  assert.match(inspector, /集客担当/u);
  assert.match(qa, /デモスタッフA/u);
});
