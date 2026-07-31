import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../../${file}`, import.meta.url), "utf8");

test("Walk-in and reservation creation enforce offering-table compatibility", async () => {
  const [types, operationCenter, wizard, clientErrors] = await Promise.all([
    read("src/components/admin/vip-floor-v2/contract/uiTypes.ts"),
    read("src/components/admin/vip-floor-v2/operations/OperationCenter.tsx"),
    read("src/components/admin/vip-floor-v2/operations/ReservationWizard.tsx"),
    read("src/lib/vipFloorClientErrors.ts"),
  ]);

  assert.match(types, /compatibleTableIds\?:\s*string\[\]\s*\|\s*null/u);
  assert.match(operationCenter, /resolveWalkInOffering/u);
  assert.match(operationCenter, /canSelectWalkInTable/u);
  assert.match(operationCenter, /この人数で登録できる卓の組み合わせを選び直してください/u);
  assert.doesNotMatch(operationCenter, /name="offeringId"/u);
  assert.match(wizard, /availableTables/u);
  assert.match(wizard, /tableIds:\s*draft\.tableIds\.filter/u);
  assert.match(clientErrors, /OFFERING_TABLE_MISMATCH/u);
});
