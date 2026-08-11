import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  runVipInertCandidateSmoke,
} from "../../scripts/vip-inert-candidate-smoke.mjs";

const deploymentId = "dpl_InertCandidate123";

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), "ghost-vip-inert-smoke-test-"));
  const envFile = path.join(root, "owner.env");
  await writeFile(envFile, [
    "VIPAPP_BASIC_USER=owner-user",
    "VIPAPP_BASIC_PASSWORD=owner-password",
    "IGNORED_SECRET=must-not-reach-child",
    "",
  ].join("\n"), { mode: 0o600 });
  await chmod(envFile, 0o600);
  t.after(() => rm(root, { recursive: true, force: true }));
  return { root, envFile };
}

function responseFor(requestPath, method) {
  if (requestPath === "/") return "<html><title>GHOST VIP</title></html>";
  if (requestPath === "/api/admin/session" && method === "GET") {
    return JSON.stringify({ ok: true, mode: "owner", role: "owner" });
  }
  if (requestPath === "/api/admin/vip-floor/tickets/capabilities") {
    return JSON.stringify({
      ok: true,
      serverNow: "2026-08-11T09:00:00.000Z",
      capabilities: { managerOperationsEnabled: false, refundReviewEnabled: true },
      readiness: { managerOperations: "disabled", refundReview: "ready" },
    });
  }
  if (requestPath === "/api/admin/session" && method === "DELETE") {
    return JSON.stringify({ ok: true });
  }
  throw new Error(`unexpected request: ${method} ${requestPath}`);
}

function fakeRuntime(commands, { badCapabilities = false } = {}) {
  let acquired = false;
  let released = false;
  return {
    stat,
    readFile,
    writeFile,
    chmod,
    mkdtemp,
    rm,
    tmpdir,
    protectionSecret() { return "temporary-bypass-secret-sentinel"; },
    async acquireProtectionBypass(secret) {
      assert.equal(secret, "temporary-bypass-secret-sentinel");
      acquired = true;
    },
    async releaseProtectionBypass(secret) {
      assert.equal(secret, "temporary-bypass-secret-sentinel");
      released = true;
    },
    run(command, args, options) {
      commands.push({ command, args, options });
      assert.equal(acquired, true);
      const separator = args.indexOf("--");
      const requestPath = args[3];
      const curlArgs = args.slice(separator + 1);
      const valueAfter = (flag) => {
        const index = curlArgs.indexOf(flag);
        return index >= 0 ? curlArgs[index + 1] : undefined;
      };
      const method = valueAfter("--request") || "GET";
      const headersPath = valueAfter("--dump-header");
      const bodyPath = valueAfter("--output");
      let body = responseFor(requestPath, method);
      if (badCapabilities && requestPath.endsWith("/capabilities")) {
        body = JSON.stringify({
          ok: true,
          capabilities: { managerOperationsEnabled: true, refundReviewEnabled: true },
          readiness: { managerOperations: "ready", refundReview: "ready" },
        });
      }
      return Promise.all([
        writeFile(headersPath, [
          "HTTP/2 200",
          "cache-control: private, no-cache, no-store, max-age=0, must-revalidate",
          "referrer-policy: no-referrer",
          "x-robots-tag: noindex, nofollow, noarchive",
          "",
        ].join("\r\n")),
        writeFile(bodyPath, body),
      ]).then(() => ({ status: 0, stdout: "", stderr: "" }));
    },
    state() { return { acquired, released }; },
  };
}

test("inert candidate smoke proves Owner session and refund-only capabilities without leaking secrets", async (t) => {
  const { envFile } = await fixture(t);
  const commands = [];
  const runtime = fakeRuntime(commands);

  const result = await runVipInertCandidateSmoke({
    repoRoot: "/fixture/repo",
    deploymentId,
    envFile,
  }, runtime);

  assert.equal(result.ok, true);
  assert.equal(result.deploymentId, deploymentId);
  assert.equal(result.managerOperationsEnabled, false);
  assert.equal(result.refundReviewEnabled, true);
  assert.equal(commands.length, 4);
  assert.deepEqual(commands.map(({ args }) => [args[3], args.includes("DELETE") ? "DELETE" : "GET"]), [
    ["/", "GET"],
    ["/api/admin/session", "GET"],
    ["/api/admin/vip-floor/tickets/capabilities", "GET"],
    ["/api/admin/session", "DELETE"],
  ]);
  for (const { args, options } of commands) {
    const serialized = JSON.stringify(args);
    assert.doesNotMatch(serialized, /owner-user|owner-password|temporary-bypass-secret-sentinel|must-not-reach-child/u);
    assert.equal(options.env.VERCEL_AUTOMATION_BYPASS_SECRET, "temporary-bypass-secret-sentinel");
    assert.equal(options.env.GHOST_VIPAPP_E2E_ENV_FILE, undefined);
    assert.equal(options.env.IGNORED_SECRET, undefined);
  }
  assert.deepEqual(runtime.state(), { acquired: true, released: true });
});

test("inert candidate smoke revokes bypass and removes temporary files on capability drift", async (t) => {
  const { envFile } = await fixture(t);
  const commands = [];
  const runtime = fakeRuntime(commands, { badCapabilities: true });

  await assert.rejects(
    runVipInertCandidateSmoke({ repoRoot: "/fixture/repo", deploymentId, envFile }, runtime),
    /inert_candidate_capabilities_mismatch/u,
  );
  assert.deepEqual(runtime.state(), { acquired: true, released: true });
  const tempRoot = commands[0].args[commands[0].args.indexOf("--config") + 1];
  await assert.rejects(stat(path.dirname(tempRoot)), /ENOENT/u);
});
