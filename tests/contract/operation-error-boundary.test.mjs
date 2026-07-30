import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("operation adapter and client preserve structured failure details without object coercion", async () => {
  const [route, hook] = await Promise.all([
    read("src/app/api/admin/vip-floor/operations/route.ts"),
    read("src/components/admin/vip-floor-v2/state/useVipFloorWorkspace.ts"),
  ]);

  assert.match(route, /normalizeOperationFailurePayload/u);
  assert.match(route, /typeof errorRecord\?\.code === "string"/u);
  assert.match(route, /Cache-Control": "no-store"/u);
  assert.match(hook, /readVipOperationFailure/u);
  assert.doesNotMatch(hook, /String\(payload\.error \?\? response\.status\)/u);
});
