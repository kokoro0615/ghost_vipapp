#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import {
  SafeHttpClient,
  assert,
  constantTimeEqual,
  emit,
  safeErrorCode,
} from "./lib/e2e-http.mjs";

const CONFIRMATION = "E2E削除可";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const FINGERPRINT_PATTERN = /^[a-f0-9]{64}$/u;
const RUN_ID_PATTERN = /^trial-[a-z0-9][a-z0-9-]{7,80}$/u;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function normalizeMode(mode) {
  return mode & 0o777;
}

async function readMode600File(filePath, code) {
  assert(typeof filePath === "string" && path.isAbsolute(filePath), `${code}_path_invalid`);
  const fileStat = await stat(filePath);
  assert(fileStat.isFile(), `${code}_not_file`);
  assert(normalizeMode(fileStat.mode) === 0o600, `${code}_must_be_mode_600`);
  return readFile(filePath, "utf8");
}

async function assertMode600File(filePath, code) {
  assert(typeof filePath === "string" && path.isAbsolute(filePath), `${code}_path_invalid`);
  const fileStat = await stat(filePath);
  assert(fileStat.isFile(), `${code}_not_file`);
  assert(normalizeMode(fileStat.mode) === 0o600, `${code}_must_be_mode_600`);
}

function parseEnvFile(source) {
  const values = {};
  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/u.exec(line);
    assert(match, "e2e_env_file_invalid");
    const [, key, rawValue] = match;
    const quoted = /^(?:"([\s\S]*)"|'([\s\S]*)')$/u.exec(rawValue);
    values[key] = quoted ? (quoted[1] ?? quoted[2] ?? "") : rawValue;
  }
  return values;
}

function readRequired(source, key) {
  const value = source[key];
  assert(typeof value === "string" && value.length > 0, `e2e_required_value_missing:${key}`);
  return value;
}

function parseOrigin(value, name, allowInsecureLocalhost = false) {
  let origin;
  try {
    origin = new URL(value);
  } catch {
    throw new Error(`${name}_origin_invalid`);
  }
  const loopback = origin.hostname === "localhost" || origin.hostname === "127.0.0.1" || origin.hostname === "::1";
  assert(origin.protocol === "https:" || (allowInsecureLocalhost && loopback && origin.protocol === "http:"), `${name}_origin_requires_https`);
  assert(!origin.username && !origin.password, `${name}_origin_credentials_forbidden`);
  assert(origin.pathname === "/" && !origin.search && !origin.hash, `${name}_origin_not_canonical`);
  return origin;
}

function assertManifestHost(manifest, key, allowInsecureLocalhost) {
  const value = manifest?.[key];
  assert(value && typeof value === "object" && !Array.isArray(value), `trial_manifest_${key}_missing`);
  const origin = parseOrigin(value.origin, key, allowInsecureLocalhost);
  assert(typeof value.host === "string" && value.host === origin.hostname, `trial_manifest_${key}_host_mismatch`);
  assert(FINGERPRINT_PATTERN.test(value.fingerprint ?? ""), `trial_manifest_${key}_fingerprint_invalid`);
  const expectedFingerprint = createHash("sha256").update(origin.origin).digest("hex");
  assert(constantTimeEqual(value.fingerprint, expectedFingerprint), `trial_manifest_${key}_fingerprint_mismatch`);
  return origin;
}

function assertProductionRefusal(origin, manifest) {
  const denied = new Set([
    "ghost-vipapp.vercel.app",
    "ghost-ruby-one.vercel.app",
    manifest.backend.host,
  ]);
  assert(!denied.has(origin.hostname), "production_origin_rejected");
  assert(origin.hostname === manifest.vip.host, "staging_host_fingerprint_mismatch");
}

function findReservation(board, reservationId) {
  const reservations = Array.isArray(board?.reservations) ? board.reservations : [];
  return reservations.find((item) => item?.id === reservationId) ?? null;
}

function readPositiveInteger(value, code) {
  assert(typeof value === "number" && Number.isSafeInteger(value) && value >= 1, code);
  return value;
}

function isWebsiteScript(scriptPath, expectedName, allowTestScript) {
  const parsed = path.parse(scriptPath);
  if (allowTestScript) return parsed.base === expectedName;
  return parsed.base === expectedName
    && path.basename(parsed.dir) === "scripts"
    && path.basename(path.dirname(parsed.dir)) === "website";
}

function runLifecycleScript(scriptPath, expectedName, args, lifecycleEnvFile, allowTestScript) {
  assert(typeof scriptPath === "string" && path.isAbsolute(scriptPath), "lifecycle_script_path_invalid");
  assert(isWebsiteScript(scriptPath, expectedName, allowTestScript), "lifecycle_script_path_rejected");
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        PATH: process.env.PATH ?? "",
        GHOST_VIP_MANAGER_LIFECYCLE_ENV_FILE: lifecycleEnvFile,
      },
    });
    // Never forward lifecycle script output: it can contain operational details.
    child.stdout.resume();
    child.stderr.resume();
    child.on("error", () => resolve({ code: 1 }));
    child.on("close", (code) => resolve({ code: code ?? 1 }));
  });
}

async function loadConfiguration() {
  const envPath = process.env.GHOST_VIPAPP_E2E_ENV_FILE ?? "";
  const manifestPath = process.env.GHOST_VIPAPP_TRIAL_MANIFEST_PATH ?? "";
  const env = parseEnvFile(await readMode600File(envPath, "e2e_env_file"));
  const manifestRaw = await readMode600File(manifestPath, "trial_manifest");
  let manifest;
  try {
    manifest = JSON.parse(manifestRaw);
  } catch {
    throw new Error("trial_manifest_invalid_json");
  }
  assert(manifest && typeof manifest === "object" && !Array.isArray(manifest), "trial_manifest_invalid");

  const trialRunId = readRequired(manifest, "trialRunId");
  const businessDate = readRequired(manifest, "businessDate");
  const reservationId = readRequired(manifest, "reservationId");
  assert(RUN_ID_PATTERN.test(trialRunId), "trial_run_id_invalid");
  assert(DATE_PATTERN.test(businessDate), "trial_business_date_invalid");
  assert(UUID_PATTERN.test(reservationId), "trial_reservation_id_invalid");

  const allowInsecureLocalhost = process.env.GHOST_VIPAPP_STAGING_ALLOW_INSECURE_LOCALHOST === "1";
  const vipOrigin = assertManifestHost(manifest, "vip", allowInsecureLocalhost);
  const backendOrigin = assertManifestHost(manifest, "backend", allowInsecureLocalhost);
  assert(backendOrigin.hostname !== "ghost-ruby-one.vercel.app", "production_backend_rejected");
  assertProductionRefusal(vipOrigin, manifest);
  assert(constantTimeEqual(readRequired(env, "GHOST_VIPAPP_ALLOW_STAGING_MUTATION"), CONFIRMATION), "staging_mutation_confirmation_missing");

  const allowTestScript = process.env.GHOST_VIPAPP_E2E_TEST_ALLOW_LOCAL_SCRIPTS === "1"
    && vipOrigin.hostname === "localhost";
  const cleanupScript = readRequired(manifest, "cleanupScript");
  const verifyScript = readRequired(manifest, "verifyScript");
  const lifecycleEnvFile = readRequired(manifest, "websiteLifecycleEnvFile");
  assert(isWebsiteScript(cleanupScript, "cleanup-vip-manager-trial.mjs", allowTestScript), "cleanup_script_path_rejected");
  assert(isWebsiteScript(verifyScript, "verify-vip-manager-trial.mjs", allowTestScript), "verify_script_path_rejected");
  await assertMode600File(lifecycleEnvFile, "website_lifecycle_env_file");

  return {
    origin: vipOrigin,
    trialRunId,
    businessDate,
    reservationId,
    cleanupScript,
    verifyScript,
    lifecycleEnvFile,
    allowTestScript,
    basicUser: readRequired(env, "VIPAPP_BASIC_USER"),
    basicPassword: readRequired(env, "VIPAPP_BASIC_PASSWORD"),
    pin: readRequired(env, "VIPAPP_OWNER_PIN"),
    protectionBypass: readRequired(env, "GHOST_VIPAPP_PROTECTION_BYPASS"),
  };
}

function lifecycleArgs(config, phase) {
  return [
    "--confirm-staging",
    "--trial-run-id", config.trialRunId,
    "--business-date", config.businessDate,
    "--phase", phase,
  ];
}

async function main() {
  const config = await loadConfiguration();
  const client = new SafeHttpClient({
    origin: config.origin,
    basicUser: config.basicUser,
    basicPassword: config.basicPassword,
    defaultHeaders: { "x-vercel-protection-bypass": config.protectionBypass },
    rules: [
      { method: "POST", path: "/api/admin/session/pin" },
      { method: "GET", path: "/api/admin/session" },
      { method: "DELETE", path: "/api/admin/session" },
      { method: "GET", path: "/api/admin/vip-floor" },
      { method: "POST", path: "/api/admin/vip-floor/commands" },
    ],
  });
  let loggedIn = false;
  let cleanupComplete = false;
  let primaryError = null;

  try {
    emit("staging_mutation_e2e_started", { contract: "vip-floor.v2", lifecycle: "external" });
    const login = await client.requestJson("/api/admin/session/pin", {
      method: "POST",
      json: { pin: config.pin },
    });
    assert(login.response.ok && login.payload?.ok === true, `pin_login_failed:${login.response.status}`);
    assert(client.jar.size > 0, "pin_login_cookie_missing");
    loggedIn = true;

    const beforeBoard = await client.requestJson(`/api/admin/vip-floor?date=${encodeURIComponent(config.businessDate)}`);
    assert(beforeBoard.response.ok, `board_read_failed:${beforeBoard.response.status}`);
    const beforeReservation = findReservation(beforeBoard.payload, config.reservationId);
    assert(beforeReservation, "trial_reservation_not_found");
    const beforeVersion = readPositiveInteger(beforeReservation.version, "trial_reservation_version_missing");
    const beforeRevision = readPositiveInteger(beforeBoard.payload?.boardRevision, "board_revision_missing");

    const command = await client.requestJson("/api/admin/vip-floor/commands", {
      method: "POST",
      json: {
        kind: "note",
        reservationId: config.reservationId,
        expectedVersion: beforeVersion,
        payload: { note: "TRIAL E2E verification" },
      },
      headers: { "Idempotency-Key": `trial-e2e-${randomUUID()}` },
    });
    assert(command.response.ok && command.payload?.ok === true, `canonical_mutation_failed:${command.response.status}`);
    assert(typeof command.payload?.auditLogId === "string" && command.payload.auditLogId, "mutation_audit_id_missing");
    const commandVersion = readPositiveInteger(command.payload.entityVersion, "mutation_version_missing");
    const commandRevision = readPositiveInteger(command.payload.boardRevision, "mutation_revision_missing");
    assert(commandVersion > beforeVersion, "mutation_version_not_advanced");
    assert(commandRevision > beforeRevision, "mutation_revision_not_advanced");

    const afterBoard = await client.requestJson(`/api/admin/vip-floor?date=${encodeURIComponent(config.businessDate)}`);
    assert(afterBoard.response.ok, `board_reread_failed:${afterBoard.response.status}`);
    const afterReservation = findReservation(afterBoard.payload, config.reservationId);
    assert(afterReservation, "trial_reservation_missing_after_mutation");
    assert(readPositiveInteger(afterReservation.version, "post_mutation_version_missing") === commandVersion, "board_version_mismatch");
    assert(readPositiveInteger(afterBoard.payload?.boardRevision, "post_mutation_revision_missing") >= commandRevision, "board_revision_mismatch");

    const verifyBefore = await runLifecycleScript(
      config.verifyScript,
      "verify-vip-manager-trial.mjs",
      lifecycleArgs(config, "before-cleanup"),
      config.lifecycleEnvFile,
      config.allowTestScript,
    );
    assert(verifyBefore.code === 0, "trial_verify_before_cleanup_failed");
    emit("staging_mutation_verified", { versionAdvanced: true, revisionAdvanced: true, auditVerified: true });
  } catch (error) {
    primaryError = error;
  } finally {
    if (config) {
      try {
        const cleanup = await runLifecycleScript(
          config.cleanupScript,
          "cleanup-vip-manager-trial.mjs",
          lifecycleArgs(config, "cleanup"),
          config.lifecycleEnvFile,
          config.allowTestScript,
        );
        assert(cleanup.code === 0, "trial_cleanup_failed");
        const verifyAfter = await runLifecycleScript(
          config.verifyScript,
          "verify-vip-manager-trial.mjs",
          lifecycleArgs(config, "after-cleanup"),
          config.lifecycleEnvFile,
          config.allowTestScript,
        );
        assert(verifyAfter.code === 0, "trial_cleanup_verify_failed");
        cleanupComplete = true;
      } catch (cleanupError) {
        primaryError = primaryError
          ? new Error(`${safeErrorCode(primaryError)}:cleanup:${safeErrorCode(cleanupError)}`)
          : cleanupError;
      }
    }
    if (loggedIn) {
      try {
        const logout = await client.requestJson("/api/admin/session", { method: "DELETE" });
        assert(logout.response.ok, `logout_failed:${logout.response.status}`);
        assert(client.jar.size === 0, "logout_cookie_not_cleared");
        const afterLogout = await client.requestJson("/api/admin/session");
        assert(afterLogout.response.status === 401, "session_survived_logout");
      } catch (logoutError) {
        if (!primaryError) primaryError = logoutError;
      }
    }
  }
  if (primaryError) throw primaryError;
  assert(cleanupComplete, "trial_cleanup_not_completed");
  emit("staging_mutation_e2e_completed", { cleanupVerified: true, logoutChecked: true });
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    emit("staging_mutation_e2e_failed", { error: safeErrorCode(error) });
    process.exitCode = 1;
  });
}
