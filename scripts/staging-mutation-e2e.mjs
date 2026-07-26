#!/usr/bin/env node

import { randomUUID } from "node:crypto";

import {
  SafeHttpClient,
  assert,
  assertStagingOrigin,
  constantTimeEqual,
  emit,
  safeErrorCode,
} from "./lib/e2e-http.mjs";

const FIXTURE_MARKER = "E2E削除可";
const CONFIRMATION = "E2E削除可";
const rawOrigin = process.env.GHOST_VIPAPP_STAGING_ORIGIN ?? "";
const basicUser = process.env.VIPAPP_BASIC_USER ?? "";
const basicPassword = process.env.VIPAPP_BASIC_PASSWORD ?? "";
const pin = process.env.VIPAPP_OWNER_PIN ?? "";

const fixturePath = process.env.GHOST_VIPAPP_STAGING_FIXTURE_PATH ?? "/api/admin/e2e/fixtures";
const commandPath = process.env.GHOST_VIPAPP_STAGING_COMMAND_PATH ?? "/api/admin/vip-floor/commands";

function escapedExactPath(pathname) {
  return new RegExp(`^${pathname.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}$`, "u");
}

function fixtureItemPath(id) {
  return `${fixturePath}/${encodeURIComponent(id)}`;
}

function fixtureAuditPath(id) {
  return `${fixtureItemPath(id)}/audit`;
}

function getReservationVersion(reservation) {
  return reservation?.version ?? null;
}

function findReservation(board, reservationId) {
  return Array.isArray(board?.reservations)
    ? board.reservations.find((item) => item?.id === reservationId) ?? null
    : null;
}

function assertFixturePayload(payload, expectedFixtureId) {
  const fixture = payload?.fixture;
  assert(payload?.ok === true && fixture && typeof fixture === "object", "fixture_create_contract_invalid");
  assert(fixture.id === expectedFixtureId, "fixture_id_mismatch");
  assert(fixture.marker === FIXTURE_MARKER, "fixture_marker_missing");
  assert(fixture.notificationMode === "disabled", "fixture_notifications_not_disabled");
  assert(fixture.cleanupRequired === true, "fixture_cleanup_not_required");
  assert(typeof fixture.id === "string" && fixture.id.length > 0, "fixture_id_missing");
  assert(typeof fixture.reservationId === "string" && fixture.reservationId.length > 0, "fixture_reservation_id_missing");
  assert(/^\d{4}-\d{2}-\d{2}$/u.test(fixture.businessDate), "fixture_business_date_invalid");
  return fixture;
}

function assertCleanupPayload(payload, mustHaveDeleted) {
  assert(payload?.ok === true && typeof payload?.deleted === "boolean", "fixture_cleanup_failed");
  if (mustHaveDeleted) assert(payload.deleted === true, "fixture_was_not_deleted");
  const orphanCounts = payload?.orphanCounts;
  assert(orphanCounts && typeof orphanCounts === "object", "fixture_cleanup_counts_missing");
  for (const key of ["reservations", "customers", "blocks", "waitlist", "outbox", "audit"]) {
    assert(orphanCounts[key] === 0, `fixture_cleanup_orphan:${key}`);
  }
}

async function main() {
  assert(rawOrigin, "staging_origin_missing");
  assert(
    constantTimeEqual(process.env.GHOST_VIPAPP_ALLOW_STAGING_MUTATION ?? "", CONFIRMATION),
    "staging_mutation_confirmation_missing",
  );
  assert(basicUser && basicPassword, "basic_auth_missing");
  assert(pin, "owner_pin_missing");
  assert(fixturePath.startsWith("/") && commandPath.startsWith("/"), "staging_path_must_be_relative");

  const productionHosts = (process.env.GHOST_VIPAPP_PRODUCTION_HOSTS ?? "")
    .split(",");
  const allowedHosts = (process.env.GHOST_VIPAPP_STAGING_HOST_ALLOWLIST ?? "")
    .split(",");
  const origin = assertStagingOrigin(rawOrigin, {
    allowInsecureLocalhost: process.env.GHOST_VIPAPP_STAGING_ALLOW_INSECURE_LOCALHOST === "1",
    allowedHosts,
    productionHosts,
  });

  const client = new SafeHttpClient({
    origin,
    basicUser,
    basicPassword,
    rules: [
      { method: "POST", path: "/api/admin/session/pin" },
      { method: "GET", path: "/api/admin/session" },
      { method: "DELETE", path: "/api/admin/session" },
      { method: "GET", path: "/api/admin/vip-floor" },
      { method: "POST", path: escapedExactPath(fixturePath) },
      { method: "POST", path: escapedExactPath(commandPath) },
      { method: "GET", path: new RegExp(`^${escapedExactPath(fixturePath).source.slice(1, -1)}/[^/]+/audit$`, "u") },
      { method: "DELETE", path: new RegExp(`^${escapedExactPath(fixturePath).source.slice(1, -1)}/[^/]+$`, "u") },
    ],
  });

  let fixture = null;
  const fixtureRunId = randomUUID();
  let fixtureCreateAttempted = false;
  let loggedIn = false;
  let cleanupComplete = false;
  let primaryError = null;

  try {
    emit("staging_mutation_e2e_started", {
      fixtureMarker: FIXTURE_MARKER,
      notificationMode: "disabled",
    });

    const login = await client.requestJson("/api/admin/session/pin", {
      method: "POST",
      json: { pin },
    });
    assert(login.response.ok && login.payload?.ok === true, `pin_login_failed:${login.response.status}`);
    assert(client.jar.size > 0, "pin_login_cookie_missing");
    loggedIn = true;

    fixtureCreateAttempted = true;
    const create = await client.requestJson(fixturePath, {
      method: "POST",
      json: {
        fixtureId: fixtureRunId,
        marker: FIXTURE_MARKER,
        notificationMode: "disabled",
        cleanupRequired: true,
        guest: { displayName: "E2E TEST", email: null, phone: null },
      },
      headers: { "Idempotency-Key": `fixture-${randomUUID()}` },
    });
    assert(create.response.ok, `fixture_create_failed:${create.response.status}`);
    fixture = assertFixturePayload(create.payload, fixtureRunId);

    const beforeBoard = await client.requestJson(
      `/api/admin/vip-floor?date=${encodeURIComponent(fixture.businessDate)}`,
    );
    assert(beforeBoard.response.ok, `fixture_board_read_failed:${beforeBoard.response.status}`);
    const beforeReservation = findReservation(beforeBoard.payload, fixture.reservationId);
    assert(beforeReservation, "fixture_reservation_not_found");
    const beforeVersion = getReservationVersion(beforeReservation);
    assert(beforeVersion !== null, "fixture_version_missing");

    const command = await client.requestJson(commandPath, {
      method: "POST",
      json: {
        kind: "note",
        reservationId: fixture.reservationId,
        expectedVersion: beforeVersion,
        payload: {
          note: "E2E staging mutation verification",
        },
      },
      headers: { "Idempotency-Key": `mutation-${randomUUID()}` },
    });
    assert(command.response.ok && command.payload?.ok === true, `fixture_mutation_failed:${command.response.status}`);
    assert(typeof command.payload?.auditLogId === "string" && command.payload.auditLogId, "mutation_audit_id_missing");

    const afterBoard = await client.requestJson(
      `/api/admin/vip-floor?date=${encodeURIComponent(fixture.businessDate)}`,
    );
    assert(afterBoard.response.ok, `fixture_board_reread_failed:${afterBoard.response.status}`);
    const afterReservation = findReservation(afterBoard.payload, fixture.reservationId);
    assert(afterReservation, "fixture_reservation_missing_after_mutation");
    const afterVersion = getReservationVersion(afterReservation);
    assert(afterVersion !== null && String(afterVersion) !== String(beforeVersion), "mutation_version_not_advanced");

    const audit = await client.requestJson(fixtureAuditPath(fixture.id));
    assert(audit.response.ok && audit.payload?.ok === true, `fixture_audit_read_failed:${audit.response.status}`);
    const auditEntries = Array.isArray(audit.payload?.entries) ? audit.payload.entries : [];
    assert(
      auditEntries.some((entry) => entry?.id === command.payload.auditLogId),
      "mutation_audit_entry_not_found",
    );

    emit("staging_mutation_verified", {
      fixtureCreated: true,
      notificationMode: "disabled",
      versionAdvanced: true,
      auditVerified: true,
      mutationCount: 1,
    });
  } catch (error) {
    primaryError = error;
  } finally {
    if (fixtureCreateAttempted) {
      try {
        const cleanup = await client.requestJson(fixtureItemPath(fixtureRunId), { method: "DELETE" });
        assert(cleanup.response.ok, `fixture_cleanup_request_failed:${cleanup.response.status}`);
        assertCleanupPayload(cleanup.payload, Boolean(fixture));
        cleanupComplete = true;
      } catch (cleanupError) {
        if (!primaryError) primaryError = cleanupError;
        else primaryError = new Error(`${safeErrorCode(primaryError)}:cleanup:${safeErrorCode(cleanupError)}`);
      }
    }

    if (loggedIn) {
      try {
        const logout = await client.requestJson("/api/admin/session", { method: "DELETE" });
        assert(logout.response.ok, `logout_failed:${logout.response.status}`);
        loggedIn = false;
        assert(client.jar.size === 0, "logout_cookie_not_cleared");
        const afterLogout = await client.requestJson("/api/admin/session");
        assert(afterLogout.response.status === 401, "session_survived_logout");
      } catch (logoutError) {
        if (!primaryError) primaryError = logoutError;
      }
    }
  }

  if (primaryError) throw primaryError;
  assert(cleanupComplete, "fixture_cleanup_not_completed");
  emit("staging_mutation_e2e_completed", {
    cleanupVerified: true,
    orphanCount: 0,
    logoutChecked: true,
  });
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    emit("staging_mutation_e2e_failed", { error: safeErrorCode(error) });
    process.exitCode = 1;
  });
}
