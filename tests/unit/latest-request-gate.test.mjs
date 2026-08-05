import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";

async function loadGate() {
  const source = await readFile(new URL("../../src/lib/latestRequestGate.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { exports: {}, module: { exports: {} } };
  context.module.exports = context.exports;
  vm.runInNewContext(compiled, context);
  return context.module.exports.LatestRequestGate;
}

test("a delayed earlier response cannot replace the latest suggestion result", async () => {
  const LatestRequestGate = await loadGate();
  const gate = new LatestRequestGate();
  let visible = [];

  async function request(value, delay) {
    const epoch = gate.begin();
    await new Promise((resolve) => setTimeout(resolve, delay));
    if (gate.isCurrent(epoch)) visible = [value];
  }

  await Promise.all([request("old", 25), request("new", 1)]);
  assert.deepEqual(visible, ["new"]);
});

test("closing the operation invalidates an in-flight suggestion response", async () => {
  const LatestRequestGate = await loadGate();
  const gate = new LatestRequestGate();
  const epoch = gate.begin();
  gate.invalidate();
  assert.equal(gate.isCurrent(epoch), false);
});
