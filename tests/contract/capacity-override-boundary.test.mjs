import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);

test("assignment and reservation BFF paths use the shared explicit override parser", async () => {
  const commands = await readFile(new URL("src/app/api/admin/vip-floor/commands/route.ts", root), "utf8");
  const operations = await readFile(new URL("src/app/api/admin/vip-floor/operations/route.ts", root), "utf8");
  assert.match(commands, /parseOwnerCapacityOverride/);
  assert.match(operations, /parseOwnerCapacityOverride/g);
  assert.doesNotMatch(commands, /capacityOverride:\s*false/);
  assert.doesNotMatch(operations, /capacityOverride:\s*false/);
});

test("reservation UI exposes a reasoned Owner confirmation control", async () => {
  const wizard = await readFile(
    new URL("src/components/admin/vip-floor-v2/operations/ReservationWizard.tsx", root),
    "utf8",
  );
  assert.match(wizard, /confirmedCapacityOverride/);
  assert.match(wizard, /capacityOverrideReason/);
  assert.match(wizard, /定員超過をOwner権限で承認/);
});
