import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workspaceSource = await readFile(
  new URL("../../src/components/admin/vip-floor-v2/VipFloorWorkspace.tsx", import.meta.url),
  "utf8",
);

test("workspace route updates merge against the current browser query", () => {
  assert.match(
    workspaceSource,
    /const params = new URLSearchParams\(window\.location\.search\);/,
  );
  assert.doesNotMatch(
    workspaceSource,
    /const params = new URLSearchParams\(searchParams\.toString\(\)\);/,
  );
});
