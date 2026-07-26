#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const SHA256 = /^[a-f0-9]{64}$/u;
const ALLOWED_START = "20260714090000";
const ALLOWED_END = "20260726175000";
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
    .filter(({ version }) => version >= ALLOWED_START && version <= ALLOWED_END)
    .sort((left, right) => left.file.localeCompare(right.file));
  assert.equal(files.length, 24, "production migration allowlist must contain exact 24 files");
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
    ["schema", "roles", "criticalRpcs", "rowCounts", "hashes", "foreignKeys", "rls"],
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
      "orphansZero",
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
