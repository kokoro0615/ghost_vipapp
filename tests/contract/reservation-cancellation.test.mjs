import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("reservation cancellation is offered for every source channel while the booking is active", async () => {
  const [inspector, uiTypes, permissions] = await Promise.all([
    read("src/components/admin/vip-floor-v2/inspector/Inspector.tsx"),
    read("src/components/admin/vip-floor-v2/contract/uiTypes.ts"),
    read("src/lib/adminPermissions.ts"),
  ]);

  // Owner report 2026-09-19: phone / admin / online bookings had no cancel
  // control because the button was gated on sourceChannel === "walk_in".
  assert.doesNotMatch(inspector, /sourceChannel === "walk_in" \? \(/u);
  assert.doesNotMatch(inspector, /Walk-in取消/u);
  assert.match(inspector, /予約取消/u);
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
  assert.match(commandCenter, /<option value="" disabled>選択してください<\/option>/u);
  for (const label of ["お客様都合", "連絡なし", "誤登録", "重複登録", "店舗判断"]) {
    assert.match(commandCenter, new RegExp(label, "u"));
  }
  assert.match(commandCenter, /name="reasonNote"/u);
  assert.doesNotMatch(commandCenter, /Walk-in誤登録/u, "the memo must not be prefilled");
  assert.match(commandCenter, /maxLength=\{500\}/u);
  assert.match(commandCenter, /個人情報は入力しない/u);
  assert.match(commandCenter, /step !== 2/u);
  assert.match(commandCenter, /data-least-destructive/u);
  assert.match(commandCenter, /予約を取り消す/u);
  assert.match(commandCenter, /請求・返金と通知は実行しません/u);
  assert.match(commandCenter, /キャンセル料はStripeダッシュボードで請求してください/u);
});

test("Owner adapter accepts every channel and fixes the non-financial side-effect boundary", async () => {
  const [route, uiTypes] = await Promise.all([
    read("src/app/api/admin/vip-floor/commands/route.ts"),
    read("src/components/admin/vip-floor-v2/contract/uiTypes.ts"),
  ]);

  assert.match(
    route,
    /walk_in_cancel: \(id: string\) => `\/api\/admin\/v2\/reservations\/\$\{encodeURIComponent\(id\)\}\/cancel`/u,
  );
  assert.doesNotMatch(route, /sourceChannel !== "walk_in"/u);
  assert.doesNotMatch(route, /walk_in_cancel_only/u);
  assert.match(route, /no_contact: "no_contact"/u);
  assert.match(route, /guest_request: "customer_request"/u);
  assert.match(route, /Object\.hasOwn\(RESERVATION_CANCELLATION_REASON_CODES, cancelReason\)/u);
  assert.match(route, /refundDecision: "none"/u);
  assert.match(route, /refundAmountYen: null/u);
  assert.match(route, /notifyCustomer: false/u);
  assert.match(route, /invalid_cancellation_reason_note/u);
  assert.doesNotMatch(route, /stripe\.(?:refunds|paymentIntents)/u);

  const uiReasons = uiTypes.match(/RESERVATION_CANCELLATION_REASONS = \[([\s\S]*?)\] as const/u)?.[1]
    .match(/"([a-z_]+)"/gu)
    .map((item) => item.slice(1, -1));
  const routeReasons = route.match(/RESERVATION_CANCELLATION_REASON_CODES = \{([\s\S]*?)\} as const/u)?.[1]
    .match(/^\s*([a-z_]+):/gmu)
    .map((item) => item.trim().slice(0, -1));
  assert.deepEqual(uiReasons?.toSorted(), routeReasons?.toSorted(), "UI reasons and adapter mapping must match");
});

test("Demo cancellation retains audit truth while removing the active booking", async () => {
  const [contract, repository] = await Promise.all([
    read("src/lib/demo/contract.ts"),
    read("src/lib/demo/repository.ts"),
  ]);

  assert.match(contract, /"walk_in_cancel"/u);
  assert.doesNotMatch(repository, /reservation\.sourceChannel !== "walk_in"/u);
  assert.match(repository, /RESERVATION_CANCELLATION_REASONS\.includes\(draft\.payload\.cancelReason\)/u);
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
