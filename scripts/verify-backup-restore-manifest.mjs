#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const SHA256 = /^[a-f0-9]{64}$/u;
const PRODUCTION_ALLOWLIST = new Set([
  "20260714090000", "20260714090500", "20260714091500", "20260714093000",
  "20260714094500", "20260714095000", "20260714100000", "20260714103000",
  "20260714110000", "20260714120000", "20260714120500", "20260714121000",
  "20260726150000", "20260726160000", "20260726161000", "20260726161500",
  "20260726170000", "20260726171000", "20260726172000", "20260726173000",
  "20260726174000", "20260726174100", "20260726174200", "20260726175000",
  "20260726205147",
]);
const FORBIDDEN = new Set(["20260726180000", "20260726181000"]);

function readArgument(name) {
  const index = process.argv.indexOf(name);
  assert(index >= 0 && process.argv[index + 1], `missing ${name}`);
  return path.resolve(process.argv[index + 1]);
}

async function readMode600Json(filePath) {
  const fileStat = await stat(filePath);
  assert(fileStat.isFile(), "manifest_not_file");
  assert((fileStat.mode & 0o777) === 0o600, "manifest_must_be_mode_600");
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function migrationManifest() {
  const websiteRoot = readArgument("--website-root");
  const directory = path.join(websiteRoot, "supabase", "migrations");
  const files = (await readdir(directory))
    .filter((file) => file.endsWith(".sql"))
    .map((file) => ({ file, version: file.slice(0, 14) }))
    .filter(({ version }) => PRODUCTION_ALLOWLIST.has(version))
    .sort((left, right) => left.file.localeCompare(right.file));
  assert.equal(files.length, 25, "production migration allowlist must contain exact 25 files");
  assert.deepEqual(
    new Set(files.map(({ version }) => version)),
    PRODUCTION_ALLOWLIST,
    "production migration version drift",
  );
  assert.equal(files.some(({ version }) => FORBIDDEN.has(version)), false, "trial migration entered allowlist");
  return Promise.all(files.map(async ({ file, version }) => ({
    version,
    file,
    sha256: createHash("sha256")
      .update(await readFile(path.join(directory, file)))
      .digest("hex"),
  })));
}

function assertBooleanChecks(checks, names, prefix) {
  assert(checks && typeof checks === "object" && !Array.isArray(checks), `${prefix}_checks_missing`);
  for (const name of names) assert.equal(checks[name], true, `${prefix}_${name}_not_passed`);
}

async function main() {
  const manifest = await readMode600Json(readArgument("--manifest"));
  assert.equal(manifest.schemaVersion, "ghost-vip-production-backup-restore.v1");
  assert.equal(manifest.productionProjectRef, "cpfsrwctjymhmwvsbwdi");
  assert.equal(manifest.pitrEnabled, false, "PITR posture must be explicit");
  assert.equal(manifest.dump?.encrypted, true);
  assert.equal(manifest.dump?.repositoryExternal, true);
  assert.equal(manifest.dump?.mode, "0600");
  assert.match(manifest.dump?.sha256 ?? "", SHA256);
  assert.equal(manifest.restore?.isolated, true);
  assert.equal(manifest.restore?.status, "pass");
  assert.match(manifest.restore?.evidenceSha256 ?? "", SHA256);
  assertBooleanChecks(
    manifest.restore?.checks,
    [
      "schema",
      "roles",
      "criticalRpcs",
      "rowCounts",
      "hashes",
      "foreignKeys",
      "rls",
      "migrationHistory",
      "storageObjectBodiesExcluded",
    ],
    "restore",
  );
  assert.deepEqual(manifest.migrations, await migrationManifest(), "migration allowlist/checksum drift");
  assertBooleanChecks(
    manifest.postMigrationChecks,
    [
      "activeOfficialSeatsExact8",
      "trialSeatsZero",
      "trialSectionsZero",
      "inactiveHistoryPreserved",
      "inactiveReservationReferencesPreserved",
      "inactiveOfferingReferencesPreserved",
      "orphansZero",
      "foreignKeysValidated",
      "rlsAllPublicTables",
      "criticalRpcs",
      "providerSentDeltaZero",
      "apiContract",
      "publicBookingRegression",
    ],
    "post_migration",
  );
  console.log(JSON.stringify({
    ok: true,
    schemaVersion: manifest.schemaVersion,
    migrationCount: manifest.migrations.length,
    forbiddenTrialMigrations: 0,
  }));
}

await main();
