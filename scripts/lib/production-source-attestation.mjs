import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const VERCEL_API_ORIGIN = "https://api.vercel.com";

const DEFAULT_VERCEL_IGNORES = [
  ".git/",
  ".gitignore",
  ".next/",
  ".vercel/",
  "node_modules/",
  ".env",
  ".env.*",
  "*.tsbuildinfo",
];

function git(repoRoot, args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: null,
    maxBuffer: 1 << 30,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function readCommitTree(repoRoot, commit) {
  if (!/^[0-9a-f]{40}$/u.test(commit)) throw new Error("release_commit_sha_invalid");
  const records = git(repoRoot, ["ls-tree", "-rz", commit])
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
  return records.map((record) => {
    const match = record.match(/^(\d{6}) (\w+) ([0-9a-f]{40})\t(.+)$/u);
    if (!match) throw new Error("release_commit_tree_invalid");
    return {
      mode: match[1],
      type: match[2],
      oid: match[3],
      path: safeDeploymentPath(match[4]),
    };
  });
}

function readBlob(repoRoot, oid) {
  return git(repoRoot, ["cat-file", "blob", oid]);
}

function globExpression(pattern) {
  let expression = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "*" && pattern[index + 1] === "*") {
      expression += ".*";
      index += 1;
    } else if (character === "*") {
      expression += "[^/]*";
    } else if (character === "?") {
      expression += "[^/]";
    } else {
      expression += character.replace(/[|\\{}()[\]^$+?.]/gu, "\\$&");
    }
  }
  return expression;
}

function matchesIgnorePattern(relative, rawPattern) {
  const anchored = rawPattern.startsWith("/");
  let pattern = anchored ? rawPattern.slice(1) : rawPattern;
  const directoryPattern = pattern.endsWith("/");
  if (directoryPattern) pattern = `${pattern}**`;
  const expression = globExpression(pattern);
  if (anchored || pattern.includes("/")) {
    return new RegExp(`^${expression}$`, "u").test(relative);
  }
  return relative.split("/").some((segment) => new RegExp(`^${expression}$`, "u").test(segment));
}

function createIgnoreMatcher(source) {
  const rules = [...DEFAULT_VERCEL_IGNORES, ...source.split(/\r?\n/u)]
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => ({ negated: line.startsWith("!"), pattern: line.replace(/^!/u, "") }));
  return (relative) => {
    let ignored = false;
    for (const rule of rules) {
      if (matchesIgnorePattern(relative, rule.pattern)) ignored = !rule.negated;
    }
    return ignored;
  };
}

function lfsPointerOid(body) {
  if (body.length > 1024) return null;
  const source = body.toString("utf8");
  if (!source.startsWith("version https://git-lfs.github.com/spec/")) return null;
  return source.match(/^oid sha256:([0-9a-f]{64})$/mu)?.[1] ?? null;
}

function expectedUploadEntries(repoRoot, commit) {
  const tree = readCommitTree(repoRoot, commit);
  const ignoreEntry = tree.find((entry) => entry.path === ".vercelignore");
  const ignoreSource = ignoreEntry ? readBlob(repoRoot, ignoreEntry.oid).toString("utf8") : "";
  const ignored = createIgnoreMatcher(ignoreSource);
  return tree.filter((entry) => !ignored(entry.path));
}

export function expectedUploadPaths(repoRoot, commit) {
  return expectedUploadEntries(repoRoot, commit).map((entry) => entry.path);
}

export function materializeCommitUploadRoot({ repoRoot, commit }) {
  const root = mkdtempSync(path.join(tmpdir(), "ghost-vip-release-source-"));
  const cleanup = () => rmSync(root, { recursive: true, force: true });
  const entries = expectedUploadEntries(repoRoot, commit);
  try {
    for (const entry of entries) {
      if (entry.type !== "blob" || !/^100(?:644|755)$/u.test(entry.mode)) {
        throw new Error(`release_source_not_regular_file:${entry.path}`);
      }
      const commitBody = readBlob(repoRoot, entry.oid);
      const pointerOid = lfsPointerOid(commitBody);
      let body = commitBody;
      if (pointerOid) {
        const source = path.join(repoRoot, entry.path);
        const sourceStat = lstatSync(source);
        if (!sourceStat.isFile()) throw new Error(`release_lfs_source_not_file:${entry.path}`);
        body = readFileSync(source);
        const digest = createHash("sha256").update(body).digest("hex");
        if (digest !== pointerOid) throw new Error(`release_lfs_content_mismatch:${entry.path}`);
      }
      const target = path.join(root, entry.path);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, body);
      chmodSync(target, entry.mode === "100755" ? 0o755 : 0o644);
    }
  } catch (error) {
    cleanup();
    throw error;
  }
  return { root, cleanup, paths: entries.length };
}

function walkFiles(root, relative = "", output = []) {
  for (const entry of readdirSync(path.join(root, relative), { withFileTypes: true })) {
    const next = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) walkFiles(root, next, output);
    else if (entry.isFile()) output.push(next);
    else throw new Error(`deployment_source_not_regular_file:${next}`);
  }
  return output;
}

export function compareDeploymentSourceToCommit({ archiveRoot, repoRoot, commit }) {
  const entries = expectedUploadEntries(repoRoot, commit);
  const expected = new Map(entries.map((entry) => [entry.path, entry]));
  const deployed = new Set(walkFiles(archiveRoot));
  const failures = [];
  let lfsFiles = 0;

  for (const [relative, entry] of expected) {
    if (!deployed.has(relative)) {
      failures.push(`expected_upload_missing:${relative}`);
      continue;
    }
    const actual = readFileSync(path.join(archiveRoot, relative));
    const commitBody = readBlob(repoRoot, entry.oid);
    const pointerOid = lfsPointerOid(commitBody);
    if (pointerOid) {
      lfsFiles += 1;
      if (createHash("sha256").update(actual).digest("hex") !== pointerOid) {
        failures.push(`lfs_content_mismatch:${relative}`);
      }
    } else if (!actual.equals(commitBody)) {
      failures.push(`commit_content_mismatch:${relative}`);
    }
  }

  for (const relative of deployed) {
    if (!expected.has(relative)) failures.push(`undeclared_deployment_source:${relative}`);
  }

  return {
    ok: failures.length === 0,
    expectedPaths: expected.size,
    deployedPaths: deployed.size,
    lfsFiles,
    failures,
  };
}

export function readDeploymentAttestation(deployment, expected) {
  const deploymentId = deployment?.id ?? deployment?.uid;
  const projectId = deployment?.projectId;
  const teamId = deployment?.ownerId;
  const state = deployment?.readyState ?? deployment?.state;
  const target = deployment?.target;
  const source = deployment?.source ?? deployment?.meta?.source;
  const metadataSource = deployment?.meta?.source;
  const commit = deployment?.meta?.gitCommitSha;
  const ref = deployment?.meta?.gitCommitRef;

  if (!/^dpl_[A-Za-z0-9]+$/u.test(deploymentId ?? "")) {
    throw new Error("deployment_id_invalid");
  }
  if (projectId !== expected.projectId) throw new Error(`deployment_project_mismatch:${projectId}`);
  if (teamId !== expected.teamId) throw new Error(`deployment_team_mismatch:${teamId}`);
  if (state !== "READY") throw new Error(`deployment_not_ready:${state}`);
  if (target !== "production") throw new Error(`deployment_target_not_production:${target}`);
  if (source !== "cli" || metadataSource !== "cli") {
    throw new Error(`deployment_source_not_cli:${source ?? "missing"}`);
  }
  if (!/^[0-9a-f]{40}$/u.test(commit ?? "")) {
    throw new Error("deployment_git_commit_sha_missing");
  }
  if (commit !== expected.commit) {
    throw new Error(`deployment_git_commit_sha_mismatch:${commit}`);
  }
  if (ref !== expected.ref) {
    throw new Error(`deployment_git_commit_ref_mismatch:${ref ?? "missing"}`);
  }

  return { deploymentId, projectId, teamId, state, target, source, commit, ref };
}

export async function attestDeploymentSource({
  deploymentId,
  repoRoot,
  expected,
  getDeployment,
  restoreDeploymentSource,
}) {
  if (typeof getDeployment !== "function" || typeof restoreDeploymentSource !== "function") {
    throw new Error("deployment_source_reader_missing");
  }
  const deployment = await getDeployment(deploymentId);
  const attestation = readDeploymentAttestation(deployment, expected);
  if (attestation.deploymentId !== deploymentId) {
    throw new Error(`deployment_id_mismatch:${attestation.deploymentId}`);
  }
  const restored = await restoreDeploymentSource(deploymentId);
  try {
    const comparison = compareDeploymentSourceToCommit({
      archiveRoot: restored.root,
      repoRoot,
      commit: attestation.commit,
    });
    if (!comparison.ok) {
      throw new Error(`deployment_source_attestation_failed:${comparison.failures.join(",")}`);
    }
    return {
      ok: true,
      deploymentId: attestation.deploymentId,
      commit: attestation.commit,
      ref: attestation.ref,
      source: attestation.source,
      archiveForm: restored.form,
      expectedPaths: comparison.expectedPaths,
      deployedPaths: comparison.deployedPaths,
      lfsFiles: comparison.lfsFiles,
      failures: comparison.failures.length,
    };
  } finally {
    await restored.cleanup();
  }
}

export async function readVercelToken() {
  if (process.env.VERCEL_TOKEN) return process.env.VERCEL_TOKEN;
  const authPath = path.join(
    process.env.HOME ?? "",
    ".local/share/com.vercel.cli/auth.json",
  );
  const value = JSON.parse(readFileSync(authPath, "utf8"));
  if (typeof value?.token !== "string" || value.token.length === 0) {
    throw new Error("vercel_token_unavailable");
  }
  return value.token;
}

export async function vercelApi(pathname, { token, teamId }, {
  timeoutMs = 120_000,
  fetchImpl = fetch,
  apiOrigin = VERCEL_API_ORIGIN,
  timeoutSignal = (ms) => AbortSignal.timeout(ms),
  waitImpl = (ms, signal) => delay(ms, undefined, { signal }),
  nowMs = () => performance.now(),
} = {}) {
  if (typeof token !== "string" || token.length === 0) throw new Error("vercel_token_unavailable");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 600_000) {
    throw new Error("vercel_api_timeout_invalid");
  }
  const url = new URL(pathname, apiOrigin);
  if (teamId) url.searchParams.set("teamId", teamId);
  // All attempts and backoff share one budget; a large blob gets at most ten
  // minutes total rather than a fresh ten minutes on every retry.
  const deadline = nowMs() + timeoutMs;
  const signal = timeoutSignal(timeoutMs);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    signal.throwIfAborted();
    if (nowMs() >= deadline) throw new DOMException("Vercel API deadline exceeded", "TimeoutError");
    let response;
    let delayMs = 250 * 2 ** attempt;
    try {
      response = await fetchImpl(url, {
        headers: { Authorization: `Bearer ${token}` },
        redirect: "error",
        signal,
      });
      if (response.status === 429 || response.status >= 500) {
        const retryAfter = Number(response.headers.get("retry-after") ?? 0);
        if (Number.isFinite(retryAfter) && retryAfter > 0) {
          delayMs = Math.min(retryAfter * 1000, 30_000);
        }
      } else {
        if (!response.ok) throw new Error(`vercel_api_${response.status}:${pathname}`);
        // Await inside the attempt so body transport failures can retry while
        // budget remains. The signal covers headers and body consumption.
        return await response.json();
      }
    } catch (error) {
      signal.throwIfAborted();
      const transient = error instanceof TypeError && (
          error.message === "fetch failed"
          || error.message === "terminated"
          || ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN", "UND_ERR_SOCKET"]
            .includes(error.cause?.code)
        );
      if (!transient || attempt === 5) throw error;
    } finally {
      // Unread error responses must not retain sockets across backoff/retry.
      if (response?.body && !response.bodyUsed) {
        await response.body.cancel().catch(() => {});
      }
    }
    if (attempt < 5) {
      if (delayMs >= deadline - nowMs()) break;
      await waitImpl(delayMs, signal);
    }
  }
  throw new Error(`vercel_api_retries_exhausted:${pathname}`);
}

export async function getVercelDeployment(deploymentIdOrHostname, auth, { api = vercelApi } = {}) {
  return api(`/v13/deployments/${encodeURIComponent(deploymentIdOrHostname)}`, auth);
}

export async function resolveProductionDeploymentId(hostname, auth, { api = vercelApi } = {}) {
  const deployment = await getVercelDeployment(hostname, auth, { api });
  const deploymentId = deployment?.id ?? deployment?.uid;
  if (!/^dpl_[A-Za-z0-9]+$/u.test(deploymentId ?? "")) {
    throw new Error("production_deployment_not_found");
  }
  return deploymentId;
}

function flattenDeploymentTree(nodes, prefix = "", output = []) {
  for (const node of nodes ?? []) {
    const name = prefix ? `${prefix}/${node.name}` : node.name;
    if (node.type === "directory") flattenDeploymentTree(node.children, name, output);
    else output.push({ path: name, uid: node.uid, type: node.type });
  }
  return output;
}

function safeDeploymentPath(relative) {
  if (
    typeof relative !== "string"
    || relative.length === 0
    || relative.includes("\\")
    || relative.includes("\0")
    || path.posix.isAbsolute(relative)
    || relative.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new Error(`deployment_source_path_invalid:${String(relative)}`);
  }
  return relative;
}

async function fetchDeploymentBlob(deploymentId, uid, auth, api) {
  if (!/^[0-9a-f]{40}$/u.test(uid ?? "")) throw new Error(`content_uid_invalid:${uid}`);
  const value = await api(
    `/v8/deployments/${encodeURIComponent(deploymentId)}/files/${encodeURIComponent(uid)}`,
    auth,
    { timeoutMs: 600_000 },
  );
  if (typeof value?.data !== "string") throw new Error(`content_envelope_invalid:${uid}`);
  const body = Buffer.from(value.data, "base64");
  const digest = createHash("sha1").update(body).digest("hex");
  if (digest !== uid) throw new Error(`content_digest_mismatch:${uid}`);
  return body;
}

function validateTarEntries(tarball) {
  const verboseEntries = execFileSync("tar", ["tvzf", tarball], {
    encoding: "utf8",
    maxBuffer: 1 << 28,
    stdio: ["ignore", "pipe", "pipe"],
  }).split("\n").filter(Boolean);
  for (const entry of verboseEntries) {
    if (entry[0] !== "-" && entry[0] !== "d") {
      throw new Error(`deployment_source_archive_entry_type_invalid:${entry[0] ?? "missing"}`);
    }
  }
  const entries = execFileSync("tar", ["tzf", tarball], {
    encoding: "utf8",
    maxBuffer: 1 << 28,
    stdio: ["ignore", "pipe", "pipe"],
  }).split("\n").filter(Boolean);
  for (const raw of entries) {
    const relative = raw.replace(/^\.\//u, "").replace(/\/$/u, "");
    if (!relative) continue;
    safeDeploymentPath(relative);
  }
}

export async function restoreDeploymentSource(
  deploymentId,
  auth,
  { api = vercelApi } = {},
) {
  const treeValue = await api(`/v6/deployments/${encodeURIComponent(deploymentId)}/files`, auth);
  const nodes = Array.isArray(treeValue) ? treeValue : treeValue?.files;
  if (!Array.isArray(nodes)) throw new Error("deployment_source_tree_invalid");
  const tree = flattenDeploymentTree(nodes);
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), "ghost-vip-source-attestation-"));
  const cleanup = async () => rmSync(temporaryRoot, { recursive: true, force: true });

  try {
    const archiveParts = tree
      .filter((entry) => /^src\/\.vercel\/source\.tgz\.part\d+$/u.test(entry.path))
      .sort((left, right) => {
        const leftPart = Number(left.path.match(/part(\d+)$/u)?.[1]);
        const rightPart = Number(right.path.match(/part(\d+)$/u)?.[1]);
        return leftPart - rightPart;
      });
    if (archiveParts.length > 0) {
      const bodies = [];
      for (const entry of archiveParts) {
        bodies.push(await fetchDeploymentBlob(deploymentId, entry.uid, auth, api));
      }
      const tarball = path.join(temporaryRoot, "source.tgz");
      writeFileSync(tarball, Buffer.concat(bodies));
      validateTarEntries(tarball);
      const extracted = path.join(temporaryRoot, "source");
      mkdirSync(extracted);
      execFileSync(
        "tar",
        ["xzf", tarball, "--no-same-owner", "--no-same-permissions", "-C", extracted],
        { stdio: ["ignore", "ignore", "pipe"] },
      );
      walkFiles(extracted);
      return { root: extracted, cleanup, deploymentId, form: "archive" };
    }

    const extracted = path.join(temporaryRoot, "source");
    mkdirSync(extracted);
    for (const entry of tree) {
      if (entry.type !== "file" || !entry.uid) {
        throw new Error(`deployment_source_entry_invalid:${entry.path}`);
      }
      const relative = safeDeploymentPath(entry.path);
      const body = await fetchDeploymentBlob(deploymentId, entry.uid, auth, api);
      const target = path.join(extracted, relative);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, body, { mode: 0o600 });
    }
    return { root: extracted, cleanup, deploymentId, form: "tree" };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
