import assert from "node:assert/strict";

// Safari 18 treats tr as position:static even when authored relative. Force
// that behavior on newer engines too, so upgrading Playwright cannot hide the
// viewport-sized stretched-button regression again (WebKit bug 240961).
export async function assertLedgerInteraction(page, viewport) {
  const table = page.getByRole("table", { name: "VIP予約一覧。来店時刻の昇順。" });
  const rowButton = table.getByRole("button", { name: /の詳細を開く/u }).first();
  await rowButton.waitFor();
  const style = await page.addStyleTag({ content: "table tbody tr { position: static !important; }" });
  const activate = async (control) => viewport.touch ? control.tap() : control.click();
  const assertHit = async (control, name) => {
    const reachable = await control.evaluate((node) => {
      const box = node.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return node === hit || node.contains(hit);
    });
    assert.equal(reachable, true, `loaded ledger intercepts ${name}`);
  };
  const assertControls = async () => {
    await rowButton.waitFor();
    for (const name of ["List", "Floor", "Chart", "メニュー"]) {
      await assertHit(page.getByRole("button", { name, exact: true }), name);
    }
    await assertHit(page.getByRole("button", { name: /^営業日/u }), "calendar");
    await assertHit(page.getByRole("button", { name: /新規オペレーション/u }), "intake");
  };

  try {
    await assertControls();
    await activate(page.getByRole("button", { name: "メニュー", exact: true }));
    await page.getByRole("dialog", { name: "メニュー", exact: true }).waitFor();
    await activate(page.getByRole("button", { name: "メニューを閉じる", exact: true }));
    await activate(page.getByRole("button", { name: /新規オペレーション/u }));
    await page.getByRole("dialog", { name: "新規予約", exact: true }).waitFor();
    await activate(page.getByRole("button", { name: "新規作成を閉じる", exact: true }));

    // The incident appeared after entering List, and reload kept that route.
    for (const name of ["Floor", "Chart", "List"]) {
      await activate(page.getByRole("button", { name, exact: true }));
      await page.waitForFunction((view) => new URL(location.href).searchParams.get("view") === view, name.toLowerCase());
      if (name !== "List") await table.waitFor({ state: "detached" });
    }
    await assertControls();

    // A non-button cell remains tappable; the native button remains the sole
    // keyboard/assistive-technology control. Neither requires an overlay.
    const rows = table.locator("tbody tr");
    const assertSelection = async (row) => {
      assert.equal(await row.getAttribute("data-selected"), "true");
      if (viewport.width < 1024) {
        await page.getByRole("dialog", { name: "予約詳細", exact: true }).waitFor();
        await page.waitForFunction(() => document.querySelector('[role="dialog"][aria-label="予約詳細"]')?.contains(document.activeElement));
        await page.keyboard.press("Escape");
        await page.getByRole("dialog", { name: "予約詳細", exact: true }).waitFor({ state: "detached" });
      } else {
        await page.locator('[data-instance="desktop"]').waitFor();
        await page.getByRole("button", { name: "インスペクターを閉じる", exact: true }).click();
      }
    };
    const indices = await rows.count() > 1 ? [await rows.count() - 1, 0] : [0];
    for (const index of indices) {
      const row = rows.nth(index);
      await activate(row.locator("td").nth(1));
      await assertSelection(row);
    }
    for (const key of ["Enter", "Space"]) {
      await rowButton.focus();
      await rowButton.press(key);
      await assertSelection(rows.first());
    }
    await assertControls();
  } finally {
    await style.evaluate((node) => node.remove());
  }

  await page.reload({ waitUntil: "domcontentloaded" });
  await assertControls();
  await activate(page.getByRole("button", { name: "Floor", exact: true }));
  await table.waitFor({ state: "detached" });
  await activate(page.getByRole("button", { name: "List", exact: true }));
  await assertControls();
}
