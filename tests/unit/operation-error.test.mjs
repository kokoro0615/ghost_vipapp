import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";

async function loadErrorModule() {
  const source = await readFile(
    new URL("../../src/lib/vipFloorClientErrors.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const context = {
    exports: {},
    module: { exports: {} },
  };
  context.module.exports = context.exports;
  vm.runInNewContext(compiled, context);
  return context.module.exports;
}

test("structured backend errors never render as object text", async () => {
  const { readVipOperationFailure } = await loadErrorModule();
  const failure = readVipOperationFailure(400, {
    ok: false,
    error: {
      code: "INVALID_COMMAND",
      details: { field: "expectedTableVersions" },
    },
  });

  assert.equal(failure.code, "INVALID_COMMAND");
  assert.match(failure.message, /別の端末で卓情報が更新/u);
  assert.match(failure.recovery, /卓を選び直/u);
  assert.doesNotMatch(JSON.stringify(failure), /\[object Object\]/u);
});

test("concurrency conflicts return a specific recovery action", async () => {
  const { readVipOperationFailure } = await loadErrorModule();
  const failure = readVipOperationFailure(409, {
    ok: false,
    error: { code: "TABLE_TIME_CONFLICT" },
  });

  assert.equal(failure.code, "TABLE_TIME_CONFLICT");
  assert.match(failure.message, /別の予約と重な/u);
  assert.match(failure.recovery, /卓と利用時間を選び直/u);
});

test("unknown server errors keep a stable string code", async () => {
  const { readVipOperationFailure } = await loadErrorModule();
  const failure = readVipOperationFailure(500, {
    ok: false,
    error: { unexpected: true },
  });

  assert.equal(failure.code, "HTTP_500");
  assert.match(failure.message, /サーバー側/u);
});
