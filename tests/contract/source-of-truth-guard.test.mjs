import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("standalone VIP Manager documents and tests its canonical source boundary", async () => {
  const [agents, readme] = await Promise.all([
    read("AGENTS.md"),
    read("README.md"),
  ]);

  for (const source of [agents, readme]) {
    assert.match(source, /src\/components\/admin\/vip-floor-v2/u);
    assert.match(source, /src\/app\/api\/admin\/vip-floor/u);
    assert.match(source, /VipFloorDashboard\.tsx/u);
    assert.match(source, /legacy|旧/u);
    assert.match(source, /Production commit|Productionのcommit/u);
  }
});

test("Walk-in cancellation exists only on the canonical standalone inspector", async () => {
  const [inspector, commandCenter, commandRoute] = await Promise.all([
    read("src/components/admin/vip-floor-v2/inspector/Inspector.tsx"),
    read("src/components/admin/vip-floor-v2/commands/CommandCenter.tsx"),
    read("src/app/api/admin/vip-floor/commands/route.ts"),
  ]);

  assert.match(inspector, /reservation\.sourceChannel === "walk_in"/u);
  assert.match(inspector, /onCommand\("walk_in_cancel"\)/u);
  assert.match(inspector, /Walk-in取消/u);
  assert.match(commandCenter, /Walk-inを取り消す/u);
  assert.match(commandCenter, /data-least-destructive/u);
  assert.match(commandRoute, /walk_in_cancel[\s\S]*\/cancel/u);
});
