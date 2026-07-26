import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { chromium } from "playwright-core";

const root = process.cwd();
const port = Number(process.env.A11Y_PORT ?? 3312);
const origin = `http://127.0.0.1:${port}`;
const chromePath = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
const axePath = path.join(root, "node_modules/axe-core/axe.min.js");
const nextBin = path.join(root, "node_modules/next/dist/bin/next");

let server;
let serverOutput = "";
let browser;

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
    browser = await chromium.launch({
      executablePath: chromePath,
      headless: true,
    });

    const results = [];
    for (const viewport of [
      { width: 320, height: 720 },
      { width: 1024, height: 768 },
      { width: 1194, height: 834 },
      { width: 1366, height: 1024 },
    ]) {
      const context = await browser.newContext({
        viewport,
        httpCredentials: {
          username: "a11y",
          password: "synthetic-only",
        },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      await installSyntheticRoutes(page);

      for (const view of ["list", "floor", "chart"]) {
        await page.goto(`${origin}/?view=${view}&date=2026-07-26`, {
          waitUntil: "domcontentloaded",
        });
        await page.locator("#vip-workspace-main").waitFor();
        results.push(await auditPage(page, `${viewport.width}x${viewport.height}:${view}`));
      }

      await page.goto(`${origin}/?view=floor&date=2026-07-26`, {
        waitUntil: "domcontentloaded",
      });
      await page.getByRole("button", { name: /新規オペレーション/u }).click();
      await page.getByRole("dialog", { name: "新規オペレーション" }).waitFor();
      results.push(await auditPage(page, `${viewport.width}x${viewport.height}:operations`));

      await page.goto(`${origin}/?view=floor&date=2026-07-26`, {
        waitUntil: "domcontentloaded",
      });
      await page.getByRole("button", { name: "メニュー", exact: true }).click();
      await page.getByRole("button", { name: /Waitlist/u }).click();
      await page.getByRole("dialog", { name: "Waitlist" }).waitFor();
      results.push(await auditPage(page, `${viewport.width}x${viewport.height}:waitlist`));
      await context.close();
    }

    console.log(JSON.stringify({
      ok: true,
      auditedViews: results.length,
      viewports: 4,
      axeViolations: 0,
      horizontalOverflow: 0,
      undersizedImportantControls: 0,
    }));
  } finally {
    if (browser) await browser.close();
    server.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => server.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 2_000)),
    ]);
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

async function installSyntheticRoutes(page) {
  await page.addInitScript(() => {
    window.EventSource = class SyntheticEventSource {
      addEventListener() {}
      removeEventListener() {}
      close() {}
    };
  });
  await page.route("**/api/admin/session", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ok: true, role: "owner", displayName: "Owner" }),
  }));
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
  await page.route("**/api/admin/vip-floor?**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(board),
  }));
}

async function auditPage(page, label) {
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
  assert.deepEqual(
    actionable.map(({ id, impact, nodes }) => ({
      id,
      impact,
      targets: nodes.map((node) => node.target),
    })),
    [],
    `axe violations in ${label}`,
  );

  const layout = await page.evaluate(() => {
    const controls = [...document.querySelectorAll("button, input, select, textarea")]
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.visibility !== "hidden"
          && style.display !== "none"
          && rect.width > 0
          && rect.height > 0
          && !element.disabled
          && element.getAttribute("type") !== "checkbox";
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label: element.getAttribute("aria-label") || element.textContent?.trim() || element.tagName,
          width: rect.width,
          height: rect.height,
        };
      })
      .filter((control) => control.width < 44 || control.height < 44);
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      undersizedControls: controls,
    };
  });
  assert.equal(layout.documentWidth, layout.viewportWidth, `horizontal overflow in ${label}`);
  assert.deepEqual(layout.undersizedControls, [], `undersized controls in ${label}`);
  return { label };
}

const tableIds = Array.from(
  { length: 8 },
  (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
);

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
  tables: tableIds.map((id, index) => ({
    id,
    version: 3,
    publicResourceCode: `VIP-${index + 1}`,
    displayCode: `T${index + 1}`,
    name: `VIP TABLE ${index + 1}`,
    sectionId: "",
    capacityMin: 1,
    capacityMax: index === 0 ? 7 : 6,
    onlineEligible: true,
    geometry: {
      shape: "rect",
      xPercent: 18 + (index % 4) * 22,
      yPercent: 33 + Math.floor(index / 4) * 35,
      widthPercent: 15,
      heightPercent: 17,
      rotationDegrees: 0,
    },
    operationalLocked: false,
    lockReason: null,
    reservationIds: index === 0
      ? ["20000000-0000-4000-8000-000000000001"]
      : [],
    blockIds: [],
  })),
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
    customer: { displayNameMasked: "GUEST ••••", masked: true },
    payment: null,
    notes: [],
    flags: [],
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

await main();
