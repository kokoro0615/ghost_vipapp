#!/usr/bin/env node
// Dependency security release gate (remediation R-02).
//
// What this enforces:
// - `npm audit --omit=dev --json` (production dependency tree): any High or
//   Critical finding without a valid, unexpired exception fails the gate.
// - `npm audit --json` (full tree, saved as the release audit artifact):
//   dev/build dependencies are reviewed with the same exception policy because
//   build-time code execution is part of the release environment.
// - Audit provider failure (transport error, error payload, malformed JSON) is
//   NEVER treated as success — the gate fails closed.
// - Exceptions live in security/dependency-audit-exceptions.json and each entry
//   MUST carry: id (GHSA-… or advisory id), package, scope
//   (production|development|all), reachability, compensatingControls,
//   approvedBy, expires (YYYY-MM-DD). An expired exception is a failure, not a
//   silent pass.
//
// Usage:
//   node scripts/dependency-audit-gate.mjs [--report <path>]
//     [--exceptions <path>] [--date <YYYY-MM-DD>]
//
// Exit codes: 0 = clean or fully excepted within policy; 1 = refused.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const BLOCKING_SEVERITIES = new Set(["high", "critical"]);
const EXCEPTION_SCOPES = new Set(["production", "development", "all"]);
const DEFAULT_EXCEPTIONS_PATH = "security/dependency-audit-exceptions.json";

function auditFindingId(viaEntry, packageName) {
  if (viaEntry && typeof viaEntry === "object") {
    const url = typeof viaEntry.url === "string" ? viaEntry.url : "";
    const ghsa = url.match(/GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}/iu);
    if (ghsa) return ghsa[0].toUpperCase();
    if (typeof viaEntry.source === "number") return `npm:${viaEntry.source}`;
    if (typeof viaEntry.title === "string" && viaEntry.title) {
      return `${packageName}:${viaEntry.title}`;
    }
  }
  return packageName;
}

function collectFindings(report, scope) {
  const findings = [];
  const vulnerabilities = report?.vulnerabilities;
  if (!vulnerabilities || typeof vulnerabilities !== "object") return findings;
  for (const [name, entry] of Object.entries(vulnerabilities)) {
    const severity = String(entry?.severity ?? "").toLowerCase();
    if (!BLOCKING_SEVERITIES.has(severity)) continue;
    const advisories = (entry?.via ?? []).filter((via) => via && typeof via === "object");
    if (advisories.length === 0) advisories.push(null);
    for (const via of advisories) {
      findings.push({
        package: name,
        scope,
        severity,
        id: auditFindingId(via, name),
        title: typeof via?.title === "string" ? via.title : null,
        url: typeof via?.url === "string" ? via.url : null,
        range: typeof entry?.range === "string" ? entry.range : null,
        direct: entry?.isDirect === true,
        fixAvailable: entry?.fixAvailable ?? null,
      });
    }
  }
  return findings;
}

function validateException(raw, index) {
  const problems = [];
  if (!raw || typeof raw !== "object") problems.push("not_an_object");
  const id = typeof raw?.id === "string" ? raw.id.trim() : "";
  if (!id) problems.push("missing_id");
  const pkg = typeof raw?.package === "string" ? raw.package.trim() : "";
  if (!pkg) problems.push("missing_package");
  const scope = typeof raw?.scope === "string" ? raw.scope : "all";
  if (!EXCEPTION_SCOPES.has(scope)) problems.push(`invalid_scope:${scope}`);
  if (typeof raw?.reachability !== "string" || raw.reachability.trim().length < 8) {
    problems.push("missing_reachability");
  }
  if (typeof raw?.compensatingControls !== "string"
    || raw.compensatingControls.trim().length < 8) {
    problems.push("missing_compensating_controls");
  }
  if (typeof raw?.approvedBy !== "string" || raw.approvedBy.trim().length < 2) {
    problems.push("missing_approved_by");
  }
  const expires = typeof raw?.expires === "string" ? raw.expires.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(expires)) problems.push("missing_or_invalid_expires");
  return Object.freeze({
    index,
    id: id.toUpperCase(),
    package: pkg,
    scope,
    expires,
    problems: Object.freeze(problems),
    raw: Object.freeze({ ...raw }),
  });
}

function exceptionApplies(exception, finding, scopeKey) {
  if (exception.problems.length > 0) return false;
  if (exception.id !== finding.id.toUpperCase()) return false;
  if (exception.package !== "*" && exception.package !== finding.package) return false;
  return exception.scope === "all" || exception.scope === scopeKey;
}

export function evaluateDependencyAudit({
  production,
  full,
  exceptions = [],
  today,
} = {}) {
  const todayDate = typeof today === "string" ? today : today.toISOString().slice(0, 10);
  const normalizedExceptions = exceptions.map(validateException);
  const expiredExceptions = normalizedExceptions.filter(
    (entry) => entry.problems.length === 0 && entry.expires < todayDate,
  );
  const invalidExceptions = normalizedExceptions.filter(
    (entry) => entry.problems.length > 0,
  );
  const liveExceptions = normalizedExceptions.filter(
    (entry) => entry.problems.length === 0 && entry.expires >= todayDate,
  );

  const productionFindings = collectFindings(production, "production");
  const fullFindings = collectFindings(full, "development");
  const productionKeys = new Set(
    productionFindings.map((f) => `${f.package}${f.id}`),
  );
  const developmentFindings = fullFindings.filter(
    (f) => !productionKeys.has(`${f.package}${f.id}`),
  );
  const findings = [...productionFindings, ...developmentFindings].map((finding) => {
    const scopeKey = productionKeys.has(`${finding.package}${finding.id}`)
      ? "production"
      : "development";
    const exception = liveExceptions.find((candidate) => exceptionApplies(
      candidate,
      finding,
      scopeKey,
    )) ?? null;
    return Object.freeze({ ...finding, scope: scopeKey, exception });
  });
  const unapproved = findings.filter((finding) => finding.exception === null);

  return Object.freeze({
    ok: unapproved.length === 0
      && expiredExceptions.length === 0
      && invalidExceptions.length === 0,
    today: todayDate,
    findings: Object.freeze(findings),
    unapproved: Object.freeze(unapproved),
    expiredExceptions: Object.freeze(expiredExceptions),
    invalidExceptions: Object.freeze(invalidExceptions),
    counts: Object.freeze({
      production: productionFindings.length,
      development: developmentFindings.length,
      excepted: findings.length - unapproved.length,
      unapproved: unapproved.length,
    }),
  });
}

function runNpmAudit(args) {
  const result = spawnSync("npm", ["audit", "--json", ...args], {
    encoding: "utf8",
    maxBuffer: 1 << 28,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) {
    return { ok: false, reason: `spawn_failed:${result.error.message}` };
  }
  const stdout = result.stdout ?? "";
  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return {
      ok: false,
      reason: `unparseable_report:exit_${result.status}:${(result.stderr ?? "").slice(0, 400)}`,
    };
  }
  if (parsed && typeof parsed === "object" && parsed.error) {
    return {
      ok: false,
      reason: `audit_error:${parsed.error.code ?? "unknown"}:${String(parsed.error.summary ?? "").slice(0, 200)}`,
    };
  }
  if (!parsed || typeof parsed.vulnerabilities !== "object") {
    return { ok: false, reason: `report_missing_vulnerabilities:exit_${result.status}` };
  }
  return { ok: true, report: parsed, exit: result.status };
}

function readExceptionsFile(filePath) {
  if (!existsSync(filePath)) {
    return { ok: true, exceptions: [], path: filePath, present: false };
  }
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8"));
    if (!Array.isArray(parsed?.exceptions)) {
      return { ok: false, reason: `exceptions_file_invalid:${filePath}` };
    }
    return { ok: true, exceptions: parsed.exceptions, path: filePath, present: true };
  } catch (error) {
    return { ok: false, reason: `exceptions_file_unparseable:${filePath}:${error.message}` };
  }
}

function parseArgs(argv) {
  const options = { report: null, exceptions: DEFAULT_EXCEPTIONS_PATH, date: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith("--report=")) options.report = arg.slice("--report=".length);
    else if (arg === "--report") {
      const next = argv[index + 1];
      if (next && !next.startsWith("--")) {
        options.report = next;
        index += 1;
      } else {
        options.report = "dependency-audit-report.json";
      }
    } else if (arg.startsWith("--exceptions=")) {
      options.exceptions = arg.slice("--exceptions=".length);
    } else if (arg === "--exceptions" && argv[index + 1] && !argv[index + 1].startsWith("--")) {
      options.exceptions = argv[index + 1];
      index += 1;
    } else if (arg.startsWith("--date=")) {
      options.date = arg.slice("--date=".length);
    } else {
      throw new Error(`usage_unknown_argument:${arg}`);
    }
  }
  return options;
}

export function main(argv = process.argv.slice(2), io = { stdout: process.stdout, stderr: process.stderr }) {
  const options = parseArgs(argv);
  const exceptionsResult = readExceptionsFile(options.exceptions);
  if (!exceptionsResult.ok) {
    io.stderr.write(`dependency audit refused: ${exceptionsResult.reason}\n`);
    return 1;
  }
  const production = runNpmAudit(["--omit=dev"]);
  if (!production.ok) {
    io.stderr.write(`dependency audit refused: production audit failed (${production.reason})\n`);
    return 1;
  }
  const full = runNpmAudit([]);
  if (!full.ok) {
    io.stderr.write(`dependency audit refused: full audit failed (${full.reason})\n`);
    return 1;
  }
  const evaluation = evaluateDependencyAudit({
    production: production.report,
    full: full.report,
    exceptions: exceptionsResult.exceptions,
    today: options.date ?? new Date(),
  });
  const artifact = {
    generatedAt: new Date().toISOString(),
    exceptionsFile: exceptionsResult.path,
    exceptionsPresent: exceptionsResult.present,
    evaluation: {
      ok: evaluation.ok,
      today: evaluation.today,
      counts: evaluation.counts,
      findings: evaluation.findings,
      unapproved: evaluation.unapproved,
      expiredExceptions: evaluation.expiredExceptions,
      invalidExceptions: evaluation.invalidExceptions,
    },
    reports: { production: production.report, full: full.report },
  };
  if (options.report) {
    const reportPath = path.resolve(options.report);
    mkdirSync(path.dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(artifact, null, 2)}\n`);
  }
  if (evaluation.ok) {
    io.stdout.write(`dependency audit gate: ok (${JSON.stringify(evaluation.counts)})\n`);
    return 0;
  }
  for (const finding of evaluation.unapproved) {
    io.stderr.write(
      `unapproved ${finding.severity} ${finding.scope} dependency finding: `
      + `${finding.package} ${finding.id} ${finding.title ?? ""}`.trimEnd() + "\n",
    );
  }
  for (const expired of evaluation.expiredExceptions) {
    io.stderr.write(`expired dependency audit exception: ${expired.id} (${expired.expires})\n`);
  }
  for (const invalid of evaluation.invalidExceptions) {
    io.stderr.write(
      `invalid dependency audit exception #${invalid.index}: ${invalid.problems.join(",")}\n`,
    );
  }
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = main();
  } catch (error) {
    process.stderr.write(`dependency audit refused: ${error.message}\n`);
    process.exitCode = 1;
  }
}
