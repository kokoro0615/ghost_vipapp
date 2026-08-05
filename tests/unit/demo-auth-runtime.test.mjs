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

test("runtime Basic access session survives missing subrequest Authorization without weakening fail-closed checks", async () => {
  const api = await loadTypeScriptModule("src/lib/demo/accessContract.ts");
  const config = {
    ownerUsername: "owner-runtime",
    ownerPassword: "owner-password-runtime",
    demoEnabled: true,
    demoUsername: "demo-runtime",
    demoPassword: "demo-password-runtime",
  };
  const now = Date.parse("2026-07-28T12:00:00+09:00");

  const ownerSession = api.createBasicAccessSession("owner", config, now);
  const demoSession = api.createBasicAccessSession("demo", config, now);
  assert.ok(ownerSession?.token);
  assert.ok(demoSession?.token);
  assert.equal(ownerSession.expiresAt - now, api.BASIC_ACCESS_MAX_AGE_SECONDS * 1000);

  const ownerAuthorization = api.resolveBasicAccessRequest(
    basic(config.ownerUsername, config.ownerPassword),
    null,
    config,
    now,
  );
  assert.equal(ownerAuthorization?.lane, "owner");
  assert.equal(ownerAuthorization?.source, "authorization");
  const demoCookie = api.resolveBasicAccessRequest(null, demoSession.token, config, now);
  assert.equal(demoCookie?.lane, "demo");
  assert.equal(demoCookie?.source, "cookie");

  assert.equal(
    api.resolveBasicAccessRequest(
      basic(config.demoUsername, "wrong-password"),
      demoSession.token,
      config,
      now,
    ),
    null,
    "an invalid Authorization header must never fall back to a valid cookie",
  );
  assert.equal(
    api.resolveBasicAccessRequest(null, `${demoSession.token}tampered`, config, now),
    null,
  );
  assert.equal(
    api.resolveBasicAccessRequest(
      null,
      demoSession.token,
      { ...config, demoEnabled: false },
      now,
    ),
    null,
  );
  assert.equal(
    api.resolveBasicAccessRequest(
      null,
      ownerSession.token,
      { ...config, ownerPassword: "rotated-owner-password" },
      now,
    ),
    null,
  );
  assert.equal(
    api.resolveBasicAccessRequest(
      null,
      demoSession.token,
      config,
      demoSession.expiresAt + 1,
    ),
    null,
  );
});

test("an application lock blocks cached Basic access until credentials are explicitly re-entered", async () => {
  const api = await loadTypeScriptModule("src/lib/demo/accessContract.ts");
  const config = {
    ownerUsername: "owner-runtime",
    ownerPassword: "owner-password-runtime",
    demoEnabled: true,
    demoUsername: "demo-runtime",
    demoPassword: "demo-password-runtime",
  };
  const cachedAuthorization = basic(config.ownerUsername, config.ownerPassword);
  const outerSession = api.createBasicAccessSession("owner", config);

  assert.equal(
    api.resolveBasicAccessRequest(cachedAuthorization, outerSession.token, config, Date.now(), true),
    null,
    "the browser's cached Authorization header must not bypass the explicit logout lock",
  );
  assert.equal(
    api.resolveExplicitAccessCredentials(
      config.ownerUsername,
      config.ownerPassword,
      config,
    ),
    "owner",
  );
  assert.equal(
    api.resolveExplicitAccessCredentials(config.ownerUsername, "wrong-password", config),
    null,
  );
});

test("session route logout clears every access cookie and only explicit credentials unlock it", async () => {
  const access = await loadTypeScriptModule("src/lib/demo/accessContract.ts");
  class RuntimeResponse {
    static json(body, init = {}) {
      return new RuntimeResponse(body, init);
    }

    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status ?? 200;
      this.headers = new Headers(init.headers);
      this.cookieMutations = [];
      this.cookies = {
        set: (name, value, options) => this.cookieMutations.push({ name, value, options }),
      };
      this.ok = this.status >= 200 && this.status < 300;
    }
  }
  const backendResponse = {
    ok: true,
    status: 200,
    json: async () => ({ ok: true }),
  };
  const route = await loadTypeScriptModule(
    "src/app/api/admin/session/route.ts",
    {
      "next/server": { NextResponse: RuntimeResponse },
      "@/lib/demo/accessContract": access,
      "@/lib/demo/session.server": {
        clearDemoSessionCookie(response) {
          response.cookies.set(access.DEMO_SESSION_COOKIE, "", { path: "/api", maxAge: 0 });
        },
        createDemoSession: () => null,
        getDemoAccessState: () => ({ status: "inactive" }),
        getDemoPublicConfiguration: () => ({}),
        readDemoSessionCookie: () => null,
        setDemoSessionCookie() {},
        verifyDemoSession: () => ({ ok: false, reason: "invalid" }),
      },
      "@/lib/server/ghostAdminProxy": {
        clearAdminToken(response) {
          response.cookies.set(access.OWNER_SESSION_COOKIE, "", { path: "/api", maxAge: 0 });
        },
        copyJson: (response) => response.json(),
        ghostAdminFetch: async () => backendResponse,
        loginBasicOwnerSession: () => null,
        readAdminToken: () => "inner-owner-token",
        setAdminToken() {},
      },
      "@/lib/adminPermissions": { normalizeVipAdminRole: (role) => role },
    },
    {
      Headers,
      process: {
        env: {
          NODE_ENV: "production",
          VIPAPP_BASIC_USER: "owner-runtime",
          VIPAPP_BASIC_PASSWORD: "owner-password-runtime",
          VIPAPP_DEMO_ENABLED: "false",
        },
      },
    },
  );

  const logout = await route.DELETE(new Request("https://vip.invalid/api/admin/session", {
    method: "DELETE",
    headers: { [access.TRUSTED_ACCESS_LANE_HEADER]: "owner" },
  }));
  const logoutCookies = new Map(logout.cookieMutations.map((cookie) => [cookie.name, cookie]));
  assert.equal(logout.status, 200);
  assert.equal(logoutCookies.get(access.OWNER_SESSION_COOKIE).options.maxAge, 0);
  assert.equal(logoutCookies.get(access.DEMO_SESSION_COOKIE).options.maxAge, 0);
  assert.equal(logoutCookies.get(access.BASIC_ACCESS_COOKIE).options.maxAge, 0);
  assert.equal(logoutCookies.get(access.ACCESS_LOCK_COOKIE).options.maxAge, access.BASIC_ACCESS_MAX_AGE_SECONDS);

  const locked = await route.GET(new Request("https://vip.invalid/api/admin/session", {
    headers: { [access.TRUSTED_ACCESS_LOCK_HEADER]: "1" },
  }));
  assert.equal(locked.status, 423);
  assert.equal(locked.body.error, "access_locked");

  const unlocked = await route.POST(new Request("https://vip.invalid/api/admin/session", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [access.TRUSTED_ACCESS_LOCK_HEADER]: "1",
    },
    body: JSON.stringify({ username: "owner-runtime", password: "owner-password-runtime" }),
  }));
  const unlockCookies = new Map(unlocked.cookieMutations.map((cookie) => [cookie.name, cookie]));
  assert.equal(unlocked.status, 200);
  assert.equal(unlockCookies.get(access.ACCESS_LOCK_COOKIE).options.maxAge, 0);
  assert.equal(unlockCookies.get(access.BASIC_ACCESS_COOKIE).options.maxAge, access.BASIC_ACCESS_MAX_AGE_SECONDS);

  const rejected = await route.POST(new Request("https://vip.invalid/api/admin/session", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [access.TRUSTED_ACCESS_LOCK_HEADER]: "1",
    },
    body: JSON.stringify({ username: "owner-runtime", password: "wrong" }),
  }));
  assert.equal(rejected.status, 401);
  assert.equal(rejected.cookieMutations.length, 0);
});

test("runtime demo HMAC session verifies only inside the exact bounded workspace", async () => {
  const processValue = {
    env: {
      VIPAPP_DEMO_ENABLED: "true",
      VIPAPP_DEMO_STARTS_AT: "2026-07-27T00:00:00+09:00",
      VIPAPP_DEMO_EXPIRES_AT: "2026-08-27T23:59:59+09:00",
      VIPAPP_DEMO_WORKSPACE_ID: "runtime-demo-workspace",
      VIPAPP_DEMO_DATA_VERSION: "runtime-v1",
      VIPAPP_DEMO_SESSION_HMAC_SECRET: "runtime-hmac-secret-with-at-least-32-bytes",
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
  assert.equal(api.getSyntheticTextIssue("デモゲストQA", { required: true }), null);
  assert.equal(api.getSyntheticTextIssue("山田太郎", { required: true }), "missing_synthetic_cue");
  assert.equal(api.getSyntheticTextIssue("デモ 090-1234-5678"), "phone_like");
  assert.equal(api.getSyntheticTextIssue("デモ person@example.com"), "email_like");
  assert.equal(api.getSyntheticTextIssue("デモ bearer token-value"), "secret_like");
  assert.equal(api.assertSyntheticEmail("qa@example.invalid"), "qa@example.invalid");
  assert.equal(api.assertNoPhone(""), null);
  assert.throws(() => api.assertSyntheticLabel("山田太郎", "guest", { required: true }));
  assert.throws(() => api.assertSyntheticLabel("デモ 090-1234-5678", "guest", { required: true }));
  assert.throws(() => api.assertSyntheticNote("デモ person@example.com"));
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
