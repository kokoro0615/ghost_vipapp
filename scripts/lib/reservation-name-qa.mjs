import assert from "node:assert/strict";

/** Exercise the real wizard and ledger against a synthetic board boundary.
 * No production data, customer-profile decrypt, or notification is involved. */
export async function assertReservationNameFlow({
  page, board, reservationTemplate, origin, capture,
}) {
  let savedBoard = structuredClone(board);
  await page.clock.setFixedTime(new Date(board.generatedAt));
  const commands = [];
  await page.route("**/api/admin/vip-floor?**", (route) => {
    if (new URL(route.request().url()).searchParams.get("purpose") === "alerts") return route.fallback();
    return route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify(savedBoard),
    });
  });
  await page.route("**/api/admin/vip-floor/operations", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const command = route.request().postDataJSON();
    commands.push(command);
    assert.ok(["reservation_create", "reservation_update"].includes(command.kind));
    assert.equal(command.payload.notificationPreference, "none");
    const payload = command.payload;
    savedBoard = {
      ...savedBoard,
      boardRevision: savedBoard.boardRevision + 1,
      reservations: [{
        ...reservationTemplate,
        version: reservationTemplate.version + commands.length,
        publicCode: "QA-NAME-01",
        tableIds: payload.tableIds,
        scheduledStartAt: payload.scheduledStartAt,
        scheduledEndAt: payload.scheduledEndAt,
        guestCount: { total: payload.guestCount, adults: null, children: null },
        // Mirrors the canonical board's guest_label projection. In particular,
        // an encrypted customer displayName is never promoted to this field.
        customer: payload.guestLabel
          ? { customerId: null, displayLabel: payload.guestLabel, masked: false }
          : null,
      }],
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      ok: true, message: "Synthetic reservation saved", boardRevision: savedBoard.boardRevision,
      entityVersion: savedBoard.reservations[0].version, auditLogId: "synthetic-name-audit",
    }) });
  });

  const name = "デモ予約名・確認用";
  await page.goto(`${origin}/?view=list&date=${board.businessDay.businessDate}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /新規オペレーション/u }).click();
  let dialog = page.getByRole("dialog", { name: "新規予約", exact: true });
  await dialog.getByRole("tab", { name: "事前予約", exact: true }).click();
  const input = dialog.getByLabel("予約名（必須）", { exact: true });
  await input.waitFor({ timeout: 10000 });
  assert.equal(await input.getAttribute("maxlength"), "80");
  assert.notEqual(await input.getAttribute("required"), null);
  assert.equal(await dialog.getByLabel("開始", { exact: true }).inputValue(), "");
  assert.equal(await dialog.getByLabel("人数（必須）", { exact: true }).inputValue(), "");
  await dialog.getByRole("button", { name: "内容を確認", exact: true }).click();
  assert.equal(commands.length, 0);
  await dialog.getByText("予約名を入力してください（80文字以内）。", { exact: true }).waitFor();
  await capture(page, "reservation-create-errors");
  const box = await input.boundingBox();
  assert.ok(box && box.y >= 0 && box.y + box.height <= page.viewportSize().height,
    "reservation name must be in the first viewport without scrolling");
  await input.fill(`  ${name}  `);
  await input.focus();
  assert.ok(await input.evaluate((element) => element === document.activeElement));
  await dialog.getByLabel("開始", { exact: true }).selectOption(`${board.businessDay.businessDate}T22:00`);
  await dialog.getByLabel("人数（必須）", { exact: true }).fill("2");
  await dialog.getByRole("group", { name: "予約卓", exact: true })
    .locator('input[type="checkbox"]:not([disabled])').first().check();
  await dialog.getByRole("button", { name: "内容を確認", exact: true }).click();
  await dialog.getByLabel("予約作成 確認", { exact: true }).waitFor();
  assert.ok((await dialog.locator("dl div").filter({ has: page.locator("dt", { hasText: /^予約名$/u }) }).textContent()).includes(name));
  await dialog.getByRole("button", { name: "競合確認して作成", exact: true }).click();
  await dialog.waitFor({ state: "detached" });
  assert.equal(commands.length, 1);
  assert.equal(commands[0].payload.guestLabel, name, "the shortcut must submit the trimmed reservation name");
  assert.equal(commands[0].payload.displayName, null, "reservation names must not manufacture a customer profile");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("cell", { name, exact: true }).waitFor();
  await capture(page, "reservation-name-saved");

  await page.getByRole("button", { name: "QA-NAME-01の詳細を開く", exact: true }).click();
  await page.getByRole("button", { name: "予約編集", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "予約編集", exact: true });
  assert.equal(await dialog.getByLabel("予約名（必須）", { exact: true }).inputValue(), name);
  const longName = "デモ予約名" + "あ".repeat(75);
  assert.equal(longName.length, 80);
  await dialog.getByLabel("予約名（必須）", { exact: true }).fill(longName);
  await dialog.getByRole("button", { name: "内容を確認", exact: true }).click();
  await capture(page, "reservation-name-long");
  await dialog.getByRole("button", { name: "競合確認して更新", exact: true }).click();
  await dialog.waitFor({ state: "detached" });
  assert.equal(commands.length, 2);
  assert.equal(commands[1].payload.guestLabel, longName);
  assert.equal(commands[1].payload.expectedVersion, savedBoard.reservations[0].version - 1);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("cell", { name: longName, exact: true }).waitFor();
  await capture(page, "reservation-name-long-list");

  // A different intake must never inherit the previous booking's name.
  await page.getByRole("button", { name: /新規オペレーション/u }).click();
  dialog = page.getByRole("dialog", { name: "新規予約", exact: true });
  await dialog.getByRole("tab", { name: "事前予約", exact: true }).click();
  assert.equal(await dialog.getByLabel("予約名（必須）", { exact: true }).inputValue(), "");
  await dialog.getByLabel("予約名（必須）", { exact: true }).fill("デモ破棄する予約名");
  await dialog.getByRole("tab", { name: "Walk-in", exact: true }).click();
  await dialog.getByRole("tab", { name: "事前予約", exact: true }).click();
  assert.equal(await dialog.getByLabel("予約名（必須）", { exact: true }).inputValue(), "");
  await dialog.getByLabel("予約名（必須）", { exact: true }).fill("デモ閉じる予約名");
  await dialog.getByRole("button", { name: "新規作成を閉じる", exact: true }).click();
  await dialog.waitFor({ state: "detached" });
  await page.getByRole("button", { name: /新規オペレーション/u }).click();
  dialog = page.getByRole("dialog", { name: "新規予約", exact: true });
  await dialog.getByRole("tab", { name: "事前予約", exact: true }).click();
  assert.equal(await dialog.getByLabel("予約名（必須）", { exact: true }).inputValue(), "");
  await dialog.getByLabel("予約名（必須）", { exact: true }).fill("   ");
  await dialog.getByLabel("開始", { exact: true }).selectOption(`${board.businessDay.businessDate}T22:00`);
  await dialog.getByLabel("人数（必須）", { exact: true }).fill("2");
  await dialog.getByRole("group", { name: "予約卓", exact: true })
    .locator('input[type="checkbox"]:not([disabled])').last().check();
  await dialog.getByRole("button", { name: "内容を確認", exact: true }).click();
  await dialog.getByText("予約名を入力してください（80文字以内）。", { exact: true }).waitFor();
  assert.equal(commands.length, 2, "blank/whitespace names must never reach the API");
  await input.fill("デモ人数の検証");
  for (const value of ["", "0", "1.5", "100"]) {
    await dialog.getByLabel("人数（必須）", { exact: true }).fill(value);
    await dialog.getByRole("button", { name: "内容を確認", exact: true }).click();
    assert.equal(await dialog.getByLabel("人数（必須）", { exact: true }).getAttribute("aria-invalid"), "true");
    assert.equal(commands.length, 2);
  }

  await dialog.getByRole("button", { name: "新規作成を閉じる", exact: true }).click();
  savedBoard.reservations[0].publicCode = "QA-UNNAMED-8734";
  savedBoard.reservations[0].customer = {
    customerId: null, displayLabel: "Guest 8734", masked: false,
  };
  for (const view of ["list", "floor", "chart"]) {
    await page.goto(`${origin}/?view=${view}&date=${board.businessDay.businessDate}`, { waitUntil: "domcontentloaded" });
    await page.getByText("名前未登録", { exact: true }).filter({ visible: true }).first().waitFor();
    assert.equal(await page.getByText("Guest 8734", { exact: true }).count(), 0);
    await capture(page, `reservation-name-missing-${view}`);
  }
  await page.goto(`${origin}/?view=list&date=${board.businessDay.businessDate}`, { waitUntil: "domcontentloaded" });
  await page.locator('main[data-state="healthy"], main[data-state="empty"]').waitFor();
  await page.getByRole("button", { name: "QA-UNNAMED-8734の詳細を開く", exact: true }).click();
  await page.getByRole("button", { name: "予約編集", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "予約編集", exact: true });
  await dialog.waitFor({ timeout: 10000 });
  assert.equal(await dialog.getByLabel("予約名（必須）", { exact: true }).inputValue(), "");
  await dialog.getByRole("button", { name: "内容を確認", exact: true }).click();
  await dialog.getByText("予約名を入力してください（80文字以内）。", { exact: true }).waitFor();
  assert.equal(commands.length, 2, "an old generated guest label must never satisfy the required field");
  await capture(page, "reservation-name-missing-edit");
}
