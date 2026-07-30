import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

test("VIPMAP instruments preserve canonical geometry and current staff workflows", async () => {
  const source = await read("src/components/admin/vip-floor-v2/floor/FloorView.tsx");

  assert.match(source, /StaffWorkspaceData/u);
  assert.match(source, /data-staff-filtered/u);
  assert.match(source, /staff\?\.displayName/u);
  assert.match(source, /left:\s*`\$\{table\.geometry\.xPercent\}%`/u);
  assert.match(source, /top:\s*`\$\{table\.geometry\.yPercent\}%`/u);
  assert.match(source, /\["--table-rotation" as string\]/u);
  assert.match(source, /className=\{styles\.tableAnchor\}/u);
  assert.match(source, /className=\{styles\.boothSignal\}/u);
  assert.match(source, /className=\{styles\.nodeCard\}/u);
  assert.match(source, /BOOTH_CLUSTER_CENTER/u);
});

test("VIPMAP status motion is semantic and has a static reduced-motion signal", async () => {
  const [statusModel, css] = await Promise.all([
    read("src/components/admin/vip-floor-v2/contract/statusModel.ts"),
    read("src/components/admin/vip-floor-v2/VipFloorWorkspace.module.css"),
  ]);

  assert.match(statusModel, /StatusVital = "still" \| "live" \| "alert"/u);
  assert.match(statusModel, /late:.*vital: "alert"/u);
  assert.match(statusModel, /seated:.*vital: "live"/u);
  assert.match(statusModel, /expected:.*vital: "still"/u);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.boothSignal\[data-vital="alert"\][\s\S]*animation: none/u);
  assert.match(css, /\.tableNode\[data-vital="live"\] \.nodeGlyph::after/u);
});

test("mobile floor stage expands with the 700px artwork instead of retaining a narrow coordinate box", async () => {
  const css = await read("src/components/admin/vip-floor-v2/VipFloorWorkspace.module.css");
  const tabletRule = css.match(/@media \(max-width: 1023px\) \{[\s\S]*?\/\* Phones:/u)?.[0] ?? "";

  assert.match(tabletRule, /\.floorCanvas\s*\{[\s\S]*justify-content: flex-start;[\s\S]*overflow: auto;/u);
  assert.match(tabletRule, /\.floorPlan \{ max-width: none; max-height: none; flex: none; \}/u);
  assert.match(tabletRule, /\.floorImage \{ width: 700px; max-width: none; max-height: none; \}/u);
});
