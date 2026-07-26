import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { runNodeScript } from "../helpers/script-runner.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sha40 = "a".repeat(40);
const tree40 = "b".repeat(40);

async function writeMode600(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
  await chmod(filePath, 0o600);
}

test("backup/restore Gate binds exact 24 migration checksums and restore evidence", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "ghost-backup-gate-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const websiteRoot = path.join(directory, "website");
  const migrationsDir = path.join(websiteRoot, "supabase", "migrations");
  await mkdir(migrationsDir, { recursive: true });
  const versions = [
    "20260714090000", "20260714090500", "20260714091500", "20260714093000",
    "20260714094500", "20260714095000", "20260714100000", "20260714103000",
    "20260714110000", "20260714120000", "20260714120500", "20260714121000",
    "20260726150000", "20260726160000", "20260726161000", "20260726161500",
    "20260726170000", "20260726171000", "20260726172000", "20260726173000",
    "20260726174000", "20260726174100", "20260726174200", "20260726175000",
  ];
  const migrations = [];
  for (const version of versions) {
    const file = `${version}_fixture.sql`;
    const source = `-- ${version}\nSELECT 1;\n`;
    await writeFile(path.join(migrationsDir, file), source);
    migrations.push({ version, file, sha256: sha256(source) });
  }
  const manifestPath = path.join(directory, "backup.json");
  await writeMode600(manifestPath, {
    schemaVersion: "ghost-vip-production-backup-restore.v1",
    productionProjectRef: "cpfsrwctjymhmwvsbwdi",
    pitrEnabled: false,
    dump: { encrypted: true, repositoryExternal: true, mode: "0600", sha256: "c".repeat(64) },
    restore: {
      isolated: true,
      status: "pass",
      evidenceSha256: "d".repeat(64),
      checks: {
        schema: true, roles: true, criticalRpcs: true, rowCounts: true,
        hashes: true, foreignKeys: true, rls: true,
      },
    },
    migrations,
    postMigrationChecks: {
      activeOfficialSeatsExact8: true,
      trialSeatsZero: true,
      trialSectionsZero: true,
      inactiveHistoryPreserved: true,
      orphansZero: true,
      apiContract: true,
      publicBookingRegression: true,
    },
  });
  const pass = await runNodeScript(
    "scripts/verify-backup-restore-manifest.mjs",
    {},
    ["--manifest", manifestPath, "--website-root", websiteRoot],
  );
  assert.equal(pass.code, 0, pass.stderr);
  assert.match(pass.stdout, /"migrationCount":24/u);
  await writeFile(path.join(migrationsDir, migrations[0].file), "-- checksum drift\nSELECT 2;\n");
  const reject = await runNodeScript(
    "scripts/verify-backup-restore-manifest.mjs",
    {},
    ["--manifest", manifestPath, "--website-root", websiteRoot],
  );
  assert.equal(reject.code, 1);
  assert.match(reject.stderr, /migration allowlist\/checksum drift/u);
});

test("deployment Gate requires permanent credentials, production origin, smoke and human witness", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "ghost-deploy-gate-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const manifestPath = path.join(directory, "deployment.json");
  const artifact = {
    sha: sha40,
    tree: tree40,
    deployment: "dpl_ReadyCandidate",
    ready: true,
    rollbackDeployment: "dpl_ReadyRollback",
    rollbackReady: true,
    rollbackAuthenticated: true,
  };
  await writeMode600(manifestPath, {
    schemaVersion: "ghost-vip-production-deployment-release.v1",
    website: { ...artifact },
    vip: {
      ...artifact,
      productionOrigin: "https://ghost-ruby-one.vercel.app",
      trialMode: false,
      backendProtectionBypassPresent: false,
      stagingOriginPresent: false,
      permanentBasicRotated: true,
      permanentOwnerPinRotated: true,
      trialCueCount: 0,
    },
    website: {
      ...artifact,
      flags: {
        FEATURE_VIP_FLOOR_V2_READ_ENABLED: true,
        FEATURE_ADMIN_MUTATION_ENABLED: false,
        FEATURE_VIP_FLOOR_V2_MUTATION_ENABLED: false,
        FEATURE_VIP_FLOOR_DUAL_WRITE_ENABLED: false,
        FEATURE_VIP_FLOOR_V2_SHADOW_COMPARE_ENABLED: false,
        FEATURE_VIP_CUSTOMER_PROFILE_WRITE_ENABLED: false,
      },
    },
    aliaslessSmoke: Object.fromEntries([
      "unauth401", "basic", "pin", "session", "todayBoard", "alternateDate",
      "search", "list", "floor", "chart", "logout", "mutationZero",
      "trialCueZero", "activeOfficialSeatsExact8", "server5xxZero",
    ].map((name) => [name, true])),
    providerDelivery: 0,
    realCustomerMutation: 0,
    ipadSafariWitness: { status: "pass" },
    ownerApprovals: { websitePromotion: true, vipPromotion: true, mutationWave: true },
  });
  const pass = await runNodeScript(
    "scripts/verify-deployment-release-manifest.mjs",
    {},
    ["--manifest", manifestPath],
  );
  assert.equal(pass.code, 0, pass.stderr);
  const unsafe = JSON.parse(await readFile(manifestPath, "utf8"));
  unsafe.vip.secret = "must-not-appear";
  await writeMode600(manifestPath, unsafe);
  const reject = await runNodeScript(
    "scripts/verify-deployment-release-manifest.mjs",
    {},
    ["--manifest", manifestPath],
  );
  assert.equal(reject.code, 1);
  assert.match(reject.stderr, /secret-bearing key forbidden/u);
});
