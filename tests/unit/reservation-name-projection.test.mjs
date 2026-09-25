import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

async function loadProjection() {
  const root = new URL("../../src/components/admin/vip-floor-v2/contract/", import.meta.url);
  function compile(source, require = () => { throw new Error("unexpected import"); }) {
    const context = { exports: {}, module: { exports: {} }, require };
    context.module.exports = context.exports;
    vm.runInNewContext(ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText, context);
    return context.module.exports;
  }
  const status = compile(await readFile(new URL("statusModel.ts", root), "utf8"), (name) => {
    assert.equal(name, "lucide-react");
    return createRequire(import.meta.url)(name);
  });
  return compile(await readFile(new URL("viewModel.ts", root), "utf8"), (name) => {
    assert.equal(name, "./statusModel");
    return status;
  });
}

const board = (customer) => ({
  tables: [{ id: "table-1", displayCode: "VIP-1" }],
  reservations: [{
    id: "reservation-1", publicCode: "QA-NAME-01", serviceStatus: "expected",
    lifecycleStatus: "confirmed", scheduledStartAt: "2026-09-26T13:00:00Z",
    scheduledEndAt: "2026-09-26T15:00:00Z", guestCount: { total: 2 },
    tableIds: ["table-1"], flags: [], version: 1, sourceChannel: "phone", customer,
  }],
});

test("the ledger and search use the reservation name returned by the board", async () => {
  const { toUiReservations, matchesReservation } = await loadProjection();
  const [reservation] = toUiReservations(board({ displayLabel: "デモ予約名・確認用", masked: false }));
  assert.equal(reservation.guestLabel, "デモ予約名・確認用");
  assert.equal(matchesReservation(reservation, "予約名・確認"), true);
  assert.equal(matchesReservation(reservation, "別の名前"), false);
});

test("the ledger retains server masking and never uses a customer profile name", async () => {
  const { toUiReservations, matchesReservation } = await loadProjection();
  const [reservation] = toUiReservations(board({
    displayLabel: "Guest ***01", masked: true, displayName: "デモ非表示顧客氏名",
  }));
  assert.equal(reservation.guestLabel, "Guest ***01");
  assert.equal(reservation.customerMasked, true);
  assert.equal(matchesReservation(reservation, "非表示顧客氏名"), false);
});

test("a reservation without a label or customer keeps the existing empty-name fallback", async () => {
  const { toUiReservations } = await loadProjection();
  assert.equal(toUiReservations(board(null))[0].guestLabel, "ゲスト情報なし");
});
