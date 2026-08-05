import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";

async function loadParser() {
  const source = await readFile(
    new URL("../../src/lib/server/ownerCapacityOverride.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { exports: {}, module: { exports: {} } };
  context.module.exports = context.exports;
  vm.runInNewContext(compiled, context);
  return context.module.exports.parseOwnerCapacityOverride;
}

test("capacity stays ordinary when no override confirmation is supplied", async () => {
  const parse = await loadParser();
  assert.deepEqual({ ...parse({}) }, { ok: true, capacityOverride: false, reason: "管理画面操作" });
});

test("raw or unreasoned capacity override cannot cross the BFF", async () => {
  const parse = await loadParser();
  assert.equal(parse({ capacityOverride: true }).ok, false);
  assert.equal(parse({ confirmedCapacityOverride: true, capacityOverrideReason: "  " }).ok, false);
  assert.equal(parse({ confirmedCapacityOverride: false, capacityOverrideReason: "Owner said so" }).ok, false);
});

test("explicit confirmation plus bounded reason produces the only true branch", async () => {
  const parse = await loadParser();
  assert.deepEqual(
    { ...parse({ confirmedCapacityOverride: true, capacityOverrideReason: "VIP卓を6名で利用" }) },
    {
      ok: true,
      capacityOverride: true,
      reason: "Owner capacity override: VIP卓を6名で利用",
    },
  );
  assert.equal(parse({ confirmedCapacityOverride: true, capacityOverrideReason: "x".repeat(241) }).ok, false);
});
