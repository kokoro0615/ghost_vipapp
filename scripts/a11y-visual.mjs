import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { chromium, webkit } from "playwright-core";
import {
  buildQaSummary,
  QA_ALLOWED_MEDIA_SELECTORS,
  QA_MAJOR_SURFACE_SELECTORS,
  QA_VIEWPORTS,
  safeArtifactName,
} from "./light-ui-qa-manifest.mjs";

const root = process.cwd();
const port = Number(process.env.A11Y_PORT ?? 3312);
const origin = `http://127.0.0.1:${port}`;
const chromePath = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
const axePath = path.join(root, "node_modules/axe-core/axe.min.js");
const nextBin = path.join(root, "node_modules/next/dist/bin/next");
const artifactDirectory = path.resolve(
  process.env.GHOST_VIP_QA_ARTIFACT_DIR
    ?? "/tmp/ghost-vip-light-ui-qa",
);
const targetedViewport = process.env.GHOST_VIP_QA_VIEWPORT?.trim() || null;
const webkitExecutablePath = process.env.GHOST_VIP_WEBKIT_EXECUTABLE?.trim() || null;

let server;
let serverOutput = "";
const browsers = new Map();

async function main() {
  await Promise.all([access(chromePath), access(axePath), access(nextBin)]);
  server = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
    cwd: root,
    env: {
      ...process.env,
      VIPAPP_BASIC_USER: "a11y",
      VIPAPP_BASIC_PASSWORD: "synthetic-only",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk) => {
    serverOutput = `${serverOutput}${chunk}`.slice(-4000);
  });
  server.stderr.on("data", (chunk) => {
    serverOutput = `${serverOutput}${chunk}`.slice(-4000);
  });

  try {
    await waitForServer();
    browsers.set("chromium", await chromium.launch({
      executablePath: chromePath,
      headless: true,
    }));

    await mkdir(artifactDirectory, { recursive: true, mode: 0o700 });
    const results = [];
    const selectedViewports = targetedViewport
      ? QA_VIEWPORTS.filter(({ browser, width, height }) =>
          `${browser}-${width}x${height}` === targetedViewport)
      : QA_VIEWPORTS;
    assert.ok(selectedViewports.length > 0, `unknown QA viewport: ${targetedViewport}`);
    for (const viewport of selectedViewports) {
      if (!browsers.has(viewport.browser)) {
        assert.equal(viewport.browser, "webkit", `unsupported QA browser: ${viewport.browser}`);
        browsers.set("webkit", await webkit.launch({
          headless: true,
          ...(webkitExecutablePath ? { executablePath: webkitExecutablePath } : {}),
        }));
      }
      const browser = browsers.get(viewport.browser);
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        httpCredentials: {
          username: "a11y",
          password: "synthetic-only",
        },
        reducedMotion: "reduce",
      });
      results.push(...await auditViewport(context, viewport));
      await context.close();
    }
    const summary = buildQaSummary(results, artifactDirectory);
    assert.deepEqual(summary.missingStates, [], "required UI QA states missing");
    if (!targetedViewport) {
      assert.deepEqual(summary.missingViewports, [], "required UI QA viewports missing");
    }
    const reportedSummary = targetedViewport
      ? {
          ...summary,
          ok: summary.missingStates.length === 0,
          targetedViewport,
        }
      : summary;
    await writeFile(
      path.join(artifactDirectory, "qa-summary.json"),
      `${JSON.stringify({ ...reportedSummary, results }, null, 2)}\n`,
      { mode: 0o600 },
    );
    console.log(JSON.stringify(reportedSummary));
  } finally {
    await Promise.all([...browsers.values()].map((activeBrowser) => activeBrowser.close()));
    server.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => server.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 2_000)),
    ]);
  }
}

async function auditViewport(context, viewport) {
  const results = [];
  const capture = async (page, state) => {
    results.push(await auditPage(page, { state, viewport }));
  };

  const loginPage = await newQaPage(context, { authenticated: false });
  await loginPage.goto(origin, { waitUntil: "domcontentloaded" });
  await loginPage.getByLabel("Owner専用PIN").waitFor();
  await capture(loginPage, "login");
  await loginPage.close();

  const page = await newQaPage(context);
  for (const view of ["list", "floor", "chart"]) {
    await goToWorkspace(page, view);
    await capture(page, view);
  }

  await goToWorkspace(page, "list");
  await capture(page, "queue");
  await openReservationDetail(page, viewport);
  await capture(page, "inspector");

  await goToWorkspace(page, "floor");
  await page.getByRole("button", { name: "メニュー", exact: true }).click();
  await page.getByRole("dialog", { name: "メニュー" }).waitFor();
  await capture(page, "menu");

  await goToWorkspace(page, "floor");
  await page.getByRole("button", { name: /新規オペレーション/u }).click();
  const operationDialog = page.getByRole("dialog", { name: "新規オペレーション" });
  await operationDialog.waitFor();
  await operationDialog.getByLabel("プラン").waitFor();
  assert.equal(
    await operationDialog.locator('input[name="tableIds"]:checked').count(),
    0,
    "new reception must not inherit the selected reservation table",
  );
  await capture(page, "walk-in");
  await page.getByRole("tab", { name: /受付ブロック/u }).click();
  await capture(page, "block");
  await page.getByRole("tab", { name: /8段階予約/u }).click();
  for (let step = 1; step <= 8; step += 1) {
    await page.getByLabel(new RegExp(`予約作成 ${step}/8`, "u")).waitFor();
    if (step === 4) {
      await page.getByRole("group", { name: "予約卓" })
        .getByRole("checkbox", { name: /VIP-1/u })
        .check();
    }
    await capture(page, `reservation-create-${step}`);
    if (step < 8) await page.getByRole("button", { name: /次へ/u }).click();
  }
  await page.keyboard.press("Escape");

  await goToWorkspace(page, "list");
  await openReservationDetail(page, viewport);
  await page.getByRole("button", { name: "予約編集", exact: true }).click();
  await page.getByRole("dialog", { name: "予約編集" }).waitFor();
  await capture(page, "reservation-edit");
  await page.keyboard.press("Escape");

  for (const [buttonLabel, dialogLabel, state] of [
    ["チェックイン", "チェックイン", "command-check-in"],
    ["到着時刻", "到着時刻を記録", "command-arrival-time"],
    ["接客状態", "接客状態を変更", "command-service-status"],
    ["席割当", "卓割当を変更", "command-assignment"],
    ["メモ", "スタッフメモ", "command-note"],
  ]) {
    await goToWorkspace(page, "list");
    await openReservationDetail(page, viewport);
    await page.getByRole("button", { name: buttonLabel, exact: true }).click();
    await page.getByRole("dialog", { name: dialogLabel, exact: true }).waitFor();
    await capture(page, state);
    await page.keyboard.press("Escape");
  }

  await page.close();
  const extensionPage = await newQaPage(context, {
    boardPayload: {
      ...board,
      reservations: board.reservations.map((reservation) => ({
        ...reservation,
        lifecycleStatus: "checked_in",
      })),
    },
  });
  await goToWorkspace(extensionPage, "list");
  await openReservationDetail(extensionPage, viewport);
  await extensionPage.getByRole("button", { name: "利用延長", exact: true }).click();
  await extensionPage.getByRole("dialog", { name: "利用時間を延長", exact: true }).waitFor();
  await capture(extensionPage, "command-seat-extension");
  await extensionPage.close();

  const menuPage = await newQaPage(context);
  for (const [buttonName, dialogName, state] of [
    [/Waitlist/u, "Waitlist", "waitlist"],
    [/担当卓/u, "スタッフ担当卓", "staff"],
    [/SLO/u, "運用SLO / Alert", "slo"],
  ]) {
    await goToWorkspace(menuPage, "floor");
    await menuPage.getByRole("button", { name: "メニュー", exact: true }).click();
    await menuPage.getByRole("button", { name: buttonName }).click();
    await menuPage.getByRole("dialog", { name: dialogName }).waitFor();
    await capture(menuPage, state);
    await menuPage.keyboard.press("Escape");
  }

  await goToWorkspace(menuPage, "list", "guest");
  await openReservationDetail(menuPage, viewport);
  await menuPage.getByRole("button", { name: "顧客詳細を開く" }).click();
  await menuPage.getByRole("dialog", { name: "顧客詳細と紐付け" }).waitFor();
  await capture(menuPage, "customer");
  await menuPage.close();

  for (const scenario of [
    { state: "loading", boardDelayMs: 5_000, waitFor: '[aria-label="VIP Floorを読み込んでいます"]' },
    { state: "empty", boardPayload: emptyBoard, waitFor: "text=この営業日の予約はありません。新規受付から登録できます。" },
    { state: "error", boardStatus: 503, waitFor: "text=予約状態を読み込めません" },
    { state: "read-only", boardPayload: readOnlyBoard, waitFor: 'main[data-state="read_only"]' },
    { state: "stale", eventMode: "unavailable", waitFor: 'main[data-state="stale"]' },
    { state: "reconnecting", eventMode: "gap", delaySecondBoardMs: 5_000, waitFor: 'main[data-state="reconnecting"]' },
  ]) {
    const scenarioPage = await newQaPage(context, scenario);
    await scenarioPage.goto(`${origin}/?view=list&date=2026-07-26`, { waitUntil: "domcontentloaded" });
    await scenarioPage.locator(scenario.waitFor).waitFor();
    await capture(scenarioPage, scenario.state);
    await scenarioPage.close();
  }

  const emptyViewsPage = await newQaPage(context, { boardPayload: emptyBoard });
  for (const [view, heading] of [
    ["list", "来店台帳"],
    ["floor", "VIPフロア"],
    ["chart", "席の時間軸"],
  ]) {
    await goToWorkspace(emptyViewsPage, view);
    await emptyViewsPage.getByRole("heading", { name: heading }).waitFor();
    if (view === "chart") {
      assert.equal(
        await emptyViewsPage.locator('[class*="timelineRow"]').count(),
        8,
        "an empty business day must still render all eight chart rows",
      );
    }
  }
  await goToWorkspace(emptyViewsPage, "floor");
  await emptyViewsPage.getByRole("heading", { name: "VIPフロア" }).waitFor();
  assert.equal(
    await emptyViewsPage.locator('button[class*="tableNode"]').count(),
    8,
    "an empty business day must still render all eight floor tables",
  );
  await emptyViewsPage.close();

  const operationConflictPage = await newQaPage(context, { operationStatus: 409 });
  await goToWorkspace(operationConflictPage, "list");
  await operationConflictPage.getByRole("button", { name: /新規オペレーション/u }).click();
  const conflictDialog = operationConflictPage.getByRole("dialog", { name: "新規オペレーション" });
  await conflictDialog.getByRole("checkbox", { name: /VIP-1/u }).check();
  await conflictDialog.getByRole("button", { name: "競合確認して保存" }).click();
  await conflictDialog.getByRole("alert").getByText("TABLE_CONFLICT", { exact: true }).waitFor();
  await operationConflictPage.close();

  const demoLeaseRacePage = await newQaPage(context, {
    demoMode: "authenticated",
    fixedNow: "2026-07-30T21:00:00+09:00",
    demoLeaseDelayMs: 750,
  });
  await demoLeaseRacePage.goto(`${origin}/?view=list&date=2026-07-31`, {
    waitUntil: "domcontentloaded",
  });
  await demoLeaseRacePage.locator("#vip-workspace-main").waitFor();
  await demoLeaseRacePage.getByRole("button", { name: /新規オペレーション/u }).click();
  await demoLeaseRacePage.getByRole("dialog", { name: "新規オペレーション" })
    .getByLabel("プラン")
    .waitFor();
  await demoLeaseRacePage.close();

  const demoWalkInPage = await newQaPage(context, { demoMode: "authenticated" });
  await goToDemoWorkspace(demoWalkInPage, "floor", "2026-07-31");
  await demoWalkInPage.getByRole("button", { name: /新規オペレーション/u }).click();
  const demoWalkInDialog = demoWalkInPage.getByRole("dialog", { name: "新規オペレーション" });
  await demoWalkInDialog.getByLabel("プラン").waitFor();
  assert.equal(
    await demoWalkInDialog.locator('input[name="guestLabel"]').inputValue(),
    "デモWalk-inゲスト",
    "demo Walk-in must start with a safe synthetic label",
  );
  await demoWalkInDialog.locator('input[name="guestLabel"]').fill("山田太郎");
  await demoWalkInDialog.locator('textarea[name="operatorNote"]').fill("入口で到着確認済み");
  await demoWalkInDialog.getByRole("checkbox", { name: /VIP-8/u }).check();
  await demoWalkInDialog.getByRole("button", { name: "競合確認して保存" }).click();
  await demoWalkInDialog.locator("#walk-in-guest-error").waitFor();
  await demoWalkInDialog.locator("#walk-in-note-error").waitFor();
  assert.match(
    await demoWalkInDialog.locator("#walk-in-guest-error").innerText(),
    /「デモ」または「DEMO」/u,
  );
  assert.equal(await demoWalkInDialog.isVisible(), true, "invalid input must preserve the dialog");
  await demoWalkInDialog.locator('input[name="guestLabel"]').fill("デモWalk-inテスト");
  await demoWalkInDialog.locator('textarea[name="operatorNote"]').fill("デモ：入口で到着確認済み");
  await demoWalkInDialog.getByRole("button", { name: "競合確認して保存" }).click();
  await demoWalkInDialog.waitFor({ state: "hidden" });
  assert.deepEqual(demoWalkInPage.qaServerErrors, [], "demo Walk-in produced a server 5xx");
  await demoWalkInPage.close();

  const offlinePage = await newQaPage(context);
  await goToWorkspace(offlinePage, "list");
  await offlinePage.evaluate(() => window.dispatchEvent(new Event("offline")));
  await offlinePage.locator('main[data-state="stale"]').waitFor();
  await capture(offlinePage, "offline");
  await offlinePage.close();

  const conflictPage = await newQaPage(context, { commandStatus: 409 });
  await goToWorkspace(conflictPage, "list");
  await openReservationDetail(conflictPage, viewport);
  await conflictPage.getByRole("button", { name: "メモ", exact: true }).click();
  await conflictPage.getByLabel("現場共有メモ").fill("Synthetic conflict check");
  await conflictPage.getByRole("button", { name: /確認へ/u }).click();
  await conflictPage.getByRole("button", { name: /GHOSTへ反映/u }).click();
  await conflictPage.getByRole("alert").filter({ hasText: "version_conflict" }).waitFor();
  await capture(conflictPage, "conflict");
  await conflictPage.close();

  const demoLoginPage = await newQaPage(context, { demoMode: "login" });
  await demoLoginPage.goto(`${origin}/?view=list&date=2026-07-27`, {
    waitUntil: "domcontentloaded",
  });
  await demoLoginPage.getByLabel("デモ専用PIN").waitFor();
  await capture(demoLoginPage, "demo-login");
  await demoLoginPage.close();

  const demoResetPage = await newQaPage(context, { demoMode: "authenticated" });
  await goToDemoWorkspace(demoResetPage, "list", "2026-07-27");
  await demoResetPage.getByRole("button", { name: "メニュー", exact: true }).click();
  await demoResetPage.getByRole("button", { name: /デモ初期化/u }).click();
  await demoResetPage.getByRole("dialog", { name: "合成データを初期状態へ戻す" }).waitFor();
  await capture(demoResetPage, "demo-reset");
  await demoResetPage.close();

  const demoNearExpiryPage = await newQaPage(context, {
    demoMode: "authenticated",
    fixedNow: "2026-08-27T12:00:00+09:00",
  });
  await goToDemoWorkspace(demoNearExpiryPage, "list", "2026-08-27");
  await demoNearExpiryPage.locator('[data-expiry-phase="near"]').first().waitFor();
  await capture(demoNearExpiryPage, "demo-near-expiry");
  await demoNearExpiryPage.close();

  const demoExpiredPage = await newQaPage(context, { demoMode: "expired" });
  await demoExpiredPage.goto(`${origin}/?view=list&date=2026-08-27`, {
    waitUntil: "domcontentloaded",
  });
  await demoExpiredPage.getByRole("heading", { name: "デモ利用期間は終了しました" }).waitFor();
  await capture(demoExpiredPage, "demo-expired");
  await demoExpiredPage.close();

  return results;
}

async function newQaPage(context, scenario = {}) {
  const page = await context.newPage();
  page.qaConsoleErrors = [];
  page.qaServerErrors = [];
  page.qaHttpErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") page.qaConsoleErrors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) page.qaHttpErrors.push({
      status: response.status(),
      url: new URL(response.url()).pathname,
    });
    if (response.status() >= 500) page.qaServerErrors.push({
      status: response.status(),
      url: new URL(response.url()).pathname,
    });
  });
  await installSyntheticRoutes(page, scenario);
  return page;
}

async function goToWorkspace(page, view, detail = null) {
  const detailQuery = detail ? `&detail=${encodeURIComponent(detail)}` : "";
  await page.goto(`${origin}/?view=${view}&date=2026-07-26${detailQuery}`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator("#vip-workspace-main").waitFor();
}

async function goToDemoWorkspace(page, view, date) {
  await page.goto(`${origin}/?view=${view}&date=${date}`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator("#vip-workspace-main").waitFor();
  await page.locator('[data-lease-state="active"]').first().waitFor();
}

async function openReservationDetail(page, viewport) {
  const details = page.getByRole("button", { name: /の詳細を開く/u }).first();
  await details.waitFor();
  await details.click();
  // Below 1024 the workspace is a single column and detail opens as a sheet;
  // the docked desktop inspector only exists at 1024 and above.
  if (viewport.width < 1024) {
    await page.getByRole("dialog", { name: "予約詳細" }).waitFor();
  } else {
    await page.locator('[data-instance="desktop"]').waitFor();
  }
}

async function waitForServer() {
  const authorization = `Basic ${Buffer.from("a11y:synthetic-only").toString("base64")}`;

  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`a11y_server_exited:${server.exitCode}:${serverOutput}`);
    }
    try {
      const response = await fetch(origin, {
        headers: { authorization },
      });
      if (response.ok) return;
    } catch {
      // Retry during startup.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`a11y_server_timeout:${serverOutput}`);
}

async function installSyntheticRoutes(page, scenario = {}) {
  if (scenario.fixedNow) {
    await page.addInitScript((fixedNow) => {
      const fixedTime = Date.parse(fixedNow);
      Date.now = () => fixedTime;
    }, scenario.fixedNow);
  }
  await page.addInitScript(({ eventMode }) => {
    window.EventSource = class SyntheticEventSource {
      listeners = new Map();
      timer = null;
      constructor() {
        if (!eventMode) return;
        this.timer = window.setTimeout(() => {
          if (eventMode === "unavailable") this.emit("unavailable", {});
          if (eventMode === "gap") {
            this.emit("revision", {
              data: JSON.stringify({ businessDate: "2026-07-26", revision: 45 }),
            });
          }
        }, 350);
      }
      addEventListener(name, listener) {
        const listeners = this.listeners.get(name) ?? [];
        listeners.push(listener);
        this.listeners.set(name, listeners);
      }
      removeEventListener(name, listener) {
        this.listeners.set(name, (this.listeners.get(name) ?? []).filter((item) => item !== listener));
      }
      emit(name, event) {
        for (const listener of this.listeners.get(name) ?? []) listener(event);
      }
      close() {
        if (this.timer) window.clearTimeout(this.timer);
      }
    };
  }, { eventMode: scenario.eventMode ?? null });
  const demoPublicConfig = {
    mode: "demo",
    workspaceId: "visual-qa-demo-workspace",
    dataVersion: "visual-qa-v1",
    startsAt: "2026-07-27T00:00:00+09:00",
    expiresAt: "2026-08-27T23:59:59+09:00",
    leaseIntervalMs: 60_000,
  };
  const demoServerNow = scenario.fixedNow ?? new Date().toISOString();
  const demoLeaseExpiresAt = new Date(Date.parse(demoServerNow) + 60_000).toISOString();
  await page.route("**/api/admin/session/pin", (route) => route.fulfill({
    status: scenario.authenticated === false ? 401 : 200,
    contentType: "application/json",
    body: JSON.stringify(scenario.authenticated === false
      ? { ok: false, error: "invalid_pin" }
      : { ok: true, role: "owner", displayName: "Owner" }),
  }));
  await page.route("**/api/admin/session", (route) => {
    if (scenario.demoMode === "expired") {
      return route.fulfill({
        status: 410,
        contentType: "application/json",
        body: JSON.stringify({
          ...demoPublicConfig,
          ok: false,
          authenticated: false,
          error: "demo_expired",
        }),
      });
    }
    if (scenario.demoMode === "login") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...demoPublicConfig,
          ok: false,
          authenticated: false,
        }),
      });
    }
    if (scenario.demoMode === "authenticated") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...demoPublicConfig,
          ok: true,
          authenticated: true,
          role: "owner-compatible-demo",
          displayName: "Demo Operator",
        }),
      });
    }
    return route.fulfill({
      status: scenario.authenticated === false ? 401 : 200,
      contentType: "application/json",
      body: JSON.stringify(scenario.authenticated === false
        ? { ok: false, error: "unauthenticated" }
        : { ok: true, role: scenario.role ?? "owner", displayName: scenario.role === "viewer" ? "Viewer" : "Owner" }),
    });
  });
  await page.route("**/api/admin/demo/lease", async (route) => {
    if (scenario.demoLeaseDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, scenario.demoLeaseDelayMs));
    }
    await route.fulfill({
      status: scenario.demoMode === "expired" ? 410 : 200,
      contentType: "application/json",
      body: JSON.stringify(scenario.demoMode === "expired"
        ? { ok: false, error: "demo_expired" }
        : {
            ...demoPublicConfig,
            ok: true,
            serverNow: demoServerNow,
            leaseExpiresAt: demoLeaseExpiresAt,
          }),
    });
  });
  await page.route("**/api/admin/vip-floor/options?**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(operationOptions),
  }));
  await page.route("**/api/admin/vip-floor/waitlist?**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(waitlist),
  }));
  await page.route("**/api/admin/vip-floor/staff?**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(staff),
  }));
  await page.route("**/api/admin/vip-floor/customers/**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(customerDetail),
  }));
  await page.route("**/api/admin/vip-floor/observability**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(observability),
  }));
  await page.route("**/api/admin/vip-floor/commands", (route) => route.fulfill({
    status: scenario.commandStatus ?? 200,
    contentType: "application/json",
    body: JSON.stringify(scenario.commandStatus === 409
      ? {
          ok: false,
          code: "version_conflict",
          error: "version_conflict",
          message: "別端末の更新を検知しました。",
          recovery: "最新状態を再読込してから明示的に再試行してください。",
        }
      : {
          ok: true,
          message: "Synthetic command accepted",
          boardRevision: 43,
          entityVersion: 5,
          auditLogId: "synthetic-audit",
      }),
  }));
  await page.route("**/api/admin/vip-floor/operations", (route) => route.fulfill({
    status: scenario.operationStatus ?? 200,
    contentType: "application/json",
    body: JSON.stringify(scenario.operationStatus === 409
      ? {
          ok: false,
          code: "TABLE_CONFLICT",
          error: "TABLE_CONFLICT",
          message: "対象卓には同時間帯の予約があります。",
        }
      : {
          ok: true,
          message: "Synthetic operation accepted",
          boardRevision: 43,
          entityVersion: 5,
          auditLogId: "synthetic-operation-audit",
        }),
  }));
  let boardRequests = 0;
  await page.route("**/api/admin/vip-floor?**", async (route) => {
    boardRequests += 1;
    const delayMs = boardRequests > 1
      ? scenario.delaySecondBoardMs ?? 0
      : scenario.boardDelayMs ?? 0;
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({
      status: scenario.boardStatus ?? 200,
      contentType: "application/json",
      body: JSON.stringify(scenario.boardStatus && scenario.boardStatus >= 400
        ? { ok: false, error: "synthetic_board_failure" }
        : scenario.boardPayload ?? board),
    });
  });
}

async function auditPage(page, { state, viewport }) {
  const viewportKey = `${viewport.browser}-${viewport.width}x${viewport.height}`;
  const label = `${viewportKey}:${state}`;
  await page.addScriptTag({ path: axePath });
  const report = await page.evaluate(async () =>
    window.axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
      },
    }));
  const actionable = report.violations.filter((violation) =>
    violation.impact === "critical"
    || violation.impact === "serious"
    || violation.impact === "moderate");
  const actionableTargets = actionable.flatMap((violation) =>
    violation.nodes.flatMap((node) => node.target));
  const targetGeometry = actionableTargets.length > 0
    ? await page.evaluate((selectors) => selectors.map((selector) => {
        const element = document.querySelector(selector);
        const label = element?.closest("label");
        const rect = element?.getBoundingClientRect();
        const labelRect = label?.getBoundingClientRect();
        const style = element ? getComputedStyle(element) : null;
        return {
          selector,
          rect: rect ? { width: rect.width, height: rect.height, x: rect.x, y: rect.y } : null,
          labelRect: labelRect
            ? { width: labelRect.width, height: labelRect.height, x: labelRect.x, y: labelRect.y }
            : null,
          margin: style?.margin ?? null,
          opacity: style?.opacity ?? null,
          color: style?.color ?? null,
          backgroundColor: style?.backgroundColor ?? null,
          disabled: element instanceof HTMLButtonElement || element instanceof HTMLInputElement
            ? element.disabled
            : null,
        };
      }), actionableTargets)
    : [];
  assert.deepEqual(
    {
      violations: actionable.map(({ id, impact, nodes }) => ({
        id,
        impact,
        targets: nodes.map((node) => ({
          target: node.target,
          failureSummary: node.failureSummary,
        })),
      })),
      targetGeometry,
    },
    { violations: [], targetGeometry: [] },
    `axe violations in ${label}`,
  );

  const layout = await page.evaluate(({ majorSurfaceSelectors, allowedMediaSelectors }) => {
    function parseRgb(value) {
      const match = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/u.exec(value);
      if (!match) return null;
      return {
        r: Number(match[1]) / 255,
        g: Number(match[2]) / 255,
        b: Number(match[3]) / 255,
        a: match[4] === undefined ? 1 : Number(match[4]),
      };
    }
    function linear(channel) {
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    }
    function luminance(color) {
      return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
    }
    function hueAndSaturation(color) {
      const max = Math.max(color.r, color.g, color.b);
      const min = Math.min(color.r, color.g, color.b);
      const delta = max - min;
      const lightness = (max + min) / 2;
      if (delta === 0) return { hue: 0, saturation: 0, lightness };
      const saturation = delta / (1 - Math.abs(2 * lightness - 1));
      const hueBase = max === color.r
        ? ((color.g - color.b) / delta) % 6
        : max === color.g
          ? (color.b - color.r) / delta + 2
          : (color.r - color.g) / delta + 4;
      return { hue: (hueBase * 60 + 360) % 360, saturation, lightness };
    }
    function visible(element) {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== "hidden"
        && style.display !== "none"
        && rect.width > 0
        && rect.height > 0;
    }
    function mediaAllowed(element, style) {
      return allowedMediaSelectors.some((selector) => element.matches(selector))
        || style.backgroundImage.includes("url(");
    }
    const controls = [...document.querySelectorAll("button, input, select, textarea")]
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.visibility !== "hidden"
          && style.display !== "none"
          && rect.width > 0
          && rect.height > 0
          && !element.disabled;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const type = element.getAttribute("type");
        const labelElement = ["checkbox", "radio"].includes(type ?? "")
          ? element.closest("label")
          : null;
        const touchRect = labelElement?.getBoundingClientRect() ?? rect;
        return {
          label: element.getAttribute("aria-label")
            || labelElement?.textContent?.trim()
            || element.textContent?.trim()
            || element.tagName,
          width: touchRect.width,
          height: touchRect.height,
        };
      })
      .filter((control) => control.width < 44 || control.height < 44);
    const majorSurfaceFailures = [];
    for (const selector of majorSurfaceSelectors) {
      for (const element of document.querySelectorAll(selector)) {
        if (!visible(element)) continue;
        const style = getComputedStyle(element);
        if (mediaAllowed(element, style)) continue;
        const color = parseRgb(style.backgroundColor);
        if (!color || color.a < 0.9) continue;
        const rect = element.getBoundingClientRect();
        if (rect.width * rect.height < 8_000) continue;
        if (luminance(color) < 0.68) {
          majorSurfaceFailures.push({
            selector,
            className: typeof element.className === "string" ? element.className : "",
            backgroundColor: style.backgroundColor,
            luminance: luminance(color),
          });
        }
      }
    }
    const purpleChrome = [];
    const colorProperties = [
      "backgroundColor",
      "borderTopColor",
      "borderRightColor",
      "borderBottomColor",
      "borderLeftColor",
      "color",
      "outlineColor",
    ];
    for (const element of document.querySelectorAll("body *")) {
      if (!visible(element)) continue;
      const style = getComputedStyle(element);
      if (mediaAllowed(element, style)) continue;
      for (const property of colorProperties) {
        const color = parseRgb(style[property]);
        if (!color || color.a < 0.3) continue;
        const hsl = hueAndSaturation(color);
        if (
          hsl.hue >= 255
          && hsl.hue <= 325
          && hsl.saturation >= 0.18
          && hsl.lightness >= 0.06
          && hsl.lightness <= 0.92
        ) {
          purpleChrome.push({
            tag: element.tagName,
            className: typeof element.className === "string" ? element.className : "",
            property,
            value: style[property],
          });
          break;
        }
      }
    }
    const colorOnlyStatuses = [...document.querySelectorAll("[data-tone], [data-state], [data-cue]")]
      .filter(visible)
      .filter((element) => {
        const accessibleText = [
          element.getAttribute("aria-label"),
          element.getAttribute("title"),
          element.textContent,
        ].filter(Boolean).join(" ").trim();
        return accessibleText.length === 0;
      })
      .map((element) => ({
        tag: element.tagName,
        className: typeof element.className === "string" ? element.className : "",
      }));
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      undersizedControls: controls,
      colorScheme: {
        root: getComputedStyle(document.documentElement).colorScheme,
        body: getComputedStyle(document.body).colorScheme,
      },
      majorSurfaceFailures,
      purpleChrome,
      colorOnlyStatuses,
    };
  }, {
    majorSurfaceSelectors: QA_MAJOR_SURFACE_SELECTORS,
    allowedMediaSelectors: QA_ALLOWED_MEDIA_SELECTORS,
  });
  assert.equal(layout.documentWidth, layout.viewportWidth, `horizontal overflow in ${label}`);
  assert.deepEqual(layout.undersizedControls, [], `undersized controls in ${label}`);
  assert.match(layout.colorScheme.root, /light/u, `root color-scheme must be light in ${label}`);
  assert.match(layout.colorScheme.body, /light/u, `body color-scheme must be light in ${label}`);
  assert.deepEqual(layout.majorSurfaceFailures, [], `dark major surfaces in ${label}`);
  assert.deepEqual(layout.purpleChrome, [], `old purple chrome in ${label}`);
  assert.deepEqual(layout.colorOnlyStatuses, [], `color-only status in ${label}`);
  const unexpectedConsoleErrors = page.qaConsoleErrors.filter((entry) =>
    !(
      (state === "login" && /status of 401 \(Unauthorized\)/u.test(entry))
      || (state === "demo-expired" && /status of 410 \(Gone\)/u.test(entry))
      || (state === "error" && /status of 503 \(Service Unavailable\)/u.test(entry))
      || (state === "conflict" && /status of 409 \(Conflict\)/u.test(entry))
    ));
  assert.deepEqual(
    unexpectedConsoleErrors,
    [],
    `console errors in ${label}; HTTP ${JSON.stringify(page.qaHttpErrors)}`,
  );
  const unexpected5xx = page.qaServerErrors.filter((entry) =>
    !(state === "error" && entry.status === 503 && entry.url === "/api/admin/vip-floor"));
  assert.deepEqual(unexpected5xx, [], `unexpected server 5xx in ${label}`);
  const screenshotPath = path.join(
    artifactDirectory,
    viewportKey,
    `${safeArtifactName(state)}.jpg`,
  );
  await mkdir(path.dirname(screenshotPath), { recursive: true, mode: 0o700 });
  await page.screenshot({
    path: screenshotPath,
    type: "jpeg",
    quality: 78,
    fullPage: true,
    animations: "disabled",
  });
  return {
    state,
    viewport: viewportKey,
    screenshot: path.relative(artifactDirectory, screenshotPath),
  };
}

const tableIds = Array.from(
  { length: 8 },
  (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
);

// Match the Production GHOST floor geometry. The earlier oversized 15×17%
// fixture masked undersized table controls that occur at the real 4.15–4.7%.
const qaTableGeometry = [
  { x: 72.8, y: 17.9, size: 4.7, rotation: 0 },
  { x: 71.6, y: 71.9, size: 4.45, rotation: -6 },
  { x: 50.9, y: 71.6, size: 4.45, rotation: 0 },
  { x: 40.8, y: 71.6, size: 4.45, rotation: 0 },
  { x: 42.5, y: 53.3, size: 4.3, rotation: 0 },
  { x: 51.9, y: 53.3, size: 4.3, rotation: 0 },
  { x: 51.8, y: 16.1, size: 4.15, rotation: 0 },
  { x: 44.2, y: 16.1, size: 4.15, rotation: 0 },
];

const board = {
  schemaVersion: "vip-floor.v2",
  generatedAt: "2026-07-26T13:15:00.000Z",
  boardRevision: 42,
  businessDay: {
    id: "10000000-0000-4000-8000-000000000001",
    businessDate: "2026-07-26",
    venueTimezone: "Asia/Tokyo",
    operatingStartAt: "2026-07-26T13:00:00.000Z",
    operatingEndAt: "2026-07-26T20:00:00.000Z",
  },
  capabilities: {
    readCustomerPii: true,
    changeServiceStatus: true,
    changeAssignments: true,
    changeSchedule: true,
    manageBlocks: true,
    cancelReservation: true,
  },
  sections: [],
  tables: tableIds.map((id, index) => {
    const geometry = qaTableGeometry[index];
    return {
      id,
      version: 3,
      publicResourceCode: `VIP-${index + 1}`,
      displayCode: `VIP-${index + 1}`,
      name: `VIP TABLE ${index + 1}`,
      sectionId: "",
      capacityMin: 1,
      capacityMax: index === 0 ? 7 : 6,
      onlineEligible: true,
      geometry: {
        shape: "rect",
        xPercent: geometry.x,
        yPercent: geometry.y,
        widthPercent: geometry.size,
        heightPercent: geometry.size,
        rotationDegrees: geometry.rotation,
      },
      operationalLocked: false,
      lockReason: null,
      reservationIds: index === 0
        ? ["20000000-0000-4000-8000-000000000001"]
        : [],
      blockIds: [],
    };
  }),
  reservations: [{
    id: "20000000-0000-4000-8000-000000000001",
    version: 4,
    publicCode: "GHO-0726-01",
    businessDate: "2026-07-26",
    lifecycleStatus: "confirmed",
    serviceStatus: "expected",
    sourceChannel: "online",
    scheduledStartAt: "2026-07-26T13:30:00.000Z",
    scheduledEndAt: "2026-07-26T15:30:00.000Z",
    expectedReleaseAt: "2026-07-26T15:30:00.000Z",
    actualSeatedAt: null,
    completedAt: null,
    guestCount: { total: 4, adults: null, children: null },
    assignmentIds: ["synthetic-assignment"],
    tableIds: [tableIds[0]],
    customer: {
      customerId: "70000000-0000-4000-8000-000000000001",
      displayLabel: "GUEST ••••",
      masked: false,
    },
    payment: null,
    notes: [],
    flags: [],
    bookingOfferingId: "30000000-0000-4000-8000-000000000001",
    bookingStaffMemberId: "50000000-0000-4000-8000-000000000002",
    notificationPreference: "none",
    operatorNote: "Synthetic floor note",
    updatedAt: "2026-07-26T13:00:00.000Z",
  }],
  assignments: [],
  unassignedReservationIds: [],
  blocks: [],
  notes: [],
  totals: {
    tableCount: 8,
    reservationCount: 1,
    activeReservationCount: 1,
    assignmentCount: 1,
    unassignedReservationCount: 0,
    activeBlockCount: 0,
    noteCount: 0,
    guestCount: 4,
    serviceStatusCounts: { expected: 1 },
  },
  operations: {
    adminMutationEnabled: true,
    webhookProcessingEnabled: true,
    publicBookingEnabled: true,
  },
};

const emptyBoard = {
  ...board,
  reservations: [],
  assignments: [],
  unassignedReservationIds: [],
  notes: [],
  tables: board.tables.map((table) => ({ ...table, reservationIds: [] })),
  totals: {
    ...board.totals,
    reservationCount: 0,
    activeReservationCount: 0,
    assignmentCount: 0,
    unassignedReservationCount: 0,
    noteCount: 0,
    guestCount: 0,
    serviceStatusCounts: {},
  },
};

const readOnlyBoard = {
  ...board,
  operations: {
    ...board.operations,
    adminMutationEnabled: false,
  },
};

const operationOptions = {
  ok: true,
  businessDay: board.businessDay,
  offerings: [{
    id: "30000000-0000-4000-8000-000000000001",
    name: "GHOST VIP STANDARD",
    minGuests: 1,
    maxGuests: 20,
    minSpendYen: 0,
  }],
};

const waitlist = {
  ok: true,
  businessDate: "2026-07-26",
  entries: [{
    id: "40000000-0000-4000-8000-000000000001",
    eventDayId: board.businessDay.id,
    guestCount: 3,
    guestLabel: "WAITING GUEST",
    email: "synthetic@example.invalid",
    status: "called",
    storedStatus: "called",
    calledAt: "2026-07-26T13:10:00.000Z",
    callExpiresAt: "2026-07-26T13:40:00.000Z",
    seatedReservationId: null,
    version: 2,
    createdAt: "2026-07-26T13:00:00.000Z",
    updatedAt: "2026-07-26T13:10:00.000Z",
  }],
};

const staff = {
  ok: true,
  eventDayId: board.businessDay.id,
  staffMembers: [
    {
      id: "50000000-0000-4000-8000-000000000001",
      displayName: "ENTRY",
      active: true,
      version: 1,
      createdAt: "2026-07-26T12:00:00.000Z",
      updatedAt: "2026-07-26T12:00:00.000Z",
    },
    {
      id: "50000000-0000-4000-8000-000000000002",
      displayName: "VIP FLOOR",
      active: true,
      version: 2,
      createdAt: "2026-07-26T12:00:00.000Z",
      updatedAt: "2026-07-26T12:30:00.000Z",
    },
  ],
  tableAssignments: [{
    id: "60000000-0000-4000-8000-000000000001",
    tableId: tableIds[0],
    staffMemberId: "50000000-0000-4000-8000-000000000002",
    version: 1,
    createdAt: "2026-07-26T12:30:00.000Z",
    updatedAt: "2026-07-26T12:30:00.000Z",
  }],
};

const customerDetail = {
  ok: true,
  schemaVersion: "vip-customer.v2",
  generatedAt: "2026-07-26T13:15:00.000Z",
  accessAuditRecorded: true,
  customer: {
    id: "70000000-0000-4000-8000-000000000001",
    profilePresent: true,
    profileVersion: 2,
    languageCode: "ja",
    displayName: "SYNTHETIC GUEST",
    nameKana: null,
    phone: "+81000000000",
    email: "synthetic@example.invalid",
    allergies: null,
    preferences: null,
    attributes: {
      nationalityCode: "JP",
      birthDate: null,
      anniversaryDate: null,
      vipRank: "BLACK",
    },
    aggregates: { reservationCount: 1 },
    reservationHistory: [{
      reservationId: board.reservations[0].id,
      publicCode: board.reservations[0].publicCode,
      businessDate: "2026-07-26",
      scheduledStartAt: board.reservations[0].scheduledStartAt,
      guestCount: 4,
      lifecycleStatus: "confirmed",
      serviceStatus: "expected",
    }],
    linkHistory: [{
      eventId: "71000000-0000-4000-8000-000000000001",
      reservationId: board.reservations[0].id,
      linked: true,
      unlinked: false,
      resolutionMethod: "phone_exact",
      createdAt: "2026-07-26T13:00:00.000Z",
    }],
  },
};

const observability = {
  ok: true,
  schemaVersion: "vip-manager-slo.v1",
  generatedAt: "2026-07-26T13:15:00.000Z",
  windowMinutes: 60,
  metrics: {
    commandCount: 120,
    commandErrorCount: 0,
    commandErrorRate: 0,
    commandP95Ms: 180,
    boardReadP95Ms: 220,
    outboxDeadCount: 0,
    realtimeGapCount: 1,
    realtimeUnavailableCount: 0,
  },
  targets: {
    commandErrorRateMax: 0.01,
    commandP95MsMax: 1000,
    boardReadP95MsMax: 1000,
    outboxDeadCountMax: 0,
    realtimeGapCountMax: 3,
  },
  alerts: {},
};

await main();
