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
import {
  createQaViewportSession,
  retireQaPage,
} from "./lib/qa-page-lifecycle.mjs";

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
const targetedState = process.env.GHOST_VIP_QA_STATE?.trim() || null;
const webkitExecutablePath = process.env.GHOST_VIP_WEBKIT_EXECUTABLE?.trim() || null;
const QA_RECOVERY_TIMEOUT_MS = 30_000;

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
      ...(targetedState === null || targetedState === "ticket-operations" || targetedState === "ticket-entry"
        ? {
            FEATURE_TICKET_MANAGER_OPERATIONS_ENABLED: "true",
            FEATURE_TICKET_REFUND_REVIEW_ENABLED: "true",
          }
        : {}),
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
    /*
     * `waitForServer` only proves that something answers on the port. If a
     * server from an earlier run still holds it, our own `next start` exits on
     * EADDRINUSE and the whole audit runs against that stale build — which is
     * exactly what happened on 2026-08-05: a server left over from a killed
     * run served a build whose CSS had since been deleted, and before that it
     * silently produced a green 561-screenshot report for code that was never
     * loaded. Auditing the wrong build is worse than not auditing at all, so
     * this fails closed.
     */
    assert.equal(server.exitCode, null,
      `the audit server exited instead of binding port ${port}; another server is `
      + `probably still holding it. Server output:\n${serverOutput}`);
    browsers.set("chromium", await chromium.launch({
      executablePath: chromePath,
      headless: true,
    }));

    await mkdir(artifactDirectory, { recursive: true, mode: 0o700 });
    const results = [];
    const notRunViewports = [];
    const selectedViewports = targetedViewport
      ? QA_VIEWPORTS.filter(({ browser, width, height }) =>
          `${browser}-${width}x${height}` === targetedViewport)
      : QA_VIEWPORTS;
    assert.ok(selectedViewports.length > 0, `unknown QA viewport: ${targetedViewport}`);
    for (const viewport of selectedViewports) {
      if (!browsers.has(viewport.browser)) {
        assert.equal(viewport.browser, "webkit", `unsupported QA browser: ${viewport.browser}`);
        try {
          browsers.set("webkit", await webkit.launch({
            headless: true,
            ...(webkitExecutablePath ? { executablePath: webkitExecutablePath } : {}),
          }));
        } catch (error) {
          /* Playwright reports a host that cannot run WebKit three different
           * ways: its own dependency probe; the browser process dying on a
           * dynamic link error once the probe passes but a library is gone;
           * and the browser revision simply never having been downloaded,
           * which is what a `playwright-core` bump produces on a host where
           * only Chromium was ever installed.
           *
           * All three are the same condition — this machine cannot start
           * WebKit — and all three must land in `notRunViewports`, which is
           * recorded explicitly and never counted as a pass. What must NOT
           * land there is a WebKit that starts and then fails the audit; that
           * is a real defect and still throws.
           *
           * Each form has crashed a full run in turn, after every Chromium
           * viewport had already been audited, throwing away those results. */
          const message = error instanceof Error ? error.message : String(error);
          const missingRuntime = message.includes("Host system is missing dependencies to run browsers");
          const missingLibrary = /error while loading shared libraries: (\S+)/u.exec(message);
          const missingBinary = /Executable doesn't exist at (\S+)/u.exec(message);
          if (!missingRuntime && !missingLibrary && !missingBinary) throw error;
          notRunViewports.push({
            viewport: `${viewport.browser}-${viewport.width}x${viewport.height}`,
            reason: missingRuntime
              ? "host-system-missing-dependencies"
              : missingLibrary
                ? `host-system-missing-shared-library:${missingLibrary[1].replace(/:$/u, "")}`
                : `host-system-missing-browser-binary:${missingBinary[1]}`,
          });
          continue;
        }
      }
      const browser = browsers.get(viewport.browser);
      /* A touch viewport must be driven as a touch device. Emulating only the
       * size leaves `hover: hover` matching, which is exactly the condition
       * under which the iPad's sticky-hover defect is invisible to the audit. */
      const context = await createQaViewportSession(browser, {
        viewport: { width: viewport.width, height: viewport.height },
        ...(viewport.touch
          ? { hasTouch: true, isMobile: viewport.browser === "chromium" }
          : {}),
        ...(viewport.scale ? { deviceScaleFactor: viewport.scale } : {}),
        httpCredentials: {
          username: "a11y",
          password: "synthetic-only",
        },
        /* The venue device is audited the way the venue runs it — motion on.
         * Everything else stays reduced, which keeps the authored static
         * fallbacks under test. */
        reducedMotion: viewport.motion ? "no-preference" : "reduce",
      });
      results.push(...await auditViewport(context, viewport));
      await context.close();
    }
    const summary = buildQaSummary(results, artifactDirectory);
    if (!targetedState) {
      assert.deepEqual(summary.missingStates, [], "required UI QA states missing");
    }
    if (!targetedViewport) {
      assert.deepEqual(
        summary.missingViewports,
        notRunViewports.map(({ viewport }) => viewport).sort(),
        "required UI QA viewports missing without an explicit launch-time not-run record",
      );
    }
    const reportedSummary = targetedViewport || targetedState
      ? {
          ...summary,
          ok: targetedState
            ? results.some((result) => ["ticket-operations", "ticket-entry"].includes(targetedState)
                ? result.state.startsWith(targetedState + "-")
                : result.state === targetedState)
            : summary.missingStates.length === 0,
          ...(targetedViewport ? { targetedViewport } : {}),
          ...(targetedState ? { targetedState } : {}),
        }
      : { ...summary, notRunViewports };
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

  if (targetedState) {
    if (targetedState === "chart-phases") {
      const phasePage = await newQaPage(context, {
        boardPayload: timelinePhaseBoard,
        fixedNow: timelinePhaseNow,
      });
      await goToWorkspace(phasePage, "chart");
      await assertTimelinePhases(phasePage);
      await capture(phasePage, "chart-phases");
      await closeQaPage(phasePage);
    } else if (targetedState === "operation-date-recovery") {
      await auditOperationDateRecovery(context, capture);
    } else if (targetedState === "chart-empty-grid") {
      await auditMissingEventChart(context, capture);
    } else if (targetedState === "ticket-entry") {
      await auditTicketOrderEntry(context, capture);
    } else if (targetedState === "ticket-operations") {
      await auditTicketOperations(context, capture);
    } else {
      assert.fail(`unknown targeted QA state: ${targetedState}`);
    }
    return results;
  }

  const bootPage = await newQaPage(context, { sessionDelayMs: 8_000 });
  await bootPage.goto(origin, { waitUntil: "domcontentloaded" });
  await bootPage.locator('main[aria-busy="true"]').waitFor();
  await capture(bootPage, "boot");
  await closeQaPage(bootPage);

  const loginPage = await newQaPage(context, { authenticated: false });
  await loginPage.goto(origin, { waitUntil: "domcontentloaded" });
  await loginPage.getByRole("heading", { name: "接続を完了できませんでした" }).waitFor();
  await capture(loginPage, "login");
  await closeQaPage(loginPage);

  const page = await newQaPage(context);
  for (const view of ["list", "floor", "chart"]) {
    await goToWorkspace(page, view);
    await capture(page, view);
  }

  const phasePage = await newQaPage(context, {
    boardPayload: timelinePhaseBoard,
    fixedNow: timelinePhaseNow,
  });
  await goToWorkspace(phasePage, "chart");
  await assertTimelinePhases(phasePage);
  await capture(phasePage, "chart-phases");
  await closeQaPage(phasePage);

  /* The authored calendar is interactive UI with its own grid semantics and a
     44px cell floor, so it is audited open rather than only in its closed
     trigger state. */
  await goToWorkspace(page, "list");
  await businessDateTrigger(page, "営業日").click();
  const datePopover = page.getByRole("dialog", { name: "営業日を選ぶ" });
  await datePopover.waitFor();
  /* A popover that opens off-screen is clipped, not scrolled, so it never
     widens the document and the horizontal-overflow gate cannot see it. Assert
     the popover's own box against the viewport. */
  const popoverBox = await datePopover.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return {
      left: Math.round(rect.left), top: Math.round(rect.top),
      right: Math.round(rect.right), bottom: Math.round(rect.bottom),
      viewportWidth: window.innerWidth, viewportHeight: window.innerHeight,
    };
  });
  assert.ok(popoverBox.left >= 0 && popoverBox.right <= popoverBox.viewportWidth,
    `the business-date popover is clipped horizontally: ${JSON.stringify(popoverBox)}`);
  assert.ok(popoverBox.top >= 0 && popoverBox.bottom <= popoverBox.viewportHeight,
    `the business-date popover is clipped vertically: ${JSON.stringify(popoverBox)}`);
  await capture(page, "business-date-picker");
  await page.keyboard.press("Escape");
  await page.getByRole("dialog", { name: "営業日を選ぶ" }).waitFor({ state: "detached" });

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
  const operationDialog = page.getByRole("dialog", { name: "新規予約" });
  await operationDialog.waitFor();
	  await operationDialog.getByRole("heading", { name: "集客担当" }).waitFor();
  assert.equal(
    await operationDialog.locator('input[name="tableIds"]:checked').count(),
    0,
    "new reception must not inherit the selected reservation table",
  );
  await capture(page, "walk-in");
  await page.getByRole("tab", { name: /受付ブロック/u }).click();
  await capture(page, "block");
  await page.getByRole("tab", { name: /事前予約/u }).click();
  for (let step = 1; step <= 8; step += 1) {
    await page.getByLabel(new RegExp(`予約作成 ${step}/8`, "u")).waitFor();
    if (step === 1) {
      await pickBusinessDate(page, "予約日", unavailableBusinessDate);
      await page.getByRole("alert").filter({ hasText: "この日は予約受付対象外です。" }).waitFor();
      assert.equal(
        await readBusinessDate(page, "営業日"),
        board.businessDay.businessDate,
        "an unavailable reservation date must not change the workspace business date",
      );
      await capture(page, "reservation-date-unavailable");
      await pickBusinessDate(page, "予約日", alternateBusinessDate);
      await page.waitForFunction((expectedDate) => {
        const shown = (label) => {
          const heading = [...document.querySelectorAll("span")]
            .find((node) => node.textContent?.trim() === label);
          const text = heading?.closest("div")?.textContent ?? "";
          const match = /(\d{4})\/(\d{2})\/(\d{2})/u.exec(text);
          return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
        };
        return shown("予約日") === expectedDate
          && shown("営業日") === expectedDate
          && new URL(window.location.href).searchParams.get("date") === expectedDate;
      }, alternateBusinessDate);
    }
    if (step === 4) {
      const tableGroup = page.getByRole("group", { name: "予約卓" });
      await tableGroup.locator('input[type="checkbox"]:not([disabled])').first().check();
      assert.ok(
        await tableGroup.locator("label[data-unavailable]").count() > 0,
        "incompatible tables must remain visible with a disabled reason",
      );
      assert.ok(
        await tableGroup.getByText(/プラン外/u).count() > 0,
        "an incompatible table must name why it cannot be selected",
      );
    }
    await capture(page, `reservation-create-${step}`);
    if (step === 4) {
      await page.getByRole("button", { name: "確認へ進む", exact: true }).click();
      await page.getByLabel("予約作成 8/8 確認").waitFor();
      assert.equal(
        await page.locator('li[data-state="defaulted"]').count(),
        3,
        "the shortcut must mark all three optional steps as defaults",
      );
      await capture(page, "reservation-create-shortcut");
      await page.getByRole("button", { name: "任意項目を入力", exact: true }).click();
      continue;
    }
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
    ["卓を決める", "卓を決める", "command-assignment"],
    ["メモ", "スタッフメモ", "command-note"],
  ]) {
    await goToWorkspace(page, "list");
    await openReservationDetail(page, viewport);
    await page.getByRole("button", { name: buttonLabel, exact: true }).click();
    await page.getByRole("dialog", { name: dialogLabel, exact: true }).waitFor();
    await capture(page, state);
    await page.keyboard.press("Escape");
  }

  await closeQaPage(page);

  const turnoverPage = await newQaPage(context, {
    boardPayloads: [turnoverBoard, releasedTurnoverBoard, checkedInTurnoverBoard],
  });
  await goToWorkspace(turnoverPage, "list");
  await turnoverPage.getByRole("button", {
    name: `${paidTurnoverReservation.publicCode}の詳細を開く`,
    exact: true,
  }).click();
  if (viewport.width < 1024) {
    await turnoverPage.getByRole("dialog", { name: "予約詳細" }).waitFor();
  } else {
    await turnoverPage.locator('[data-instance="desktop"]').waitFor();
  }
  const releaseButton = turnoverPage.getByRole("button", {
    name: /席を開放/u,
  });
  await releaseButton.waitFor();
  await capture(turnoverPage, "turnover-release");
  await releaseButton.click();
  const nextCheckInButton = turnoverPage.getByRole("button", {
    name: /次のお客様.*チェックイン/u,
  });
  await nextCheckInButton.waitFor();
  await capture(turnoverPage, "turnover-next-check-in");
  await nextCheckInButton.click();
  await nextCheckInButton.waitFor({ state: "hidden" });
  await capture(turnoverPage, "turnover-checked-in");
  assert.deepEqual(
    turnoverPage.qaCommandPayloads.map(({ kind, payload }) => ({
      kind,
      serviceStatus: payload?.serviceStatus ?? null,
    })),
    [
      { kind: "service_status", serviceStatus: "completed" },
      { kind: "check_in", serviceStatus: null },
    ],
    "turnover shortcuts must complete/release before checking in the next guest",
  );
  await closeQaPage(turnoverPage);

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
  await closeQaPage(extensionPage);

  const menuPage = await newQaPage(context);
  for (const [buttonName, dialogName, state] of [
    [/待機リスト/u, "待機リスト", "waitlist"],
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
  await closeQaPage(menuPage);

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
    await closeQaPage(scenarioPage);
  }

  const emptyViewsPage = await newQaPage(context, { boardPayload: emptyBoard });
  for (const [view, heading] of [
    ["list", "来店台帳"],
    ["floor", "VIPフロア"],
    ["chart", "席のチャート"],
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
  await closeQaPage(emptyViewsPage);

  await auditOperationDateRecovery(context, capture);
  await auditMissingEventChart(context, capture);

  const operationConflictPage = await newQaPage(context, { operationStatus: 409 });
  await goToWorkspace(operationConflictPage, "list");
  await operationConflictPage.getByRole("button", { name: /新規オペレーション/u }).click();
  const conflictDialog = operationConflictPage.getByRole("dialog", { name: "新規予約" });
  await conflictDialog.getByRole("checkbox", { name: /VIP-1/u }).check();
  await conflictDialog.getByRole("button", { name: "競合確認して保存" }).click();
  await conflictDialog.getByRole("alert").getByText("TABLE_CONFLICT", { exact: true }).waitFor();
  await closeQaPage(operationConflictPage);

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
  await demoLeaseRacePage.getByRole("dialog", { name: "新規予約" })
	    .getByRole("heading", { name: "集客担当" })
    .waitFor();
  await closeQaPage(demoLeaseRacePage);

  const demoWalkInPage = await newQaPage(context, { demoMode: "authenticated" });
  await goToDemoWorkspace(demoWalkInPage, "floor", "2026-07-31");
  await demoWalkInPage.getByRole("button", { name: /新規オペレーション/u }).click();
  const demoWalkInDialog = demoWalkInPage.getByRole("dialog", { name: "新規予約" });
	  await demoWalkInDialog.getByRole("heading", { name: "集客担当" }).waitFor();
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
	  await demoWalkInDialog.getByLabel("このお客様の担当").selectOption({ label: "デモスタッフA" });
	  await demoWalkInDialog.getByRole("button", { name: "競合確認して保存" }).click();
  await demoWalkInDialog.waitFor({ state: "hidden" });
  await goToDemoWorkspace(demoWalkInPage, "list", "2026-07-31");
  const createdWalkInRow = demoWalkInPage.locator("tr", {
    hasText: "デモWalk-inテスト",
  });
  await createdWalkInRow.getByRole("button", { name: /の詳細を開く/u }).click();
	  const createdWalkInInspector = viewport.width < 1024
	    ? demoWalkInPage.getByRole("dialog", { name: "予約詳細" })
	    : demoWalkInPage.locator('[data-instance="desktop"]');
	  await createdWalkInInspector.waitFor();
	  await createdWalkInInspector.getByText("デモスタッフA", { exact: true }).waitFor();
  await demoWalkInPage.getByRole("button", { name: "Walk-in取消", exact: true }).click();
  const cancelDialog = demoWalkInPage.getByRole("dialog", { name: "Walk-inを取り消す" });
  await cancelDialog.getByLabel("取消区分").selectOption("mistake");
  await cancelDialog.getByLabel("取消理由メモ").fill("デモ：Walk-in誤登録");
  await cancelDialog.getByRole("button", { name: /確認へ/u }).click();
  await cancelDialog.getByRole("button", { name: "Walk-inを取り消す", exact: true }).waitFor();
  assert.equal(
    await cancelDialog.locator("[data-least-destructive]").evaluate(
      (element) => element === document.activeElement,
    ),
    true,
    "destructive confirmation must initially focus the least destructive action",
  );
  await capture(demoWalkInPage, "command-walk-in-cancel");
  await cancelDialog.getByRole("button", { name: "Walk-inを取り消す", exact: true }).click();
  await cancelDialog.waitFor({ state: "hidden" });
  await createdWalkInRow.waitFor({ state: "hidden" });
  await goToDemoWorkspace(demoWalkInPage, "floor", "2026-07-31");
  await demoWalkInPage.getByRole("button", { name: /VIP-8.*空席/u }).waitFor();
  assert.deepEqual(demoWalkInPage.qaServerErrors, [], "demo Walk-in produced a server 5xx");
  await closeQaPage(demoWalkInPage);

  const offlinePage = await newQaPage(context);
  await goToWorkspace(offlinePage, "list");
  await offlinePage.evaluate(() => window.dispatchEvent(new Event("offline")));
  await offlinePage.locator('main[data-state="stale"]').waitFor();
  await capture(offlinePage, "offline");
  await closeQaPage(offlinePage);

  const conflictPage = await newQaPage(context, { commandStatus: 409 });
  await goToWorkspace(conflictPage, "list");
  await openReservationDetail(conflictPage, viewport);
  await conflictPage.getByRole("button", { name: "メモ", exact: true }).click();
  await conflictPage.getByLabel("現場共有メモ").fill("Synthetic conflict check");
  await conflictPage.getByRole("button", { name: /確認へ/u }).click();
  await conflictPage.getByRole("button", { name: /GHOSTへ反映/u }).click();
  await conflictPage.getByRole("alert").filter({ hasText: "version_conflict" }).waitFor();
  await capture(conflictPage, "conflict");
  await closeQaPage(conflictPage);

  const demoLoginPage = await newQaPage(context, { demoMode: "login" });
  await demoLoginPage.goto(`${origin}/?view=list&date=2026-07-27`, {
    waitUntil: "domcontentloaded",
  });
  await demoLoginPage.getByRole("heading", { name: "VIP予約デモへ再接続" }).waitFor();
  await capture(demoLoginPage, "demo-login");
  await closeQaPage(demoLoginPage);

  const demoResetPage = await newQaPage(context, { demoMode: "authenticated" });
  await goToDemoWorkspace(demoResetPage, "list", "2026-07-27");
  await demoResetPage.getByRole("button", { name: "メニュー", exact: true }).click();
  await demoResetPage.getByRole("button", { name: /デモ初期化/u }).click();
  await demoResetPage.getByRole("dialog", { name: "合成データを初期状態へ戻す" }).waitFor();
  await capture(demoResetPage, "demo-reset");
  await closeQaPage(demoResetPage);

  const demoNearExpiryPage = await newQaPage(context, {
    demoMode: "authenticated",
    fixedNow: "2026-08-27T12:00:00+09:00",
  });
  await goToDemoWorkspace(demoNearExpiryPage, "list", "2026-08-27");
  await demoNearExpiryPage.locator('[data-expiry-phase="near"]').first().waitFor();
  await capture(demoNearExpiryPage, "demo-near-expiry");
  await closeQaPage(demoNearExpiryPage);

  const demoExpiredPage = await newQaPage(context, { demoMode: "expired" });
  await demoExpiredPage.goto(`${origin}/?view=list&date=2026-08-27`, {
    waitUntil: "domcontentloaded",
  });
  await demoExpiredPage.getByRole("heading", { name: "デモ利用期間は終了しました" }).waitFor();
  await capture(demoExpiredPage, "demo-expired");
  await closeQaPage(demoExpiredPage);

  await auditTicketOperationsLegacyIncomplete(context, capture);
  await auditTicketOrderEntry(context, capture);

  return results;
}

async function auditOperationDateRecovery(context, capture) {
  const page = await newQaPage(context, {
    boardPayloads: [missingEventBoard, alternateBoard],
    // Production latency exposed an old-URL synchronization race that a
    // zero-latency fixture hid. Keep the second board read in flight long
    // enough for React effects to run before the new route is committed.
    delaySecondBoardMs: 750,
    eventMode: "unavailable",
    missingEventDate: board.businessDay.businessDate,
  });
  await goToWorkspace(page, "list");
  await page.locator('main[data-state="stale"]').waitFor({ timeout: QA_RECOVERY_TIMEOUT_MS });
  const intakeButton = page.getByRole("button", { name: /新規オペレーション/u });
  await intakeButton.waitFor({ timeout: QA_RECOVERY_TIMEOUT_MS });
  assert.equal(
    await intakeButton.isEnabled(),
    true,
    "an event-day-missing board must still expose the phone reservation intake",
  );
  await intakeButton.click({ timeout: QA_RECOVERY_TIMEOUT_MS });
  const dialog = page.getByRole("dialog", { name: "新規予約" });
  await dialog.getByRole("alert")
    .getByText("選択した日は予約受付対象として登録されていません。")
    .waitFor({ timeout: QA_RECOVERY_TIMEOUT_MS });
  assert.equal(
    await dialog.getByRole("tab", { name: "事前予約" }).getAttribute("aria-selected"),
    "true",
    "a phone-reservation recovery state must not advertise Walk-in as the active task",
  );
  await businessDateTrigger(dialog, "予約・受付日").waitFor({ timeout: QA_RECOVERY_TIMEOUT_MS });
  await capture(page, "operation-date-recovery");
  await pickBusinessDate(dialog, "予約・受付日", alternateBusinessDate, { timeout: QA_RECOVERY_TIMEOUT_MS });
  await dialog.getByText(`${formatJpBusinessDate(alternateBusinessDate)} / 22:00–翌05:00`).waitFor({
    timeout: QA_RECOVERY_TIMEOUT_MS,
  });
  assert.equal(
    await dialog.getByRole("alert").count(),
    0,
    "changing away from a rejected date must immediately remove its stale warning",
  );
  await dialog.getByRole("button", { name: "この日を開く" }).click({ timeout: QA_RECOVERY_TIMEOUT_MS });
  await dialog.getByLabel("予約作成 1/8").waitFor({ timeout: QA_RECOVERY_TIMEOUT_MS });
  assert.equal(
    await dialog.getByRole("tab", { name: "事前予約" }).getAttribute("aria-selected"),
    "true",
    "phone-reservation recovery must land on the reservation workflow",
  );
  assert.equal(
    await readBusinessDate(page, "営業日"),
    alternateBusinessDate,
    "phone reservation recovery must load the selected canonical business day",
  );
  await capture(page, "operation-date-recovered");
  await closeQaPage(page);
}

async function auditMissingEventChart(context, capture) {
  const page = await newQaPage(context, { boardPayload: missingEventBoard });
  await goToWorkspace(page, "chart");
  const emptyTimelineTrack = page.locator('[class*="timelineEmptyRow"] [class*="timelineTrack"]');
  await emptyTimelineTrack.waitFor({ timeout: QA_RECOVERY_TIMEOUT_MS });
  assert.notEqual(
    await emptyTimelineTrack.evaluate((element) => getComputedStyle(element).backgroundImage),
    "none",
    "the true time grid must remain drawn when no event-day table payload exists",
  );
  await capture(page, "chart-empty-grid");
  await closeQaPage(page);
}

async function openTicketOperations(page, { demo = false } = {}) {
  if (demo) await goToDemoWorkspace(page, "list", "2026-08-11");
  else await goToWorkspace(page, "list");
  await page.getByRole("button", { name: "メニュー", exact: true }).click();
  const menu = page.getByRole("dialog", { name: "メニュー" });
  await menu.getByRole("button", { name: "チケット対応", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "チケット対応", exact: true });
  await panel.getByRole("heading", { name: "対応キュー", exact: true }).waitFor();
  return panel;
}

async function assertLeastDestructiveFocus(dialog) {
  assert.equal(
    await dialog.locator("[data-least-destructive]").evaluate(
      (element) => element === document.activeElement,
    ),
    true,
    "ticket operation confirmation must initially focus its safe action",
  );
}

async function auditTicketOperations(context, capture) {
  const page = await newQaPage(context, { demoMode: "authenticated" });
  const panel = await openTicketOperations(page, { demo: true });
  await panel.getByText("GT-DEMO20260811", { exact: true }).first().waitFor();
  await capture(page, "ticket-operations-queue");

  const search = panel.getByRole("searchbox", {
    name: "表示中の対応を絞り込み、または公開注文番号で開く",
  });
  await search.fill("該当なし");
  await panel.getByText("一致する対応はありません", { exact: true }).waitFor();
  await capture(page, "ticket-operations-search-empty");
  await search.fill("");

  await panel.getByRole("button", { name: /GT-DEMO20260811/u }).first().click();
  await panel.getByRole("heading", { name: "GT-DEMO20260811", exact: true }).waitFor();
  const inspector = panel.locator('article[aria-labelledby="ticket-order-title"]');
  for (const state of ["未入場", "入場済み", "無効"]) {
    await inspector.getByText(state, { exact: true }).first().waitFor();
  }
  await inspector.getByText("送信事業者が無効です。再投入は復旧後に実行してください。", {
    exact: true,
  }).waitFor();
  await inspector.getByText("Stripe Checkout / Payment の証跡を確認", {
    exact: true,
  }).waitFor();
  await capture(page, "ticket-operations-inspector");

  await panel.getByRole("checkbox").first().check();
  await panel.getByRole("button", { name: "補助入場を確認", exact: true }).click();
  let confirmation = page.getByRole("alertdialog", { name: "Owner補助入場を確定しますか" });
  await confirmation.waitFor();
  await assertLeastDestructiveFocus(confirmation);
  await capture(page, "ticket-operations-override-confirm");
  await confirmation.getByRole("button", { name: "戻る", exact: true }).click();

  const refundSelection = panel.getByRole("group", { name: "返金配分の対象券" });
  await refundSelection.getByRole("checkbox").first().check();
  const allocation = panel.getByRole("spinbutton", { name: /#1/u });
  await allocation.fill("6500");
  await panel.getByRole("button", { name: "確認へ", exact: true }).click();
  confirmation = page.getByRole("alertdialog", { name: "返金確認を解決しますか" });
  await confirmation.waitFor();
  await assertLeastDestructiveFocus(confirmation);
  await capture(page, "ticket-operations-resolve-confirm");
  await confirmation.getByRole("button", { name: "戻る", exact: true }).click();

  await panel.getByLabel("解決方法").selectOption("record_admitted_exception");
  await panel.getByRole("button", { name: "確認へ", exact: true }).click();
  confirmation = page.getByRole("alertdialog", { name: "返金確認を解決しますか" });
  await confirmation.waitFor();
  await assertLeastDestructiveFocus(confirmation);
  await capture(page, "ticket-operations-admitted-exception-confirm");
  await confirmation.getByRole("button", { name: "戻る", exact: true }).click();

  const conflictPage = await newQaPage(context, {
    ticketOperations: true,
    ticketOperationStatus: 409,
  });
  const conflictPanel = await openTicketOperations(conflictPage);
  let searchPage = 0;
  await conflictPage.route("**/api/admin/vip-floor/tickets/search", async route => {
    const query = route.request().postDataJSON();
    assert.equal(query.email, "synthetic@example.test");
    searchPage += 1;
    const hasMore = searchPage === 1;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      ok: true, orders: [{ publicCode: "GT-QA20260811", eventDate: "2026-08-11", eventTitle: "GHOST QA · 長いイベント名と複数候補の照会", status: "fulfilled", quantity: 2 }],
      hasMore, nextCursor: hasMore ? { id: "a0000000-0000-4000-8000-000000000001", createdAt: "2026-08-01T00:00:00Z" } : null,
      auditId: "a0000000-0000-4000-8000-000000000002",
    }) });
  });
  await conflictPanel.getByText("メールと営業日で注文を探す", { exact: true }).click();
  await conflictPanel.getByLabel("購入時のメールアドレス", { exact: true }).fill("synthetic@example.test");
  await capture(conflictPage, "ticket-operations-full-search-form");
  await conflictPanel.getByRole("button", { name: "全注文から検索", exact: true }).click();
  await conflictPanel.getByText("1件表示・続きがあります", { exact: true }).waitFor();
  await capture(conflictPage, "ticket-operations-full-search-results");
  await conflictPanel.getByRole("button", { name: "次の25件", exact: true }).click();
  await conflictPanel.getByText("1件表示・この条件の最終ページです", { exact: true }).waitFor();
  await capture(conflictPage, "ticket-operations-full-search-last-page");
  await conflictPanel.getByText("メールと営業日で注文を探す", { exact: true }).click();
  await conflictPanel.getByRole("button", { name: /GT-QA20260811/u }).first().click();
  await conflictPanel.getByRole("heading", { name: "GT-QA20260811", exact: true }).waitFor();
  await conflictPanel.getByText("購入案内", { exact: true }).scrollIntoViewIfNeeded();
  await capture(conflictPage, "ticket-operations-purchase-notice");
  await conflictPanel.getByRole("checkbox").first().check();
  await conflictPanel.getByRole("button", { name: "補助入場を確認", exact: true }).click();
  const conflictDialog = conflictPage.getByRole("alertdialog", {
    name: "Owner補助入場を確定しますか",
  });
  await conflictDialog.getByLabel("理由（8文字以上・監査履歴へ記録）").fill("入口で本人確認を行いました");
  await conflictDialog.getByRole("button", { name: "選択券を入場済みにする", exact: true }).click();
  await conflictDialog.getByText("版が変わりました", { exact: true }).waitFor();
  assert.equal(
    await conflictDialog.getByRole("button", {
      name: "選択券を入場済みにする",
      exact: true,
    }).isDisabled(),
    true,
    "a stale ticket operation must not remain confirmable",
  );
  await capture(conflictPage, "ticket-operations-version-conflict");

  /* WPE WebKit's page-level close command can wedge even after an ordinary
   * application page. Audit the final offline state after the independent
   * conflict page has completed, then let the enclosing browser context tear
   * both synthetic pages down together. */
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await panel.getByText("オフラインです。回線を再接続してから状態を再読込してください。", {
    exact: true,
  }).waitFor();
  await capture(page, "ticket-operations-offline");
  await auditTicketOperationsLegacyIncomplete(context, capture);
  await auditTicketOrderEntry(context, capture);
}

async function auditTicketOrderEntry(context, capture) {
  const fixture = structuredClone(ticketOperationsOrderFixture);
  fixture.order.entry = { admissionPolicy: "order_together_v1", originalCount: 4,
    currentLink: { id: "83000000-0000-4000-8000-000000000001", generation: 1, revokedAt: null, expiresAt: "2026-08-11T20:30:00Z" },
    committedOperationId: null, exception: null };
  fixture.order.admissions = Array.from({length:4},(_,index)=>({ admissionId: `83000000-0000-4000-8000-${String(index+10).padStart(12,"0")}`,
    serial:index+1,label:index===3?"FAST ENTRY・長い日英券種名":"一般入場 GENERAL ADMISSION",status:"issued",admittedAt:null }));
  const page = await newQaPage(context,{ticketOperations:true,ticketOperationsOrder:fixture});
  const panel = await openTicketOperations(page);
  await panel.getByRole("button",{name:/GT-QA20260811/u}).first().click();
  await panel.getByText("注文リンク・誤使用の救済",{exact:true}).waitFor();
  assert.equal(await panel.getByRole("checkbox").count(),0,"new group order must never expose per-ticket selection");
  await capture(page,"ticket-entry-unused");
  await panel.getByRole("button",{name:"補助入場を確認",exact:true}).click();
  let dialog=page.getByRole("alertdialog");await assertLeastDestructiveFocus(dialog);
  await dialog.getByRole("button",{name:"全員4名の入場を確定",exact:true}).waitFor();
  await capture(page,"ticket-entry-assist-confirm");await dialog.getByRole("button",{name:"戻る",exact:true}).click();
  for(const [button,state] of [["登録先へ再送","resend"],["漏えい時の交換","rotate"],["リンクを失効","revoke"]]){
    await panel.getByRole("button",{name:button,exact:true}).click();dialog=page.getByRole("alertdialog");await assertLeastDestructiveFocus(dialog);
    await capture(page,"ticket-entry-"+state+"-confirm");await dialog.getByRole("button",{name:"戻る",exact:true}).click();
  }
  fixture.order.entry.committedOperationId="83000000-0000-4000-8000-000000000030";
  fixture.order.admissions.forEach(a=>{a.status="admitted";a.admittedAt="2026-08-11T13:04:00Z";});
  await panel.getByRole("button",{name:"注文詳細を再読込",exact:true}).click();
  await panel.getByRole("button",{name:"誤使用の例外受付を確認",exact:true}).click();
  dialog=page.getByRole("alertdialog");await assertLeastDestructiveFocus(dialog);
  const confirm=dialog.getByRole("button",{name:"一回の例外受付を記録",exact:true});assert.equal(await confirm.isDisabled(),true);
  await dialog.getByLabel("理由（8文字以上・監査履歴へ記録）").fill("全員の誤操作申告と原記録を確認しました");
  assert.equal(await confirm.isDisabled(),true);
  await dialog.getByLabel("4名全員の集合・身分証・誤使用の確認内容（8文字以上）").fill("4名全員の集合と写真付き身分証、元の使用記録を確認しました");
  await capture(page,"ticket-entry-exception-confirm");
  let commands=0;
  await page.route("**/api/admin/vip-floor/tickets/entry/exception",async route=>{
    commands++;const body=route.request().postDataJSON();assert.equal(body.guestCount,4);assert.equal(body.originalOperationId,fixture.order.entry.committedOperationId);
    fixture.order.entry.exception={originalOperationId:body.originalOperationId,admittedCount:4,createdAt:"2026-08-11T13:06:00Z",auditLogId:"83000000-0000-4000-8000-000000000040"};
    await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,action:"entry_exception",entityVersion:8,auditLogId:fixture.order.entry.exception.auditLogId,reused:false,serverNow:"2026-08-11T13:06:00Z"})});
  });
  await confirm.click();await panel.getByText(/誤使用の例外受付を記録済み/u).waitFor();assert.equal(commands,1);
  assert.equal(await panel.getByRole("button",{name:"誤使用の例外受付を確認",exact:true}).count(),0);
  await capture(page,"ticket-entry-exception-recorded");
  await closeQaPage(page);
}

async function auditTicketOperationsLegacyIncomplete(context, capture) {
  const page = await newQaPage(context, {
    ticketOperations: true,
    ticketOperationsOrder: ticketOperationsLegacyIncompleteOrderFixture,
  });
  const panel = await openTicketOperations(page);
  await panel.getByRole("button", { name: /GT-QA20260811/u }).first().click();
  const inspector = panel.locator('article[aria-labelledby="ticket-order-title"]');
  await inspector.getByText(
    "保存済みの観測履歴が不完全なため、この画面では終端解決できません。Stripeの権威ある決済・返金履歴を照合し、forward fixで回復してください。",
    { exact: true },
  ).waitFor();
  assert.equal(
    await inspector.getByRole("group", { name: "返金配分の対象券" }).count(),
    0,
    "legacy incomplete must not render refund allocation controls",
  );
  assert.equal(
    await inspector.getByLabel("解決方法").count(),
    0,
    "legacy incomplete must not render refund resolution controls",
  );
  assert.equal(
    await page.getByRole("alertdialog", { name: "返金確認を解決しますか" }).count(),
    0,
    "legacy incomplete must not render a refund confirmation",
  );
  await capture(page, "ticket-operations-legacy-incomplete");
  await closeQaPage(page);
}

async function assertTimelinePhases(page) {
  await page.locator("button[data-phase]").first().waitFor();
  const bands = await page.locator("button[data-phase]").evaluateAll((buttons) =>
    buttons.map((button) => ({
      code: button.textContent?.match(/PHASE-\d+/u)?.[0] ?? null,
      label: button.textContent ?? "",
      phase: button.getAttribute("data-phase"),
      signal: button.getAttribute("data-signal"),
      acknowledged: button.hasAttribute("data-acknowledged"),
    })));

  assert.deepEqual(
    bands.map((band) => band.phase).sort(),
    [
      "active", "arrival_overdue", "arrival_soon", "arrival_soon",
      "closing_soon", "overdue", "resolved", "scheduled",
    ],
    "chart must render all seven reservation band phases, with a second arrival "
    + "window to prove the handled state",
  );

  const labels = Object.fromEntries(bands.map((band) => [band.code, band.label]));
  assert.match(labels["PHASE-04"], /延長確認/u);
  assert.match(labels["PHASE-05"], /解放超過/u);
  assert.match(labels["PHASE-08"], /未着/u);

  /* The alarm ladder, as it actually renders: three tiers raise a signal and
   * three do not. */
  assert.deepEqual(
    Object.fromEntries(bands.map((band) => [band.code, band.signal])),
    {
      "PHASE-01": "none",
      "PHASE-02": "low",
      "PHASE-03": "none",
      "PHASE-04": "medium",
      "PHASE-05": "high",
      "PHASE-06": "none",
      "PHASE-07": "low",
      "PHASE-08": "high",
    },
    "each band must expose the signal tier its phase belongs to",
  );

  /* Handled bands keep their tier and lose their motion, and they have to sit
   * beside an unhandled band in the same tier or the screenshot proves nothing. */
  assert.deepEqual(
    bands.filter((band) => band.acknowledged).map((band) => band.code).sort(),
    ["PHASE-07", "PHASE-08"],
    "only the two answered bands may be acknowledged",
  );
  for (const tier of ["low", "high"]) {
    const inTier = bands.filter((band) => band.signal === tier);
    assert.ok(
      inTier.some((band) => band.acknowledged) && inTier.some((band) => !band.acknowledged),
      `the ${tier} tier must render both a blinking and a handled band`,
    );
  }
}


/*
 * The business date is picked, not typed. `<input type="date">` was replaced on
 * 2026-08-16 by an authored calendar (it printed US month-first order, showed
 * no weekday, and drew a second calendar glyph inside the ribbon), so the audit
 * drives the control the way the operator does: open the popover, walk to the
 * month, tap the day. A harness that kept calling `.fill()` would be testing a
 * control that no longer exists.
 */
const JP_WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/* Mirrors formatBusinessDateWithWeekday: the surface states a business date in
 * the venue's order with its weekday, so the audit asserts on that and not on
 * the wire format. */
function formatJpBusinessDate(value) {
  const [y, m, d] = value.split("-").map(Number);
  const weekday = JP_WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${y}/${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}(${weekday})`;
}

function businessDateTrigger(scope, label) {
  return scope.getByRole("button", { name: new RegExp(`^${label}`, "u") });
}

async function readBusinessDate(scope, label) {
  const text = await businessDateTrigger(scope, label).innerText();
  const match = /(\d{4})\/(\d{2})\/(\d{2})/u.exec(text);
  assert.ok(match, `could not read a business date from ${label}: ${JSON.stringify(text)}`);
  return `${match[1]}-${match[2]}-${match[3]}`;
}

async function pickBusinessDate(scope, label, value, options = {}) {
  const timeout = options.timeout ?? 10_000;
  const [year, month, day] = value.split("-").map(Number);
  const trigger = businessDateTrigger(scope, label);
  await trigger.waitFor({ timeout });
  await trigger.click({ timeout });
  const popover = scope.getByRole("dialog", { name: `${label}を選ぶ` });
  await popover.waitFor({ timeout });

  /* Walk months rather than assuming a starting point, so the helper works from
   * whatever date the screen happened to be on. */
  for (let guard = 0; guard < 36; guard += 1) {
    const heading = await popover.locator("strong").first().innerText();
    const seen = /(\d{4})年(\d{1,2})月/u.exec(heading);
    assert.ok(seen, `unreadable calendar heading: ${JSON.stringify(heading)}`);
    const delta = (year - Number(seen[1])) * 12 + (month - Number(seen[2]));
    if (delta === 0) break;
    await popover.getByRole("button", { name: delta > 0 ? "次の月" : "前の月" }).click({ timeout });
    assert.ok(guard < 35, `could not reach ${value} from ${heading}`);
  }

  const weekday = JP_WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  await popover
    .getByRole("gridcell", { name: new RegExp(`^${month}月${day}日 ${weekday}曜日`, "u") })
    .click({ timeout });
  await popover.waitFor({ state: "detached", timeout });
}

async function newQaPage(context, scenario = {}) {
  const page = await context.newPage();
  page.qaConsoleErrors = [];
  page.qaServerErrors = [];
  page.qaHttpErrors = [];
  page.qaCommandPayloads = [];
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

async function closeQaPage(page) {
  await retireQaPage(page);
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
        signal: AbortSignal.timeout(1_000),
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
  // Demo fixtures have a fixed availability window. Keep both browser expiry
  // checks and mock lease responses inside it, regardless of the CI run date.
  // Explicit clocks still exercise near-expiry and other temporal scenarios.
  const fixedNow = scenario.fixedNow
    ?? (scenario.demoMode ? "2026-07-30T21:00:00+09:00" : null);
  if (fixedNow) {
    await page.addInitScript((fixedNow) => {
      const fixedTime = Date.parse(fixedNow);
      Date.now = () => fixedTime;
    }, fixedNow);
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
  const demoServerNow = fixedNow ?? new Date().toISOString();
  const demoLeaseExpiresAt = new Date(Date.parse(demoServerNow) + 60_000).toISOString();
  await page.route("**/api/admin/session", async (route) => {
    /* Holding the session probe open is the only way to observe the boot
     * screen: it is the frame the workspace shows while this request is in
     * flight, and on a warm connection it is gone in well under a second. */
    if (scenario.sessionDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, scenario.sessionDelayMs));
    }
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
  await page.route("**/api/admin/vip-floor/business-days?**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      ok: true,
      businessDates: [alternateBusinessDate, "2026-08-07", "2026-08-08"],
    }),
  }));
  await page.route("**/api/admin/vip-floor/options?**", (route) => {
    const requestedDate = new URL(route.request().url()).searchParams.get("date");
    if (requestedDate === scenario.missingEventDate) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "event_day_not_found" }),
      });
    }
    if (requestedDate === unavailableBusinessDate) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "event_day_not_found" }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        requestedDate === alternateBusinessDate ? alternateOperationOptions : operationOptions,
      ),
    });
  });
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
  if (scenario.ticketOperations) {
    await page.route("**/api/admin/vip-floor/tickets/capabilities", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ticketOperationsCapabilitiesFixture),
    }));
    await page.route("**/api/admin/vip-floor/tickets/queue?**", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ticketOperationsQueueFixture),
    }));
    await page.route("**/api/admin/vip-floor/tickets/orders/**", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(scenario.ticketOperationsOrder ?? ticketOperationsOrderFixture),
    }));
    for (const mutationPath of [
      "sessions/revoke",
      "admissions/assist",
      "refund-reviews/resolve",
      "email-jobs/retry",
    ]) {
      await page.route(`**/api/admin/vip-floor/tickets/${mutationPath}`, (route) => route.fulfill({
        status: scenario.ticketOperationStatus ?? 200,
        contentType: "application/json",
        body: JSON.stringify(scenario.ticketOperationStatus === 409
          ? {
              ok: false,
              error: "version_conflict",
              currentVersion: 8,
              recovery: "最新状態を再読込してから再実行してください。",
            }
          : {
              ok: true,
              action: mutationPath === "sessions/revoke"
                ? "session_revoke"
                : mutationPath === "admissions/assist"
                  ? "assisted_admission"
                  : mutationPath === "refund-reviews/resolve"
                    ? "refund_resolve"
                    : "email_retry",
              entityVersion: 8,
              auditLogId: "81000000-0000-4000-8000-000000000099",
              reused: false,
              serverNow: "2026-08-11T13:06:00.000Z",
            }),
      }));
    }
  }
  await page.route("**/api/admin/vip-floor/commands", async (route) => {
    const payload = route.request().postDataJSON();
    page.qaCommandPayloads.push(payload);
    await route.fulfill({
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
    });
  });
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
    const requestedDate = new URL(route.request().url()).searchParams.get("date");
    const delayMs = boardRequests > 1
      ? scenario.delaySecondBoardMs ?? 0
      : scenario.boardDelayMs ?? 0;
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({
      status: scenario.boardStatus ?? 200,
      contentType: "application/json",
      body: JSON.stringify(scenario.boardStatus && scenario.boardStatus >= 400
        ? { ok: false, error: "synthetic_board_failure" }
        : scenario.boardPayloads?.[
            Math.min(boardRequests - 1, scenario.boardPayloads.length - 1)
          ] ?? scenario.boardPayload ?? (
            requestedDate === alternateBusinessDate ? alternateBoard : board
          )),
    });
  });
}

async function auditPage(page, { state, viewport }) {
  const viewportKey = `${viewport.browser}-${viewport.width}x${viewport.height}`;
  const label = `${viewportKey}:${state}`;
  const testNoticeOverlap = await page.evaluate(() => {
    const notice = document.querySelector(".ticket-test-notice");
    const panel = document.querySelector("[data-ticket-operations-root]");
    if (!notice || !panel) return null;
    const noticeBottom = notice.getBoundingClientRect().bottom;
    return [...panel.querySelectorAll("#ticket-operations-title, [aria-label='チケット対応を閉じる']")]
      .filter((element) => element.getBoundingClientRect().top < noticeBottom)
      .map((element) => element.id || element.getAttribute("aria-label"));
  });
  if (testNoticeOverlap !== null) {
    assert.deepEqual(testNoticeOverlap, [], `TEST notice obscures ticket controls in ${label}`);
  }
  // Screenshots and geometry must witness the self-hosted operator face, not a
  // transient fallback frame. This also makes before/after text signatures
  // deterministic on slower CI/font-shard loads.
  await page.evaluate(() => document.fonts.ready);
  await page.addScriptTag({ path: axePath });
  /*
   * The masthead is a flex row of fixed-size controls, and one of them — the
   * business-date field — is `position: relative` so it can host its popover.
   * That puts it in the positioned paint layer, above its non-positioned
   * siblings. So when the row runs out of width, the failure is not a visible
   * overflow the horizontal-overflow gate would catch: later siblings slide
   * underneath the date control and get painted over, which reaches the
   * operator as a counter they cannot tap. axe reports it as "partially
   * obscured" without naming the cause. This measures the cause directly.
   */
  const ribbonOverlaps = await page.evaluate(() => {
    const ribbon = document.querySelector('header[class*="serviceRibbon"]');
    if (!ribbon) return [];
    /* Measure the painted controls, not the wrapper boxes. A flex child that is
       squeezed below its content width still reports a narrow box while its
       button paints outside it, so comparing wrappers finds nothing. */
    const children = [...ribbon.querySelectorAll("button, a[href], input, select, [role='button']")]
      .filter((node) => node.getBoundingClientRect().width > 0)
      .map((node) => ({
        name: `${node.tagName.toLowerCase()}.${(node.className || "").split(" ")[0] || "(none)"}`,
        rect: node.getBoundingClientRect(),
      }));
    const found = [];
    for (let a = 0; a < children.length; a += 1) {
      for (let b = a + 1; b < children.length; b += 1) {
        const x = Math.min(children[a].rect.right, children[b].rect.right)
          - Math.max(children[a].rect.left, children[b].rect.left);
        const y = Math.min(children[a].rect.bottom, children[b].rect.bottom)
          - Math.max(children[a].rect.top, children[b].rect.top);
        if (x > 0.5 && y > 0.5) {
          found.push({
            a: children[a].name, b: children[b].name,
            overlapX: Math.round(x * 10) / 10, overlapY: Math.round(y * 10) / 10,
            aLeft: Math.round(children[a].rect.left), aRight: Math.round(children[a].rect.right),
            bLeft: Math.round(children[b].rect.left), bRight: Math.round(children[b].rect.right),
            ribbonWidth: Math.round(ribbon.getBoundingClientRect().width),
          });
        }
      }
    }
    return found;
  });
  assert.deepEqual(ribbonOverlaps, [],
    `masthead controls overlap in ${label} — the ribbon has run out of width`);

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
          /* axe reports "partially obscured" without naming the element on top,
             which leaves the reader guessing at exactly the moment they need a
             name. Sample the target's own box and report anything painted above
             it, so the failure is actionable from the log alone. */
          obscuredBy: rect && element
            ? [...new Set(
                [
                  [rect.x + 4, rect.y + rect.height / 2],
                  [rect.x + rect.width / 2, rect.y + rect.height / 2],
                  [rect.x + rect.width - 4, rect.y + rect.height / 2],
                ].flatMap(([x, y]) => {
                  const stack = document.elementsFromPoint(x, y);
                  const index = stack.indexOf(element);
                  const above = index === -1 ? stack : stack.slice(0, index);
                  return above
                    .filter((node) => !node.contains(element))
                    .map((node) => `${node.tagName.toLowerCase()}.${node.className || "(none)"}`);
                }),
              )]
            : [],
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
    const controls = [...document.querySelectorAll(
      'button, input, select, textarea, a[href], [role="button"], summary',
    )]
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
    /* Safari on iOS/iPadOS zooms the layout viewport when focus enters a text
     * control whose computed font-size is below 16px. This app sets
     * `body { overflow: hidden }`, so that zoom strands the operator in a panned
     * board with no scroll affordance to get out of it — one tap into a search
     * field, mid-service. Before `--t-field` existed, every text control on this
     * surface except the login field would have failed this gate. */
    const zoomTriggeringFields = [...document.querySelectorAll("input, select, textarea")]
      .filter(visible)
      .filter((element) => !["checkbox", "radio", "hidden"].includes(element.type))
      .map((element) => ({
        tag: element.tagName,
        className: typeof element.className === "string" ? element.className : "",
        fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
      }))
      .filter((entry) => entry.fontSize < 16);
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      undersizedControls: controls,
      zoomTriggeringFields,
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
  assert.deepEqual(
    layout.zoomTriggeringFields,
    [],
    `text controls below the 16px iOS zoom threshold in ${label}`,
  );
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
      || (state === "ticket-operations-version-conflict" && /status of 409 \(Conflict\)/u.test(entry))
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

const ticketOperationsEventSessionFixture = {
  eventSessionId: "81000000-0000-4000-8000-000000000001",
  eventTitle: "QA TICKET OPERATIONS 🎙️",
  eventDate: "2026-08-11",
  doorsAt: "2026-08-11T12:30:00.000Z",
  admissionOpensAt: "2026-08-11T12:00:00.000Z",
  admissionClosesAt: "2026-08-11T17:30:00.000Z",
  state: "open",
};
const ticketOperationsHealthFixture = {
  emailProvider: "disabled",
  outboxRetryCount: 2,
  outboxDeadCount: 1,
  webhookFreshness: "stale",
  lastWebhookAt: "2026-08-11T12:55:00.000Z",
};
const ticketOperationsCapabilitiesFixture = {
  ok: true,
  serverNow: "2026-08-11T13:05:00.000Z",
  capabilities: {
    managerOperationsEnabled: true,
    refundReviewEnabled: true,
  },
  readiness: {
    managerOperations: "ready",
    refundReview: "ready",
  },
};
const ticketOperationsQueueFixture = {
  ok: true,
  serverNow: "2026-08-11T13:05:00.000Z",
  environment: "test",
  eventSessions: [ticketOperationsEventSessionFixture],
  recentAdmissions: [{
    admissionId: "81000000-0000-4000-8000-000000000003",
    publicCode: "GT-QA20260811",
    eventTitle: ticketOperationsEventSessionFixture.eventTitle,
    admittedCount: 1,
    admittedAt: "2026-08-11T13:00:00.000Z",
  }],
  health: ticketOperationsHealthFixture,
  items: [
    {
      id: "81000000-0000-4000-8000-000000000002",
      kind: "admission",
      priority: "urgent",
      publicCode: "GT-QA20260811",
      maskedEmail: "qa•••@example.invalid",
      eventTitle: ticketOperationsEventSessionFixture.eventTitle,
      eventDate: "2026-08-11",
      environment: "test",
      status: "issued",
      statusLabel: "未入場 1枚",
      summary: "Owner補助入場の競合回復を確認します。",
      updatedAt: "2026-08-11T13:05:00.000Z",
      expectedVersion: 7,
    },
    {
      id: "81000000-0000-4000-8000-000000000019",
      kind: "checkout_review",
      priority: "urgent",
      publicCode: "GT-QA20260811",
      maskedEmail: "qa•••@example.invalid",
      eventTitle: ticketOperationsEventSessionFixture.eventTitle,
      eventDate: "2026-08-11",
      environment: "test",
      status: "provider_outcome_unknown",
      statusLabel: "決済結果不明",
      summary: "Checkout決済の終端と発行状況を確認します。",
      updatedAt: "2026-08-11T13:05:30.000Z",
      expectedVersion: 7,
    },
  ],
};
const ticketOperationsOrderFixture = {
  ok: true,
  serverNow: "2026-08-11T13:05:00.000Z",
  health: ticketOperationsHealthFixture,
  order: {
    publicCode: "GT-QA20260811",
    maskedEmail: "qa•••@example.invalid",
    environment: "test",
    expectedVersion: 7,
    eventSession: ticketOperationsEventSessionFixture,
    wallet: {
      state: "active",
      activeSessionCount: 1,
      activeSessions: [{
        sessionId: "81000000-0000-4000-8000-000000000004",
        expectedVersion: 3,
        createdAt: "2026-08-11T12:40:00.000Z",
        expiresAt: "2026-08-19T14:59:59.000Z",
      }],
      lastVerifiedAt: "2026-08-11T12:40:00.000Z",
      freshAuthenticationUntil: "2026-08-12T00:40:00.000Z",
      otpDelivery: "delivered",
      otpRateLimit: "available",
      challengeState: "prepared",
    },
    admissions: [{
      admissionId: "81000000-0000-4000-8000-000000000005",
      serial: 1,
      label: "QA 一般券",
      status: "issued",
      admittedAt: null,
    }],
    refundReview: null,
    emailJobs: [{emailJobId:"81000000-0000-4000-8000-000000000009",purpose:"wallet_access",status:"dead",attemptCount:2,nextAttemptAt:null,expectedVersion:3,retryable:false}],
    timeline: [{
      auditId: "81000000-0000-4000-8000-000000000006",
      type: "wallet_verified",
      label: "Wallet認証を確認",
      occurredAt: "2026-08-11T12:40:00.000Z",
      actorLabel: "QA Owner",
      reason: null,
    }],
    safeRecoveryInstruction: "購入者端末でWalletを再読込し、公開注文番号だけを受付で確認してください。",
  },
};
const ticketOperationsLegacyIncompleteOrderFixture = {
  ...ticketOperationsOrderFixture,
  order: {
    ...ticketOperationsOrderFixture.order,
    refundReview: {
      reviewId: "81000000-0000-4000-8000-000000000020",
      status: "pending",
      expectedVersion: 3,
      observationVersion: 2,
      observationHash: "d".repeat(64),
      amountMinor: 6500,
      currency: "JPY",
      providerEventId: "refund-review:81000000-0000-4000-8000-000000000020",
      selectedAdmissionIds: [],
      conflictReason: "refund_observation_history_incomplete",
      moneyMayHaveMoved: true,
      authorityResolvable: false,
      observationHistoryState: "legacy_incomplete",
      observationHistoryReason: "legacy_conflict_observation_history_unrecoverable",
      resolutionOptions: [],
    },
  },
};

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

const timelinePhaseNow = "2026-07-26T15:00:00.000Z";
const timelinePhaseSpecs = [
  {
    publicCode: "PHASE-01",
    serviceStatus: "expected",
    lifecycleStatus: "confirmed",
    scheduledStartAt: "2026-07-26T17:00:00.000Z",
    scheduledEndAt: "2026-07-26T19:00:00.000Z",
  },
  {
    publicCode: "PHASE-02",
    serviceStatus: "expected",
    lifecycleStatus: "confirmed",
    scheduledStartAt: "2026-07-26T15:15:00.000Z",
    scheduledEndAt: "2026-07-26T17:15:00.000Z",
  },
  {
    publicCode: "PHASE-03",
    serviceStatus: "seated",
    lifecycleStatus: "checked_in",
    scheduledStartAt: "2026-07-26T14:00:00.000Z",
    scheduledEndAt: "2026-07-26T16:30:00.000Z",
  },
  {
    publicCode: "PHASE-04",
    serviceStatus: "seated",
    lifecycleStatus: "checked_in",
    scheduledStartAt: "2026-07-26T13:15:00.000Z",
    scheduledEndAt: "2026-07-26T15:15:00.000Z",
  },
  {
    publicCode: "PHASE-05",
    serviceStatus: "seated",
    lifecycleStatus: "checked_in",
    scheduledStartAt: "2026-07-26T13:00:00.000Z",
    scheduledEndAt: "2026-07-26T14:30:00.000Z",
  },
  {
    publicCode: "PHASE-06",
    serviceStatus: "completed",
    lifecycleStatus: "completed",
    scheduledStartAt: "2026-07-26T14:00:00.000Z",
    scheduledEndAt: "2026-07-26T16:00:00.000Z",
  },
  /* The two acknowledged bands. Both are inside a blinking window, and both
   * have already been answered on the floor, so their alarm has to be still
   * while the band beside them in the same phase is still blinking. Without
   * these the "handled" path renders in no screenshot at all. */
  {
    publicCode: "PHASE-07",
    serviceStatus: "arrived",
    lifecycleStatus: "confirmed",
    scheduledStartAt: "2026-07-26T15:10:00.000Z",
    scheduledEndAt: "2026-07-26T17:10:00.000Z",
  },
  {
    publicCode: "PHASE-08",
    serviceStatus: "late",
    lifecycleStatus: "confirmed",
    scheduledStartAt: "2026-07-26T13:20:00.000Z",
    scheduledEndAt: "2026-07-26T14:40:00.000Z",
  },
];
const timelinePhaseReservations = timelinePhaseSpecs.map((spec, index) => ({
  ...board.reservations[0],
  ...spec,
  id: `21000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  businessDate: board.businessDay.businessDate,
  expectedReleaseAt: spec.scheduledEndAt,
  actualSeatedAt: spec.lifecycleStatus === "checked_in"
    ? spec.scheduledStartAt
    : null,
  completedAt: spec.lifecycleStatus === "completed"
    ? timelinePhaseNow
    : null,
  tableIds: [tableIds[index]],
  assignmentIds: [`synthetic-phase-assignment-${index + 1}`],
  guestCount: { total: index + 2, adults: null, children: null },
  customer: {
    customerId: `71000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    displayLabel: `PHASE GUEST ${index + 1}`,
    masked: false,
  },
}));
const timelinePhaseBoard = {
  ...board,
  generatedAt: timelinePhaseNow,
  tables: board.tables.map((table, index) => ({
    ...table,
    reservationIds: index < timelinePhaseReservations.length
      ? [timelinePhaseReservations[index].id]
      : [],
  })),
  reservations: timelinePhaseReservations,
  totals: {
    ...board.totals,
    reservationCount: timelinePhaseReservations.length,
    activeReservationCount: timelinePhaseReservations.length - 1,
    assignmentCount: timelinePhaseReservations.length,
    guestCount: timelinePhaseReservations.reduce((total, item) => total + item.guestCount.total, 0),
    serviceStatusCounts: {
      expected: 2,
      seated: 3,
      completed: 1,
      arrived: 1,
      bill_requested: 1,
    },
  },
};

const nextTurnoverReservation = {
  ...board.reservations[0],
  id: "20000000-0000-4000-8000-000000000002",
  version: 4,
  publicCode: "GHO-0726-02",
  lifecycleStatus: "confirmed",
  serviceStatus: "expected",
  scheduledStartAt: "2026-07-26T16:00:00.000Z",
  scheduledEndAt: "2026-07-26T18:00:00.000Z",
  expectedReleaseAt: "2026-07-26T18:00:00.000Z",
  actualSeatedAt: null,
  completedAt: null,
  guestCount: { total: 3, adults: null, children: null },
  assignmentIds: ["synthetic-assignment-next"],
  customer: {
    customerId: "70000000-0000-4000-8000-000000000002",
    displayLabel: "NEXT GUEST ••••",
    masked: false,
  },
  operatorNote: "Synthetic next guest",
};

const paidTurnoverReservation = {
  ...board.reservations[0],
  lifecycleStatus: "checked_in",
  serviceStatus: "paid",
  scheduledStartAt: "2026-07-26T13:30:00.000Z",
  scheduledEndAt: "2026-07-26T15:30:00.000Z",
  expectedReleaseAt: "2026-07-26T15:30:00.000Z",
  actualSeatedAt: "2026-07-26T13:35:00.000Z",
  payment: { status: "paid", amountYen: 180000 },
};

const turnoverBoard = {
  ...board,
  tables: board.tables.map((table, index) => ({
    ...table,
    reservationIds: index === 0
      ? [paidTurnoverReservation.id, nextTurnoverReservation.id]
      : [],
  })),
  reservations: [paidTurnoverReservation, nextTurnoverReservation],
  totals: {
    ...board.totals,
    reservationCount: 2,
    activeReservationCount: 2,
    assignmentCount: 2,
    guestCount: 7,
    serviceStatusCounts: { paid: 1, expected: 1 },
  },
};

const releasedTurnoverBoard = {
  ...turnoverBoard,
  boardRevision: 43,
  tables: turnoverBoard.tables.map((table, index) => ({
    ...table,
    version: index === 0 ? 4 : table.version,
    reservationIds: index === 0 ? [nextTurnoverReservation.id] : [],
  })),
  reservations: [
    {
      ...paidTurnoverReservation,
      version: 5,
      serviceStatus: "completed",
      completedAt: "2026-07-26T15:40:00.000Z",
      assignmentIds: [],
      tableIds: [],
    },
    nextTurnoverReservation,
  ],
  totals: {
    ...turnoverBoard.totals,
    activeReservationCount: 1,
    assignmentCount: 1,
    serviceStatusCounts: { completed: 1, expected: 1 },
  },
};

const checkedInTurnoverBoard = {
  ...releasedTurnoverBoard,
  boardRevision: 44,
  reservations: [
    releasedTurnoverBoard.reservations[0],
    {
      ...nextTurnoverReservation,
      version: 5,
      lifecycleStatus: "checked_in",
      serviceStatus: "seated",
      actualSeatedAt: "2026-07-26T16:00:00.000Z",
    },
  ],
  totals: {
    ...releasedTurnoverBoard.totals,
    serviceStatusCounts: { completed: 1, seated: 1 },
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

const missingEventBoard = {
  ...emptyBoard,
  legacyFallbackCount: 0,
  tables: [],
  totals: {
    ...emptyBoard.totals,
    tableCount: 0,
  },
  operations: {
    ...emptyBoard.operations,
    adminMutationEnabled: false,
  },
};

const alternateBusinessDate = "2026-07-31";
const unavailableBusinessDate = "2026-07-27";
const alternateBoard = {
  ...emptyBoard,
  generatedAt: "2026-07-31T13:15:00.000Z",
  boardRevision: 1,
  businessDay: {
    ...emptyBoard.businessDay,
    id: "10000000-0000-4000-8000-000000000002",
    businessDate: alternateBusinessDate,
    operatingStartAt: "2026-07-31T13:00:00.000Z",
    operatingEndAt: "2026-07-31T20:00:00.000Z",
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
    compatibleTableIds: tableIds.slice(0, 4),
  }],
};

const alternateOperationOptions = {
  ...operationOptions,
  businessDay: alternateBoard.businessDay,
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
