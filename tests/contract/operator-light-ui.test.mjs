import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [globals, layout, workspace, workspaceStyles] = await Promise.all([
  readFile(new URL("../../src/app/globals.css", import.meta.url), "utf8"),
  readFile(new URL("../../src/app/layout.tsx", import.meta.url), "utf8"),
  readFile(new URL("../../src/components/admin/vip-floor-v2/VipFloorWorkspace.tsx", import.meta.url), "utf8"),
  readFile(new URL("../../src/components/admin/vip-floor-v2/VipFloorWorkspace.module.css", import.meta.url), "utf8"),
]);

test("VIP Manager keeps the Owner-approved white operator surface and legible Japanese type", () => {
  assert.match(globals, /--canvas:\s*oklch\(0\.985 0 0\)/u);
  assert.match(globals, /--surface:\s*oklch\(1 0 0\)/u);
  assert.match(layout, /BIZ_UDPGothic/u);
  assert.doesNotMatch(workspaceStyles, /Georgia|Times New Roman/u);
});

test("desktop prioritizes summary, work views, queue and inspector without a miniature icon rail", () => {
  assert.match(workspaceStyles, /grid-template-columns:\s*auto minmax\(0,\s*1fr\) auto/u);
  assert.match(workspaceStyles, /\.primaryNav\s*\{\s*display:\s*none;/u);
  assert.match(workspace, /本日のVIP予約サマリー/u);
  for (const label of ["予約", "次の来店", "要対応", "未割当"]) {
    assert.match(workspace, new RegExp(`>${label}<`, "u"));
  }
  for (const view of ["List", "Floor", "Chart"]) {
    assert.match(workspace, new RegExp(`aria-label="${view}"`, "u"));
  }
});

test("status emphasis uses horizontal rules instead of AI-like colored side tabs", () => {
  assert.doesNotMatch(
    workspaceStyles,
    /border-left(?:-width)?:\s*[2-9](?:px|rem)/u,
  );
  assert.doesNotMatch(
    workspaceStyles,
    /box-shadow:\s*inset\s+[2-9]px\s+0/u,
  );
});
