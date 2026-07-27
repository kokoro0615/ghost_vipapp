import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";

async function loadTypeScriptModule(relativePath, mocks = {}, globals = {}) {
  const source = await readFile(new URL(`../../${relativePath}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const context = {
    Buffer,
    Date,
    JSON,
    Math,
    Promise,
    clearTimeout,
    console: { error() {}, log() {}, warn() {} },
    exports: {},
    module: { exports: {} },
    process: { env: {} },
    require(identifier) {
      if (identifier === "node:crypto") return crypto;
      if (identifier in mocks) return mocks[identifier];
      if (identifier === "server-only") return {};
      throw new Error(`unexpected module: ${identifier}`);
    },
    setTimeout,
    ...globals,
  };
  context.module.exports = context.exports;
  vm.runInNewContext(compiled, context);
  return context.module.exports;
}

function basic(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

test("runtime Basic resolver isolates owner, demo, disabled and ambiguous credentials", async () => {
  const api = await loadTypeScriptModule("src/lib/demo/accessContract.ts");
  const config = {
    ownerUsername: "owner-runtime",
    ownerPassword: "owner-password-runtime",
    demoEnabled: true,
    demoUsername: "demo-runtime",
    demoPassword: "demo-password-runtime",
  };

  assert.equal(api.resolveBasicAccessLane(basic(config.ownerUsername, config.ownerPassword), config), "owner");
  assert.equal(api.resolveBasicAccessLane(basic(config.demoUsername, config.demoPassword), config), "demo");
  assert.equal(api.resolveBasicAccessLane(basic("demo-runtime", "wrong"), config), null);
  assert.equal(api.resolveBasicAccessLane(basic(config.demoUsername, config.demoPassword), {
    ...config,
    demoEnabled: false,
  }), null);
  assert.equal(api.resolveBasicAccessLane(basic("same", "same-password"), {
    ownerUsername: "same",
    ownerPassword: "same-password",
    demoEnabled: true,
    demoUsername: "same",
    demoPassword: "same-password",
  }), null);
});

test("runtime demo PIN and HMAC session verify only inside the exact bounded workspace", async () => {
  const pin = "24681357";
  const salt = "runtime-demo-salt";
  const verifier = crypto.scryptSync(pin, salt, 32).toString("hex");
  const processValue = {
    env: {
      VIPAPP_DEMO_ENABLED: "true",
      VIPAPP_DEMO_STARTS_AT: "2026-07-27T00:00:00+09:00",
      VIPAPP_DEMO_EXPIRES_AT: "2026-08-27T23:59:59+09:00",
      VIPAPP_DEMO_WORKSPACE_ID: "runtime-demo-workspace",
      VIPAPP_DEMO_DATA_VERSION: "runtime-v1",
      VIPAPP_DEMO_SESSION_HMAC_SECRET: "runtime-hmac-secret-with-at-least-32-bytes",
      VIPAPP_DEMO_PIN_SALT: salt,
      VIPAPP_DEMO_PIN_SCRYPT_VERIFIER: verifier,
    },
  };
  const api = await loadTypeScriptModule(
    "src/lib/demo/session.server.ts",
    {
      "@/lib/demo/accessContract": {
        DEMO_SESSION_COOKIE: "ghost_vipapp_demo_session",
      },
    },
    { process: processValue },
  );
  const activeNow = Date.parse("2026-08-01T12:00:00+09:00");

  assert.equal(await api.verifyDemoPin(pin), true);
  assert.equal(await api.verifyDemoPin("13572468"), false);
  const session = api.createDemoSession(activeNow);
  assert.ok(session?.token);
  const verified = api.verifyDemoSession(session.token, activeNow + 60_000);
  assert.equal(verified.ok, true);
  assert.equal(verified.claim.mode, "demo");
  assert.equal(verified.claim.role, "owner-compatible-demo");
  assert.equal(verified.claim.workspaceId, "runtime-demo-workspace");

  const [encodedClaim, encodedSignature] = session.token.split(".");
  const tamperedSignature = `${encodedSignature.startsWith("a") ? "b" : "a"}${encodedSignature.slice(1)}`;
  const tampered = `${encodedClaim}.${tamperedSignature}`;
  assert.equal(api.verifyDemoSession(tampered, activeNow).ok, false);
  assert.equal(
    api.verifyDemoSession(
      session.token,
      Date.parse("2026-08-28T00:00:00+09:00"),
    ).reason,
    "expired",
  );
});

test("runtime synthetic validation rejects phone, real email, secrets, personal dates, and non-demo labels", async () => {
  const api = await loadTypeScriptModule(
    "src/lib/demo/validation.ts",
    {
      "./contract": {
        DEMO_FIRST_BUSINESS_DATE: "2026-07-27",
        DEMO_LAST_BUSINESS_DATE: "2026-08-27",
      },
    },
  );

  assert.equal(api.assertSyntheticLabel("デモゲストQA", "guest", { required: true }), "デモゲストQA");
  assert.equal(api.assertSyntheticEmail("qa@example.invalid"), "qa@example.invalid");
  assert.equal(api.assertNoPhone(""), null);
  assert.throws(() => api.assertSyntheticLabel("山田太郎", "guest", { required: true }));
  assert.throws(() => api.assertSyntheticLabel("デモ 090-1234-5678", "guest", { required: true }));
  assert.throws(() => api.assertSyntheticEmail("person@example.com"));
  assert.throws(() => api.assertSyntheticNote("デモ bearer token-value"));
  assert.throws(() => api.validateCustomerPatch({
    expectedVersion: 1,
    nationalityCode: "JP",
    birthDate: "1990-01-01",
    anniversaryDate: null,
    vipRank: "デモVIP",
  }));
  assert.throws(() => api.assertDemoBusinessDate("2026-08-28"));
});
