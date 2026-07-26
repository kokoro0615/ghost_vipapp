import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const read = (relativePath) => readFile(path.join(process.cwd(), relativePath), "utf8");

test("maintenance mode is server-only, exact true, and defaults false", async () => {
  const source = await read("src/lib/server/maintenanceMode.ts");
  assert.match(source, /import "server-only"/u);
  assert.match(source, /process\.env\.GHOST_VIP_MAINTENANCE_MODE === "true"/u);
  assert.doesNotMatch(source, /\?\?\s*true|!==\s*"false"/u);
});

test("maintenance anchor replaces the workspace and exposes no PIN, board, or mutation controls", async () => {
  const [page, anchor] = await Promise.all([
    read("src/app/page.tsx"),
    read("src/components/admin/vip-floor-v2/MaintenanceAnchor.tsx"),
  ]);
  assert.match(page, /isGhostVipMaintenanceMode\(\)/u);
  assert.match(page, /return <MaintenanceAnchor \/>/u);
  assert.match(anchor, /Trial終了・本番移行作業中/u);
  assert.match(anchor, /閲覧・更新を一時停止しています/u);
  assert.doesNotMatch(anchor, /<form|<input|<button|fetch\(|\/api\/admin/u);
});

test("outer Basic guard remains independent of maintenance mode", async () => {
  const proxy = await read("src/proxy.ts");
  assert.match(proxy, /VIPAPP_BASIC_USER/u);
  assert.match(proxy, /VIPAPP_BASIC_PASSWORD/u);
  assert.match(proxy, /WWW-Authenticate/u);
  assert.doesNotMatch(proxy, /GHOST_VIP_MAINTENANCE_MODE/u);
});
