import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("Walk-in cancellation is visible only for active walk-in reservations", async () => {
  const [inspector, uiTypes, permissions] = await Promise.all([
    read("src/components/admin/vip-floor-v2/inspector/Inspector.tsx"),
    read("src/components/admin/vip-floor-v2/contract/uiTypes.ts"),
    read("src/lib/adminPermissions.ts"),
  ]);

  assert.match(inspector, /reservation\.sourceChannel === "walk_in"/u);
  assert.match(inspector, /reservation\.lifecycleStatus === "cancelled"/u);
  assert.match(inspector, /reservation\.serviceStatus === "completed"/u);
  assert.match(inspector, /reservation\.serviceStatus === "no_show"/u);
  assert.match(inspector, /onCommand\("walk_in_cancel"\)/u);
  assert.match(inspector, /data-danger/u);
  assert.match(uiTypes, /"walk_in_cancel"/u);
  assert.match(permissions, /"walk_in_cancel"/u);
});

test("the cancellation dialog is two-step, reasoned, and defaults focus to safety", async () => {
  const commandCenter = await read(
    "src/components/admin/vip-floor-v2/commands/CommandCenter.tsx",
  );

  assert.match(commandCenter, /取消区分/u);
  assert.match(commandCenter, /誤登録/u);
  assert.match(commandCenter, /重複登録/u);
  assert.match(commandCenter, /来店取り消し/u);
  assert.match(commandCenter, /店舗判断/u);
  assert.match(commandCenter, /name="reasonNote"/u);
  assert.match(commandCenter, /maxLength=\{500\}/u);
  assert.match(commandCenter, /個人情報は入力しない/u);
  assert.match(commandCenter, /step !== 2/u);
  assert.match(commandCenter, /data-least-destructive/u);
  assert.match(commandCenter, /Walk-inを取り消す/u);
  assert.match(commandCenter, /返金・顧客通知は実行しません/u);
});

test("Owner adapter fixes the non-financial side-effect boundary", async () => {
  const route = await read("src/app/api/admin/vip-floor/commands/route.ts");

  assert.match(
    route,
    /walk_in_cancel: \(id: string\) => `\/api\/admin\/v2\/reservations\/\$\{encodeURIComponent\(id\)\}\/cancel`/u,
  );
  assert.match(route, /body\.payload\?\.sourceChannel !== "walk_in"/u);
  assert.match(route, /refundDecision: "none"/u);
  assert.match(route, /refundAmountYen: null/u);
  assert.match(route, /notifyCustomer: false/u);
  assert.match(route, /invalid_cancellation_reason_note/u);
  assert.doesNotMatch(route, /stripe\.(?:refunds|paymentIntents)/u);
});

test("Demo cancellation retains audit truth while removing the active booking", async () => {
  const [contract, repository] = await Promise.all([
    read("src/lib/demo/contract.ts"),
    read("src/lib/demo/repository.ts"),
  ]);

  assert.match(contract, /"walk_in_cancel"/u);
  assert.match(repository, /reservation\.sourceChannel !== "walk_in"/u);
  assert.match(repository, /reservation\.lifecycleStatus = "cancelled"/u);
  assert.match(repository, /reservation\.tableIds = \[\]/u);
  assert.match(repository, /this\.bumpTables\(envelope, priorTables\)/u);
  assert.match(
    repository,
    /reservation\.lifecycleStatus !== "cancelled"/u,
    "cancelled envelopes must be filtered from the active board",
  );
  assert.match(repository, /summary: draft\.kind === "walk_in_cancel"/u);
  assert.match(repository, /auditHistory\.push\(audit\)/u);
});
