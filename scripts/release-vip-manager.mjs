#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import {
  attestDeploymentSource,
  getVercelDeployment,
  materializeCommitUploadRoot,
  readDeploymentAttestation,
  readVercelToken,
  resolveProductionDeploymentId,
  restoreDeploymentSource,
  vercelApi,
} from "./lib/production-source-attestation.mjs";

export const RELEASE_CONFIG = Object.freeze({
  projectId: "prj_mchunQTOAeQMkn86A1zCtMapdVqp",
  teamId: "team_VHoP9car1gK30q4ideCMW0g5",
  projectName: "ghost-vipapp",
  releaseBranch: "codex/vip-manager-production-light-ui-20260727",
  scope: "projects-b6224582",
  productionHostname: "ghost-vipapp.vercel.app",
  backendOrigin: "https://ghost-ruby-one.vercel.app",
  websiteProjectId: "prj_ve4VBLGc7Ao5xqvepbEa06X7n8wM",
  websiteReleaseBranch: "codex/vip-manager-production-backend-20260727",
  websiteProductionHostname: "ghost-ruby-one.vercel.app",
  websiteCompatibilityContract: "ticket-wallet-inert-v1",
  promotionLeaseKey: "GHOST_RELEASE_PROMOTION_LOCK",
  bootstrapBaselineCommit: "17a900051edfb892ddb4a22f7eb3da3ed5e41565",
});

const PROMOTION_LEASE_TTL_MS = 4 * 60 * 60 * 1000;
const VERCEL_API_ORIGIN = "https://api.vercel.com";
const WEBSITE_READINESS_PATH = "/api/internal/ticket-wallet/activation-readiness";
const WEBSITE_INERT_CAPABILITIES = Object.freeze({
  walletRead: false,
  otpDelivery: false,
  transactionalEmailDrain: false,
  swipePrepare: false,
  swipeCommit: false,
  managerOperations: false,
  refundReview: true,
  providerWebhook: false,
});
const BASE_CHILD_ENV_KEYS = Object.freeze([
  "PATH", "HOME", "TMPDIR", "TEMP", "TMP", "LANG", "LC_ALL", "LC_CTYPE", "TERM", "CI",
  "FORCE_COLOR", "NO_COLOR",
]);

function baseChildEnvironment(source = process.env) {
  const output = {};
  for (const key of BASE_CHILD_ENV_KEYS) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0 && value.length <= 4096) output[key] = value;
  }
  return output;
}

function copyAbsoluteChildPath(output, source, key) {
  const value = source[key]?.trim();
  if (!value) return;
  if (!path.isAbsolute(value) || value.includes("\0")) {
    throw new Error(`release_child_env_invalid:${key}`);
  }
  output[key] = value;
}

function copyChildPort(output, source, key) {
  const value = source[key]?.trim();
  if (!value) return;
  const port = Number(value);
  if (!/^\d{1,5}$/u.test(value) || !Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`release_child_env_invalid:${key}`);
  }
  output[key] = value;
}

function vipCiEnvironment(source = process.env) {
  const output = baseChildEnvironment(source);
  for (const key of [
    "GHOST_VIP_WEBKIT_EXECUTABLE",
    "CHROME_PATH",
    "GHOST_VIP_QA_ARTIFACT_DIR",
    "GHOST_VIPAPP_E2E_ENV_FILE",
  ]) copyAbsoluteChildPath(output, source, key);
  for (const key of ["A11Y_PORT", "MAINTENANCE_QA_PORT"]) copyChildPort(output, source, key);
  return output;
}

function vipVercelEnvironment(source = process.env) {
  return {
    ...baseChildEnvironment(source),
    VERCEL_ORG_ID: RELEASE_CONFIG.teamId,
    VERCEL_PROJECT_ID: RELEASE_CONFIG.projectId,
  };
}

function defaultGit(repoRoot, args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 1 << 28,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function defaultRun(command, args, { cwd, env, capture = false } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: capture ? "utf8" : undefined,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (result.status !== 0) {
    if (capture && result.stderr) process.stderr.write(result.stderr);
    throw new Error(`${command}_failed:${result.status}`);
  }
  return {
    stdout: capture ? result.stdout.trim() : "",
    stderr: capture ? result.stderr.trim() : "",
  };
}

async function defaultMutateVercelProject(pathname, auth, { method, body } = {}) {
  const url = new URL(pathname, VERCEL_API_ORIGIN);
  if (auth.teamId) url.searchParams.set("teamId", auth.teamId);
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${auth.token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(120_000),
  });
  const raw = await response.text();
  let value = null;
  if (raw) {
    try {
      value = JSON.parse(raw);
    } catch {
      throw new Error(`vercel_mutation_response_invalid:${response.status}`);
    }
  }
  return Object.freeze({ ok: response.ok, status: response.status, value });
}

function defaultPromotionLeaseOwner() {
  return `v1.${randomBytes(18).toString("base64url")}.${Date.now() + PROMOTION_LEASE_TTL_MS}`;
}

async function defaultReadWebsiteReadiness() {
  const secret = process.env.GHOST_WEBSITE_WORKER_RUN_SECRET?.trim() ?? "";
  if (secret.length < 32 || secret.length > 4096 || /[\r\n\0]/u.test(secret)) {
    throw new Error("website_readiness_secret_missing_or_invalid");
  }
  const response = await fetch(new URL(WEBSITE_READINESS_PATH, RELEASE_CONFIG.backendOrigin), {
    method: "GET",
    redirect: "error",
    cache: "no-store",
    headers: { accept: "application/json", authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status !== 200) throw new Error(`website_readiness_http_${response.status}`);
  const cacheControl = response.headers.get("cache-control") ?? "";
  if (!/(?:^|,)\s*(?:private\s*,\s*)?(?:no-cache\s*,\s*)?no-store(?:\s*,|$)/iu.test(cacheControl)) {
    throw new Error("website_readiness_cache_invalid");
  }
  const raw = await response.text();
  if (Buffer.byteLength(raw, "utf8") > 16_384) throw new Error("website_readiness_body_too_large");
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("website_readiness_body_invalid");
  }
}

export function createProductionRuntime() {
  const runtime = {
    git: defaultGit,
    readJson(filePath) {
      return JSON.parse(readFileSync(filePath, "utf8"));
    },
    readVercelToken,
    vercelApi,
    materializeCommitUploadRoot,
    attestDeploymentSource,
    getVercelDeployment,
    resolveProductionDeploymentId,
    restoreDeploymentSource,
    mutateVercelProject: defaultMutateVercelProject,
    createPromotionLeaseOwner: defaultPromotionLeaseOwner,
    now: Date.now,
    readWebsiteReadiness: defaultReadWebsiteReadiness,
    run: defaultRun,
  };
  runtime.readWebsiteCompatibilityProof = (options) => readCanonicalWebsiteCompatibility(options, runtime);
  runtime.acquirePromotionLease = (options) => acquirePromotionLease(options, runtime);
  runtime.releasePromotionLease = (options) => releasePromotionLease(options, runtime);
  return runtime;
}

function targetsProduction(row) {
  return Array.isArray(row?.target)
    ? row.target.includes("production")
    : row?.target === "production";
}

function isUnscopedProductionRecord(row) {
  return targetsProduction(row)
    && (row?.gitBranch === null || row?.gitBranch === undefined)
    && (!Array.isArray(row?.customEnvironmentIds) || row.customEnvironmentIds.length === 0);
}

function productionBackendEnvironmentRows(value) {
  const rows = value?.envs;
  if (!Array.isArray(rows)) throw new Error("vercel_environment_inventory_invalid");
  const originRows = rows.filter(
    (row) => row?.key === "GHOST_ADMIN_API_ORIGIN" && isUnscopedProductionRecord(row),
  );
  if (originRows.length !== 1) throw new Error("production_backend_origin_mismatch");
  const bypassRows = rows.filter(
    (row) => row?.key === "GHOST_BACKEND_PROTECTION_BYPASS" && isUnscopedProductionRecord(row),
  );
  const trialRows = rows.filter(
    (row) => row?.key === "GHOST_VIP_TRIAL_MODE" && isUnscopedProductionRecord(row),
  );
  return { originRows, bypassRows, trialRows };
}

async function readExactProductionEnvironment(row, auth, runtime) {
  if (
    typeof row?.id !== "string"
    || !/^(?:env_[A-Za-z0-9]{1,64}|[A-Za-z0-9]{16,64})$/u.test(row.id)
  ) {
    throw new Error(`production_environment_id_invalid:${row?.key ?? "missing"}`);
  }
  const exact = await runtime.vercelApi(
    `/v9/projects/${encodeURIComponent(RELEASE_CONFIG.projectId)}/env/${encodeURIComponent(row.id)}?decrypt=true`,
    auth,
  );
  if (
    exact?.id !== row.id
    || exact?.key !== row.key
    || !isUnscopedProductionRecord(exact)
  ) {
    throw new Error(`production_environment_readback_mismatch:${row.key}`);
  }
  return exact;
}

async function assertProductionBackendEnvironment(value, auth, runtime) {
  const { originRows, bypassRows, trialRows } = productionBackendEnvironmentRows(value);
  const origin = await readExactProductionEnvironment(originRows[0], auth, runtime);
  if (origin.value !== RELEASE_CONFIG.backendOrigin) {
    throw new Error("production_backend_origin_mismatch");
  }
  for (const row of bypassRows) {
    const exact = await readExactProductionEnvironment(row, auth, runtime);
    if (typeof exact.value === "string" && exact.value.length > 0) {
      throw new Error("production_backend_canary_bypass_present");
    }
  }
  for (const row of trialRows) {
    const exact = await readExactProductionEnvironment(row, auth, runtime);
    if (exact.value === "true") throw new Error("production_trial_mode_enabled");
  }
}

export async function assertReleasePreflight(
  { repoRoot = process.cwd() } = {},
  runtime = createProductionRuntime(),
) {
  const localProject = runtime.readJson(path.join(repoRoot, ".vercel", "project.json"));
  if (
    localProject?.projectId !== RELEASE_CONFIG.projectId
    || localProject?.orgId !== RELEASE_CONFIG.teamId
    || localProject?.projectName !== RELEASE_CONFIG.projectName
  ) {
    throw new Error("local_vercel_project_identity_mismatch");
  }

  const branch = runtime.git(repoRoot, ["branch", "--show-current"]);
  if (branch !== RELEASE_CONFIG.releaseBranch) {
    throw new Error(`release_branch_mismatch:${branch}`);
  }
  if (runtime.git(repoRoot, ["status", "--porcelain=v1", "--untracked-files=all"])) {
    throw new Error("release_requires_clean_git");
  }
  const remoteRef = `origin/${RELEASE_CONFIG.releaseBranch}`;
  const upstream = runtime.git(repoRoot, [
    "rev-parse",
    "--abbrev-ref",
    "--symbolic-full-name",
    "@{upstream}",
  ]);
  if (upstream !== remoteRef) throw new Error(`release_upstream_mismatch:${upstream}`);
  if (runtime.git(repoRoot, ["rev-list", "--left-right", "--count", "HEAD...@{upstream}"]) !== "0\t0") {
    throw new Error("release_source_not_pushed_exactly");
  }
  const commit = runtime.git(repoRoot, ["rev-parse", "HEAD"]);
  if (!/^[0-9a-f]{40}$/u.test(commit)) throw new Error("release_commit_sha_invalid");
  const remoteLine = runtime.git(repoRoot, [
    "ls-remote",
    "--exit-code",
    "--heads",
    "origin",
    `refs/heads/${RELEASE_CONFIG.releaseBranch}`,
  ]);
  if (remoteLine !== `${commit}\trefs/heads/${RELEASE_CONFIG.releaseBranch}`) {
    throw new Error("release_remote_ref_mismatch");
  }

  const token = await runtime.readVercelToken();
  const auth = { token, teamId: RELEASE_CONFIG.teamId };
  const project = await runtime.vercelApi(
    `/v9/projects/${encodeURIComponent(RELEASE_CONFIG.projectId)}`,
    auth,
  );
  if (
    project?.id !== RELEASE_CONFIG.projectId
    || project?.accountId !== RELEASE_CONFIG.teamId
    || project?.name !== RELEASE_CONFIG.projectName
  ) {
    throw new Error("remote_vercel_project_identity_mismatch");
  }
  if (project.link) throw new Error("vercel_git_writer_still_enabled");
  const environment = await runtime.vercelApi(
    `/v10/projects/${encodeURIComponent(RELEASE_CONFIG.projectId)}/env`,
    auth,
  );
  await assertProductionBackendEnvironment(environment, auth, runtime);

  return {
    branch,
    remoteRef,
    commit,
    backendOrigin: RELEASE_CONFIG.backendOrigin,
    auth,
  };
}

function isUnscopedProductionLease(row) {
  const targets = Array.isArray(row?.target) ? row.target : [row?.target];
  return targets.length === 1
    && targets[0] === "production"
    && (row?.gitBranch === null || row?.gitBranch === undefined)
    && (!Array.isArray(row?.customEnvironmentIds) || row.customEnvironmentIds.length === 0);
}

async function readPromotionLeaseRows(auth, runtime) {
  const inventory = await runtime.vercelApi(
    `/v10/projects/${encodeURIComponent(RELEASE_CONFIG.projectId)}/env`,
    auth,
  );
  if (!Array.isArray(inventory?.envs)) throw new Error("promotion_lease_inventory_invalid");
  return inventory.envs.filter((row) => row?.key === RELEASE_CONFIG.promotionLeaseKey);
}

function assertPromotionLeaseRecord(rows, lease) {
  const owned = rows.filter((row) => row?.id === lease.id);
  if (
    owned.length !== 1
    || owned[0]?.key !== RELEASE_CONFIG.promotionLeaseKey
    || !isUnscopedProductionLease(owned[0])
  ) {
    throw new Error("promotion_lease_inventory_mismatch");
  }
  return owned[0];
}

async function readOwnedPromotionLease(auth, lease, runtime) {
  const owned = await runtime.vercelApi(
    `/v9/projects/${encodeURIComponent(RELEASE_CONFIG.projectId)}/env/${encodeURIComponent(lease.id)}?decrypt=true`,
    auth,
  );
  if (
    owned?.id !== lease.id
    || owned?.key !== RELEASE_CONFIG.promotionLeaseKey
    || owned?.value !== lease.owner
    || owned?.type !== "plain"
    || !isUnscopedProductionLease(owned)
  ) {
    throw new Error("promotion_lease_ownership_mismatch");
  }
  return owned;
}

async function deleteOwnedPromotionLease({ lease, auth }, runtime) {
  const before = await readPromotionLeaseRows(auth, runtime);
  assertPromotionLeaseRecord(before, lease);
  await readOwnedPromotionLease(auth, lease, runtime);
  let deletion;
  try {
    deletion = await runtime.mutateVercelProject(
      `/v9/projects/${encodeURIComponent(RELEASE_CONFIG.projectId)}/env/${encodeURIComponent(lease.id)}`,
      auth,
      { method: "DELETE" },
    );
  } catch (error) {
    deletion = { ok: false, status: "transport", error };
  }
  const after = await readPromotionLeaseRows(auth, runtime);
  if (after.some((row) => row?.id === lease.id)) {
    throw new Error(`promotion_lease_cleanup_failed:${deletion?.status ?? "unknown"}`);
  }
  return Object.freeze({
    released: true,
    leaseId: lease.id,
    concurrentWriterDetected: after.length > 0,
  });
}

export async function releasePromotionLease({ lease, auth }, runtime) {
  const rows = await readPromotionLeaseRows(auth, runtime);
  assertPromotionLeaseRecord(rows, lease);
  const released = await deleteOwnedPromotionLease({ lease, auth }, runtime);
  if (rows.length !== 1 || released.concurrentWriterDetected) {
    throw new Error("promotion_concurrent_writer_detected");
  }
  return released;
}

export async function acquirePromotionLease(
  { auth, expectedDeploymentId, candidateDeploymentId },
  runtime,
) {
  // Vercel's promote API has no expected-current/If-Match input. This
  // provider-scoped record is therefore a cooperative exclusive lease for the
  // sole wrapper writer (the preflight separately requires project.link=null),
  // not a claim that the underlying promote endpoint implements CAS.
  const owner = runtime.createPromotionLeaseOwner();
  if (!/^v1\.[A-Za-z0-9_-]{24}\.[0-9]{13}$/u.test(owner) || owner.length > 64) {
    throw new Error("promotion_lease_owner_invalid");
  }
  const response = await runtime.mutateVercelProject(
    `/v10/projects/${encodeURIComponent(RELEASE_CONFIG.projectId)}/env`,
    auth,
    {
      method: "POST",
      body: {
        key: RELEASE_CONFIG.promotionLeaseKey,
        value: owner,
        type: "plain",
        target: ["production"],
        gitBranch: null,
        customEnvironmentIds: [],
        comment: "GHOST release promotion lease; never auto-break stale records",
      },
    },
  );
  if (!response?.ok) {
    if (response?.status === 409) throw new Error("promotion_lease_held");
    throw new Error(`promotion_lease_acquire_uncertain:${response?.status ?? "transport"}`);
  }
  const failed = response.value?.failed;
  const createdValue = response.value?.created;
  const created = Array.isArray(createdValue) ? createdValue : [createdValue].filter(Boolean);
  if (created.length !== 1) {
    throw new Error("promotion_lease_held_or_ambiguous");
  }
  const id = created[0]?.id;
  if (
    typeof id !== "string"
    || !/^(?:env_[A-Za-z0-9]{1,64}|[A-Za-z0-9]{16,64})$/u.test(id)
  ) {
    throw new Error("promotion_lease_id_invalid");
  }
  const lease = Object.freeze({ id, owner, expectedDeploymentId, candidateDeploymentId });
  if (Array.isArray(failed) && failed.length > 0) {
    const partialRows = await readPromotionLeaseRows(auth, runtime);
    assertPromotionLeaseRecord(partialRows, lease);
    await readOwnedPromotionLease(auth, lease, runtime);
    await deleteOwnedPromotionLease({ lease, auth }, runtime);
    throw new Error("promotion_lease_held_or_ambiguous");
  }
  const rows = await readPromotionLeaseRows(auth, runtime);
  assertPromotionLeaseRecord(rows, lease);
  await readOwnedPromotionLease(auth, lease, runtime);
  if (rows.length !== 1) {
    await deleteOwnedPromotionLease({ lease, auth }, runtime);
    throw new Error("promotion_lease_ambiguous");
  }
  return lease;
}

function assertReadyDeploymentIdentity(deployment, expectedId) {
  const deploymentId = deployment?.id ?? deployment?.uid;
  const state = deployment?.readyState ?? deployment?.state;
  if (deploymentId !== expectedId) throw new Error(`deployment_id_mismatch:${deploymentId}`);
  if (deployment?.projectId !== RELEASE_CONFIG.projectId) {
    throw new Error(`deployment_project_mismatch:${deployment?.projectId}`);
  }
  if (deployment?.ownerId !== RELEASE_CONFIG.teamId) {
    throw new Error(`deployment_team_mismatch:${deployment?.ownerId}`);
  }
  if (state !== "READY") throw new Error(`deployment_not_ready:${state}`);
  if (deployment?.target !== "production") {
    throw new Error(`deployment_target_not_production:${deployment?.target}`);
  }
  return deploymentId;
}

function deploymentAliasEntries(deployment) {
  return [deployment?.alias, deployment?.aliases]
    .flat(2)
    .filter((value) => value !== null && value !== undefined);
}

function deploymentAliases(deployment) {
  const values = deploymentAliasEntries(deployment);
  return values.map((value) => {
    if (typeof value === "string") return value.replace(/^https?:\/\//u, "").replace(/\/$/u, "");
    return String(value?.alias ?? value?.domain ?? value?.name ?? "");
  }).filter(Boolean);
}

function deploymentAutomaticAliases(deployment) {
  return [deployment?.automaticAliases]
    .flat(2)
    .filter((value) => value !== null && value !== undefined)
    .map((value) => {
      if (typeof value === "string") return value.replace(/^https?:\/\//u, "").replace(/\/$/u, "");
      return String(value?.alias ?? value?.domain ?? value?.name ?? "");
    })
    .filter(Boolean);
}

function assertStagedCandidate(candidate, errorSuffix = "") {
  if (candidate?.readySubstate !== "STAGED") {
    throw new Error(`candidate_not_staged${errorSuffix}:${candidate?.readySubstate ?? "missing"}`);
  }
  const aliases = [...new Set(deploymentAliases(candidate))].sort();
  const automaticAliases = [...new Set(deploymentAutomaticAliases(candidate))].sort();
  const automaticAliasesAreSafe = automaticAliases.every((hostname) => (
    hostname !== RELEASE_CONFIG.productionHostname
    && /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.vercel\.app$/u.test(hostname)
  ));
  if (
    !automaticAliasesAreSafe
    || aliases.length !== automaticAliases.length
    || aliases.some((hostname, index) => hostname !== automaticAliases[index])
  ) {
    throw new Error(`candidate_is_not_aliasless${errorSuffix}`);
  }
}

function createWebsiteCompatibilityBinding({ deploymentId, commit, ref }) {
  const source = "cli";
  const capabilities = Object.entries(WEBSITE_INERT_CAPABILITIES)
    .map(([name, enabled]) => `${name}=${enabled}`)
    .join(",");
  const digest = createHash("sha256").update([
    "v1",
    RELEASE_CONFIG.websiteProjectId,
    RELEASE_CONFIG.teamId,
    deploymentId,
    commit,
    ref,
    source,
    RELEASE_CONFIG.websiteCompatibilityContract,
    capabilities,
  ].join("\0")).digest("hex");
  return Object.freeze({
    deploymentId,
    commit,
    ref,
    source,
    contract: RELEASE_CONFIG.websiteCompatibilityContract,
    digest,
  });
}

function assertWebsiteDeployment(deployment, expectedId) {
  const deploymentId = deployment?.id ?? deployment?.uid;
  const state = deployment?.readyState ?? deployment?.state;
  const commit = deployment?.meta?.gitCommitSha;
  const ref = deployment?.meta?.gitCommitRef;
  const source = deployment?.source;
  const metadataSource = deployment?.meta?.source;
  if (deploymentId !== expectedId) throw new Error("website_deployment_id_mismatch");
  if (deployment?.projectId !== RELEASE_CONFIG.websiteProjectId) {
    throw new Error("website_deployment_project_mismatch");
  }
  if (deployment?.ownerId !== RELEASE_CONFIG.teamId) throw new Error("website_deployment_team_mismatch");
  if (state !== "READY") throw new Error(`website_deployment_not_ready:${state}`);
  if (deployment?.target !== "production") throw new Error("website_deployment_not_production");
  // The fixed hostname is attested by the exact resolver reads around this
  // deployment check; Vercel may omit custom hostnames from deployment.alias.
  if (!/^[0-9a-f]{40}$/u.test(commit ?? "")) throw new Error("website_commit_missing");
  if (ref !== RELEASE_CONFIG.websiteReleaseBranch) throw new Error("website_ref_mismatch");
  if (source !== "cli" || metadataSource !== "cli") throw new Error("website_source_not_cli");
  return createWebsiteCompatibilityBinding({ deploymentId, commit, ref });
}

function assertWebsiteInertReadiness(readiness, binding, now) {
  const observedAt = Date.parse(readiness?.observedAt ?? "");
  const capabilities = readiness?.capabilities;
  if (
    readiness?.ok !== false
    || readiness?.websiteCommit !== binding.commit
    || readiness?.environment !== "live"
    || readiness?.trialMode !== false
    || !Number.isFinite(observedAt)
    || !Number.isFinite(now)
    || observedAt > now + 60_000
    || now - observedAt > 5 * 60_000
    || capabilities === null
    || typeof capabilities !== "object"
    || Object.keys(capabilities).length !== Object.keys(WEBSITE_INERT_CAPABILITIES).length
    || Object.entries(WEBSITE_INERT_CAPABILITIES).some(([name, expected]) => capabilities[name] !== expected)
  ) throw new Error("website_inert_compatibility_mismatch");
  return Object.freeze({
    ...binding,
    observedAt: readiness.observedAt,
    capabilities: WEBSITE_INERT_CAPABILITIES,
  });
}

export async function readCanonicalWebsiteCompatibility({ auth }, runtime = createProductionRuntime()) {
  const deploymentId = await runtime.resolveProductionDeploymentId(
    RELEASE_CONFIG.websiteProductionHostname,
    auth,
  );
  const deployment = await runtime.getVercelDeployment(deploymentId, auth);
  const binding = assertWebsiteDeployment(deployment, deploymentId);
  const readiness = await runtime.readWebsiteReadiness();
  const proof = assertWebsiteInertReadiness(readiness, binding, runtime.now());
  const deploymentIdAfter = await runtime.resolveProductionDeploymentId(
    RELEASE_CONFIG.websiteProductionHostname,
    auth,
  );
  if (deploymentIdAfter !== deploymentId) throw new Error("website_fixed_alias_drift");
  return proof;
}

function readWebsiteCompatibilityBinding(deployment) {
  const meta = deployment?.meta ?? {};
  const binding = createWebsiteCompatibilityBinding({
    deploymentId: meta.websiteDeploymentId,
    commit: meta.websiteCommitSha,
    ref: meta.websiteCommitRef,
  });
  if (
    !/^dpl_[A-Za-z0-9]+$/u.test(binding.deploymentId ?? "")
    || !/^[0-9a-f]{40}$/u.test(binding.commit ?? "")
    || binding.ref !== RELEASE_CONFIG.websiteReleaseBranch
    || meta.websiteSource !== "cli"
    || meta.websiteCompatibilityContract !== RELEASE_CONFIG.websiteCompatibilityContract
    || meta.websiteCompatibilitySha256 !== binding.digest
  ) throw new Error("candidate_website_compatibility_binding_invalid");
  return binding;
}

async function attestBoundWebsiteCompatibility({ auth, binding }, runtime) {
  const proof = await runtime.readWebsiteCompatibilityProof({ auth });
  if (
    proof?.deploymentId !== binding.deploymentId
    || proof?.commit !== binding.commit
    || proof?.ref !== binding.ref
    || proof?.source !== binding.source
    || proof?.contract !== binding.contract
    || proof?.digest !== binding.digest
  ) throw new Error("website_compatibility_binding_mismatch");
  return proof;
}

function createRollbackBinding({ fixedDeploymentId, rollbackDeploymentId, commit, ref }) {
  const source = "cli";
  const digest = createHash("sha256").update([
    "v1",
    RELEASE_CONFIG.projectId,
    RELEASE_CONFIG.teamId,
    fixedDeploymentId,
    rollbackDeploymentId,
    commit,
    ref,
    source,
  ].join("\0")).digest("hex");
  return Object.freeze({ fixedDeploymentId, rollbackDeploymentId, commit, ref, source, digest });
}

function readRollbackBinding(deployment) {
  const meta = deployment?.meta ?? {};
  const binding = createRollbackBinding({
    fixedDeploymentId: meta.fixedPredecessorDeploymentId,
    rollbackDeploymentId: meta.rollbackDeploymentId,
    commit: meta.rollbackCommitSha,
    ref: meta.rollbackCommitRef,
  });
  if (
    !/^dpl_[A-Za-z0-9]+$/u.test(binding.fixedDeploymentId ?? "")
    || !/^dpl_[A-Za-z0-9]+$/u.test(binding.rollbackDeploymentId ?? "")
    || !/^[0-9a-f]{40}$/u.test(binding.commit ?? "")
    || binding.ref !== RELEASE_CONFIG.releaseBranch
    || meta.rollbackSource !== "cli"
    || meta.rollbackBindingSha256 !== binding.digest
  ) throw new Error("candidate_rollback_binding_invalid");
  return binding;
}

function rollbackExpectedSource(deployment, deploymentId) {
  assertReadyDeploymentIdentity(deployment, deploymentId);
  const commit = deployment?.meta?.gitCommitSha;
  const ref = deployment?.meta?.gitCommitRef;
  const source = deployment?.source ?? deployment?.meta?.source;
  if (typeof commit !== "string" || !/^[0-9a-f]{40}$/u.test(commit)) {
    throw new Error("rollback_git_commit_sha_missing");
  }
  if (ref !== RELEASE_CONFIG.releaseBranch) {
    throw new Error(`rollback_git_commit_ref_mismatch:${ref ?? "missing"}`);
  }
  if (source !== "cli") throw new Error(`rollback_source_not_cli:${source ?? "missing"}`);
  const expected = Object.freeze({
    projectId: RELEASE_CONFIG.projectId,
    teamId: RELEASE_CONFIG.teamId,
    commit,
    ref,
  });
  readDeploymentAttestation(deployment, expected);
  return expected;
}

async function attestRollback({ deploymentId, repoRoot, auth }, runtime) {
  const rollback = await runtime.getVercelDeployment(deploymentId, auth);
  const expected = rollbackExpectedSource(rollback, deploymentId);
  const attestation = await runtime.attestDeploymentSource({
    deploymentId,
    repoRoot,
    expected,
    getDeployment: (value) => runtime.getVercelDeployment(value, auth),
    restoreDeploymentSource: (value) => runtime.restoreDeploymentSource(value, auth),
  });
  if (
    attestation?.ok !== true
    || attestation?.deploymentId !== deploymentId
    || attestation?.commit !== expected.commit
    || attestation?.ref !== expected.ref
    || attestation?.source !== "cli"
  ) {
    throw new Error("rollback_source_attestation_invalid");
  }
  return Object.freeze({ ...attestation });
}

function parseCandidateHostname(output) {
  const matches = String(output).match(/https:\/\/[a-z0-9-]+\.vercel\.app\/?/giu) ?? [];
  if (matches.length === 0) throw new Error("candidate_deployment_url_missing");
  const value = new URL(matches.at(-1));
  if (
    value.protocol !== "https:"
    || value.username
    || value.password
    || (value.pathname !== "/" && value.pathname !== "")
    || value.search
    || value.hash
  ) {
    throw new Error("candidate_deployment_url_invalid");
  }
  if (value.hostname === RELEASE_CONFIG.productionHostname) {
    throw new Error("candidate_resolved_to_fixed_production_hostname");
  }
  return value.hostname;
}

function assertSafeFailedCandidate(candidate, protectedDeploymentIds) {
  const deploymentId = candidate?.id ?? candidate?.uid;
  if (!/^dpl_[A-Za-z0-9]+$/u.test(deploymentId ?? "")) {
    throw new Error("candidate_cleanup_id_invalid");
  }
  if (candidate?.projectId !== RELEASE_CONFIG.projectId) {
    throw new Error(`deployment_project_mismatch:${candidate?.projectId}`);
  }
  if (candidate?.ownerId !== RELEASE_CONFIG.teamId) {
    throw new Error(`deployment_team_mismatch:${candidate?.ownerId}`);
  }
  if (candidate?.target !== "production") {
    throw new Error(`deployment_target_not_production:${candidate?.target}`);
  }
  assertStagedCandidate(candidate);
  if (protectedDeploymentIds.has(deploymentId)) {
    throw new Error("candidate_matches_protected_deployment");
  }
  return deploymentId;
}

function deploymentAbsentError(error) {
  return error?.status === 404
    || error?.status === 410
    || /vercel_api_(?:404|410)/u.test(error?.message ?? "");
}

async function cleanupFailedCandidate({
  deploymentId,
  auth,
  protectedDeploymentIds,
  fixedDeploymentId,
}, runtime) {
  const fixedReadback = await runtime.resolveProductionDeploymentId(
    RELEASE_CONFIG.productionHostname,
    auth,
  );
  if (fixedReadback !== fixedDeploymentId) {
    throw new Error("candidate_cleanup_fixed_production_changed");
  }
  const exactCandidate = await runtime.getVercelDeployment(deploymentId, auth);
  const exactId = assertSafeFailedCandidate(exactCandidate, protectedDeploymentIds);
  if (exactId !== deploymentId) throw new Error("candidate_cleanup_exact_id_mismatch");
  let deletion;
  try {
    deletion = await runtime.mutateVercelProject(
      `/v13/deployments/${encodeURIComponent(deploymentId)}`,
      auth,
      { method: "DELETE" },
    );
  } catch {
    throw new Error(`candidate_cleanup_failed:${deploymentId}:transport`);
  }
  if (!deletion?.ok && deletion?.status !== 404 && deletion?.status !== 410) {
    throw new Error(`candidate_cleanup_failed:${deploymentId}:${deletion?.status ?? "unknown"}`);
  }
  try {
    await runtime.getVercelDeployment(deploymentId, auth);
  } catch (error) {
    if (deploymentAbsentError(error)) return Object.freeze({ deleted: true, deploymentId });
    throw new Error(`candidate_cleanup_failed:${deploymentId}:readback`);
  }
  throw new Error(`candidate_cleanup_failed:${deploymentId}:still_present`);
}

export async function bootstrapRollback(
  { repoRoot = process.cwd(), commit: bootstrapCommit } = {},
  runtime = createProductionRuntime(),
) {
  if (bootstrapCommit !== RELEASE_CONFIG.bootstrapBaselineCommit) {
    throw new Error("bootstrap_rollback_commit_not_recorded_baseline");
  }
  const preflight = await assertReleasePreflight({ repoRoot }, runtime);
  try {
    runtime.git(repoRoot, ["merge-base", "--is-ancestor", bootstrapCommit, preflight.remoteRef]);
  } catch {
    throw new Error("bootstrap_rollback_commit_not_on_release_ref");
  }
  const fixedDeploymentBeforeBootstrap = await runtime.resolveProductionDeploymentId(
    RELEASE_CONFIG.productionHostname,
    preflight.auth,
  );
  const fixedBefore = await runtime.getVercelDeployment(
    fixedDeploymentBeforeBootstrap,
    preflight.auth,
  );
  assertReadyDeploymentIdentity(fixedBefore, fixedDeploymentBeforeBootstrap);

  const staged = runtime.materializeCommitUploadRoot({ repoRoot, commit: bootstrapCommit });
  let rollbackHostname;
  try {
    const command = await runtime.run("npx", [
      "--no-install", "vercel", "deploy", staged.root,
      "--prod", "--skip-domain", "--archive=tgz", "--yes",
      "--scope", RELEASE_CONFIG.scope,
      "--meta", `gitCommitSha=${bootstrapCommit}`,
      "--meta", `gitCommitRef=${RELEASE_CONFIG.releaseBranch}`,
      "--meta", "source=cli",
    ], { cwd: repoRoot, capture: true, env: vipVercelEnvironment() });
    rollbackHostname = parseCandidateHostname(`${command.stdout ?? ""}\n${command.stderr ?? ""}`);
  } finally {
    staged.cleanup();
  }
  const rollback = await runtime.getVercelDeployment(rollbackHostname, preflight.auth);
  const rollbackDeployment = rollback?.id ?? rollback?.uid;
  const expected = {
    projectId: RELEASE_CONFIG.projectId,
    teamId: RELEASE_CONFIG.teamId,
    commit: bootstrapCommit,
    ref: RELEASE_CONFIG.releaseBranch,
  };
  const protectedDeploymentIds = new Set([fixedDeploymentBeforeBootstrap]);
  let cleanupEligible = false;
  let rollbackAttestation;
  try {
    assertSafeFailedCandidate(rollback, protectedDeploymentIds);
    cleanupEligible = true;
    readDeploymentAttestation(rollback, expected);
    rollbackAttestation = await runtime.attestDeploymentSource({
      deploymentId: rollbackDeployment,
      repoRoot,
      expected,
      getDeployment: (value) => runtime.getVercelDeployment(value, preflight.auth),
      restoreDeploymentSource: (value) => runtime.restoreDeploymentSource(value, preflight.auth),
    });
    if (
      rollbackAttestation?.ok !== true
      || rollbackAttestation?.deploymentId !== rollbackDeployment
      || rollbackAttestation?.commit !== bootstrapCommit
      || rollbackAttestation?.ref !== RELEASE_CONFIG.releaseBranch
      || rollbackAttestation?.source !== "cli"
    ) throw new Error("bootstrap_rollback_source_attestation_invalid");
    const finalRollback = await runtime.getVercelDeployment(rollbackDeployment, preflight.auth);
    assertSafeFailedCandidate(finalRollback, protectedDeploymentIds);
    readDeploymentAttestation(finalRollback, expected);
    const fixedAfter = await runtime.resolveProductionDeploymentId(
      RELEASE_CONFIG.productionHostname,
      preflight.auth,
    );
    if (fixedAfter !== fixedDeploymentBeforeBootstrap) {
      throw new Error("bootstrap_moved_fixed_production_alias");
    }
  } catch (error) {
    if (cleanupEligible) {
      await cleanupFailedCandidate({
        deploymentId: rollbackDeployment,
        auth: preflight.auth,
        protectedDeploymentIds,
        fixedDeploymentId: fixedDeploymentBeforeBootstrap,
      }, runtime);
    }
    throw error;
  }
  return Object.freeze({
    ok: true,
    phase: "bootstrap-rollback",
    fixedDeploymentBeforeBootstrap,
    rollbackDeployment,
    rollbackReady: true,
    rollbackAttestation,
    commit: bootstrapCommit,
    ref: RELEASE_CONFIG.releaseBranch,
    source: "cli",
    uploadPaths: staged.paths,
  });
}

export async function createCandidate(
  { repoRoot = process.cwd(), rollbackDeployment: explicitRollbackDeployment } = {},
  runtime = createProductionRuntime(),
) {
  const preflight = await assertReleasePreflight({ repoRoot }, runtime);
  const fixedDeploymentBeforeCandidate = await runtime.resolveProductionDeploymentId(
    RELEASE_CONFIG.productionHostname,
    preflight.auth,
  );
  const rollbackDeployment = explicitRollbackDeployment ?? fixedDeploymentBeforeCandidate;
  if (!/^dpl_[A-Za-z0-9]+$/u.test(rollbackDeployment)) {
    throw new Error("candidate_rollback_deployment_invalid");
  }
  const rollbackAttestation = await attestRollback({
    deploymentId: rollbackDeployment,
    repoRoot,
    auth: preflight.auth,
  }, runtime);
  const rollbackBinding = createRollbackBinding({
    fixedDeploymentId: fixedDeploymentBeforeCandidate,
    rollbackDeploymentId: rollbackDeployment,
    commit: rollbackAttestation.commit,
    ref: rollbackAttestation.ref,
  });
  const websiteCompatibility = await runtime.readWebsiteCompatibilityProof({ auth: preflight.auth });
  const websiteBinding = createWebsiteCompatibilityBinding(websiteCompatibility);
  if (
    !/^dpl_[A-Za-z0-9]+$/u.test(websiteBinding.deploymentId ?? "")
    || !/^[0-9a-f]{40}$/u.test(websiteBinding.commit ?? "")
    || websiteBinding.ref !== RELEASE_CONFIG.websiteReleaseBranch
    || websiteCompatibility?.source !== "cli"
    || websiteCompatibility?.contract !== RELEASE_CONFIG.websiteCompatibilityContract
    || websiteCompatibility?.digest !== websiteBinding.digest
  ) {
    throw new Error("website_compatibility_proof_invalid");
  }

  const staged = runtime.materializeCommitUploadRoot({
    repoRoot,
    commit: preflight.commit,
  });
  let candidateHostname;
  try {
    const command = await runtime.run(
      "npx",
      [
        "--no-install",
        "vercel",
        "deploy",
        staged.root,
        "--prod",
        "--skip-domain",
        "--archive=tgz",
        "--yes",
        "--scope",
        RELEASE_CONFIG.scope,
        "--meta",
        `gitCommitSha=${preflight.commit}`,
        "--meta",
        `gitCommitRef=${preflight.branch}`,
        "--meta",
        "source=cli",
        "--meta",
        `fixedPredecessorDeploymentId=${rollbackBinding.fixedDeploymentId}`,
        "--meta",
        `rollbackDeploymentId=${rollbackBinding.rollbackDeploymentId}`,
        "--meta",
        `rollbackCommitSha=${rollbackBinding.commit}`,
        "--meta",
        `rollbackCommitRef=${rollbackBinding.ref}`,
        "--meta",
        "rollbackSource=cli",
        "--meta",
        `rollbackBindingSha256=${rollbackBinding.digest}`,
        "--meta",
        `websiteDeploymentId=${websiteBinding.deploymentId}`,
        "--meta",
        `websiteCommitSha=${websiteBinding.commit}`,
        "--meta",
        `websiteCommitRef=${websiteBinding.ref}`,
        "--meta",
        "websiteSource=cli",
        "--meta",
        `websiteCompatibilityContract=${websiteBinding.contract}`,
        "--meta",
        `websiteCompatibilitySha256=${websiteBinding.digest}`,
      ],
      {
        cwd: repoRoot,
        capture: true,
        env: vipVercelEnvironment(),
      },
    );
    candidateHostname = parseCandidateHostname(`${command.stdout ?? ""}\n${command.stderr ?? ""}`);
  } finally {
    staged.cleanup();
  }

  const candidate = await runtime.getVercelDeployment(candidateHostname, preflight.auth);
  const candidateId = candidate?.id ?? candidate?.uid;
  const expected = {
    projectId: RELEASE_CONFIG.projectId,
    teamId: RELEASE_CONFIG.teamId,
    commit: preflight.commit,
    ref: preflight.branch,
  };
  let cleanupEligible = false;
  let sourceAttestation;
  const protectedDeploymentIds = new Set([fixedDeploymentBeforeCandidate, rollbackDeployment]);
  try {
    assertSafeFailedCandidate(candidate, protectedDeploymentIds);
    cleanupEligible = true;
    readDeploymentAttestation(candidate, expected);
    const candidateRollbackBinding = readRollbackBinding(candidate);
    if (candidateRollbackBinding.digest !== rollbackBinding.digest) {
      throw new Error("candidate_rollback_binding_readback_mismatch");
    }
    if (readWebsiteCompatibilityBinding(candidate).digest !== websiteBinding.digest) {
      throw new Error("candidate_website_binding_readback_mismatch");
    }
    sourceAttestation = await runtime.attestDeploymentSource({
      deploymentId: candidateId,
      repoRoot,
      expected,
      getDeployment: (value) => runtime.getVercelDeployment(value, preflight.auth),
      restoreDeploymentSource: (value) => runtime.restoreDeploymentSource(value, preflight.auth),
    });
    const finalCandidate = await runtime.getVercelDeployment(candidateId, preflight.auth);
    assertSafeFailedCandidate(finalCandidate, protectedDeploymentIds);
    readDeploymentAttestation(finalCandidate, expected);
    if (readRollbackBinding(finalCandidate).digest !== rollbackBinding.digest) {
      throw new Error("candidate_rollback_binding_changed_after_attestation");
    }
    if (readWebsiteCompatibilityBinding(finalCandidate).digest !== websiteBinding.digest) {
      throw new Error("candidate_website_binding_changed_after_attestation");
    }
    const fixedAfterCandidate = await runtime.resolveProductionDeploymentId(
      RELEASE_CONFIG.productionHostname,
      preflight.auth,
    );
    if (fixedAfterCandidate !== fixedDeploymentBeforeCandidate) {
      throw new Error("candidate_moved_fixed_production_alias");
    }
  } catch (error) {
    if (cleanupEligible) {
      await cleanupFailedCandidate({
        deploymentId: candidateId,
        auth: preflight.auth,
        protectedDeploymentIds,
        fixedDeploymentId: fixedDeploymentBeforeCandidate,
      }, runtime);
    }
    throw error;
  }

  return {
    ok: true,
    phase: "candidate",
    deploymentId: candidateId,
    deploymentHostname: candidateHostname,
    commit: preflight.commit,
    ref: preflight.branch,
    source: "cli",
    uploadPaths: staged.paths,
    fixedDeploymentBeforeCandidate,
    rollbackDeployment,
    rollbackReady: true,
    rollbackAttestation,
    rollbackBinding,
    websiteCompatibility,
    websiteBinding,
    sourceAttestation,
  };
}

export async function promoteCandidate(
  { repoRoot = process.cwd(), deploymentId, rollbackDeployment: explicitRollbackDeployment } = {},
  runtime = createProductionRuntime(),
) {
  if (!/^dpl_[A-Za-z0-9]+$/u.test(deploymentId ?? "")) {
    throw new Error("promote_requires_deployment_id");
  }
  const initialPreflight = await assertReleasePreflight({ repoRoot }, runtime);
  const fixedDeploymentBeforePromotion = await runtime.resolveProductionDeploymentId(
    RELEASE_CONFIG.productionHostname,
    initialPreflight.auth,
  );
  if (fixedDeploymentBeforePromotion === deploymentId) throw new Error("candidate_already_promoted");
  const initialCandidate = await runtime.getVercelDeployment(deploymentId, initialPreflight.auth);
  readDeploymentAttestation(initialCandidate, {
    projectId: RELEASE_CONFIG.projectId,
    teamId: RELEASE_CONFIG.teamId,
    commit: initialPreflight.commit,
    ref: initialPreflight.branch,
  });
  const rollbackBinding = readRollbackBinding(initialCandidate);
  const websiteBinding = readWebsiteCompatibilityBinding(initialCandidate);
  if (rollbackBinding.fixedDeploymentId !== fixedDeploymentBeforePromotion) {
    throw new Error("candidate_fixed_predecessor_mismatch");
  }
  if (
    explicitRollbackDeployment !== undefined
    && explicitRollbackDeployment !== rollbackBinding.rollbackDeploymentId
  ) throw new Error("promote_rollback_override_mismatch");
  const rollbackDeployment = rollbackBinding.rollbackDeploymentId;
  if (rollbackDeployment === deploymentId) throw new Error("candidate_cannot_be_rollback_anchor");
  const rollbackAttestation = await attestRollback({
    deploymentId: rollbackDeployment,
    repoRoot,
    auth: initialPreflight.auth,
  }, runtime);
  if (
    rollbackAttestation.commit !== rollbackBinding.commit
    || rollbackAttestation.ref !== rollbackBinding.ref
    || rollbackAttestation.source !== rollbackBinding.source
  ) throw new Error("candidate_rollback_attestation_mismatch");
  let websiteCompatibility = await attestBoundWebsiteCompatibility({
    auth: initialPreflight.auth,
    binding: websiteBinding,
  }, runtime);

  await runtime.run("npm", ["run", "ci"], {
    cwd: repoRoot,
    env: vipCiEnvironment(),
  });
  await runtime.run("npm", [
    "run", "e2e:staging:inert", "--", "--deployment-id", deploymentId,
  ], {
    cwd: repoRoot,
    env: vipCiEnvironment(),
  });

  const finalPreflight = await assertReleasePreflight({ repoRoot }, runtime);
  if (
    finalPreflight.commit !== initialPreflight.commit
    || finalPreflight.branch !== initialPreflight.branch
  ) {
    throw new Error("release_source_changed_during_verification");
  }
  const expected = {
    projectId: RELEASE_CONFIG.projectId,
    teamId: RELEASE_CONFIG.teamId,
    commit: finalPreflight.commit,
    ref: finalPreflight.branch,
  };
  const candidate = await runtime.getVercelDeployment(deploymentId, finalPreflight.auth);
  readDeploymentAttestation(candidate, expected);
  if (readRollbackBinding(candidate).digest !== rollbackBinding.digest) {
    throw new Error("candidate_rollback_binding_changed");
  }
  if (readWebsiteCompatibilityBinding(candidate).digest !== websiteBinding.digest) {
    throw new Error("candidate_website_binding_changed");
  }
  assertStagedCandidate(candidate);
  const sourceAttestation = await runtime.attestDeploymentSource({
    deploymentId,
    repoRoot,
    expected,
    getDeployment: (value) => runtime.getVercelDeployment(value, finalPreflight.auth),
    restoreDeploymentSource: (value) => runtime.restoreDeploymentSource(value, finalPreflight.auth),
  });
  websiteCompatibility = await attestBoundWebsiteCompatibility({
    auth: finalPreflight.auth,
    binding: websiteBinding,
  }, runtime);
  const lease = await runtime.acquirePromotionLease({
    auth: finalPreflight.auth,
    expectedDeploymentId: fixedDeploymentBeforePromotion,
    candidateDeploymentId: deploymentId,
  });
  try {
    const lockedPreflight = await assertReleasePreflight({ repoRoot }, runtime);
    if (
      lockedPreflight.commit !== finalPreflight.commit
      || lockedPreflight.branch !== finalPreflight.branch
    ) {
      throw new Error("release_source_changed_under_promotion_lease");
    }
    const fixedBeforePromotion = await runtime.resolveProductionDeploymentId(
      RELEASE_CONFIG.productionHostname,
      lockedPreflight.auth,
    );
    if (fixedBeforePromotion !== fixedDeploymentBeforePromotion) {
      throw new Error("fixed_production_changed_under_promotion_lease");
    }
    const lockedCandidate = await runtime.getVercelDeployment(deploymentId, lockedPreflight.auth);
    readDeploymentAttestation(lockedCandidate, expected);
    if (readRollbackBinding(lockedCandidate).digest !== rollbackBinding.digest) {
      throw new Error("candidate_rollback_binding_changed_under_promotion_lease");
    }
    assertStagedCandidate(lockedCandidate, "_under_promotion_lease");
    assertReadyDeploymentIdentity(
      await runtime.getVercelDeployment(rollbackDeployment, lockedPreflight.auth),
      rollbackDeployment,
    );
    websiteCompatibility = await attestBoundWebsiteCompatibility({
      auth: lockedPreflight.auth,
      binding: websiteBinding,
    }, runtime);
    await runtime.run(
      "npx",
      [
        "--no-install",
        "vercel",
        "promote",
        deploymentId,
        "--yes",
        "--scope",
        RELEASE_CONFIG.scope,
      ],
      {
        cwd: repoRoot,
        env: vipVercelEnvironment(),
      },
    );

    const fixedDeployment = await runtime.resolveProductionDeploymentId(
      RELEASE_CONFIG.productionHostname,
      finalPreflight.auth,
    );
    if (fixedDeployment !== deploymentId) {
      throw new Error(`fixed_production_readback_mismatch:${fixedDeployment}`);
    }
    const fixed = await runtime.getVercelDeployment(fixedDeployment, finalPreflight.auth);
    const fixedAttestation = readDeploymentAttestation(fixed, expected);
    const rollbackReadback = await runtime.getVercelDeployment(
      rollbackDeployment,
      finalPreflight.auth,
    );
    assertReadyDeploymentIdentity(rollbackReadback, rollbackDeployment);

    return {
      ok: true,
      phase: "promote",
      fixedDeployment,
      commit: fixedAttestation.commit,
      ref: fixedAttestation.ref,
      source: fixedAttestation.source,
      rollbackDeployment,
      rollbackReady: true,
      rollbackAttestation,
      sourceAttestation,
      websiteCompatibility,
    };
  } finally {
    await runtime.releasePromotionLease({ lease, auth: finalPreflight.auth });
  }
}

function isMainModule() {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
}

export async function runReleaseCommand(
  { command, deploymentId, rollbackDeployment, commit, repoRoot = process.cwd() },
  runtime = createProductionRuntime(),
) {
  if (command === "preflight") {
    const preflight = await assertReleasePreflight({ repoRoot }, runtime);
    return {
      ok: true,
      phase: "preflight",
      branch: preflight.branch,
      remoteRef: preflight.remoteRef,
      commit: preflight.commit,
      backendOrigin: preflight.backendOrigin,
    };
  }
  if (command === "bootstrap-rollback") return bootstrapRollback({ repoRoot, commit }, runtime);
  if (command === "candidate") return createCandidate({ repoRoot, rollbackDeployment }, runtime);
  if (command === "promote") {
    return promoteCandidate({ repoRoot, deploymentId, rollbackDeployment }, runtime);
  }
  throw new Error(
    "usage: npm run release:vip-manager -- preflight|bootstrap-rollback|candidate|promote [commit|dpl_id] [rollback_dpl_id]",
  );
}

if (isMainModule()) {
  runReleaseCommand({
    command: process.argv[2],
    deploymentId: process.argv[2] === "promote" ? process.argv[3] : undefined,
    rollbackDeployment: process.argv[2] === "candidate" ? process.argv[3] : process.argv[4],
    commit: process.argv[2] === "bootstrap-rollback" ? process.argv[3] : undefined,
  }).then((result) => {
    console.log(JSON.stringify(result));
  }).catch((error) => {
    console.error(`vip-manager release refused: ${error.message}`);
    process.exitCode = 1;
  });
}
