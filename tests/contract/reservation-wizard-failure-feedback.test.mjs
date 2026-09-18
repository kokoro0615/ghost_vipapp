import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../../${file}`, import.meta.url), "utf8");

// 2026-09-18: four rejected "競合確認して作成" saves (409 TABLE_TIME_CONFLICT)
// showed nothing, because the only conflict box lived in the Walk-in/block form
// branch and the page status line sits behind the dialog.
test("the reservation wizard shows a rejected save inside the dialog", async () => {
  const [operationCenter, wizard] = await Promise.all([
    read("src/components/admin/vip-floor-v2/operations/OperationCenter.tsx"),
    read("src/components/admin/vip-floor-v2/operations/ReservationWizard.tsx"),
  ]);

  assert.match(operationCenter, /<ReservationWizard[\s\S]*?failure=\{visibleConflict\}/u);
  assert.match(wizard, /visibleFailure \? \([\s\S]*?role="alert"[\s\S]*?visibleFailure\.message[\s\S]*?visibleFailure\.recovery/u);
  // The panel sits outside the scrolling steps, directly above the footer.
  assert.match(wizard, /<\/div>\s*\{visibleFailure \? \([\s\S]*?\) : null\}\s*<footer className=\{styles\.wizardFooter\}>/u);
  assert.match(wizard, /卓を選び直す[\s\S]*?goToStep\(3\)|goToStep\(3\)[\s\S]*?卓を選び直す/u);
  assert.match(wizard, /pending \? "保存中…"/u);
});

test("busy tables are marked before the save instead of failing after it", async () => {
  const wizard = await read("src/components/admin/vip-floor-v2/operations/ReservationWizard.tsx");

  assert.match(wizard, /tableOccupancy\(board, draft\.startAt, draft\.endAt, reservation\?\.id \?\? null\)/u);
  assert.match(wizard, /\(step !== 3 && step !== 7 \|\| occupiedSelection\.length === 0\)/u);
  assert.match(wizard, /data-occupied=\{compatible && occupied \? true : undefined\}/u);
});
