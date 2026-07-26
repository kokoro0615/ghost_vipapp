import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const inspectorSource = await readFile(
  new URL("../../src/components/admin/vip-floor-v2/inspector/Inspector.tsx", import.meta.url),
  "utf8",
);
const workspaceSource = await readFile(
  new URL("../../src/components/admin/vip-floor-v2/VipFloorWorkspace.tsx", import.meta.url),
  "utf8",
);

test("the inspector scroll region is named, keyboard focusable, and included in the mobile focus trap", () => {
  assert.match(
    inspectorSource,
    /role="tabpanel"[\s\S]*?aria-labelledby=\{`\$\{instance\}-\$\{activeTab\}-tab`\}[\s\S]*?tabIndex=\{0\}/,
  );
  assert.match(workspaceSource, /\[tabindex\]:not\(\[tabindex="-1"\]\)/);
});
