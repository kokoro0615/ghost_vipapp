import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";

async function loadResolver() {
  const source = await readFile(new URL("../../src/lib/server/adminOperationAccess.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { exports: {}, module: { exports: {} }, Request };
  context.module.exports = context.exports;
  vm.runInNewContext(compiled, context);
  return context.module.exports.resolveAdminOperationAccess;
}

test("Owner-operation access has one stable 401/403/success policy", async () => {
  const resolveAccess = await loadResolver();
  const request = new Request("https://vip.example.test/api/admin/vip-floor/operations");
  const plain = (value) => JSON.parse(JSON.stringify(value));

  assert.deepEqual(
    plain(await resolveAccess(request, { readToken: () => null, readSession: async () => ({ ok: false, status: 401 }) }, { ownerOnly: true })),
    { ok: false, status: 401, error: "missing_admin_session" },
  );
  assert.deepEqual(
    plain(await resolveAccess(request, { readToken: () => "expired", readSession: async () => ({ ok: false, status: 410 }) }, { ownerOnly: true })),
    { ok: false, status: 410, error: "invalid_admin_session" },
  );
  assert.deepEqual(
    plain(await resolveAccess(request, { readToken: () => "staff", readSession: async () => ({ ok: true, status: 200, actor: { role: "staff", displayName: null } }) }, { ownerOnly: true })),
    { ok: false, status: 403, error: "insufficient_role" },
  );
  assert.deepEqual(
    plain(await resolveAccess(request, { readToken: () => "owner", readSession: async () => ({ ok: true, status: 200, actor: { role: "owner", displayName: "Owner" } }) }, { ownerOnly: true })),
    { ok: true, token: "owner", actor: { role: "owner", displayName: "Owner" } },
  );
});
