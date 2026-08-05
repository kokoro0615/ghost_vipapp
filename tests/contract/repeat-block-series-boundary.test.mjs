import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("VIP BFF sends a repeat series once and contains no day-by-day mutation loop", async () => {
  const source = await readFile(
    new URL("../../src/app/api/admin/vip-floor/operations/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /\/api\/admin\/v2\/vip-blocks\/series/);
  assert.doesNotMatch(source, /for \(let index = 0; index < payload\.repeatDays/);
  assert.doesNotMatch(source, /completedCount/);
});
