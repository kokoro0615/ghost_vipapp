import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { runNodeScript } from "../helpers/script-runner.mjs";

const reservationId = "00000000-0000-4000-8000-000000000001";
const fingerprint = (origin) => createHash("sha256").update(origin).digest("hex");

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function makeExternalLifecycle(t, { origin, vipHost, cleanupBody = "" } = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), "ghost-vip-e2e-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const receiptPath = path.join(directory, "receipt.log");
  const lifecycleEnvPath = path.join(directory, "website-lifecycle.env");
  const cleanupScript = path.join(directory, "cleanup-vip-manager-trial.mjs");
  const verifyScript = path.join(directory, "verify-vip-manager-trial.mjs");
  await writeFile(cleanupScript, `import { appendFile } from 'node:fs/promises';\nif (!process.env.GHOST_VIP_MANAGER_LIFECYCLE_ENV_FILE) process.exit(2);\nawait appendFile(${JSON.stringify(receiptPath)}, 'cleanup env-path=' + process.env.GHOST_VIP_MANAGER_LIFECYCLE_ENV_FILE + ' ' + process.argv.slice(2).join(' ') + '\\n');\n${cleanupBody}\n`);
  await writeFile(verifyScript, `import { appendFile } from 'node:fs/promises';\nif (!process.env.GHOST_VIP_MANAGER_LIFECYCLE_ENV_FILE) process.exit(2);\nawait appendFile(${JSON.stringify(receiptPath)}, 'verify env-path=' + process.env.GHOST_VIP_MANAGER_LIFECYCLE_ENV_FILE + ' ' + process.argv.slice(2).join(' ') + '\\n');\n`);
  const envPath = path.join(directory, "trial.env");
  const manifestPath = path.join(directory, "trial-manifest.json");
  await writeFile(envPath, [
    "VIPAPP_BASIC_USER=user",
    "VIPAPP_BASIC_PASSWORD=password",
    "VIPAPP_OWNER_PIN=123456",
    "GHOST_VIPAPP_PROTECTION_BYPASS=bypass-secret",
    "GHOST_VIPAPP_ALLOW_STAGING_MUTATION=E2E削除可",
    "",
  ].join("\n"));
  await writeFile(manifestPath, JSON.stringify({
    trialRunId: "trial-e2e-0001",
    businessDate: "2026-07-27",
    reservationId,
    vip: { origin, host: vipHost, fingerprint: fingerprint(origin) },
    backend: { origin: "https://vip-manager-staging.example.test", host: "vip-manager-staging.example.test", fingerprint: fingerprint("https://vip-manager-staging.example.test") },
    cleanupScript,
    verifyScript,
    websiteLifecycleEnvFile: lifecycleEnvPath,
  }));
  await writeFile(lifecycleEnvPath, "SUPABASE_SERVICE_ROLE_KEY=not-emitted\n");
  await chmod(envPath, 0o600);
  await chmod(manifestPath, 0o600);
  await chmod(lifecycleEnvPath, 0o600);
  return { envPath, manifestPath, lifecycleEnvPath, receiptPath };
}

function testEnv(files) {
  return {
    GHOST_VIPAPP_E2E_ENV_FILE: files.envPath,
    GHOST_VIPAPP_TRIAL_MANIFEST_PATH: files.manifestPath,
    GHOST_VIPAPP_STAGING_ALLOW_INSECURE_LOCALHOST: "1",
    GHOST_VIPAPP_E2E_TEST_ALLOW_LOCAL_SCRIPTS: "1",
  };
}

test("staging harness uses canonical proxy commands, verifies version/revision/audit, and runs Website lifecycle", async (t) => {
  const sessionCookie = "staging-session-secret";
  let version = 4;
  let revision = 9;
  const requests = [];
  const bypassHeaders = [];
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    const hasSession = request.headers.cookie?.includes(`ghost_vipapp_admin_session=${sessionCookie}`);
    requests.push({ method: request.method, pathname: url.pathname });
    bypassHeaders.push(request.headers["x-vercel-protection-bypass"]);
    response.setHeader("content-type", "application/json");
    if (url.pathname === "/api/admin/session/pin" && request.method === "POST") {
      response.setHeader("set-cookie", `ghost_vipapp_admin_session=${sessionCookie}; HttpOnly; Path=/api`);
      response.end(JSON.stringify({ ok: true }));
      return;
    }
    if (url.pathname === "/api/admin/vip-floor" && request.method === "GET" && hasSession) {
      response.end(JSON.stringify({ boardRevision: revision, reservations: [{ id: reservationId, version }] }));
      return;
    }
    if (url.pathname === "/api/admin/vip-floor/commands" && request.method === "POST" && hasSession) {
      const body = await readJsonBody(request);
      assert.equal(body.kind, "note");
      assert.equal(body.reservationId, reservationId);
      assert.equal(body.expectedVersion, 4);
      assert.match(String(request.headers["idempotency-key"]), /^trial-e2e-/u);
      version = 5;
      revision = 10;
      response.end(JSON.stringify({ ok: true, auditLogId: "audit-e2e", entityVersion: version, boardRevision: revision }));
      return;
    }
    if (url.pathname === "/api/admin/session" && request.method === "DELETE") {
      response.setHeader("set-cookie", "ghost_vipapp_admin_session=; Max-Age=0; HttpOnly; Path=/api");
      response.end(JSON.stringify({ ok: true }));
      return;
    }
    if (url.pathname === "/api/admin/session" && request.method === "GET") {
      response.statusCode = 401;
      response.end(JSON.stringify({ ok: false }));
      return;
    }
    response.statusCode = 500;
    response.end(JSON.stringify({ ok: false }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const { port } = server.address();
  const files = await makeExternalLifecycle(t, { origin: `http://localhost:${port}`, vipHost: "localhost" });
  const result = await runNodeScript("scripts/staging-mutation-e2e.mjs", testEnv(files));

  assert.equal(result.code, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /"versionAdvanced":true/u);
  assert.match(result.stdout, /"revisionAdvanced":true/u);
  assert.match(result.stdout, /"auditVerified":true/u);
  assert.match(result.stdout, /"cleanupVerified":true/u);
  assert.doesNotMatch(`${result.stdout}${result.stderr}`, /staging-session-secret|123456|password|bypass-secret/u);
  assert.deepEqual(bypassHeaders, Array(6).fill("bypass-secret"));
  assert.deepEqual(requests, [
    { method: "POST", pathname: "/api/admin/session/pin" },
    { method: "GET", pathname: "/api/admin/vip-floor" },
    { method: "POST", pathname: "/api/admin/vip-floor/commands" },
    { method: "GET", pathname: "/api/admin/vip-floor" },
    { method: "DELETE", pathname: "/api/admin/session" },
    { method: "GET", pathname: "/api/admin/session" },
  ]);
  const receipt = await readFile(files.receiptPath, "utf8");
  assert.match(receipt, new RegExp(`env-path=${files.lifecycleEnvPath.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}`, "u"));
  assert.match(receipt, /verify .*before-cleanup/u);
  assert.match(receipt, /cleanup .*cleanup/u);
  assert.match(receipt, /verify .*after-cleanup/u);
});

test("staging harness rejects production host and bad file permissions before network", async (t) => {
  const files = await makeExternalLifecycle(t, { origin: "https://ghost-vipapp.vercel.app", vipHost: "ghost-vipapp.vercel.app" });
  const result = await runNodeScript("scripts/staging-mutation-e2e.mjs", testEnv(files));
  assert.equal(result.code, 1);
  assert.match(result.stdout, /production_origin_rejected/u);
  await chmod(files.manifestPath, 0o644);
  const modeResult = await runNodeScript("scripts/staging-mutation-e2e.mjs", testEnv(files));
  assert.equal(modeResult.code, 1);
  assert.match(modeResult.stdout, /trial_manifest_must_be_mode_600/u);
});

test("staging harness refuses manifest fingerprint mismatches and unsafe lifecycle env permissions before network", async (t) => {
  const files = await makeExternalLifecycle(t, { origin: "http://localhost:41001", vipHost: "localhost" });
  const manifest = JSON.parse(await readFile(files.manifestPath, "utf8"));
  manifest.vip.fingerprint = "b".repeat(64);
  await writeFile(files.manifestPath, JSON.stringify(manifest));
  await chmod(files.manifestPath, 0o600);
  const fingerprintResult = await runNodeScript("scripts/staging-mutation-e2e.mjs", testEnv(files));
  assert.equal(fingerprintResult.code, 1);
  assert.match(fingerprintResult.stdout, /trial_manifest_vip_fingerprint_mismatch/u);
  manifest.vip.fingerprint = fingerprint(manifest.vip.origin);
  await writeFile(files.manifestPath, JSON.stringify(manifest));
  await chmod(files.manifestPath, 0o600);
  await chmod(files.lifecycleEnvPath, 0o644);
  const lifecycleResult = await runNodeScript("scripts/staging-mutation-e2e.mjs", testEnv(files));
  assert.equal(lifecycleResult.code, 1);
  assert.match(lifecycleResult.stdout, /website_lifecycle_env_file_must_be_mode_600/u);
});

test("staging harness runs cleanup and redacts secrets when canonical mutation fails", async (t) => {
  const sessionCookie = "failure-cleanup-session";
  let version = 4;
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    const hasSession = request.headers.cookie?.includes(`ghost_vipapp_admin_session=${sessionCookie}`);
    response.setHeader("content-type", "application/json");
    if (url.pathname === "/api/admin/session/pin" && request.method === "POST") {
      response.setHeader("set-cookie", `ghost_vipapp_admin_session=${sessionCookie}; HttpOnly; Path=/api`);
      response.end(JSON.stringify({ ok: true }));
      return;
    }
    if (url.pathname === "/api/admin/vip-floor" && request.method === "GET" && hasSession) {
      response.end(JSON.stringify({ boardRevision: 9, reservations: [{ id: reservationId, version }] }));
      return;
    }
    if (url.pathname === "/api/admin/vip-floor/commands" && request.method === "POST" && hasSession) {
      response.statusCode = 409;
      response.end(JSON.stringify({ ok: false, error: "expected_test_failure" }));
      return;
    }
    if (url.pathname === "/api/admin/session" && request.method === "DELETE") {
      response.setHeader("set-cookie", "ghost_vipapp_admin_session=; Max-Age=0; HttpOnly; Path=/api");
      response.end(JSON.stringify({ ok: true }));
      return;
    }
    if (url.pathname === "/api/admin/session" && request.method === "GET") {
      response.statusCode = 401;
      response.end(JSON.stringify({ ok: false }));
      return;
    }
    response.statusCode = 500;
    response.end(JSON.stringify({ ok: false }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const { port } = server.address();
  const files = await makeExternalLifecycle(t, { origin: `http://localhost:${port}`, vipHost: "localhost" });
  const result = await runNodeScript("scripts/staging-mutation-e2e.mjs", testEnv(files));
  assert.equal(result.code, 1);
  assert.match(result.stdout, /canonical_mutation_failed:409/u);
  assert.doesNotMatch(`${result.stdout}${result.stderr}`, /failure-cleanup-session|123456|password|bypass-secret/u);
  const receipt = await readFile(files.receiptPath, "utf8");
  assert.match(receipt, /cleanup .*cleanup/u);
  assert.match(receipt, /verify .*after-cleanup/u);
});

test("staging harness cleans the seeded trial run after PIN login failure", async (t) => {
  const server = createServer((request, response) => {
    assert.equal(request.headers["x-vercel-protection-bypass"], "bypass-secret");
    response.setHeader("content-type", "application/json");
    response.statusCode = 401;
    response.end(JSON.stringify({ ok: false }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const { port } = server.address();
  const files = await makeExternalLifecycle(t, { origin: `http://localhost:${port}`, vipHost: "localhost" });
  const result = await runNodeScript("scripts/staging-mutation-e2e.mjs", testEnv(files));
  assert.equal(result.code, 1);
  assert.match(result.stdout, /pin_login_failed:401/u);
  const receipt = await readFile(files.receiptPath, "utf8");
  assert.match(receipt, /cleanup .*cleanup/u);
  assert.match(receipt, /verify .*after-cleanup/u);
});
