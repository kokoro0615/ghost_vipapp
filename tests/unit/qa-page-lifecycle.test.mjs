import assert from "node:assert/strict";
import test from "node:test";

import {
  createQaViewportSession,
  retireQaPage,
} from "../../scripts/lib/qa-page-lifecycle.mjs";

function browserFixture(name) {
  const contexts = [];
  return {
    contexts,
    browserType() {
      return { name: () => name };
    },
    async newContext(options) {
      const listeners = new Map();
      const context = {
        options,
        closeCount: 0,
        pages: [],
        browser: () => this,
        on(event, listener) {
          listeners.set(event, listener);
        },
        async newPage() {
          const page = {
            closeCount: 0,
            context: () => context,
            async close() {
              this.closeCount += 1;
            },
          };
          context.pages.push(page);
          return page;
        },
        async close() {
          this.closeCount += 1;
          listeners.get("close")?.();
        },
      };
      contexts.push(context);
      return context;
    },
  };
}

test("WebKit gives every QA page an isolated context and retires that context", async () => {
  const browser = browserFixture("webkit");
  const session = await createQaViewportSession(browser, { viewport: { width: 1080, height: 810 } });
  const first = await session.newPage();
  const second = await session.newPage();

  assert.equal(browser.contexts.length, 2);
  assert.notEqual(first.context(), second.context());
  await retireQaPage(first);
  assert.equal(first.context().closeCount, 1);
  assert.equal(first.closeCount, 0);
  await session.close();
  assert.equal(second.context().closeCount, 1);
});

test("Chromium preserves one viewport context and closes individual QA pages", async () => {
  const browser = browserFixture("chromium");
  const session = await createQaViewportSession(browser, { viewport: { width: 1080, height: 810 } });
  const first = await session.newPage();
  const second = await session.newPage();

  assert.equal(browser.contexts.length, 1);
  assert.equal(first.context(), second.context());
  await retireQaPage(first);
  assert.equal(first.closeCount, 1);
  assert.equal(first.context().closeCount, 0);
  await session.close();
  assert.equal(second.context().closeCount, 1);
});

