import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("eight-step reservation create is Owner-only, versioned, and notification-safe", async () => {
  const [proxy, wizard, operationCenter, hook] = await Promise.all([
    read("src/app/api/admin/vip-floor/operations/route.ts"),
    read("src/components/admin/vip-floor-v2/operations/ReservationWizard.tsx"),
    read("src/components/admin/vip-floor-v2/operations/OperationCenter.tsx"),
    read("src/components/admin/vip-floor-v2/state/useVipFloorWorkspace.ts"),
  ]);

  assert.match(proxy, /requireAdminOperation\(request, \{ ownerOnly: true \}\)/u);
  assert.match(proxy, /"\/api\/admin\/v2\/reservations"/u);
  assert.match(proxy, /expectedTableVersions/u);
  assert.match(proxy, /notificationPreference/u);
  assert.match(proxy, /reservation_created/u);
  assert.match(proxy, /queued: notificationResponse\.ok/u);
  assert.match(wizard, /const STEPS = \["日付", "時刻", "人数", "卓", "顧客", "追加", "担当", "確認"\]/u);
  assert.match(wizard, /expectedVersion: table\.version/u);
  assert.match(wizard, /電話の完全一致を優先/u);
  assert.match(wizard, /送信しない/u);
  assert.match(wizard, /Eメール送信/u);
  assert.match(operationCenter, /activeKind === "reservation_create"/u);
  assert.match(hook, /reservation_create: "予約を作成しました"/u);
  assert.doesNotMatch(wizard, /name="reason"/u);
});
