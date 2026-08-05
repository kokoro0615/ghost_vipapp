import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);

test("VIP BFF chooses the explicit backend override route only after confirmation", async () => {
  const source = await readFile(new URL("src/app/api/admin/vip-floor/commands/route.ts", root), "utf8");
  assert.match(source, /confirmedServiceOverride/);
  assert.match(source, /COMMANDS\.service_status\(body\.reservationId\)\}\/override/);
  assert.match(source, /serviceOverrideReason/);
});

test("service command UI distinguishes standard edges from explicit Owner override", async () => {
  const source = await readFile(
    new URL("src/components/admin/vip-floor-v2/commands/CommandCenter.tsx", root),
    "utf8",
  );
  assert.match(source, /isStandardServiceTransition/);
  assert.match(source, /非標準の状態遷移をOwner権限で承認/);
  assert.match(source, /serviceOverrideReason/);
});
