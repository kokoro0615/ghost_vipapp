import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";

async function loadReader() {
  const source = await readFile(new URL("../../src/lib/vipFloorDayState.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = {
    exports: {},
    module: { exports: {} },
    require: () => ({ isBusinessDate: (value) => value === "2026-08-05" }),
  };
  context.module.exports = context.exports;
  vm.runInNewContext(compiled, context);
  return context.module.exports.readVipFloorDayStateEvent;
}

test("missing and closed day states are typed and invalid payloads fail closed", async () => {
  const read = await loadReader();
  assert.equal(read({ state: "missing", businessDate: "bad" }), null);
  assert.equal(read({ state: "unknown", businessDate: "2026-08-05" }), null);
  assert.equal(read({ state: "missing", businessDate: "2026-08-05" }).state, "missing");
  assert.equal(read({ state: "closed", businessDate: "2026-08-05", reason: "休業" }).state, "closed");
});
