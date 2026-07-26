import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { runNodeScript } from "../helpers/script-runner.mjs";

const fingerprint = (origin) => createHash("sha256").update(origin).digest("hex");

async function makeFiles(t, {
  runId = "trial-rc-20260727-contract0001",
  origin = "https://ghost-vipapp.vercel.app",
  host = "ghost-vipapp.vercel.app",
  backendOrigin = "https://vip-manager-staging.example.test",
  backendHost = "vip-manager-staging.example.test",
} = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), "ghost-vip-release-e2e-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const envPath = path.join(directory, "release.env");
  const manifestPath = path.join(directory, "release-manifest.json");
  const lifecycleEnvPath = path.join(directory, "website-lifecycle.env");
  const script = (name) => path.join(directory, name);
  const lifecycleScripts = {
    seedScript: script("seed-vip-manager-release-candidate.mjs"),
    expireSessionsScript: script("expire-vip-manager-release-candidate-sessions.mjs"),
    cleanupScript: script("cleanup-vip-manager-trial.mjs"),
    verifyScript: script("verify-vip-manager-release-candidate.mjs"),
  };
  const scriptSource = "#!/usr/bin/env node\nprocess.exit(0);\n";
  for (const scriptPath of Object.values(lifecycleScripts)) {
    await writeFile(scriptPath, scriptSource);
  }
  await writeFile(envPath, [
    "VIPAPP_BASIC_USER=user",
    "VIPAPP_BASIC_PASSWORD=password",
    "VIPAPP_OWNER_PIN=123456",
    "GHOST_VIPAPP_PROTECTION_BYPASS=bypass-secret",
    "GHOST_VIPAPP_ALLOW_STAGING_MUTATION=E2E削除可",
    `GHOST_VIPAPP_RELEASE_VIP_HOST=${host}`,
    `GHOST_VIPAPP_RELEASE_BACKEND_HOST=${backendHost}`,
    "",
  ].join("\n"));
  await writeFile(
    lifecycleEnvPath,
    "SUPABASE_SERVICE_ROLE_KEY=not-emitted\nGHOST_VIP_RELEASE_CANDIDATE_PIN=123456\n",
  );
  await writeFile(manifestPath, JSON.stringify({
    trialRunId: runId,
    businessDate: "2026-07-27",
    alternateBusinessDate: "2026-07-28",
    vip: { origin, host, fingerprint: fingerprint(origin) },
    backend: {
      origin: backendOrigin,
      host: backendHost,
      fingerprint: fingerprint(backendOrigin),
    },
    ...lifecycleScripts,
    lifecycleScriptSha256: Object.fromEntries(
      Object.keys(lifecycleScripts).map((key) => [key, fingerprint(scriptSource)]),
    ),
    websiteLifecycleEnvFile: lifecycleEnvPath,
  }));
  await chmod(envPath, 0o600);
  await chmod(manifestPath, 0o600);
  await chmod(lifecycleEnvPath, 0o600);
  return { envPath, manifestPath };
}

function testEnv(files) {
  return {
    GHOST_VIPAPP_E2E_ENV_FILE: files.envPath,
    GHOST_VIPAPP_RELEASE_MANIFEST_PATH: files.manifestPath,
  };
}

test("release regression harness rejects the production fixed URL before network", async (t) => {
  const files = await makeFiles(t);
  const result = await runNodeScript("scripts/staging-release-regression.mjs", testEnv(files));
  assert.equal(result.code, 1);
  assert.match(result.stdout, /production_vip_origin_rejected/u);
  assert.doesNotMatch(`${result.stdout}${result.stderr}`, /123456|password|bypass-secret/u);
});

test("release regression harness requires a fresh release-candidate lineage", async (t) => {
  const files = await makeFiles(t, { runId: "trial-20260727-not-release-candidate" });
  const result = await runNodeScript("scripts/staging-release-regression.mjs", testEnv(files));
  assert.equal(result.code, 1);
  assert.match(result.stdout, /release_candidate_run_id_invalid/u);
});

test("release regression harness pins exact hosts, PIN source and lifecycle script hashes", async (t) => {
  const files = await makeFiles(t, {
    origin: "http://localhost",
    host: "localhost",
    backendOrigin: "http://localhost",
    backendHost: "localhost",
  });
  const manifest = JSON.parse(await readFile(files.manifestPath, "utf8"));
  manifest.lifecycleScriptSha256.cleanupScript = "0".repeat(64);
  await writeFile(files.manifestPath, JSON.stringify(manifest));
  const result = await runNodeScript("scripts/staging-release-regression.mjs", {
    ...testEnv(files),
    GHOST_VIPAPP_STAGING_ALLOW_INSECURE_LOCALHOST: "1",
    GHOST_VIPAPP_E2E_TEST_ALLOW_LOCAL_SCRIPTS: "1",
  });
  assert.equal(result.code, 1);
  assert.match(result.stdout, /lifecycle_script_fingerprint_mismatch/u);
  assert.doesNotMatch(`${result.stdout}${result.stderr}`, /123456|password|bypass-secret/u);
});

test("release regression source covers required business and cleanup boundaries", async () => {
  const source = await readFile(
    new URL("../../scripts/staging-release-regression.mjs", import.meta.url),
    "utf8",
  );
  for (const marker of [
    "expire-vip-manager-release-candidate-sessions.mjs",
    "seed-vip-manager-release-candidate.mjs",
    "verify-vip-manager-release-candidate.mjs",
    "cleanup-vip-manager-trial.mjs",
    "GHOST_VIPAPP_RELEASE_VIP_HOST",
    "GHOST_VIPAPP_RELEASE_BACKEND_HOST",
    "/api/admin/vip-floor/options",
    "/api/admin/vip-floor/operations",
    "/api/admin/vip-floor/commands",
    "/api/admin/vip-floor/waitlist",
    "/api/admin/vip-floor/staff",
    "/api/admin/vip-floor/observability",
    "release_candidate_pin_sources_mismatch",
    "lifecycle_script_fingerprint_mismatch",
    "safeCommandFailureCode",
    "assertUiOperationSucceeded",
    "ui_created_public_code_missing",
    "ui_reservation_plan_missing",
    "ui_create_list_navigation_failed",
    "serverless metric writes quiesce",
    "reservation.created",
    "release-candidate@example.com",
    "release-candidate-ui@example.com",
    "reservation.updated",
    "reservation.checked_in",
    "reservation.arrival_time.updated",
    "reservation.service_status.updated",
    "reservation.assignments.changed",
    "reservation.seat_extended",
    "reservation_note.upserted",
    "walk_in.created",
    "waitlist.created",
    "waitlist.called",
    "waitlist.seated",
    "reservation_block.created",
    "reservation_block.updated",
    "reservation_block.cancelled",
    "staff_member.created",
    "table_staff_assignment.set",
    "customer_profile.upserted",
    "customer_profile.attributes_updated",
    "reservation.customer_relinked",
    "realtime_gap",
    "realtime_unavailable",
    "stale_version_conflict_not_409",
    "board_table_count_not_eight",
    "baselineRestored",
    "providerDelivery: 0",
    "context.setOffline(true)",
    "8段階予約",
    "RC UI Guest Edited",
    "ui_status_filter_failed",
    "ui_staff_filter_member_failed",
    "List",
    "Floor",
    "Chart",
    "メニュー",
  ]) {
    assert(source.includes(marker), `release regression marker missing: ${marker}`);
  }
  assert(
    source.indexOf('"reservation.checked_in"')
      < source.indexOf('"reservation.arrival_time.updated"'),
    "arrival-time correction must run after check-in establishes arrived_at",
  );
  assert(
    source.indexOf('"waitlist.seated"')
      < source.indexOf('"reservation.checked_in"'),
    "waitlist seating must bind the reservation while it is still confirmed",
  );
});
