import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const operationsRoute = read(
  "src/app/api/admin/vip-floor/operations/route.ts",
);
const customerRoute = read(
  "src/app/api/admin/vip-floor/customers/[customerId]/route.ts",
);
const customerLinkRoute = read(
  "src/app/api/admin/vip-floor/reservations/[reservationId]/customer-link/route.ts",
);
const wizard = read(
  "src/components/admin/vip-floor-v2/operations/ReservationWizard.tsx",
);
const customerPanel = read(
  "src/components/admin/vip-floor-v2/customers/CustomerPanel.tsx",
);

test("reservation edit is atomic, versioned and queues notification only after success", () => {
  assert.ok(operationsRoute.includes('body.kind === "reservation_update"'));
  assert.ok(operationsRoute.includes("/api/admin/v2/reservations/${encodeURIComponent(payload.value.reservationId)}"));
  assert.ok(operationsRoute.includes('method: "PATCH"'));
  assert.ok(operationsRoute.includes('template: "reservation_changed"'));
  assert.ok(operationsRoute.indexOf("if (!updateResponse.ok)") < operationsRoute.indexOf('template: "reservation_changed"'));
  assert.ok(wizard.includes('kind: "reservation_update"'));
  assert.ok(wizard.includes("expectedVersion: reservation.version"));
  assert.ok(wizard.includes('reservation ? "更新" : "作成"'));
});

test("customer detail and relink adapters remain Owner-only and versioned", () => {
  assert.ok(customerRoute.includes('requireAdminOperation(request, { ownerOnly: true })'));
  assert.ok(customerRoute.includes("/api/admin/v2/customers/${encodeURIComponent(customerId)}"));
  assert.ok(customerRoute.includes("expectedVersion"));
  assert.ok(customerRoute.includes("idempotency-key"));
  assert.ok(customerLinkRoute.includes('requireAdminOperation(request, { ownerOnly: true })'));
  assert.ok(customerLinkRoute.includes("expectedVersion"));
  assert.ok(customerLinkRoute.includes("customerId"));
  assert.ok(customerLinkRoute.includes("FIXED_REASON"));
  assert.ok(customerPanel.includes("reservationHistory"));
  assert.ok(customerPanel.includes("linkHistory"));
  assert.ok(customerPanel.includes("属性を保存"));
  assert.ok(customerPanel.includes("再紐付け"));
  assert.ok(customerPanel.includes("解除"));
});

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}
