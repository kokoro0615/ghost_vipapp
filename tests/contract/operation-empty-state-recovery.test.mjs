import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [workspace, operationCenter, workspaceHook, reducer, reservationList] = await Promise.all([
  readFile(new URL("../../src/components/admin/vip-floor-v2/VipFloorWorkspace.tsx", import.meta.url), "utf8"),
  readFile(new URL("../../src/components/admin/vip-floor-v2/operations/OperationCenter.tsx", import.meta.url), "utf8"),
  readFile(new URL("../../src/components/admin/vip-floor-v2/state/useVipFloorWorkspace.ts", import.meta.url), "utf8"),
  readFile(new URL("../../src/components/admin/vip-floor-v2/state/reducer.ts", import.meta.url), "utf8"),
  readFile(new URL("../../src/components/admin/vip-floor-v2/list/ReservationListView.tsx", import.meta.url), "utf8"),
]);

test("new reception does not inherit the selected reservation table", () => {
  assert.match(
    workspace,
    /selectedTableId=\{editingReservationId \|\| !state\.selectedReservationId\s*\?\s*state\.selectedTableId\s*:\s*null\}/u,
  );
  assert.match(operationCenter, /table\.id === selectedTableId/u);
});

test("operation errors stay visible inside the active dialog", () => {
  assert.match(operationCenter, /conflict:\s*CommandOutcome \| null/u);
  assert.match(operationCenter, /className=\{styles\.conflictBox\} role="alert"/u);
  assert.match(workspace, /conflict=\{state\.conflict\}/u);
  assert.match(reducer, /\{ type: "clearConflict" \}/u);
});

test("demo Walk-in rejects unsafe text beside the exact field before transport", () => {
  assert.match(operationCenter, /getSyntheticTextIssue/u);
  assert.match(operationCenter, /defaultValue=\{demoMode\.enabled \? "デモWalk-inゲスト" : undefined\}/u);
  assert.match(operationCenter, /aria-invalid=\{Boolean\(walkInErrors\.guestLabel\)\}/u);
  assert.match(operationCenter, /aria-invalid=\{Boolean\(walkInErrors\.operatorNote\)\}/u);
  assert.match(operationCenter, /電話番号・メール・秘密情報は入力できません/u);
  assert.match(operationCenter, /className=\{styles\.fieldError\} role="alert"/u);
  assert.match(
    workspaceHook,
    /payload\.code === "INVALID_SYNTHETIC_INPUT"[\s\S]*ゲスト表示名と入力した現場メモ/u,
  );
});

test("demo operation options renew a pending lease and continue automatically", () => {
  const optionsStart = workspaceHook.indexOf("const loadOperationOptions");
  const operationStart = workspaceHook.indexOf("const runOperation", optionsStart);
  const optionsSource = workspaceHook.slice(optionsStart, operationStart);
  const renew = optionsSource.indexOf("await demoTransport.renewLease()");
  const loadOptions = optionsSource.indexOf("await demoTransport.loadOperationOptions(businessDate)");

  assert.match(optionsSource, /if \(demoLeaseState !== "active"\)/u);
  assert.ok(renew >= 0, "demo lease renewal missing from option load");
  assert.ok(loadOptions > renew, "options must load after the renewed lease is accepted");
});

test("zero reservations keep list, floor, and chart operational", () => {
  assert.doesNotMatch(workspace, /state\.globalState === "empty" \? <EmptyState/u);
  assert.doesNotMatch(workspace, /\["loading", "error", "empty"\]\.includes/u);
  for (const view of ["floor", "timeline", "list"]) {
    assert.match(
      workspace,
      new RegExp(`!\\["loading", "error"\\]\\.includes\\(state\\.globalState\\) && state\\.view === "${view}"`, "u"),
    );
  }
  assert.match(workspace, /この営業日の予約はありません。新規受付から登録できます。/u);
  assert.match(reservationList, /\{emptyMessage\}/u);
});
