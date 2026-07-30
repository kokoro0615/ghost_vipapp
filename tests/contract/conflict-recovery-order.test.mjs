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

test("demo command conflict recovery keeps the outcome visible after hydration", async () => {
  const source = await readFile(
    path.join(root, "src/components/admin/vip-floor-v2/state/useVipFloorWorkspace.ts"),
    "utf8",
  );
  const runCommand = source.indexOf("const runCommand");
  const demoGuard = source.indexOf("if (!result.ok)", runCommand);
  const refresh = source.indexOf("if (result.status === 409) await loadBoard(businessDate)", demoGuard);
  const outcomeDispatch = source.indexOf('type: "commandOutcome"', refresh);

  assert.ok(demoGuard > runCommand, "demo runCommand failure guard missing");
  assert.ok(refresh > demoGuard, "demo command 409 refresh missing");
  assert.ok(outcomeDispatch > refresh, "demo command outcome must survive board hydration");
});

test("operation failures refresh before dispatching the visible error", async () => {
  const source = await readFile(
    path.join(root, "src/components/admin/vip-floor-v2/state/useVipFloorWorkspace.ts"),
    "utf8",
  );
  const runOperation = source.indexOf("const runOperation");
  const demoGuard = source.indexOf("if (!result.ok)", runOperation);
  const demoRefresh = source.indexOf("if (result.status === 409) await loadBoard(businessDate)", demoGuard);
  const demoOutcomeDispatch = source.indexOf('type: "commandOutcome"', demoRefresh);
  const ownerGuard = source.indexOf("if (!response.ok)", demoOutcomeDispatch);
  const ownerRefresh = source.indexOf("await loadBoard(businessDate)", ownerGuard);
  const ownerOutcomeDispatch = source.indexOf('type: "commandOutcome"', ownerRefresh);

  assert.ok(demoGuard > runOperation, "demo operation failure guard missing");
  assert.ok(demoRefresh > demoGuard, "demo operation 409 refresh missing");
  assert.ok(demoOutcomeDispatch > demoRefresh, "demo operation error must survive hydration");
  assert.ok(ownerGuard > demoOutcomeDispatch, "owner operation failure guard missing");
  assert.ok(ownerRefresh > ownerGuard, "owner operation recovery refresh missing");
  assert.ok(ownerOutcomeDispatch > ownerRefresh, "owner operation error must survive hydration");
});
