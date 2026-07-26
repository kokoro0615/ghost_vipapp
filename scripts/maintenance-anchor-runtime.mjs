#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright-core";

const root = process.cwd();
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const traceFix = path.join(root, "scripts", "fix-middleware-trace.mjs");
const basicUser = "maintenance-runtime";
const basicPassword = "synthetic-only";
const authorization = `Basic ${Buffer.from(`${basicUser}:${basicPassword}`).toString("base64")}`;

async function startServer(port, maintenanceMode) {
  const child = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
    cwd: root,
    env: {
      ...process.env,
      VIPAPP_BASIC_USER: basicUser,
      VIPAPP_BASIC_PASSWORD: basicPassword,
      GHOST_VIP_MAINTENANCE_MODE: maintenanceMode ? "true" : "false",
      GHOST_VIP_TRIAL_MODE: "false",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => {
    output = `${output}${chunk}`.slice(-4_000);
  });
  child.stderr.on("data", (chunk) => {
    output = `${output}${chunk}`.slice(-4_000);
  });
  const origin = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`maintenance_server_exit:${child.exitCode}:${output}`);
    try {
      const response = await fetch(origin, { headers: { authorization } });
      if (response.ok) return { child, origin };
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  child.kill("SIGTERM");
  throw new Error(`maintenance_server_timeout:${output}`);
}

async function runBuild(maintenanceMode) {
  await runProcess(
    process.execPath,
    [nextBin, "build", "--webpack"],
    {
      ...process.env,
      GHOST_VIP_MAINTENANCE_MODE: maintenanceMode ? "true" : "false",
      GHOST_VIP_TRIAL_MODE: "false",
    },
    `maintenance_build_${maintenanceMode ? "true" : "false"}`,
  );
  await runProcess(process.execPath, [traceFix], process.env, "maintenance_trace_fix");
}

function runProcess(command, args, env, code) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output = `${output}${chunk}`.slice(-8_000);
    });
    child.stderr.on("data", (chunk) => {
      output = `${output}${chunk}`.slice(-8_000);
    });
    child.on("error", reject);
    child.on("close", (status) => {
      if (status === 0) resolve();
      else reject(new Error(`${code}:${status}:${output}`));
    });
  });
}

async function stopServer(child) {
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
}

async function main() {
  const basePort = Number(process.env.MAINTENANCE_QA_PORT ?? 3322);
  await runBuild(true);
  const maintenance = await startServer(basePort, true);
  let maintenanceError = null;
  try {
    const unauthenticated = await fetch(maintenance.origin);
    assert.equal(unauthenticated.status, 401, "maintenance outer Basic guard missing");
    const authenticated = await fetch(maintenance.origin, { headers: { authorization } });
    assert.equal(authenticated.status, 200);
    const html = await authenticated.text();
    assert.match(html, /Trial終了・本番移行作業中/u);
    assert.match(html, /閲覧・更新を一時停止しています/u);
    assert.doesNotMatch(html, /Owner専用PIN|vip-workspace-main|予約検索/u);
    assert.doesNotMatch(html, /<(?:form|input|button|select|textarea)\b/iu);
  } catch (error) {
    maintenanceError = error;
  } finally {
    await stopServer(maintenance.child);
    await runBuild(false);
  }
  if (maintenanceError) throw maintenanceError;

  const normal = await startServer(basePort + 1, false);
  let browser;
  try {
    const authenticated = await fetch(normal.origin, { headers: { authorization } });
    assert.equal(authenticated.status, 200);
    const html = await authenticated.text();
    assert.doesNotMatch(html, /Trial終了・本番移行作業中/u);

    browser = await chromium.launch({
      executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome",
      headless: true,
    });
    const context = await browser.newContext({
      httpCredentials: { username: basicUser, password: basicPassword },
    });
    const page = await context.newPage();
    await page.route("**/api/admin/session", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, code: "unauthorized" }),
      });
    });
    await page.goto(normal.origin, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Owner専用PIN").waitFor({ state: "visible" });
    assert.equal(
      await page.getByText(/Trial終了・本番移行作業中/u).count(),
      0,
      "maintenance anchor remained visible after the final false build",
    );
  } finally {
    await browser?.close();
    await stopServer(normal.child);
  }

  console.log(JSON.stringify({
    ok: true,
    maintenanceOuterBasic401: true,
    maintenancePinBoardMutationRoutes: 0,
    maintenanceModeTrue: true,
    defaultAndFinalFalse: true,
  }));
}

await main();
