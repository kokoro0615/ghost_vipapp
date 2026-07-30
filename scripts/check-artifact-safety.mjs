#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_ROOTS = ["artifacts", "test-results", "playwright-report", "coverage"];
const TEXT_EXTENSIONS = new Set([
  ".css", ".csv", ".html", ".json", ".log", ".md", ".svg", ".txt", ".xml", ".yaml", ".yml",
]);

export const SENSITIVE_PATTERNS = Object.freeze([
  { id: "authorization", pattern: /\bauthorization\s*[:=]\s*(?:basic|bearer)\s+[A-Za-z0-9+/._=-]{8,}/iu },
  { id: "session_cookie", pattern: /\b(?:set-cookie|cookie)\s*[:=][^\n]*(?:ghost_vipapp_admin_session|admin_session)=([^;\s]{4,})/iu },
  { id: "owner_pin", pattern: /\b(?:VIPAPP_OWNER_PIN|owner_?pin|pin)\s*[:=]\s*["']?(?!REDACTED|MASKED|<redacted>)[0-9]{4,12}\b/iu },
  { id: "email", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu },
  { id: "jp_phone", pattern: /(?:\+81[-\s]?(?:[1-9]\d{0,3})|0\d{1,4})[-\s]?\d{1,4}[-\s]?\d{3,4}/u },
]);

export function inspectText(text) {
  return SENSITIVE_PATTERNS
    .filter(({ pattern }) => pattern.test(text))
    .map(({ id }) => id);
}

async function collectFiles(target) {
  const info = await stat(target).catch(() => null);
  if (!info) return [];
  if (info.isFile()) return [target];
  if (!info.isDirectory()) return [];

  const entries = await readdir(target, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = path.join(target, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(child));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

export async function scanArtifactRoots(roots) {
  const findings = [];
  for (const root of roots) {
    const files = await collectFiles(root);
    for (const file of files) {
      if (!TEXT_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
      const text = await readFile(file, "utf8");
      const matches = inspectText(text);
      if (matches.length > 0) findings.push({ file, matches });
    }
  }
  return findings;
}

export function formatFindingReport(findings) {
  return JSON.stringify({
    ok: false,
    error: "sensitive_artifact_detected",
    findings: findings.map(({ file, matches }) => ({
      fileHash: createHash("sha256").update(file).digest("hex").slice(0, 12),
      matches,
    })),
  });
}

async function main() {
  const roots = process.argv.slice(2);
  const targets = roots.length > 0 ? roots : DEFAULT_ROOTS;
  const findings = await scanArtifactRoots(targets);
  if (findings.length > 0) {
    process.stderr.write(`${formatFindingReport(findings)}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`${JSON.stringify({ ok: true, scannedRoots: targets.length })}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    process.stderr.write(`${JSON.stringify({ ok: false, error: "artifact_scan_failed" })}\n`);
    process.exitCode = 1;
  });
}
