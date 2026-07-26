import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { inspectText } from "../../scripts/check-artifact-safety.mjs";

test("artifact inspection catches auth, cookie, PIN, email, and phone leaks", () => {
  assert.deepEqual(inspectText("Authorization: Bearer abcdefghijklmnop"), ["authorization"]);
  assert.deepEqual(inspectText("Cookie: ghost_vipapp_admin_session=secret-value"), ["session_cookie"]);
  assert.deepEqual(inspectText("VIPAPP_OWNER_PIN=123456"), ["owner_pin"]);
  assert.deepEqual(inspectText("guest@example.com"), ["email"]);
  assert.deepEqual(inspectText("090-1234-5678"), ["jp_phone"]);
});

test("artifact inspection accepts redacted operational summaries", () => {
  assert.deepEqual(inspectText(JSON.stringify({
    stage: "completed",
    mutationRequests: 0,
    rowsObserved: 3,
    pin: "REDACTED",
  })), []);
});

test("artifact scanner reports only a path hash and finding class", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "ghost-vipapp-artifact-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const sensitiveFilename = "guest@example.com.log";
  const secret = "Bearer artifact-secret-value";
  await writeFile(path.join(directory, sensitiveFilename), `Authorization: ${secret}\n`, "utf8");

  const scan = await new Promise((resolve) => {
    const child = spawn(process.execPath, ["scripts/check-artifact-safety.mjs", directory], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => resolve({ code, stderr }));
  });

  assert.equal(scan.code, 1);
  assert.match(scan.stderr, /"fileHash":"[0-9a-f]{12}"/u);
  assert.match(scan.stderr, /"authorization"/u);
  assert.doesNotMatch(scan.stderr, /guest@example\.com|artifact-secret-value/u);
});
