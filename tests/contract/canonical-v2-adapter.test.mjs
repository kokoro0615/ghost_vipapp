import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const commandRoutePath = path.join(
  root,
  "src/app/api/admin/vip-floor/commands/route.ts",
);
const boardRoutePath = path.join(root, "src/app/api/admin/vip-floor/route.ts");
const legacyAdapterPath = path.join(root, "src/lib/vipFloorLegacy.ts");
const siblingWebsiteRoot = path.resolve(root, "../ghost/website");
const siblingContractPath = path.join(
  siblingWebsiteRoot,
  "contracts/vip-manager/v2/routes.json",
);

const expectedCommands = [
  {
    kind: "check_in",
    backendPath: "/api/admin/v2/reservations/{reservationId}/check-in",
  },
  {
    kind: "arrival_time",
    backendPath: "/api/admin/v2/reservations/{reservationId}/arrival-time",
  },
  {
    kind: "assignment",
    backendPath: "/api/admin/v2/reservations/{reservationId}/assignments",
  },
  {
    kind: "seat_extension",
    backendPath: "/api/admin/v2/reservations/{reservationId}/extend-seat",
  },
  {
    kind: "note",
    backendPath: "/api/admin/v2/reservations/{reservationId}/notes",
  },
  {
    kind: "service_status",
    backendPath: "/api/admin/v2/reservations/{reservationId}/service-status",
  },
];

function routeSourceFragment(backendPath) {
  return backendPath
    .replace("{reservationId}", "${encodeURIComponent(id)}");
}

test("VIP App maps exactly six commands to the canonical v2 backend", () => {
  const source = readFileSync(commandRoutePath, "utf8");

  for (const command of expectedCommands) {
    assert.match(source, new RegExp(`${command.kind}:`));
    assert.ok(
      source.includes(routeSourceFragment(command.backendPath)),
      `missing adapter route: ${command.backendPath}`,
    );
  }

  assert.doesNotMatch(source, /vipapp-command/u);
  assert.match(source, /request\.headers\.get\("idempotency-key"\)/u);
  assert.match(source, /typeof expectedVersion !== "number"/u);
  assert.match(source, /Number\.isSafeInteger\(expectedVersion\)/u);
  assert.match(source, /expectedVersion < 1/u);
  assert.doesNotMatch(source, /\breason\s*:/u);
});

test("command payload translation preserves the v2 concurrency and domain fields", () => {
  const source = readFileSync(commandRoutePath, "utf8");

  assert.match(source, /operation: "replace"/u);
  assert.match(source, /capacityOverride: false/u);
  assert.match(source, /extendMinutes % 15 !== 0/u);
  assert.match(source, /extendMinutes > 120/u);
  assert.match(source, /toStatus: serviceStatus/u);
  assert.match(source, /arrivedAt: occurredAt/u);
  assert.match(source, /kind: "floor"/u);
  assert.match(source, /body: note/u);
  assert.match(source, /pinned: false/u);
  assert.match(source, /entityVersion: rawPayload\.entityVersion/u);
  assert.match(source, /boardRevision: rawPayload\.boardRevision/u);
  assert.match(source, /auditLogId: rawPayload\.auditLogId/u);
});

test("board adapter prefers vip-floor.v2 and makes legacy fallback read-only", () => {
  const boardSource = readFileSync(boardRoutePath, "utf8");
  const legacySource = readFileSync(legacyAdapterPath, "utf8");
  const v2Index = boardSource.indexOf("/api/admin/v2/vip-floor");
  const legacyIndex = boardSource.indexOf("/api/admin/vip-status");

  assert.ok(v2Index >= 0);
  assert.ok(legacyIndex > v2Index);
  assert.match(boardSource, /schemaVersion === VIP_FLOOR_SCHEMA_VERSION/u);
  assert.match(boardSource, /"X-GHOST-Board-Contract": VIP_FLOOR_SCHEMA_VERSION/u);
  assert.match(boardSource, /"X-GHOST-Board-Contract": "legacy-read-only"/u);
  assert.match(legacySource, /adminMutationEnabled: false/u);
});

test("checked-out GHOST website contract stays synchronized when available", () => {
  if (!existsSync(siblingContractPath)) return;

  const contract = JSON.parse(readFileSync(siblingContractPath, "utf8"));
  assert.equal(contract.contractVersion, "ghost.vip-manager.v2");
  assert.equal(contract.boardSchemaVersion, "vip-floor.v2");
  assert.equal(
    contract.board.backendPath,
    "/api/admin/v2/vip-floor?businessDate={businessDate}",
  );
  assert.equal(contract.commandProtocol.versionField, "expectedVersion");
  assert.equal(contract.commandProtocol.fixedAuditReason, "管理画面操作");
  assert.deepEqual(
    contract.commands.map(({ kind, backendPath }) => ({ kind, backendPath })),
    expectedCommands,
  );

  for (const command of contract.commands) {
    assert.ok(
      existsSync(path.join(siblingWebsiteRoot, command.source)),
      `missing backend route: ${command.source}`,
    );
  }
});
