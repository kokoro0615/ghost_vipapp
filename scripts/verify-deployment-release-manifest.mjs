#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const SHA = /^[a-f0-9]{40}$/u;
const TREE = /^[a-f0-9]{40}$/u;
const DEPLOYMENT = /^dpl_[A-Za-z0-9]+$/u;
const SAFE_ORIGIN = /^https:\/\/[a-z0-9.-]+$/u;

function readArgument(name) {
  const index = process.argv.indexOf(name);
  assert(index >= 0 && process.argv[index + 1], `missing ${name}`);
  return path.resolve(process.argv[index + 1]);
}

async function readMode600Json(filePath) {
  const fileStat = await stat(filePath);
  assert(fileStat.isFile(), "manifest_not_file");
  assert((fileStat.mode & 0o777) === 0o600, "manifest_must_be_mode_600");
  const source = await readFile(filePath, "utf8");
  const parsed = JSON.parse(source);
  assertNoSecretValues(parsed);
  return parsed;
}

function assertNoSecretValues(value) {
  if (Array.isArray(value)) {
    for (const item of value) assertNoSecretValues(item);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (
      /^(?:password|pin|token|secret|cookie|authorization|credentialValue)$/iu.test(key)
      && typeof child !== "boolean"
      && child !== null
    ) {
      assert.fail("secret-bearing key forbidden");
    }
    assertNoSecretValues(child);
  }
}

function assertArtifact(artifact, name) {
  assert.match(artifact?.sha ?? "", SHA, `${name}_sha_invalid`);
  assert.match(artifact?.tree ?? "", TREE, `${name}_tree_invalid`);
  assert.match(artifact?.deployment ?? "", DEPLOYMENT, `${name}_deployment_invalid`);
  assert.equal(artifact?.ready, true, `${name}_not_ready`);
  assert.match(artifact?.rollbackDeployment ?? "", DEPLOYMENT, `${name}_rollback_invalid`);
  assert.equal(artifact?.rollbackReady, true, `${name}_rollback_not_ready`);
  assert.equal(artifact?.rollbackAuthenticated, true, `${name}_rollback_not_authenticated`);
}

async function main() {
  const manifest = await readMode600Json(readArgument("--manifest"));
  assert.equal(manifest.schemaVersion, "ghost-vip-production-deployment-release.v1");
  assertArtifact(manifest.website, "website");
  assertArtifact(manifest.vip, "vip");
  assert.match(manifest.vip.productionOrigin ?? "", SAFE_ORIGIN);
  assert.equal(manifest.vip.productionOrigin, "https://ghost-ruby-one.vercel.app");
  assert.equal(manifest.vip.trialMode, false);
  assert.equal(manifest.vip.backendProtectionBypassPresent, false);
  assert.equal(manifest.vip.stagingOriginPresent, false);
  assert.equal(manifest.vip.permanentBasicRotated, true);
  assert.equal(manifest.vip.permanentOwnerPinRotated, true);
  assert.equal(manifest.vip.trialCueCount, 0);
  assert.deepEqual(manifest.website.flags, {
    FEATURE_VIP_FLOOR_V2_READ_ENABLED: true,
    FEATURE_ADMIN_MUTATION_ENABLED: false,
    FEATURE_VIP_FLOOR_V2_MUTATION_ENABLED: false,
    FEATURE_VIP_FLOOR_DUAL_WRITE_ENABLED: false,
    FEATURE_VIP_FLOOR_V2_SHADOW_COMPARE_ENABLED: false,
    FEATURE_VIP_CUSTOMER_PROFILE_WRITE_ENABLED: false,
  });
  for (const name of [
    "unauth401",
    "basic",
    "pin",
    "session",
    "todayBoard",
    "alternateDate",
    "search",
    "list",
    "floor",
    "chart",
    "logout",
    "mutationZero",
    "trialCueZero",
    "activeOfficialSeatsExact8",
    "server5xxZero",
  ]) {
    assert.equal(manifest.aliaslessSmoke?.[name], true, `smoke_${name}_not_passed`);
  }
  assert.equal(manifest.providerDelivery, 0);
  assert.equal(manifest.realCustomerMutation, 0);
  assert.equal(manifest.ipadSafariWitness?.status, "pass");
  assert.equal(manifest.ownerApprovals?.websitePromotion, true);
  assert.equal(manifest.ownerApprovals?.vipPromotion, true);
  assert.equal(manifest.ownerApprovals?.mutationWave, true);
  console.log(JSON.stringify({ ok: true, schemaVersion: manifest.schemaVersion }));
}

await main();
