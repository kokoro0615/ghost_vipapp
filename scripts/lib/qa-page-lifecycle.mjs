export async function createQaViewportSession(browser, contextOptions) {
  if (browser.browserType().name() !== "webkit") {
    return browser.newContext(contextOptions);
  }

  /* WPE MiniBrowser can wedge on page.close(), while BrowserContext.close()
   * completes reliably. Isolate every synthetic page so retiring one page can
   * use the reliable context boundary without keeping its app, timers and
   * WebProcess alive until all 52 states finish. */
  const contexts = new Set();
  return {
    browser: () => browser,
    async newPage() {
      const context = await browser.newContext(contextOptions);
      contexts.add(context);
      context.on("close", () => contexts.delete(context));
      return context.newPage();
    },
    async close() {
      await Promise.all([...contexts].map((context) => context.close()));
    },
  };
}

export async function retireQaPage(page) {
  if (page.context().browser()?.browserType().name() === "webkit") {
    await page.context().close();
    return;
  }
  await page.close();
}

