#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  chmod,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import {
  readVercelToken,
  vercelApi,
} from "./lib/production-source-attestation.mjs";

const PROJECT_ID = "prj_mchunQTOAeQMkn86A1zCtMapdVqp";
const TEAM_ID = "team_VHoP9car1gK30q4ideCMW0g5";
const SCOPE = "projects-b6224582";
const DEPLOYMENT_ID = /^dpl_[A-Za-z0-9]+$/u;
const BASE_CHILD_ENV_KEYS = Object.freeze([
  "PATH", "HOME", "TMPDIR", "TEMP", "TMP", "LANG", "LC_ALL", "LC_CTYPE", "TERM",
  "CI", "FORCE_COLOR", "NO_COLOR",
]);

function requiredFlag(argv, name) {
  const indexes = argv.flatMap((value, index) => value === name ? [index] : []);
  if (indexes.length !== 1 || indexes[0] === argv.length - 1) {
    throw new Error(`inert_candidate_flag_invalid:${name}`);
  }
  return argv[indexes[0] + 1];
}

function parseEnvironment(source) {
  const values = new Map();
  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/u);
    if (!match || values.has(match[1])) throw new Error("inert_candidate_env_invalid");
    const quoted = match[2].match(/^(?:"([^"]*)"|'([^']*)')$/u);
    values.set(match[1], quoted ? (quoted[1] ?? quoted[2] ?? "") : match[2]);
  }
  const username = values.get("VIPAPP_BASIC_USER") ?? "";
  const password = values.get("VIPAPP_BASIC_PASSWORD") ?? "";
  if (
    username.length < 1 || username.length > 256
    || password.length < 1 || password.length > 4096
    || /[\r\n\0]/u.test(`${username}${password}`)
  ) throw new Error("inert_candidate_owner_credentials_invalid");
  return Object.freeze({ username, password });
}

async function readOwnerCredentials(filePath, runtime) {
  if (!path.isAbsolute(filePath) || filePath.includes("\0")) {
    throw new Error("inert_candidate_env_file_path_invalid");
  }
  const metadata = await runtime.stat(filePath);
  if (!metadata.isFile() || (metadata.mode & 0o077) !== 0 || metadata.size > 16_384) {
    throw new Error("inert_candidate_env_file_not_mode_600");
  }
  return parseEnvironment(await runtime.readFile(filePath, "utf8"));
}

function childEnvironment(secret, source = process.env) {
  const output = { VERCEL_AUTOMATION_BYPASS_SECRET: secret };
  for (const key of BASE_CHILD_ENV_KEYS) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0 && value.length <= 4096) output[key] = value;
  }
  return output;
}

function statusFromHeaders(source) {
  const matches = [...source.matchAll(/^HTTP\/\S+\s+(\d{3})\b/gimu)];
  return Number(matches.at(-1)?.[1] ?? 0);
}

function requireNoStore(headers, stage) {
  const cacheControl = headers.match(/^cache-control:\s*(.+)$/imu)?.[1] ?? "";
  if (!/(?:^|,)\s*(?:private\s*,\s*)?(?:no-cache\s*,\s*)?no-store(?:\s*,|$)/iu.test(cacheControl)) {
    throw new Error(`inert_candidate_no_store_missing:${stage}`);
  }
}

function parseBoundedJson(source, stage) {
  if (Buffer.byteLength(source, "utf8") > 65_536) {
    throw new Error(`inert_candidate_body_too_large:${stage}`);
  }
  try {
    const value = JSON.parse(source);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("shape");
    return value;
  } catch {
    throw new Error(`inert_candidate_body_invalid:${stage}`);
  }
}

async function requestCandidate({
  repoRoot,
  deploymentId,
  requestPath,
  method = "GET",
  tempRoot,
  configPath,
  cookiePath,
  secret,
  stage,
}, runtime) {
  const headersPath = path.join(tempRoot, `${stage}.headers`);
  const bodyPath = path.join(tempRoot, `${stage}.body`);
  const args = [
    "--no-install", "vercel", "curl", requestPath,
    "--deployment", deploymentId,
    "--scope", SCOPE,
    "--",
    "--config", configPath,
    "--cookie", cookiePath,
    "--cookie-jar", cookiePath,
    "--output", bodyPath,
    "--dump-header", headersPath,
    "--silent", "--show-error",
    ...(method === "GET" ? [] : ["--request", method]),
  ];
  const result = await runtime.run("npx", args, {
    cwd: repoRoot,
    env: childEnvironment(secret),
  });
  if (result?.error || result?.status !== 0) {
    throw new Error(`inert_candidate_request_failed:${stage}`);
  }
  await Promise.all([
    runtime.chmod(headersPath, 0o600),
    runtime.chmod(bodyPath, 0o600),
    runtime.chmod(cookiePath, 0o600),
  ]);
  const headers = await runtime.readFile(headersPath, "utf8");
  const body = await runtime.readFile(bodyPath, "utf8");
  const status = statusFromHeaders(headers);
  requireNoStore(headers, stage);
  return Object.freeze({ status, headers, body });
}

function assertPage(response) {
  if (response.status !== 200) throw new Error(`inert_candidate_page_http_${response.status}`);
  if (!/^referrer-policy:\s*no-referrer\s*$/imu.test(response.headers)) {
    throw new Error("inert_candidate_referrer_policy_missing");
  }
  if (!/^x-robots-tag:\s*[^\r\n]*noindex/imu.test(response.headers)) {
    throw new Error("inert_candidate_robots_policy_missing");
  }
}

function assertSession(response) {
  if (response.status !== 200) throw new Error(`inert_candidate_session_http_${response.status}`);
  const value = parseBoundedJson(response.body, "session");
  if (value.ok !== true || value.mode !== "owner" || value.role !== "owner") {
    throw new Error("inert_candidate_owner_session_invalid");
  }
}

function assertCapabilities(response) {
  if (response.status !== 200) throw new Error(`inert_candidate_capabilities_http_${response.status}`);
  const value = parseBoundedJson(response.body, "capabilities");
  if (
    value.ok !== true
    || value.capabilities?.managerOperationsEnabled !== false
    || value.capabilities?.refundReviewEnabled !== true
    || value.readiness?.managerOperations !== "disabled"
    || value.readiness?.refundReview !== "ready"
  ) throw new Error("inert_candidate_capabilities_mismatch");
  return value;
}

function assertLogout(response) {
  if (response.status !== 200) throw new Error(`inert_candidate_logout_http_${response.status}`);
  const value = parseBoundedJson(response.body, "logout");
  if (value.ok !== true) throw new Error("inert_candidate_logout_invalid");
}

export async function runVipInertCandidateSmoke(
  { repoRoot = process.cwd(), deploymentId, envFile },
  runtime = createProductionRuntime(),
) {
  if (!DEPLOYMENT_ID.test(deploymentId ?? "")) throw new Error("inert_candidate_deployment_id_invalid");
  const credentials = await readOwnerCredentials(envFile, runtime);
  const tempRoot = await runtime.mkdtemp(path.join(runtime.tmpdir(), "ghost-vip-inert-smoke-"));
  await runtime.chmod(tempRoot, 0o700);
  const configPath = path.join(tempRoot, "curl.conf");
  const cookiePath = path.join(tempRoot, "cookies.txt");
  const basic = Buffer.from(`${credentials.username}:${credentials.password}`, "utf8").toString("base64");
  await runtime.writeFile(configPath, `header = \"Authorization: Basic ${basic}\"\n`, { mode: 0o600 });
  await runtime.writeFile(cookiePath, "", { mode: 0o600 });
  await Promise.all([runtime.chmod(configPath, 0o600), runtime.chmod(cookiePath, 0o600)]);
  const secret = runtime.protectionSecret();
  let acquired = false;
  try {
    await runtime.acquireProtectionBypass(secret);
    acquired = true;
    const shared = { repoRoot, deploymentId, tempRoot, configPath, cookiePath, secret };
    assertPage(await requestCandidate({ ...shared, requestPath: "/", stage: "page" }, runtime));
    assertSession(await requestCandidate({
      ...shared, requestPath: "/api/admin/session", stage: "session",
    }, runtime));
    const capabilities = assertCapabilities(await requestCandidate({
      ...shared,
      requestPath: "/api/admin/vip-floor/tickets/capabilities",
      stage: "capabilities",
    }, runtime));
    assertLogout(await requestCandidate({
      ...shared, requestPath: "/api/admin/session", method: "DELETE", stage: "logout",
    }, runtime));
    return Object.freeze({
      ok: true,
      deploymentId,
      ownerSession: true,
      managerOperationsEnabled: capabilities.capabilities.managerOperationsEnabled,
      refundReviewEnabled: capabilities.capabilities.refundReviewEnabled,
      logout: true,
      businessMutations: 0,
    });
  } finally {
    try {
      if (acquired) await runtime.releaseProtectionBypass(secret);
      else await runtime.releaseProtectionBypass(secret);
    } finally {
      await runtime.rm(tempRoot, { recursive: true, force: true });
    }
  }
}

async function mutateProtectionBypass(secret, operation) {
  const token = await readVercelToken();
  const auth = { token, teamId: TEAM_ID };
  const projectPath = `/v9/projects/${encodeURIComponent(PROJECT_ID)}`;
  const before = await vercelApi(projectPath, auth);
  const entries = Object.entries(before?.protectionBypass ?? {})
    .filter(([, row]) => row?.scope === "automation-bypass");
  if (operation === "acquire") {
    if (entries.length !== 0) throw new Error("inert_candidate_bypass_already_present");
  } else if (entries.length === 0) {
    return;
  } else if (entries.length !== 1 || entries[0][0] !== secret) {
    throw new Error("inert_candidate_bypass_cleanup_ambiguous");
  }
  const url = new URL(
    `/v1/projects/${encodeURIComponent(PROJECT_ID)}/protection-bypass`,
    "https://api.vercel.com",
  );
  url.searchParams.set("teamId", TEAM_ID);
  const body = operation === "acquire"
    ? { generate: { secret } }
    : { revoke: { secret, regenerate: false } };
  const response = await fetch(url, {
    method: "PATCH",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`inert_candidate_bypass_${operation}_http_${response.status}`);
  const after = await vercelApi(projectPath, auth);
  const afterEntries = Object.entries(after?.protectionBypass ?? {})
    .filter(([, row]) => row?.scope === "automation-bypass");
  if (
    (operation === "acquire" && (afterEntries.length !== 1 || afterEntries[0][0] !== secret))
    || (operation === "release" && afterEntries.length !== 0)
  ) throw new Error(`inert_candidate_bypass_${operation}_readback_failed`);
}

export function createProductionRuntime() {
  return {
    stat,
    readFile,
    writeFile,
    chmod,
    mkdtemp,
    rm,
    tmpdir,
    protectionSecret() { return randomBytes(16).toString("hex"); },
    acquireProtectionBypass(secret) { return mutateProtectionBypass(secret, "acquire"); },
    releaseProtectionBypass(secret) { return mutateProtectionBypass(secret, "release"); },
    run(command, args, { cwd, env }) {
      return spawnSync(command, args, {
        cwd,
        env,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 60_000,
        maxBuffer: 1 << 20,
      });
    },
  };
}

async function main() {
  const deploymentId = requiredFlag(process.argv.slice(2), "--deployment-id");
  const envFile = process.env.GHOST_VIPAPP_E2E_ENV_FILE?.trim() ?? "";
  const result = await runVipInertCandidateSmoke({ deploymentId, envFile });
  console.log(JSON.stringify(result));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "inert_candidate_smoke_failed");
    process.exitCode = 1;
  });
}
