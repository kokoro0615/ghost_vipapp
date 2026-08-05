import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("canonical spec and plan declare Basic-only Production with demo-only PIN", async () => {
  const [spec, plan] = await Promise.all([
    readFile(new URL("../../docs/GHOST_VIP_MANAGER_SPEC.md", import.meta.url), "utf8"),
    readFile(new URL("../../docs/GHOST_VIP_MANAGER_IMPLEMENTATION_PLAN.md", import.meta.url), "utf8"),
  ]);
  for (const source of [spec, plan]) {
    assert.match(source, /Production.*Basic-only|Basic-only.*Production/iu);
    assert.match(source, /PIN.*DEMO|DEMO.*PIN/iu);
  }
  assert.doesNotMatch(spec, /共通Basic認証＋Owner専用PIN 1件/u);
});
