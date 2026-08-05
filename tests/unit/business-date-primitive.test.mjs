import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";

async function loadContract() {
  const source = await readFile(new URL("../../src/lib/vipFloorV2Contract.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = {
    Date,
    Error,
    exports: {},
    module: { exports: {} },
    require: () => ({ VIP_MANAGER_ERROR_CODES: [] }),
  };
  context.module.exports = context.exports;
  vm.runInNewContext(compiled, context);
  return context.module.exports;
}

test("canonical business-date predicate rejects impossible calendar dates", async () => {
  const { isBusinessDate } = await loadContract();
  assert.equal(isBusinessDate("2026-02-28"), true);
  assert.equal(isBusinessDate("2026-02-29"), false);
  assert.equal(isBusinessDate("2026-04-31"), false);
  assert.equal(isBusinessDate("2026-13-01"), false);
});

test("business-days BFF and workspace hook reuse the canonical primitive", async () => {
  const [route, hook] = await Promise.all([
    readFile(new URL("../../src/app/api/admin/vip-floor/business-days/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../../src/components/admin/vip-floor-v2/state/useVipFloorWorkspace.ts", import.meta.url), "utf8"),
  ]);
  assert.match(route, /readBusinessDate/);
  assert.match(hook, /isBusinessDate/);
  assert.doesNotMatch(route, /BUSINESS_DATE_PATTERN/);
  assert.doesNotMatch(hook, /BUSINESS_DATE_PATTERN/);
});
