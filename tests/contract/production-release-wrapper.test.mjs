import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { runNodeScript } from "../helpers/script-runner.mjs";

import {
  attestDeploymentSource,
  compareDeploymentSourceToCommit,
  materializeCommitUploadRoot,
  readDeploymentAttestation,
  restoreDeploymentSource,
} from "../../scripts/lib/production-source-attestation.mjs";
import {
  RELEASE_CONFIG,
  acquirePromotionLease,
  assertReleasePreflight,
  bootstrapRollback,
  createCandidate,
  promoteCandidate,
  readCanonicalWebsiteCompatibility,
  releasePromotionLease,
} from "../../scripts/release-vip-manager.mjs";

const releaseCommit = "f".repeat(40);
const websiteCommit = "e".repeat(40);
const websiteDeploymentId = "dpl_WebsiteFixed";

function websiteCompatibilityDigest({
  deploymentId = websiteDeploymentId,
  commit = websiteCommit,
} = {}) {
  return createHash("sha256").update([
    "v1",
    "prj_ve4VBLGc7Ao5xqvepbEa06X7n8wM",
    RELEASE_CONFIG.teamId,
    deploymentId,
    commit,
    "codex/vip-manager-production-backend-20260727",
    "cli",
    "ticket-wallet-inert-v1",
    "walletRead=false,otpDelivery=false,transactionalEmailDrain=false,swipePrepare=false,swipeCommit=false,managerOperations=false,refundReview=true,providerWebhook=false",
  ].join("\0")).digest("hex");
}

function websiteFixedDeployment(id = websiteDeploymentId, commit = websiteCommit) {
  return {
    id,
    projectId: "prj_ve4VBLGc7Ao5xqvepbEa06X7n8wM",
    ownerId: RELEASE_CONFIG.teamId,
    readyState: "READY",
    target: "production",
    source: "cli",
    alias: ["ghost-ruby-one.vercel.app"],
    meta: {
      gitCommitSha: commit,
      gitCommitRef: "codex/vip-manager-production-backend-20260727",
      source: "cli",
    },
  };
}

function websiteReadiness(overrides = {}) {
  return {
    ok: false,
    websiteCommit,
    environment: "live",
    trialMode: false,
    observedAt: "2026-08-11T00:00:00.000Z",
    capabilities: {
      walletRead: false,
      otpDelivery: false,
      transactionalEmailDrain: false,
      swipePrepare: false,
      swipeCommit: false,
      managerOperations: false,
      refundReview: true,
      providerWebhook: false,
    },
    ...overrides,
  };
}

function releaseDeployment(id, {
  alias = [],
  commit = releaseCommit,
  fixedDeploymentId = "dpl_VipRollback",
  rollbackDeploymentId = "dpl_VipRollback",
  rollbackCommit = releaseCommit,
} = {}) {
  const rollbackBindingSha256 = createHash("sha256").update([
    "v1",
    RELEASE_CONFIG.projectId,
    RELEASE_CONFIG.teamId,
    fixedDeploymentId,
    rollbackDeploymentId,
    rollbackCommit,
    RELEASE_CONFIG.releaseBranch,
    "cli",
  ].join("\0")).digest("hex");
  return {
    id,
    projectId: RELEASE_CONFIG.projectId,
    ownerId: RELEASE_CONFIG.teamId,
    readyState: "READY",
    target: "production",
    source: "cli",
    alias,
    meta: {
      gitCommitSha: commit,
      gitCommitRef: RELEASE_CONFIG.releaseBranch,
      source: "cli",
      fixedPredecessorDeploymentId: fixedDeploymentId,
      rollbackDeploymentId,
      rollbackCommitSha: rollbackCommit,
      rollbackCommitRef: RELEASE_CONFIG.releaseBranch,
      rollbackSource: "cli",
      rollbackBindingSha256,
      websiteDeploymentId,
      websiteCommitSha: websiteCommit,
      websiteCommitRef: "codex/vip-manager-production-backend-20260727",
      websiteSource: "cli",
      websiteCompatibilityContract: "ticket-wallet-inert-v1",
      websiteCompatibilitySha256: websiteCompatibilityDigest(),
    },
  };
}

function releaseProjectApiFixture(pathname) {
  if (pathname.endsWith("/env/env_BackendOrigin?decrypt=true")) {
    return {
      id: "env_BackendOrigin",
      key: "GHOST_ADMIN_API_ORIGIN",
      value: RELEASE_CONFIG.backendOrigin,
      target: ["production"],
      gitBranch: null,
      customEnvironmentIds: [],
    };
  }
  if (pathname === `/v9/projects/${RELEASE_CONFIG.projectId}`) {
    return {
      id: RELEASE_CONFIG.projectId,
      accountId: RELEASE_CONFIG.teamId,
      name: RELEASE_CONFIG.projectName,
      link: null,
    };
  }
  if (pathname === `/v10/projects/${RELEASE_CONFIG.projectId}/env`) {
    return {
      envs: [{
        id: "env_BackendOrigin",
        key: "GHOST_ADMIN_API_ORIGIN",
        target: ["production"],
        gitBranch: null,
        customEnvironmentIds: [],
      }],
    };
  }
  throw new Error(`unexpected_vercel_api:${pathname}`);
}

function baseReleaseRuntime(overrides = {}) {
  const rollbackId = "dpl_VipRollback";
  const candidateId = "dpl_VipCandidate";
  return {
    git(_repoRoot, args) {
      const key = args.join(" ");
      if (key === "branch --show-current") return RELEASE_CONFIG.releaseBranch;
      if (key === "status --porcelain=v1 --untracked-files=all") return "";
      if (key === "rev-parse --abbrev-ref --symbolic-full-name @{upstream}") {
        return `origin/${RELEASE_CONFIG.releaseBranch}`;
      }
      if (key === "rev-list --left-right --count HEAD...@{upstream}") return "0\t0";
      if (key === "rev-parse HEAD") return releaseCommit;
      if (key.startsWith("ls-remote --exit-code --heads origin ")) {
        return `${releaseCommit}\trefs/heads/${RELEASE_CONFIG.releaseBranch}`;
      }
      throw new Error(`unexpected_git_call:${key}`);
    },
    readJson() {
      return {
        projectId: RELEASE_CONFIG.projectId,
        orgId: RELEASE_CONFIG.teamId,
        projectName: RELEASE_CONFIG.projectName,
      };
    },
    async readVercelToken() { return "fixture-token"; },
    async vercelApi(pathname) {
      return releaseProjectApiFixture(pathname);
    },
    materializeCommitUploadRoot() {
      return { root: "/fixture/source", paths: 263, cleanup() {} };
    },
    async resolveProductionDeploymentId(hostname) {
      return hostname === "ghost-ruby-one.vercel.app" ? websiteDeploymentId : rollbackId;
    },
    async getVercelDeployment(value) {
      if (value === websiteDeploymentId) return websiteFixedDeployment();
      if (value === rollbackId) return releaseDeployment(rollbackId, {
        alias: [RELEASE_CONFIG.productionHostname],
      });
      if (value === "ghost-vipapp-candidate.vercel.app" || value === candidateId) {
        return releaseDeployment(candidateId);
      }
      throw new Error(`unexpected_deployment:${value}`);
    },
    async attestDeploymentSource({ deploymentId }) {
      return {
        ok: true,
        deploymentId,
        commit: releaseCommit,
        ref: RELEASE_CONFIG.releaseBranch,
        source: "cli",
        failures: [],
      };
    },
    async restoreDeploymentSource() { throw new Error("unused"); },
    now() { return Date.parse("2026-08-11T00:01:00.000Z"); },
    async readWebsiteReadiness() { return websiteReadiness(); },
    async readWebsiteCompatibilityProof() {
      return {
        deploymentId: websiteDeploymentId,
        commit: websiteCommit,
        ref: "codex/vip-manager-production-backend-20260727",
        source: "cli",
        contract: "ticket-wallet-inert-v1",
        digest: websiteCompatibilityDigest(),
        observedAt: "2026-08-11T00:00:00.000Z",
      };
    },
    async acquirePromotionLease() {
      return { id: "env_VipLease", owner: `v1.${"x".repeat(24)}.1893456000000` };
    },
    async releasePromotionLease() { return { released: true }; },
    async run() { return { stdout: "https://ghost-vipapp-candidate.vercel.app" }; },
    ...overrides,
  };
}

function createSourceFixture() {
  const root = mkdtempSync(path.join(tmpdir(), "ghost-vip-release-source-"));
  const repoRoot = path.join(root, "repo");
  mkdirSync(repoRoot);
  execFileSync("git", ["init", "-q"], { cwd: repoRoot });
  execFileSync("git", ["config", "user.email", "release-test@ghost.invalid"], { cwd: repoRoot });
  execFileSync("git", ["config", "user.name", "GHOST release test"], { cwd: repoRoot });
  writeFileSync(path.join(repoRoot, ".vercelignore"), "private/**\n");
  writeFileSync(path.join(repoRoot, "app.txt"), "committed source\n");
  mkdirSync(path.join(repoRoot, "private"));
  writeFileSync(path.join(repoRoot, "private", "evidence.txt"), "excluded source\n");
  execFileSync("git", ["add", "."], { cwd: repoRoot });
  execFileSync("git", ["commit", "-qm", "fixture"], { cwd: repoRoot });
  const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot })
    .toString()
    .trim();
  return { root, repoRoot, commit };
}

test("candidate materialization contains only the exact committed upload surface", (t) => {
  const fixture = createSourceFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));

  writeFileSync(path.join(fixture.repoRoot, "app.txt"), "mutable worktree drift\n");
  mkdirSync(path.join(fixture.repoRoot, ".next"));
  writeFileSync(path.join(fixture.repoRoot, ".next", "local-only.txt"), "ignored\n");

  const staged = materializeCommitUploadRoot({
    repoRoot: fixture.repoRoot,
    commit: fixture.commit,
  });
  t.after(staged.cleanup);

  assert.equal(staged.paths, 2);
  assert.equal(existsSync(path.join(staged.root, "private", "evidence.txt")), false);
  assert.equal(existsSync(path.join(staged.root, ".next", "local-only.txt")), false);
  assert.equal(
    compareDeploymentSourceToCommit({
      archiveRoot: staged.root,
      repoRoot: fixture.repoRoot,
      commit: fixture.commit,
    }).ok,
    true,
  );
});

test("candidate metadata binds the exact project, team, target, commit, ref, and CLI source", () => {
  const expected = {
    projectId: "prj_expected",
    teamId: "team_expected",
    commit: "a".repeat(40),
    ref: "codex/vip-manager-production-light-ui-20260727",
  };
  const deployment = {
    id: "dpl_ExactCandidate",
    projectId: expected.projectId,
    ownerId: expected.teamId,
    readyState: "READY",
    target: "production",
    source: "cli",
    meta: {
      gitCommitSha: expected.commit,
      gitCommitRef: expected.ref,
      source: "cli",
    },
  };

  assert.deepEqual(readDeploymentAttestation(deployment, expected), {
    deploymentId: deployment.id,
    projectId: expected.projectId,
    teamId: expected.teamId,
    state: "READY",
    target: "production",
    source: "cli",
    commit: expected.commit,
    ref: expected.ref,
  });
  assert.throws(
    () => readDeploymentAttestation({ ...deployment, source: "git" }, expected),
    /deployment_source_not_cli/u,
  );
  assert.throws(
    () => readDeploymentAttestation({ ...deployment, meta: { ...deployment.meta, gitCommitRef: "main" } }, expected),
    /deployment_git_commit_ref_mismatch/u,
  );
});

test("candidate attestation compares restored bytes and always removes the temporary source", async (t) => {
  const fixture = createSourceFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const staged = materializeCommitUploadRoot({
    repoRoot: fixture.repoRoot,
    commit: fixture.commit,
  });
  let cleaned = false;
  const expected = {
    projectId: "prj_expected",
    teamId: "team_expected",
    commit: fixture.commit,
    ref: "codex/vip-manager-production-light-ui-20260727",
  };
  const deployment = {
    id: "dpl_AttestedCandidate",
    projectId: expected.projectId,
    ownerId: expected.teamId,
    readyState: "READY",
    target: "production",
    source: "cli",
    meta: {
      gitCommitSha: expected.commit,
      gitCommitRef: expected.ref,
      source: "cli",
    },
  };

  const result = await attestDeploymentSource({
    deploymentId: deployment.id,
    repoRoot: fixture.repoRoot,
    expected,
    getDeployment: async () => deployment,
    restoreDeploymentSource: async () => ({
      root: staged.root,
      form: "fixture",
      cleanup: async () => {
        cleaned = true;
        staged.cleanup();
      },
    }),
  });

  assert.equal(result.ok, true);
  assert.equal(result.deploymentId, deployment.id);
  assert.equal(result.commit, fixture.commit);
  assert.equal(result.archiveForm, "fixture");
  assert.equal(cleaned, true);
});

test("Vercel source restoration verifies every content-addressed deployment blob", async () => {
  const bodies = new Map([
    ["package.json", Buffer.from("{\"private\":true}\n")],
    ["src/app.txt", Buffer.from("deployed\n")],
  ]);
  const nodes = [...bodies].map(([name, body]) => ({
    name,
    type: "file",
    uid: createHash("sha1").update(body).digest("hex"),
  }));
  const api = async (pathname) => {
    if (pathname.endsWith("/files") && !pathname.includes("/files/")) return nodes;
    const uid = pathname.split("/").at(-1);
    const body = [...bodies.values()].find(
      (candidate) => createHash("sha1").update(candidate).digest("hex") === uid,
    );
    assert.ok(body, `unexpected blob request: ${pathname}`);
    return { data: body.toString("base64") };
  };

  const restored = await restoreDeploymentSource(
    "dpl_SourceFixture",
    { token: "fixture", teamId: "team_fixture" },
    { api },
  );
  try {
    assert.equal(restored.form, "tree");
    assert.equal(readFileSync(path.join(restored.root, "package.json"), "utf8"), "{\"private\":true}\n");
    assert.equal(readFileSync(path.join(restored.root, "src/app.txt"), "utf8"), "deployed\n");
  } finally {
    await restored.cleanup();
  }
  assert.equal(existsSync(restored.root), false);
});

test("deployment archives reject links before extraction", async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "ghost-vip-release-archive-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, "source");
  const tarball = path.join(root, "source.tgz");
  mkdirSync(source);
  symlinkSync("../outside", path.join(source, "escape"));
  execFileSync("tar", ["czf", tarball, "-C", source, "escape"]);
  const body = readFileSync(tarball);
  const uid = createHash("sha1").update(body).digest("hex");
  const api = async (pathname) => {
    if (pathname.endsWith("/files") && !pathname.includes("/files/")) {
      return [{ name: "src/.vercel/source.tgz.part0", type: "file", uid }];
    }
    return { data: body.toString("base64") };
  };

  await assert.rejects(
    restoreDeploymentSource(
      "dpl_LinkArchive",
      { token: "fixture", teamId: "team_fixture" },
      { api },
    ),
    /deployment_source_archive_entry_type_invalid/u,
  );
});

test("release preflight pins the canonical Git line, Vercel identity, and fixed Website backend", async () => {
  const commit = "c".repeat(40);
  const gitCalls = [];
  const vercelReadPaths = [];
  const runtime = {
    git(_repoRoot, args) {
      gitCalls.push(args);
      const key = args.join(" ");
      if (key === "branch --show-current") return RELEASE_CONFIG.releaseBranch;
      if (key === "status --porcelain=v1 --untracked-files=all") return "";
      if (key === "rev-parse --abbrev-ref --symbolic-full-name @{upstream}") {
        return `origin/${RELEASE_CONFIG.releaseBranch}`;
      }
      if (key === "rev-list --left-right --count HEAD...@{upstream}") return "0\t0";
      if (key === "rev-parse HEAD") return commit;
      if (key.startsWith("ls-remote --exit-code --heads origin ")) {
        return `${commit}\trefs/heads/${RELEASE_CONFIG.releaseBranch}`;
      }
      throw new Error(`unexpected git call: ${key}`);
    },
    readJson() {
      return {
        projectId: RELEASE_CONFIG.projectId,
        orgId: RELEASE_CONFIG.teamId,
        projectName: RELEASE_CONFIG.projectName,
      };
    },
    async readVercelToken() {
      return "fixture-token";
    },
    async vercelApi(pathname) {
      vercelReadPaths.push(pathname);
      if (pathname.endsWith("/env/env_BackendOrigin?decrypt=true")) {
        return {
          id: "env_BackendOrigin",
          key: "GHOST_ADMIN_API_ORIGIN",
          value: RELEASE_CONFIG.backendOrigin,
          target: ["production"],
          gitBranch: null,
          customEnvironmentIds: [],
        };
      }
      if (pathname === `/v9/projects/${RELEASE_CONFIG.projectId}`) {
        return {
          id: RELEASE_CONFIG.projectId,
          accountId: RELEASE_CONFIG.teamId,
          name: RELEASE_CONFIG.projectName,
          link: null,
        };
      }
      if (pathname.startsWith("/v10/projects/")) {
        return {
          envs: [{ id: "env_UnrelatedSecret", key: "DATABASE_PASSWORD" }, {
            id: "env_BackendOrigin",
            key: "GHOST_ADMIN_API_ORIGIN",
            target: ["production"],
            gitBranch: null,
            customEnvironmentIds: [],
          }],
        };
      }
      throw new Error(`unexpected Vercel API call: ${pathname}`);
    },
  };

  const result = await assertReleasePreflight({ repoRoot: "/fixture/repo" }, runtime);

  assert.equal(result.commit, commit);
  assert.equal(result.branch, RELEASE_CONFIG.releaseBranch);
  assert.equal(result.remoteRef, `origin/${RELEASE_CONFIG.releaseBranch}`);
  assert.equal(result.backendOrigin, "https://ghost-ruby-one.vercel.app");
  assert.ok(gitCalls.some((args) => args[0] === "ls-remote"), "live remote ref must be checked");
  assert.ok(vercelReadPaths.every((pathname) => !pathname.endsWith("/env?decrypt=true")));
  assert.deepEqual(vercelReadPaths.filter((pathname) => pathname.includes("?decrypt=true")), [
    `/v9/projects/${RELEASE_CONFIG.projectId}/env/env_BackendOrigin?decrypt=true`,
  ]);
});

test("Website compatibility proof attests exact fixed CLI source and canonical inert readiness", async () => {
  let fixedReads = 0;
  const runtime = {
    async resolveProductionDeploymentId(hostname) {
      assert.equal(hostname, "ghost-ruby-one.vercel.app");
      fixedReads += 1;
      return websiteDeploymentId;
    },
    async getVercelDeployment(value) {
      assert.equal(value, websiteDeploymentId);
      return websiteFixedDeployment();
    },
    async readWebsiteReadiness() { return websiteReadiness(); },
    now() { return Date.parse("2026-08-11T00:01:00.000Z"); },
  };
  const proof = await readCanonicalWebsiteCompatibility({ auth: {} }, runtime);
  assert.equal(proof.deploymentId, websiteDeploymentId);
  assert.equal(proof.commit, websiteCommit);
  assert.equal(proof.contract, "ticket-wallet-inert-v1");
  assert.equal(proof.capabilities.refundReview, true);
  assert.equal(proof.capabilities.managerOperations, false);
  assert.equal(fixedReads, 2);

  for (const badReadiness of [
    websiteReadiness({ ok: true, capabilities: {
      ...websiteReadiness().capabilities,
      managerOperations: true,
    } }),
    websiteReadiness({ websiteCommit: "9".repeat(40) }),
    websiteReadiness({ observedAt: "2026-08-10T23:00:00.000Z" }),
  ]) {
    await assert.rejects(
      readCanonicalWebsiteCompatibility({ auth: {} }, {
        ...runtime,
        async readWebsiteReadiness() { return badReadiness; },
      }),
      /website_inert_compatibility_mismatch/u,
    );
  }

  await assert.rejects(
    readCanonicalWebsiteCompatibility({ auth: {} }, {
      ...runtime,
      async getVercelDeployment() {
        const deployment = websiteFixedDeployment();
        return { ...deployment, meta: { ...deployment.meta, source: undefined } };
      },
    }),
    /website_source_not_cli/u,
  );
});

test("VIP bootstrap trusts exact custom-host resolution when deployment aliases omit it", async () => {
  const baselineCommit = "17a900051edfb892ddb4a22f7eb3da3ed5e41565";
  let materializedCommit = null;
  let fixedReads = 0;
  const commands = [];
  const runtime = baseReleaseRuntime({
    git(repoRoot, args) {
      if (args[0] === "merge-base") return "";
      return baseReleaseRuntime().git(repoRoot, args);
    },
    materializeCommitUploadRoot({ commit }) {
      materializedCommit = commit;
      return { root: "/fixture/vip-rollback-source", paths: 263, cleanup() {} };
    },
    async resolveProductionDeploymentId() {
      fixedReads += 1;
      return "dpl_LegacyNullMeta";
    },
    async getVercelDeployment(value) {
      if (value === "dpl_LegacyNullMeta") {
        return {
          id: value,
          projectId: RELEASE_CONFIG.projectId,
          ownerId: RELEASE_CONFIG.teamId,
          readyState: "READY",
          target: "production",
          alias: ["ghost-vipapp-team.vercel.app"],
          source: null,
          meta: { gitCommitSha: null, gitCommitRef: null, source: null },
        };
      }
      if (value === "ghost-vipapp-bootstrap.vercel.app" || value === "dpl_VipBootstrap") {
        return releaseDeployment("dpl_VipBootstrap", { commit: baselineCommit });
      }
      throw new Error(`unexpected_deployment:${value}`);
    },
    async attestDeploymentSource(options) {
      return {
        ok: true,
        deploymentId: options.deploymentId,
        commit: baselineCommit,
        ref: RELEASE_CONFIG.releaseBranch,
        source: "cli",
        failures: [],
      };
    },
    async run(command, args, options) {
      commands.push({ command, args, options });
      return { stdout: "https://ghost-vipapp-bootstrap.vercel.app" };
    },
  });

  const result = await bootstrapRollback({
    repoRoot: "/fixture/repo",
    commit: baselineCommit,
  }, runtime);

  assert.equal(materializedCommit, baselineCommit);
  assert.equal(result.fixedDeploymentBeforeBootstrap, "dpl_LegacyNullMeta");
  assert.equal(result.rollbackDeployment, "dpl_VipBootstrap");
  assert.equal(result.rollbackReady, true);
  assert.equal(fixedReads, 2);
  assert.equal(commands.length, 1);
  assert.ok(commands[0].args.includes("--skip-domain"));
  assert.ok(commands[0].args.includes(`gitCommitSha=${baselineCommit}`));
});

test("VIP bootstrap cleans an exact failed aliasless deployment and refuses an aliased cleanup race", async () => {
  const baselineCommit = RELEASE_CONFIG.bootstrapBaselineCommit;
  for (const lateAlias of [false, true]) {
    let deleted = false;
    let sourceRead = false;
    const runtime = baseReleaseRuntime({
      git(repoRoot, args) {
        if (args[0] === "merge-base") return "";
        return baseReleaseRuntime().git(repoRoot, args);
      },
      async getVercelDeployment(value) {
        if (deleted && value === "dpl_VipBootstrap") {
          throw Object.assign(new Error("vercel_api_404"), { status: 404 });
        }
        if (value === "dpl_VipRollback") return releaseDeployment(value, {
          alias: [RELEASE_CONFIG.productionHostname],
        });
        if (value === "ghost-vipapp-bootstrap.vercel.app" || value === "dpl_VipBootstrap") {
          return releaseDeployment("dpl_VipBootstrap", {
            alias: sourceRead && lateAlias ? ["late.example"] : [],
            commit: baselineCommit,
          });
        }
        throw new Error(`unexpected_deployment:${value}`);
      },
      async attestDeploymentSource() {
        sourceRead = true;
        throw new Error("bootstrap_archive_bad");
      },
      async mutateVercelProject(pathname, _auth, options) {
        assert.equal(lateAlias, false, "an aliased deployment must not be deleted");
        assert.equal(options.method, "DELETE");
        assert.match(pathname, /\/v13\/deployments\/dpl_VipBootstrap$/u);
        deleted = true;
        return { ok: true, status: 204, value: null };
      },
      async run() { return { stdout: "https://ghost-vipapp-bootstrap.vercel.app" }; },
    });

    await assert.rejects(
      bootstrapRollback({ repoRoot: "/fixture/repo", commit: baselineCommit }, runtime),
      lateAlias ? /candidate_is_not_aliasless/u : /bootstrap_archive_bad/u,
    );
    assert.equal(deleted, !lateAlias);
  }
});

test("candidate deploys the committed root aliaslessly, attaches metadata, and attests before returning", async (t) => {
  const previousSecret = process.env.GHOST_SECRET;
  const previousWebkit = process.env.GHOST_VIP_WEBKIT_EXECUTABLE;
  t.after(() => {
    if (previousSecret === undefined) delete process.env.GHOST_SECRET;
    else process.env.GHOST_SECRET = previousSecret;
    if (previousWebkit === undefined) delete process.env.GHOST_VIP_WEBKIT_EXECUTABLE;
    else process.env.GHOST_VIP_WEBKIT_EXECUTABLE = previousWebkit;
  });
  process.env.GHOST_SECRET = "must-not-reach-child";
  process.env.GHOST_VIP_WEBKIT_EXECUTABLE = "/opt/ghost/webkit";
  const commit = "d".repeat(40);
  const rollbackDeployment = "dpl_PreviousProduction";
  const candidateDeployment = "dpl_ExactCandidate";
  const commands = [];
  let cleaned = false;
  let attested = null;
  const runtime = {
    git(_repoRoot, args) {
      const key = args.join(" ");
      if (key === "branch --show-current") return RELEASE_CONFIG.releaseBranch;
      if (key === "status --porcelain=v1 --untracked-files=all") return "";
      if (key === "rev-parse --abbrev-ref --symbolic-full-name @{upstream}") {
        return `origin/${RELEASE_CONFIG.releaseBranch}`;
      }
      if (key === "rev-list --left-right --count HEAD...@{upstream}") return "0\t0";
      if (key === "rev-parse HEAD") return commit;
      if (key.startsWith("ls-remote --exit-code --heads origin ")) {
        return `${commit}\trefs/heads/${RELEASE_CONFIG.releaseBranch}`;
      }
      throw new Error(`unexpected git call: ${key}`);
    },
    readJson() {
      return {
        projectId: RELEASE_CONFIG.projectId,
        orgId: RELEASE_CONFIG.teamId,
        projectName: RELEASE_CONFIG.projectName,
      };
    },
    async readVercelToken() {
      return "fixture-token";
    },
    async vercelApi(pathname) {
      return releaseProjectApiFixture(pathname);
    },
    materializeCommitUploadRoot() {
      return {
        root: "/fixture/committed-source",
        paths: 263,
        cleanup() {
          cleaned = true;
        },
      };
    },
    async resolveProductionDeploymentId() {
      return rollbackDeployment;
    },
    async getVercelDeployment(value) {
      if (value === rollbackDeployment) {
        return releaseDeployment(rollbackDeployment, { commit, rollbackCommit: commit });
      }
      assert.ok(["ghost-vipapp-fixture.vercel.app", candidateDeployment].includes(value));
      return releaseDeployment(candidateDeployment, {
        commit,
        rollbackCommit: commit,
        fixedDeploymentId: rollbackDeployment,
        rollbackDeploymentId: rollbackDeployment,
      });
    },
    run(command, args, options) {
      commands.push({ command, args, options });
      return { stdout: "https://ghost-vipapp-fixture.vercel.app" };
    },
    async attestDeploymentSource(options) {
      attested = options;
      return {
        ok: true,
        deploymentId: options.deploymentId,
        commit,
        ref: RELEASE_CONFIG.releaseBranch,
        source: "cli",
        archiveForm: "archive",
        expectedPaths: 263,
        deployedPaths: 263,
        lfsFiles: 0,
        failures: 0,
      };
    },
    async restoreDeploymentSource() {
      throw new Error("fake attestation must own restoration");
    },
    async readWebsiteCompatibilityProof() {
      return {
        deploymentId: websiteDeploymentId,
        commit: websiteCommit,
        ref: "codex/vip-manager-production-backend-20260727",
        source: "cli",
        contract: "ticket-wallet-inert-v1",
        digest: websiteCompatibilityDigest(),
      };
    },
  };

  const result = await createCandidate({ repoRoot: "/fixture/repo" }, runtime);

  assert.equal(cleaned, true);
  assert.equal(result.deploymentId, candidateDeployment);
  assert.equal(result.rollbackDeployment, rollbackDeployment);
  assert.equal(attested.deploymentId, candidateDeployment);
  assert.equal(attested.expected.commit, commit);
  assert.equal(commands.length, 1);
  assert.equal(commands[0].command, "npx");
  assert.deepEqual(commands[0].args.slice(0, 5), [
    "--no-install",
    "vercel",
    "deploy",
    "/fixture/committed-source",
    "--prod",
  ]);
  assert.ok(commands[0].args.includes("--skip-domain"));
  assert.ok(commands[0].args.includes(`gitCommitSha=${commit}`));
  assert.ok(commands[0].args.includes(`gitCommitRef=${RELEASE_CONFIG.releaseBranch}`));
  assert.ok(commands[0].args.includes("source=cli"));
  assert.ok(commands[0].args.includes(`rollbackDeploymentId=${rollbackDeployment}`));
  assert.ok(commands[0].args.includes(`fixedPredecessorDeploymentId=${rollbackDeployment}`));
  assert.ok(commands[0].args.some((value) => /^rollbackBindingSha256=[0-9a-f]{64}$/u.test(value)));
  assert.ok(commands[0].args.includes(`websiteDeploymentId=${websiteDeploymentId}`));
  assert.ok(commands[0].args.includes(`websiteCommitSha=${websiteCommit}`));
  assert.ok(commands[0].args.some((value) => /^websiteCompatibilitySha256=[0-9a-f]{64}$/u.test(value)));
  assert.equal(commands[0].options.env.VERCEL_PROJECT_ID, RELEASE_CONFIG.projectId);
  assert.equal(commands[0].options.env.VERCEL_ORG_ID, RELEASE_CONFIG.teamId);
  assert.equal(commands[0].options.env.GHOST_SECRET, undefined);
  assert.equal(commands[0].options.env.GHOST_VIP_WEBKIT_EXECUTABLE, undefined);
});

test("candidate refuses every pre-existing alias, not only the fixed Production hostname", async () => {
  const runtime = baseReleaseRuntime({
    async getVercelDeployment(value) {
      if (value === "dpl_VipRollback") return releaseDeployment(value, {
        alias: [RELEASE_CONFIG.productionHostname],
      });
      if (value === "ghost-vipapp-candidate.vercel.app") {
        return releaseDeployment("dpl_VipCandidate", { alias: ["unexpected-alias.example"] });
      }
      throw new Error(`unexpected_deployment:${value}`);
    },
    async mutateVercelProject() { throw new Error("aliased candidate must never be deleted"); },
  });

  await assert.rejects(
    createCandidate({ repoRoot: "/fixture/repo" }, runtime),
    /candidate_is_not_aliasless/u,
  );
});

test("candidate source failure deletes only the exact safe deployment and confirms absence", async () => {
  let deleted = false;
  let deletedId = null;
  const base = baseReleaseRuntime();
  const runtime = baseReleaseRuntime({
    async getVercelDeployment(value) {
      if (deleted && value === "dpl_VipCandidate") {
        throw Object.assign(new Error("vercel_api_404"), { status: 404 });
      }
      return base.getVercelDeployment(value);
    },
    async attestDeploymentSource(options) {
      if (options.deploymentId === "dpl_VipCandidate") throw new Error("candidate_archive_bad");
      return base.attestDeploymentSource(options);
    },
    async mutateVercelProject(pathname, _auth, options) {
      assert.equal(options.method, "DELETE");
      assert.match(pathname, /\/v13\/deployments\/dpl_VipCandidate$/u);
      deletedId = pathname.split("/").at(-1);
      deleted = true;
      return { ok: true, status: 204, value: null };
    },
  });

  await assert.rejects(
    createCandidate({ repoRoot: "/fixture/repo" }, runtime),
    /candidate_archive_bad/u,
  );
  assert.equal(deletedId, "dpl_VipCandidate");
});

test("candidate cleanup re-reads safety and final success rechecks zero aliases", async () => {
  for (const failureMode of ["archive-failure", "late-success-alias"]) {
    let sourceRead = false;
    let mutations = 0;
    const base = baseReleaseRuntime();
    const runtime = baseReleaseRuntime({
      async getVercelDeployment(value) {
        if (value === "ghost-vipapp-candidate.vercel.app" || value === "dpl_VipCandidate") {
          return releaseDeployment("dpl_VipCandidate", {
            alias: sourceRead ? ["late.example"] : [],
          });
        }
        return base.getVercelDeployment(value);
      },
      async attestDeploymentSource(options) {
        if (options.deploymentId === "dpl_VipCandidate") {
          sourceRead = true;
          if (failureMode === "archive-failure") throw new Error("candidate_archive_bad");
        }
        return base.attestDeploymentSource(options);
      },
      async mutateVercelProject() { mutations += 1; },
    });

    await assert.rejects(
      createCandidate({ repoRoot: "/fixture/repo" }, runtime),
      /candidate_is_not_aliasless/u,
    );
    assert.equal(mutations, 0);
  }
});

test("candidate cleanup refuses foreign, current, and rollback deployment IDs", async () => {
  for (const scenario of ["foreign", "current", "rollback"]) {
    let mutations = 0;
    const base = baseReleaseRuntime();
    const runtime = baseReleaseRuntime({
      async getVercelDeployment(value) {
        if (value === "ghost-vipapp-candidate.vercel.app") {
          if (scenario === "foreign") {
            return { ...releaseDeployment("dpl_ForeignCandidate"), projectId: "prj_foreign" };
          }
          return releaseDeployment("dpl_VipRollback");
        }
        return base.getVercelDeployment(value);
      },
      async mutateVercelProject() { mutations += 1; },
    });
    await assert.rejects(
      createCandidate({ repoRoot: "/fixture/repo" }, runtime),
      scenario === "foreign" ? /deployment_project_mismatch/u : /candidate_matches_protected_deployment/u,
    );
    assert.equal(mutations, 0);
  }
});

test("candidate byte-attests the rollback project/team/READY/CLI/commit/ref before reporting it ready", async () => {
  const attestations = [];
  const runtime = baseReleaseRuntime({
    async attestDeploymentSource(options) {
      attestations.push(options);
      return {
        ok: true,
        deploymentId: options.deploymentId,
        commit: releaseCommit,
        ref: RELEASE_CONFIG.releaseBranch,
        source: "cli",
        failures: [],
      };
    },
  });

  const result = await createCandidate({ repoRoot: "/fixture/repo" }, runtime);

  assert.deepEqual(attestations.map(({ deploymentId }) => deploymentId), [
    "dpl_VipRollback",
    "dpl_VipCandidate",
  ]);
  assert.equal(attestations[0].expected.projectId, RELEASE_CONFIG.projectId);
  assert.equal(attestations[0].expected.teamId, RELEASE_CONFIG.teamId);
  assert.equal(attestations[0].expected.commit, releaseCommit);
  assert.equal(attestations[0].expected.ref, RELEASE_CONFIG.releaseBranch);
  assert.equal(result.rollbackReady, true);
  assert.equal(result.rollbackAttestation.deploymentId, "dpl_VipRollback");
});

test("candidate refuses null-meta fixed as rollback and accepts only an explicit source-attested anchor", async () => {
  const runtime = baseReleaseRuntime({
    async resolveProductionDeploymentId() { return "dpl_LegacyNullMeta"; },
    async getVercelDeployment(value) {
      if (value === "dpl_LegacyNullMeta") {
        return {
          id: value,
          projectId: RELEASE_CONFIG.projectId,
          ownerId: RELEASE_CONFIG.teamId,
          readyState: "READY",
          target: "production",
          alias: [RELEASE_CONFIG.productionHostname],
          source: null,
          meta: { gitCommitSha: null, gitCommitRef: null, source: null },
        };
      }
      if (value === "dpl_VipBootstrap") return releaseDeployment(value);
      if (value === "ghost-vipapp-candidate.vercel.app" || value === "dpl_VipCandidate") return releaseDeployment("dpl_VipCandidate", {
        fixedDeploymentId: "dpl_LegacyNullMeta",
        rollbackDeploymentId: "dpl_VipBootstrap",
      });
      throw new Error(`unexpected_deployment:${value}`);
    },
  });

  await assert.rejects(
    createCandidate({ repoRoot: "/fixture/repo" }, runtime),
    /rollback_git_commit_sha_missing/u,
  );
  const result = await createCandidate({
    repoRoot: "/fixture/repo",
    rollbackDeployment: "dpl_VipBootstrap",
  }, runtime);
  assert.equal(result.fixedDeploymentBeforeCandidate, "dpl_LegacyNullMeta");
  assert.equal(result.rollbackDeployment, "dpl_VipBootstrap");
  assert.equal(result.rollbackReady, true);
});

test("VIP bootstrap anchor is durably sealed through candidate and promotion while fixed CAS stays separate", async () => {
  const baselineCommit = RELEASE_CONFIG.bootstrapBaselineCommit;
  const fixedId = "dpl_LegacyNullMeta";
  const anchorId = "dpl_VipBootstrap";
  const candidateId = "dpl_VipFeature";
  let deploys = 0;
  let promoted = false;
  const runtime = baseReleaseRuntime({
    git(repoRoot, args) {
      if (args[0] === "merge-base") return "";
      return baseReleaseRuntime().git(repoRoot, args);
    },
    async resolveProductionDeploymentId(hostname) {
      if (hostname === RELEASE_CONFIG.websiteProductionHostname) return websiteDeploymentId;
      return promoted ? candidateId : fixedId;
    },
    async getVercelDeployment(value) {
      if (value === fixedId) return {
        id: value,
        projectId: RELEASE_CONFIG.projectId,
        ownerId: RELEASE_CONFIG.teamId,
        readyState: "READY",
        target: "production",
        alias: [RELEASE_CONFIG.productionHostname],
        source: null,
        meta: { gitCommitSha: null, gitCommitRef: null, source: null },
      };
      if (value === anchorId || value === "ghost-vipapp-bootstrap.vercel.app") {
        return releaseDeployment(anchorId, { commit: baselineCommit, rollbackCommit: baselineCommit });
      }
      if (value === candidateId || value === "ghost-vipapp-candidate.vercel.app") {
        return releaseDeployment(candidateId, {
          alias: promoted ? [RELEASE_CONFIG.productionHostname] : [],
          fixedDeploymentId: fixedId,
          rollbackDeploymentId: anchorId,
          rollbackCommit: baselineCommit,
        });
      }
      if (value === websiteDeploymentId) return websiteFixedDeployment();
      throw new Error(`unexpected_deployment:${value}`);
    },
    async attestDeploymentSource({ deploymentId }) {
      return {
        ok: true,
        deploymentId,
        commit: deploymentId === anchorId ? baselineCommit : releaseCommit,
        ref: RELEASE_CONFIG.releaseBranch,
        source: "cli",
        failures: [],
      };
    },
    async run(command, args) {
      if (command === "npx" && args.includes("deploy")) {
        deploys += 1;
        return { stdout: deploys === 1
          ? "https://ghost-vipapp-bootstrap.vercel.app"
          : "https://ghost-vipapp-candidate.vercel.app" };
      }
      if (command === "npx" && args.includes("promote")) promoted = true;
      return { stdout: "" };
    },
  });

  const bootstrap = await bootstrapRollback({ repoRoot: "/fixture/repo", commit: baselineCommit }, runtime);
  const candidate = await createCandidate({
    repoRoot: "/fixture/repo",
    rollbackDeployment: bootstrap.rollbackDeployment,
  }, runtime);
  const promotion = await promoteCandidate({
    repoRoot: "/fixture/repo",
    deploymentId: candidate.deploymentId,
    rollbackDeployment: bootstrap.rollbackDeployment,
  }, runtime);

  assert.equal(candidate.rollbackBinding.fixedDeploymentId, fixedId);
  assert.equal(candidate.rollbackBinding.rollbackDeploymentId, anchorId);
  assert.equal(promotion.fixedDeployment, candidateId);
  assert.equal(promotion.rollbackDeployment, anchorId);
  assert.equal(promotion.rollbackReady, true);
});

test("promotion runs every Gate, re-attests the exact candidate, and reads fixed plus rollback state", async (t) => {
  const previousSecret = process.env.GHOST_SECRET;
  const previousWebkit = process.env.GHOST_VIP_WEBKIT_EXECUTABLE;
  t.after(() => {
    if (previousSecret === undefined) delete process.env.GHOST_SECRET;
    else process.env.GHOST_SECRET = previousSecret;
    if (previousWebkit === undefined) delete process.env.GHOST_VIP_WEBKIT_EXECUTABLE;
    else process.env.GHOST_VIP_WEBKIT_EXECUTABLE = previousWebkit;
  });
  process.env.GHOST_SECRET = "must-not-reach-child";
  process.env.GHOST_VIP_WEBKIT_EXECUTABLE = "/opt/ghost/webkit";
  const commit = "e".repeat(40);
  const candidateDeployment = "dpl_VerifiedCandidate";
  const rollbackDeployment = "dpl_RollbackAnchor";
  const commands = [];
  let fixedResolutionCount = 0;
  let attestationCount = 0;
  const candidate = releaseDeployment(candidateDeployment, {
    commit,
    rollbackCommit: commit,
    fixedDeploymentId: rollbackDeployment,
    rollbackDeploymentId: rollbackDeployment,
  });
  const rollback = releaseDeployment(rollbackDeployment, { commit, rollbackCommit: commit });
  const runtime = {
    git(_repoRoot, args) {
      const key = args.join(" ");
      if (key === "branch --show-current") return RELEASE_CONFIG.releaseBranch;
      if (key === "status --porcelain=v1 --untracked-files=all") return "";
      if (key === "rev-parse --abbrev-ref --symbolic-full-name @{upstream}") {
        return `origin/${RELEASE_CONFIG.releaseBranch}`;
      }
      if (key === "rev-list --left-right --count HEAD...@{upstream}") return "0\t0";
      if (key === "rev-parse HEAD") return commit;
      if (key.startsWith("ls-remote --exit-code --heads origin ")) {
        return `${commit}\trefs/heads/${RELEASE_CONFIG.releaseBranch}`;
      }
      throw new Error(`unexpected git call: ${key}`);
    },
    readJson() {
      return {
        projectId: RELEASE_CONFIG.projectId,
        orgId: RELEASE_CONFIG.teamId,
        projectName: RELEASE_CONFIG.projectName,
      };
    },
    async readVercelToken() {
      return "fixture-token";
    },
    async vercelApi(pathname) {
      return releaseProjectApiFixture(pathname);
    },
    async resolveProductionDeploymentId() {
      fixedResolutionCount += 1;
      return fixedResolutionCount < 3 ? rollbackDeployment : candidateDeployment;
    },
    async getVercelDeployment(value) {
      if (value === candidateDeployment) {
        if (fixedResolutionCount >= 3) {
          return { ...candidate, alias: [RELEASE_CONFIG.productionHostname] };
        }
        return candidate;
      }
      if (value === rollbackDeployment) return rollback;
      throw new Error(`unexpected deployment read: ${value}`);
    },
    async attestDeploymentSource(options) {
      attestationCount += 1;
      assert.ok([rollbackDeployment, candidateDeployment].includes(options.deploymentId));
      assert.equal(options.expected.commit, commit);
      return {
        ok: true,
        deploymentId: options.deploymentId,
        commit,
        ref: RELEASE_CONFIG.releaseBranch,
        source: "cli",
        archiveForm: "archive",
        expectedPaths: 263,
        deployedPaths: 263,
        lfsFiles: 0,
        failures: 0,
      };
    },
    async restoreDeploymentSource() {
      throw new Error("fake attestation must own restoration");
    },
    async acquirePromotionLease() {
      return { id: "env_VipLease", owner: `v1.${"x".repeat(24)}.1893456000000` };
    },
    async releasePromotionLease() {
      return { released: true };
    },
    async readWebsiteCompatibilityProof() {
      return {
        deploymentId: websiteDeploymentId,
        commit: websiteCommit,
        ref: "codex/vip-manager-production-backend-20260727",
        source: "cli",
        contract: "ticket-wallet-inert-v1",
        digest: websiteCompatibilityDigest(),
      };
    },
    run(command, args, options) {
      commands.push({ command, args, options });
      return { stdout: "" };
    },
  };

  const result = await promoteCandidate(
    { repoRoot: "/fixture/repo", deploymentId: candidateDeployment },
    runtime,
  );

  assert.deepEqual(commands.map(({ command, args }) => [command, ...args]), [
    ["npm", "run", "ci"],
    ["npm", "run", "e2e:staging:release"],
    [
      "npx",
      "--no-install",
      "vercel",
      "promote",
      candidateDeployment,
      "--yes",
      "--scope",
      RELEASE_CONFIG.scope,
    ],
  ]);
  assert.equal(attestationCount, 2);
  assert.equal(result.fixedDeployment, candidateDeployment);
  assert.equal(result.rollbackDeployment, rollbackDeployment);
  assert.equal(result.commit, commit);
  assert.equal(result.ref, RELEASE_CONFIG.releaseBranch);
  assert.equal(result.source, "cli");
  assert.equal(result.rollbackReady, true);
  assert.equal(result.rollbackAttestation.deploymentId, rollbackDeployment);
  for (const command of commands) assert.equal(command.options.env.GHOST_SECRET, undefined);
  assert.equal(commands[0].options.env.GHOST_VIP_WEBKIT_EXECUTABLE, "/opt/ghost/webkit");
  assert.equal(commands[1].options.env.GHOST_VIP_WEBKIT_EXECUTABLE, "/opt/ghost/webkit");
  assert.equal(commands[2].options.env.GHOST_VIP_WEBKIT_EXECUTABLE, undefined);
});

test("promotion fails closed when the provider-scoped promotion lease is already held", async () => {
  let resolution = 0;
  const commands = [];
  const runtime = baseReleaseRuntime({
    async resolveProductionDeploymentId() {
      resolution += 1;
      return resolution < 3 ? "dpl_VipRollback" : "dpl_VipCandidate";
    },
    async getVercelDeployment(value) {
      if (value === "dpl_VipRollback") return releaseDeployment(value, {
        alias: [RELEASE_CONFIG.productionHostname],
      });
      if (value === "dpl_VipCandidate") return releaseDeployment(value, {
        alias: resolution >= 3 ? [RELEASE_CONFIG.productionHostname] : [],
      });
      throw new Error(`unexpected_deployment:${value}`);
    },
    async acquirePromotionLease() {
      throw new Error("promotion_lease_held");
    },
    async run(command, args) {
      commands.push([command, ...args]);
      return { stdout: "" };
    },
  });

  await assert.rejects(
    promoteCandidate({ repoRoot: "/fixture/repo", deploymentId: "dpl_VipCandidate" }, runtime),
    /promotion_lease_held/u,
  );
  assert.deepEqual(commands, [
    ["npm", "run", "ci"],
    ["npm", "run", "e2e:staging:release"],
  ]);
});

test("promotion rejects an operator rollback override that differs from candidate metadata", async () => {
  await assert.rejects(
    promoteCandidate({
      repoRoot: "/fixture/repo",
      deploymentId: "dpl_VipCandidate",
      rollbackDeployment: "dpl_AttackerAnchor",
    }, baseReleaseRuntime()),
    /promote_rollback_override_mismatch/u,
  );
});

test("promotion byte-attests the exact rollback before returning rollbackReady", async () => {
  let resolution = 0;
  const attestations = [];
  const runtime = baseReleaseRuntime({
    async resolveProductionDeploymentId() {
      resolution += 1;
      return resolution < 3 ? "dpl_VipRollback" : "dpl_VipCandidate";
    },
    async getVercelDeployment(value) {
      if (value === "dpl_VipRollback") return releaseDeployment(value, {
        alias: [RELEASE_CONFIG.productionHostname],
      });
      if (value === "dpl_VipCandidate") return releaseDeployment(value, {
        alias: resolution >= 3 ? [RELEASE_CONFIG.productionHostname] : [],
      });
      throw new Error(`unexpected_deployment:${value}`);
    },
    async attestDeploymentSource(options) {
      attestations.push(options);
      return {
        ok: true,
        deploymentId: options.deploymentId,
        commit: releaseCommit,
        ref: RELEASE_CONFIG.releaseBranch,
        source: "cli",
        failures: [],
      };
    },
    async run() { return { stdout: "" }; },
  });

  const result = await promoteCandidate({
    repoRoot: "/fixture/repo",
    deploymentId: "dpl_VipCandidate",
  }, runtime);

  assert.deepEqual(attestations.map(({ deploymentId }) => deploymentId), [
    "dpl_VipRollback",
    "dpl_VipCandidate",
  ]);
  assert.equal(result.rollbackReady, true);
  assert.equal(result.rollbackAttestation.deploymentId, "dpl_VipRollback");
});

test("promotion rechecks the fixed alias under its lease and refuses an intervening change", async () => {
  let aliasChanged = false;
  let leaseReleased = false;
  const commands = [];
  const runtime = baseReleaseRuntime({
    async resolveProductionDeploymentId() {
      return aliasChanged ? "dpl_ConcurrentWriter" : "dpl_VipRollback";
    },
    async acquirePromotionLease() {
      aliasChanged = true;
      return { id: "env_VipLease", owner: `v1.${"x".repeat(24)}.1893456000000` };
    },
    async releasePromotionLease({ lease }) {
      assert.equal(lease.id, "env_VipLease");
      leaseReleased = true;
    },
    async run(command, args) {
      commands.push([command, ...args]);
      return { stdout: "" };
    },
  });

  await assert.rejects(
    promoteCandidate({ repoRoot: "/fixture/repo", deploymentId: "dpl_VipCandidate" }, runtime),
    /fixed_production_changed_under_promotion_lease/u,
  );
  assert.deepEqual(commands, [
    ["npm", "run", "ci"],
    ["npm", "run", "e2e:staging:release"],
  ]);
  assert.equal(leaseReleased, true);
});

test("promotion reruns source and sole-writer preflight under its lease", async () => {
  for (const scenario of ["git-link", "source-drift"]) {
    let leaseHeld = false;
    let leaseReleased = false;
    const commands = [];
    const runtime = baseReleaseRuntime({
      async acquirePromotionLease() {
        leaseHeld = true;
        return { id: "env_VipLease", owner: `v1.${"x".repeat(24)}.1893456000000` };
      },
      async releasePromotionLease() { leaseReleased = true; },
      async run(command, args) {
        commands.push([command, ...args]);
        return { stdout: "" };
      },
    });
    const originalGit = runtime.git;
    runtime.git = (repoRoot, args) => {
      if (scenario === "source-drift" && leaseHeld && args[0] === "status") return " M drift";
      return originalGit(repoRoot, args);
    };
    const originalApi = runtime.vercelApi;
    runtime.vercelApi = async (pathname, auth) => {
      const value = await originalApi(pathname, auth);
      return scenario === "git-link"
        && leaseHeld
        && pathname === `/v9/projects/${RELEASE_CONFIG.projectId}`
        ? { ...value, link: { type: "github", repo: "concurrent-writer" } }
        : value;
    };

    await assert.rejects(
      promoteCandidate({ repoRoot: "/fixture/repo", deploymentId: "dpl_VipCandidate" }, runtime),
      scenario === "git-link" ? /vercel_git_writer_still_enabled/u : /release_requires_clean_git/u,
    );
    assert.deepEqual(commands, [
      ["npm", "run", "ci"],
      ["npm", "run", "e2e:staging:release"],
    ]);
    assert.equal(leaseReleased, true);
  }
});

test("promotion rechecks aliasless candidate and READY rollback under its lease", async () => {
  for (const scenario of ["candidate-alias", "rollback-not-ready"]) {
    let leaseHeld = false;
    let leaseReleased = false;
    const commands = [];
    const runtime = baseReleaseRuntime({
      async acquirePromotionLease() {
        leaseHeld = true;
        return { id: "env_VipLease", owner: `v1.${"x".repeat(24)}.1893456000000` };
      },
      async releasePromotionLease() { leaseReleased = true; },
      async getVercelDeployment(value) {
        if (value === "dpl_VipCandidate") {
          return releaseDeployment(value, {
            alias: leaseHeld && scenario === "candidate-alias" ? ["late.example"] : [],
          });
        }
        if (value === "dpl_VipRollback") {
          const rollback = releaseDeployment(value, { alias: [RELEASE_CONFIG.productionHostname] });
          return leaseHeld && scenario === "rollback-not-ready"
            ? { ...rollback, readyState: "ERROR" }
            : rollback;
        }
        throw new Error(`unexpected_deployment:${value}`);
      },
      async run(command, args) {
        commands.push([command, ...args]);
        return { stdout: "" };
      },
    });

    await assert.rejects(
      promoteCandidate({ repoRoot: "/fixture/repo", deploymentId: "dpl_VipCandidate" }, runtime),
      scenario === "candidate-alias"
        ? /candidate_is_not_aliasless_under_promotion_lease/u
        : /deployment_not_ready:ERROR/u,
    );
    assert.deepEqual(commands, [
      ["npm", "run", "ci"],
      ["npm", "run", "e2e:staging:release"],
    ]);
    assert.equal(leaseReleased, true);
  }
});

test("promotion re-attests the sealed Website inert proof under the lease and refuses drift", async () => {
  for (const scenario of ["stale-source", "readiness-drift"]) {
    let proofReads = 0;
    let leaseReleased = false;
    const commands = [];
    const runtime = baseReleaseRuntime({
      async readWebsiteCompatibilityProof() {
        proofReads += 1;
        const proof = {
          deploymentId: websiteDeploymentId,
          commit: websiteCommit,
          ref: "codex/vip-manager-production-backend-20260727",
          source: "cli",
          contract: "ticket-wallet-inert-v1",
          digest: websiteCompatibilityDigest(),
        };
        if (proofReads === 3 && scenario === "stale-source") {
          return { ...proof, deploymentId: "dpl_StaleWebsite" };
        }
        if (proofReads === 3 && scenario === "readiness-drift") {
          throw new Error("website_inert_compatibility_mismatch");
        }
        return proof;
      },
      async releasePromotionLease() { leaseReleased = true; },
      async run(command, args) {
        commands.push([command, ...args]);
        return { stdout: "" };
      },
    });

    await assert.rejects(
      promoteCandidate({ repoRoot: "/fixture/repo", deploymentId: "dpl_VipCandidate" }, runtime),
      scenario === "stale-source"
        ? /website_compatibility_binding_mismatch/u
        : /website_inert_compatibility_mismatch/u,
    );
    assert.equal(proofReads, 3);
    assert.deepEqual(commands, [
      ["npm", "run", "ci"],
      ["npm", "run", "e2e:staging:release"],
    ]);
    assert.equal(leaseReleased, true);
  }
});

test("promotion lease uses create-without-upsert and deletes only its owned env ID", async () => {
  const owner = `v1.${"q".repeat(24)}.1893456000000`;
  const calls = [];
  const readPaths = [];
  let present = true;
  const runtime = {
    createPromotionLeaseOwner() { return owner; },
    async mutateVercelProject(pathname, _auth, options) {
      calls.push({ pathname, options });
      if (options.method === "POST") {
        return {
          ok: true,
          status: 200,
          value: { created: { id: "env_VipOwnedLease" }, failed: [] },
        };
      }
      assert.equal(options.method, "DELETE");
      assert.match(pathname, /\/env\/env_VipOwnedLease$/u);
      present = false;
      return { ok: true, status: 200, value: {} };
    },
    async vercelApi(pathname) {
      readPaths.push(pathname);
      if (pathname.endsWith("/env")) {
        return {
          envs: present ? [{
            id: "env_UnrelatedSecret",
            key: "DATABASE_PASSWORD",
            target: ["production"],
          }, {
            id: "env_VipOwnedLease",
            key: RELEASE_CONFIG.promotionLeaseKey,
            target: ["production"],
            gitBranch: null,
            customEnvironmentIds: [],
          }] : [{ id: "env_UnrelatedSecret", key: "DATABASE_PASSWORD" }],
        };
      }
      assert.match(pathname, /\/env\/env_VipOwnedLease\?decrypt=true$/u);
      return {
        id: "env_VipOwnedLease",
        key: RELEASE_CONFIG.promotionLeaseKey,
        value: owner,
        type: "plain",
        target: ["production"],
        gitBranch: null,
        customEnvironmentIds: [],
      };
    },
  };
  const auth = { token: "fixture", teamId: RELEASE_CONFIG.teamId };
  const lease = await acquirePromotionLease({
    auth,
    expectedDeploymentId: "dpl_VipRollback",
    candidateDeploymentId: "dpl_VipCandidate",
  }, runtime);
  await releasePromotionLease({ lease, auth }, runtime);

  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.body.key, RELEASE_CONFIG.promotionLeaseKey);
  assert.equal(calls[0].options.body.value, owner);
  assert.deepEqual(calls[0].options.body.target, ["production"]);
  assert.equal(calls[0].options.body.type, "plain");
  assert.doesNotMatch(calls[0].pathname, /upsert=true/u);
  assert.equal(calls[1].options.method, "DELETE");
  assert.ok(readPaths.every((pathname) => pathname.endsWith("/env")
    || pathname.endsWith("/env/env_VipOwnedLease?decrypt=true")));
  assert.ok(readPaths.every((pathname) => !pathname.endsWith("/env?decrypt=true")));
});

test("promotion lease never auto-breaks an existing/stale record and treats cleanup residue as release failure", async () => {
  const owner = `v1.${"q".repeat(24)}.1893456000000`;
  let acquisitionMutations = 0;
  await assert.rejects(
    acquirePromotionLease({
      auth: { token: "fixture", teamId: RELEASE_CONFIG.teamId },
      expectedDeploymentId: "dpl_VipRollback",
      candidateDeploymentId: "dpl_VipCandidate",
    }, {
      createPromotionLeaseOwner() { return owner; },
      async mutateVercelProject(_pathname, _auth, options) {
        acquisitionMutations += 1;
        assert.equal(options.method, "POST");
        return { ok: false, status: 409, value: { error: { code: "env_conflict" } } };
      },
      async vercelApi() { throw new Error("existing lease must not be read or deleted"); },
    }),
    /promotion_lease_held/u,
  );
  assert.equal(acquisitionMutations, 1);

  const lease = { id: "env_VipOwnedLease", owner };
  await assert.rejects(
    releasePromotionLease({
      lease,
      auth: { token: "fixture", teamId: RELEASE_CONFIG.teamId },
    }, {
      async mutateVercelProject(_pathname, _auth, options) {
        assert.equal(options.method, "DELETE");
        return { ok: true, status: 200, value: {} };
      },
      async vercelApi(pathname) {
        if (pathname.includes("/env/env_VipOwnedLease?decrypt=true")) {
          return {
            id: lease.id,
            key: RELEASE_CONFIG.promotionLeaseKey,
            value: owner,
            type: "plain",
            target: ["production"],
            gitBranch: null,
            customEnvironmentIds: [],
          };
        }
        return {
          envs: [{
            id: lease.id,
            key: RELEASE_CONFIG.promotionLeaseKey,
            target: ["production"],
            gitBranch: null,
            customEnvironmentIds: [],
          }],
        };
      },
    }),
    /promotion_lease_cleanup_failed:200/u,
  );
});

test("promotion lease cleans only an owned exact ID after an ambiguous partial create", async () => {
  const owner = `v1.${"q".repeat(24)}.1893456000000`;
  const calls = [];
  let present = true;
  const runtime = {
    createPromotionLeaseOwner() { return owner; },
    async mutateVercelProject(pathname, _auth, options) {
      calls.push({ pathname, options });
      if (options.method === "POST") {
        return {
          ok: true,
          status: 200,
          value: {
            created: { id: "env_VipPartialLease" },
            failed: [{ error: { code: "ambiguous_partial_create" } }],
          },
        };
      }
      assert.equal(options.method, "DELETE");
      assert.match(pathname, /\/env\/env_VipPartialLease$/u);
      present = false;
      return { ok: true, status: 200, value: {} };
    },
    async vercelApi(pathname) {
      if (pathname.includes("/env/env_VipPartialLease?decrypt=true")) {
        return {
          id: "env_VipPartialLease",
          key: RELEASE_CONFIG.promotionLeaseKey,
          value: owner,
          type: "plain",
          target: ["production"],
          gitBranch: null,
          customEnvironmentIds: [],
        };
      }
      return {
        envs: present ? [{
          id: "env_VipPartialLease",
          key: RELEASE_CONFIG.promotionLeaseKey,
          target: ["production"],
          gitBranch: null,
          customEnvironmentIds: [],
        }] : [],
      };
    },
  };

  await assert.rejects(
    acquirePromotionLease({
      auth: { token: "fixture", teamId: RELEASE_CONFIG.teamId },
      expectedDeploymentId: "dpl_VipRollback",
      candidateDeploymentId: "dpl_VipCandidate",
    }, runtime),
    /promotion_lease_held_or_ambiguous/u,
  );
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.method, "DELETE");
});

test("concurrent duplicate VIP leases each clean only their exact owned ID and both fail closed", async () => {
  const owners = ["a", "b"].map((value) => `v1.${value.repeat(24)}.1893456000000`);
  const leases = [];
  const deletes = [];
  let ownerIndex = 0;
  let releaseBothCreates;
  const bothCreated = new Promise((resolve) => { releaseBothCreates = resolve; });
  const runtime = {
    createPromotionLeaseOwner() {
      const owner = owners[ownerIndex];
      ownerIndex += 1;
      return owner;
    },
    async mutateVercelProject(pathname, _auth, options) {
      if (options.method === "POST") {
        const lease = { id: `env_Race${leases.length + 1}`, owner: options.body.value };
        leases.push(lease);
        if (leases.length === 2) releaseBothCreates();
        await bothCreated;
        return { ok: true, status: 200, value: { created: { id: lease.id }, failed: [] } };
      }
      const id = pathname.split("/").at(-1);
      deletes.push(id);
      const index = leases.findIndex((lease) => lease.id === id);
      if (index >= 0) leases.splice(index, 1);
      return { ok: true, status: 200, value: {} };
    },
    async vercelApi(pathname) {
      const exactId = pathname.match(/\/env\/(env_Race\d)\?decrypt=true$/u)?.[1];
      if (exactId) {
        const lease = leases.find((value) => value.id === exactId);
        return lease ? {
          id: lease.id,
          key: RELEASE_CONFIG.promotionLeaseKey,
          value: lease.owner,
          type: "plain",
          target: ["production"],
          gitBranch: null,
          customEnvironmentIds: [],
        } : null;
      }
      return {
        envs: leases.map((lease) => ({
          id: lease.id,
          key: RELEASE_CONFIG.promotionLeaseKey,
          target: ["production"],
          gitBranch: null,
          customEnvironmentIds: [],
        })),
      };
    },
  };
  const auth = { token: "fixture", teamId: RELEASE_CONFIG.teamId };
  const results = await Promise.allSettled([1, 2].map(() => acquirePromotionLease({
    auth,
    expectedDeploymentId: "dpl_VipRollback",
    candidateDeploymentId: "dpl_VipCandidate",
  }, runtime)));

  assert.deepEqual(results.map((result) => result.status), ["rejected", "rejected"]);
  assert.ok(results.every((result) => /promotion_lease_ambiguous/u.test(result.reason.message)));
  assert.deepEqual(deletes.sort(), ["env_Race1", "env_Race2"]);
  assert.deepEqual(leases, []);
});

test("VIP release cleans its exact lease amid a late sibling then reports concurrent writer", async () => {
  const owner = `v1.${"q".repeat(24)}.1893456000000`;
  const lease = { id: "env_VipOwnedLease", owner };
  let ownPresent = true;
  let deleted = null;
  const sibling = {
    id: "env_VipSiblingLease",
    key: RELEASE_CONFIG.promotionLeaseKey,
    target: ["production"],
    gitBranch: null,
    customEnvironmentIds: [],
  };
  const runtime = {
    async mutateVercelProject(pathname) {
      deleted = pathname.split("/").at(-1);
      ownPresent = false;
      return { ok: true, status: 200, value: {} };
    },
    async vercelApi(pathname) {
      if (pathname.includes("/env/env_VipOwnedLease?decrypt=true")) {
        return {
          id: lease.id,
          key: RELEASE_CONFIG.promotionLeaseKey,
          value: owner,
          type: "plain",
          target: ["production"],
          gitBranch: null,
          customEnvironmentIds: [],
        };
      }
      return {
        envs: [
          ...(ownPresent ? [{ ...sibling, id: lease.id }] : []),
          sibling,
        ],
      };
    },
  };

  await assert.rejects(
    releasePromotionLease({
      lease,
      auth: { token: "fixture", teamId: RELEASE_CONFIG.teamId },
    }, runtime),
    /promotion_concurrent_writer_detected/u,
  );
  assert.equal(deleted, lease.id);
  assert.equal(ownPresent, false);
});

test("release CLI, committed-source exclusions, and the normal CI contract are wired together", async () => {
  const packageValue = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(
    packageValue.scripts["release:vip-manager"],
    "node scripts/release-vip-manager.mjs",
  );
  assert.match(packageValue.scripts["test:contract"], /tests\/contract\/\*\.test\.mjs/u);
  assert.match(packageValue.scripts.ci, /npm run test(?:\s|$)/u);
  assert.match(packageValue.scripts.ci, /npm run test:a11y/u);

  const vercelIgnore = readFileSync(".vercelignore", "utf8").split(/\r?\n/u);
  for (const required of [
    ".git",
    ".next",
    ".vercel",
    "node_modules",
    "*.log",
    "*.tsbuildinfo",
    ".env",
    ".env.*",
  ]) {
    assert.ok(vercelIgnore.includes(required), `.vercelignore missing ${required}`);
  }

  const usage = await runNodeScript("scripts/release-vip-manager.mjs", {});
  assert.equal(usage.code, 1);
  assert.match(
    usage.stderr,
    /usage: npm run release:vip-manager -- preflight\|bootstrap-rollback\|candidate\|promote/u,
  );
});
