import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("409 recovery refreshes the board before exposing the conflict outcome", async () => {
  const source = await readFile(
    path.join(root, "src/components/admin/vip-floor-v2/state/useVipFloorWorkspace.ts"),
    "utf8",
  );
  const responseGuard = source.indexOf("if (!response.ok)", source.indexOf("const runCommand"));
  const refresh = source.indexOf("if (response.status === 409) await loadBoard(businessDate)", responseGuard);
  const outcomeDispatch = source.indexOf('type: "commandOutcome"', refresh);

  assert.ok(responseGuard >= 0, "runCommand response guard missing");
  assert.ok(refresh > responseGuard, "409 board refresh missing");
  assert.ok(outcomeDispatch > refresh, "conflict outcome must be dispatched after board refresh");
});
