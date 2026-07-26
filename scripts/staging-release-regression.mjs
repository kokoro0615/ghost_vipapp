#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright-core";

import {
  SafeHttpClient,
  assert,
  constantTimeEqual,
  emit,
  safeErrorCode,
} from "./lib/e2e-http.mjs";

const CONFIRMATION = "E2E削除可";
const AUDIT_REASON = "管理画面操作";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const FINGERPRINT_PATTERN = /^[a-f0-9]{64}$/u;
const RC_RUN_ID_PATTERN = /^trial-rc-[a-z0-9][a-z0-9-]{7,72}$/u;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const OFFICIAL_DISPLAY_CODES = new Set([
  "VIP-1",
  "VIP-2",
  "VIP-3",
  "VIP-4",
  "VIP-5",
  "VIP-6",
  "VIP-7",
  "VIP-8",
]);

async function main() {
  const config = await loadConfiguration();
  const client = createClient(config);
  let loggedIn = false;
  let browser = null;
  let cleanupComplete = false;
  let primaryError = null;

  try {
    emit("staging_release_regression_started", {
      contract: "vip-floor.v2",
      trialRunId: config.trialRunId,
      officialTableTarget: 8,
      providerDelivery: "disabled",
    });

    await runRequiredLifecycle(
      config.seedScript,
      "seed-vip-manager-release-candidate.mjs",
      lifecycleArgs(config, "seeded", true),
      config,
    );

    const withoutBasic = await client.request("/", { basic: false });
    assert(withoutBasic.status === 401, "outer_basic_guard_missing");
    const withBasic = await client.request("/");
    assert(withBasic.ok, `basic_entry_failed:${withBasic.status}`);

    await login(client, config.pin);
    loggedIn = true;
    await delay(2_100);
    await runRequiredLifecycle(
      config.expireSessionsScript,
      "expire-vip-manager-release-candidate-sessions.mjs",
      lifecycleArgs(config, "seeded", false),
      config,
    );
    const expiredSession = await client.requestJson("/api/admin/session");
    assert(expiredSession.response.status === 401, "expired_session_still_authenticated");
    await login(client, config.pin);

    const options = await readOptions(client, config.businessDate);
    const initialBoard = await readBoard(client, config.businessDate);
    const tables = officialTables(initialBoard);
    const tableByCode = new Map(tables.map((table) => [table.displayCode, table]));
    const offering = options.offerings.find((item) => item?.name === "RELEASE CANDIDATE VIP");
    assert(offering && UUID_PATTERN.test(offering.id ?? ""), "release_candidate_offering_missing");
    const eventDayId = options.businessDay?.id;
    assert(UUID_PATTERN.test(eventDayId ?? ""), "release_candidate_event_day_missing");

    const now = Date.now();
    const scheduledStartAt = new Date(now - 30 * 60_000).toISOString();
    const scheduledEndAt = new Date(now + 90 * 60_000).toISOString();
    const createResult = await command(
      client,
      "/api/admin/vip-floor/operations",
      "POST",
      {
        kind: "reservation_create",
        payload: {
          eventDayId,
          offeringId: offering.id,
          scheduledStartAt,
          scheduledEndAt,
          guestCount: 2,
          tableIds: [tableByCode.get("VIP-1").id],
          expectedTableVersions: tableVersions([tableByCode.get("VIP-1")]),
          existingCustomerId: null,
          displayName: "Release Candidate Guest",
          phone: null,
          email: "release-candidate@example.com",
          languageCode: "ja",
          guestLabel: "RC Guest",
          operatorNote: "Synthetic release-candidate reservation",
          sourceChannel: "admin_hold",
          serviceStatus: "expected",
          bookingStaffMemberId: null,
          notificationPreference: "none",
          capacityOverride: false,
        },
      },
      "reservation.created",
    );
    const reservationId = requireUuid(createResult.reservationId, "created_reservation_id_missing");
    const customerId = requireUuid(createResult.customerId, "created_customer_id_missing");

    let board = await readBoard(client, config.businessDate);
    let reservation = findReservation(board, reservationId);
    const staleVersion = positiveInteger(reservation.version, "created_reservation_version_missing");
    const currentVip1 = findTable(board, "VIP-1");
    const editResult = await command(
      client,
      "/api/admin/vip-floor/operations",
      "POST",
      {
        kind: "reservation_update",
        payload: {
          reservationId,
          expectedVersion: staleVersion,
          offeringId: offering.id,
          scheduledStartAt,
          scheduledEndAt,
          guestCount: 3,
          tableIds: [currentVip1.id],
          expectedTableVersions: tableVersions([currentVip1]),
          guestLabel: "RC Guest Edited",
          operatorNote: "Synthetic edit verified",
          sourceChannel: "admin_hold",
          serviceStatus: "expected",
          bookingStaffMemberId: null,
          notificationPreference: "none",
          capacityOverride: false,
        },
      },
      "reservation.updated",
    );
    assert(editResult.entityVersion > staleVersion, "reservation_edit_version_not_advanced");

    const staleConflict = await client.requestJson(
      "/api/admin/vip-floor/commands",
      {
        method: "POST",
        json: {
          kind: "note",
          reservationId,
          expectedVersion: staleVersion,
          payload: { note: "Stale conflict probe" },
        },
        headers: { "Idempotency-Key": `rc-conflict-${randomUUID()}` },
      },
    );
    assert(staleConflict.response.status === 409, "stale_version_conflict_not_409");

    await reservationCommand(
      client,
      config.businessDate,
      reservationId,
      "notes",
      {
        noteId: null,
        expectedNoteVersion: null,
        kind: "floor",
        body: "Release candidate note",
        pinned: true,
        reason: AUDIT_REASON,
      },
      "reservation_note.upserted",
    );

    board = await readBoard(client, config.businessDate);
    const vip2 = findTable(board, "VIP-2");
    await reservationCommand(
      client,
      config.businessDate,
      reservationId,
      "assignments",
      {
        operation: "replace",
        tableIds: [vip2.id],
        capacityOverride: false,
        reason: AUDIT_REASON,
      },
      "reservation.assignments.changed",
    );

    const waitlist = await command(
      client,
      "/api/admin/vip-floor/waitlist",
      "POST",
      {
        action: "create",
        payload: {
          eventDayId,
          guestCount: 1,
          guestLabel: "RC Waitlist",
          email: null,
        },
      },
      "waitlist.created",
    );
    const waitlistEntryId = requireUuid(waitlist.waitlistEntryId, "waitlist_entry_id_missing");
    const waitlistCalled = await command(
      client,
      "/api/admin/vip-floor/waitlist",
      "POST",
      {
        action: "call",
        payload: {
          waitlistEntryId,
          expectedVersion: positiveInteger(waitlist.entityVersion, "waitlist_version_missing"),
          reservationId: null,
        },
      },
      "waitlist.called",
    );
    await command(
      client,
      "/api/admin/vip-floor/waitlist",
      "POST",
      {
        action: "seat",
        payload: {
          waitlistEntryId,
          expectedVersion: positiveInteger(
            waitlistCalled.entityVersion,
            "called_waitlist_version_missing",
          ),
          reservationId,
        },
      },
      "waitlist.seated",
    );

    await reservationCommand(client, config.businessDate, reservationId, "check-in", {
      occurredAt: new Date().toISOString(),
      reason: AUDIT_REASON,
    }, "reservation.checked_in");
    await reservationCommand(client, config.businessDate, reservationId, "arrival-time", {
      arrivedAt: new Date(Date.now() - 60_000).toISOString(),
      reason: AUDIT_REASON,
    }, "reservation.arrival_time.updated");
    await reservationCommand(client, config.businessDate, reservationId, "service-status", {
      toStatus: "bottle_pending",
      occurredAt: new Date().toISOString(),
      reason: AUDIT_REASON,
    }, "reservation.service_status.updated");
    await reservationCommand(client, config.businessDate, reservationId, "extend-seat", {
      extendMinutes: 15,
      reason: AUDIT_REASON,
    }, "reservation.seat_extended");

    board = await readBoard(client, config.businessDate);
    const vip3 = findTable(board, "VIP-3");
    const walkIn = await command(
      client,
      "/api/admin/vip-floor/operations",
      "POST",
      {
        kind: "walk_in",
        payload: {
          eventDayId,
          offeringId: offering.id,
          scheduledStartAt: new Date(now - 15 * 60_000).toISOString(),
          scheduledEndAt: new Date(now + 60 * 60_000).toISOString(),
          guestCount: 2,
          tableIds: [vip3.id],
          guestLabel: "RC Walk-in",
          operatorNote: "Synthetic walk-in",
          expectedTableVersions: tableVersions([vip3]),
          capacityOverride: false,
        },
      },
      "walk_in.created",
    );
    requireUuid(
      walkIn.reservationId,
      "walk_in_reservation_id_missing",
    );

    board = await readBoard(client, config.businessDate);
    const vip4 = findTable(board, "VIP-4");
    const blockFields = {
      scope: "all_operations",
      blockKind: "manual",
      startAt: new Date(now + 2 * 60 * 60_000).toISOString(),
      endAt: new Date(now + 3 * 60 * 60_000).toISOString(),
      memo: "RC block",
      seatResourceIds: [vip4.id],
      venueWide: false,
    };
    const block = await command(
      client,
      "/api/admin/vip-floor/operations",
      "POST",
      {
        kind: "block_create",
        payload: {
          eventDayId,
          businessDate: config.businessDate,
          repeatDays: 1,
          ...blockFields,
        },
      },
      "reservation_block.created",
    );
    const blockId = requireUuid(block.blockId, "block_id_missing");
    const blockUpdated = await command(
      client,
      "/api/admin/vip-floor/operations",
      "POST",
      {
        kind: "block_update",
        payload: {
          blockId,
          expectedVersion: positiveInteger(block.entityVersion, "block_version_missing"),
          ...blockFields,
          memo: "RC block updated",
        },
      },
      "reservation_block.updated",
    );
    await command(
      client,
      "/api/admin/vip-floor/operations",
      "POST",
      {
        kind: "block_cancel",
        payload: {
          blockId,
          expectedVersion: positiveInteger(
            blockUpdated.entityVersion,
            "updated_block_version_missing",
          ),
        },
      },
      "reservation_block.cancelled",
    );

    const staff = await command(
      client,
      "/api/admin/vip-floor/staff",
      "POST",
      { action: "create", payload: { displayName: "RC Staff" } },
      "staff_member.created",
    );
    const staffMemberId = requireUuid(staff.staffMemberId, "staff_member_id_missing");
    board = await readBoard(client, config.businessDate);
    await command(
      client,
      "/api/admin/vip-floor/staff",
      "POST",
      {
        action: "assign",
        payload: {
          eventDayId,
          tableId: findTable(board, "VIP-5").id,
          staffMemberId,
          expectedAssignmentVersion: null,
        },
      },
      "table_staff_assignment.set",
    );

    const customerRead = await client.requestJson(
      `/api/admin/vip-floor/customers/${customerId}`,
    );
    assert(customerRead.response.ok && customerRead.payload?.ok === true, "customer_read_failed");
    const profileVersion = positiveInteger(
      customerRead.payload?.customer?.profileVersion,
      "customer_profile_version_missing",
    );
    await command(
      client,
      `/api/admin/vip-floor/customers/${customerId}`,
      "PATCH",
      {
        expectedVersion: profileVersion,
        eventDayId,
        reservationId,
        nationalityCode: "JP",
        birthDate: null,
        anniversaryDate: null,
        vipRank: "RC",
        reason: AUDIT_REASON,
      },
      "customer_profile.attributes_updated",
    );

    board = await readBoard(client, config.businessDate);
    reservation = findReservation(board, reservationId);
    const unlinked = await command(
      client,
      `/api/admin/vip-floor/reservations/${reservationId}/customer-link`,
      "PATCH",
      {
        expectedVersion: positiveInteger(reservation.version, "customer_unlink_version_missing"),
        customerId: null,
        reason: AUDIT_REASON,
      },
      "reservation.customer_relinked",
    );
    await command(
      client,
      `/api/admin/vip-floor/reservations/${reservationId}/customer-link`,
      "PATCH",
      {
        expectedVersion: positiveInteger(unlinked.entityVersion, "customer_relink_version_missing"),
        customerId,
        reason: AUDIT_REASON,
      },
      "reservation.customer_relinked",
    );

    await postObservability(client, config.businessDate, "realtime_gap", 2);
    await postObservability(client, config.businessDate, "realtime_unavailable", null);
    const revisionBeforeRecovery = positiveInteger(
      (await readBoard(client, config.businessDate)).boardRevision,
      "recovery_revision_missing",
    );
    await reservationCommand(client, config.businessDate, reservationId, "notes", {
      noteId: null,
      expectedNoteVersion: null,
      kind: "booking",
      body: "Gap recovery checkpoint",
      pinned: false,
      reason: AUDIT_REASON,
    }, "reservation_note.upserted");
    const recoveredBoard = await readBoard(client, config.businessDate);
    assert(
      positiveInteger(recoveredBoard.boardRevision, "recovered_revision_missing")
        > revisionBeforeRecovery,
      "gap_recovery_revision_not_advanced",
    );

    const slo = await client.requestJson(
      "/api/admin/vip-floor/observability?windowMinutes=1440",
    );
    assert(slo.response.ok && slo.payload?.ok === true, "slo_read_failed");
    assert(
      slo.payload?.alerts && Object.keys(slo.payload.alerts).length > 0,
      "slo_attention_alert_missing",
    );

    const uiReservationPlan = selectUiReservationPlan(
      await readBoard(client, config.businessDate),
    );
    browser = await runUiRegression(config, reservationId, uiReservationPlan);

    const logout = await client.requestJson("/api/admin/session", { method: "DELETE" });
    assert(logout.response.ok, `logout_failed:${logout.response.status}`);
    client.jar.clear();
    loggedIn = false;
    const afterLogout = await client.requestJson("/api/admin/session");
    assert(afterLogout.response.status === 401, "session_survived_logout");

    await runRequiredLifecycle(
      config.verifyScript,
      "verify-vip-manager-release-candidate.mjs",
      lifecycleArgs(config, "before-cleanup", false),
      config,
    );
    emit("staging_release_regression_verified", {
      sessionExpiry: true,
      officialTables: 8,
      reservationCreateEdit: true,
      commandCoverage: true,
      walkInWaitlistBlockStaffCustomer: true,
      conflictRecovery: true,
      realtimeGapRecovery: true,
      offlineReadOnly: true,
      sloAlert: true,
      verifiedAuditActions: ["customer_profile.upserted"],
    });
  } catch (error) {
    primaryError = error;
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
    if (loggedIn) {
      await client.requestJson("/api/admin/session", { method: "DELETE" }).catch(() => undefined);
      client.jar.clear();
    }
    try {
      // Let browser polling and serverless metric writes quiesce before the
      // exact-run delete reaches its final metrics/control-row assertions.
      await delay(5_000);
      await runRequiredLifecycle(
        config.cleanupScript,
        "cleanup-vip-manager-trial.mjs",
        lifecycleArgs(config, "cleanup", false),
        config,
      );
      await runRequiredLifecycle(
        config.verifyScript,
        "verify-vip-manager-release-candidate.mjs",
        lifecycleArgs(config, "after-cleanup", false),
        config,
      );
      cleanupComplete = true;
    } catch (cleanupError) {
      primaryError = primaryError
        ? new Error(`${safeErrorCode(primaryError)}:cleanup:${safeErrorCode(cleanupError)}`)
        : cleanupError;
    }
  }

  if (primaryError) throw primaryError;
  assert(cleanupComplete, "release_candidate_cleanup_not_completed");
  emit("staging_release_regression_completed", {
    cleanupVerified: true,
    baselineRestored: true,
    providerDelivery: 0,
  });
}

function createClient(config) {
  return new SafeHttpClient({
    origin: config.origin,
    basicUser: config.basicUser,
    basicPassword: config.basicPassword,
    defaultHeaders: { "x-vercel-protection-bypass": config.protectionBypass },
    rules: [
      { method: "GET", path: "/" },
      { method: "POST", path: "/api/admin/session/pin" },
      { method: "GET", path: "/api/admin/session" },
      { method: "DELETE", path: "/api/admin/session" },
      { method: "GET", path: "/api/admin/vip-floor" },
      { method: "GET", path: "/api/admin/vip-floor/options" },
      { method: "POST", path: "/api/admin/vip-floor/operations" },
      { method: "POST", path: "/api/admin/vip-floor/commands" },
      { method: "POST", path: "/api/admin/vip-floor/waitlist" },
      { method: "POST", path: "/api/admin/vip-floor/staff" },
      { method: "GET", path: /^\/api\/admin\/vip-floor\/customers\/[0-9a-f-]+$/u },
      { method: "PATCH", path: /^\/api\/admin\/vip-floor\/customers\/[0-9a-f-]+$/u },
      {
        method: "PATCH",
        path: /^\/api\/admin\/vip-floor\/reservations\/[0-9a-f-]+\/customer-link$/u,
      },
      { method: "POST", path: "/api/admin/vip-floor/observability" },
      { method: "GET", path: "/api/admin/vip-floor/observability" },
    ],
  });
}

async function login(client, pin) {
  const result = await client.requestJson("/api/admin/session/pin", {
    method: "POST",
    json: { pin },
  });
  assert(result.response.ok && result.payload?.ok === true, `pin_login_failed:${result.response.status}`);
  assert(client.jar.size > 0, "pin_login_cookie_missing");
  const session = await client.requestJson("/api/admin/session");
  assert(session.response.ok && session.payload?.ok === true, "session_read_after_login_failed");
}

async function readOptions(client, businessDate) {
  const result = await client.requestJson(
    `/api/admin/vip-floor/options?date=${encodeURIComponent(businessDate)}`,
  );
  assert(result.response.ok && result.payload?.ok === true, "vip_floor_options_failed");
  return result.payload;
}

async function readBoard(client, businessDate) {
  const result = await client.requestJson(
    `/api/admin/vip-floor?date=${encodeURIComponent(businessDate)}`,
  );
  assert(result.response.ok && result.payload?.ok === true, `board_read_failed:${result.response.status}`);
  officialTables(result.payload);
  return result.payload;
}

function officialTables(board) {
  const tables = Array.isArray(board?.tables) ? board.tables : [];
  assert(tables.length === 8, "board_table_count_not_eight");
  assert(
    tables.every((table) => OFFICIAL_DISPLAY_CODES.has(table?.displayCode)),
    "board_contains_non_official_table",
  );
  return tables;
}

function findTable(board, displayCode) {
  const table = officialTables(board).find((item) => item.displayCode === displayCode);
  assert(table && UUID_PATTERN.test(table.id ?? ""), `official_table_missing:${displayCode}`);
  positiveInteger(table.version, `official_table_version_missing:${displayCode}`);
  return table;
}

function findReservation(board, reservationId) {
  const reservation = Array.isArray(board?.reservations)
    ? board.reservations.find((item) => item?.id === reservationId)
    : null;
  assert(reservation, "release_candidate_reservation_missing");
  return reservation;
}

function tableVersions(tables) {
  return [...tables]
    .map((table) => ({
      tableId: requireUuid(table.id, "table_version_id_missing"),
      expectedVersion: positiveInteger(table.version, "table_version_missing"),
    }))
    .sort((left, right) => left.tableId.localeCompare(right.tableId));
}

async function command(client, pathname, method, json, expectedAction) {
  const result = await client.requestJson(pathname, {
    method,
    json,
    headers: { "Idempotency-Key": `rc-${randomUUID()}` },
  });
  assert(
    result.response.ok && result.payload?.ok === true,
    `${expectedAction}_failed:${result.response.status}:${safeCommandFailureCode(result.payload)}`,
  );
  const payload = expectedAction === "reservation_block.created"
    ? result.payload.results?.[0]
    : result.payload;
  assert(payload?.action === expectedAction, `${expectedAction}_action_mismatch`);
  requireUuid(payload.auditLogId, `${expectedAction}_audit_missing`);
  positiveInteger(payload.entityVersion, `${expectedAction}_version_missing`);
  return payload;
}

function safeCommandFailureCode(payload) {
  const error = payload?.error;
  const code = typeof error === "string"
    ? error
    : error && typeof error === "object" && typeof error.code === "string"
      ? error.code
      : "unknown";
  const details = error && typeof error === "object" && error.details
    && typeof error.details === "object"
    ? error.details
    : payload?.details && typeof payload.details === "object"
      ? payload.details
      : null;
  const diagnostic = [
    code,
    details?.field,
    details?.reason,
    details?.entityType,
  ].filter((value) => typeof value === "string").join(":");
  return diagnostic.replace(/[^A-Za-z0-9_:-]/gu, "_").slice(0, 160);
}

async function reservationCommand(
  client,
  businessDate,
  reservationId,
  operation,
  fields,
  action,
) {
  const board = await readBoard(client, businessDate);
  const reservation = findReservation(board, reservationId);
  const kindByOperation = {
    "arrival-time": "arrival_time",
    assignments: "assignment",
    "check-in": "check_in",
    "service-status": "service_status",
    "extend-seat": "seat_extension",
    notes: "note",
  };
  const kind = kindByOperation[operation];
  assert(kind, `reservation_command_operation_unknown:${operation}`);
  const payloadByOperation = {
    "arrival-time": { occurredAt: fields.arrivedAt },
    assignments: { tableIds: fields.tableIds },
    "check-in": { occurredAt: fields.occurredAt },
    "service-status": {
      serviceStatus: fields.toStatus,
      occurredAt: fields.occurredAt,
    },
    "extend-seat": { extendMinutes: fields.extendMinutes },
    notes: { note: fields.body },
  };
  return command(
    client,
    "/api/admin/vip-floor/commands",
    "POST",
    {
      kind,
      reservationId,
      expectedVersion: positiveInteger(
        reservation.version,
        `${operation}_reservation_version_missing`,
      ),
      payload: payloadByOperation[operation],
    },
    action,
  );
}

async function postObservability(client, businessDate, event, gapSize) {
  const result = await client.requestJson("/api/admin/vip-floor/observability", {
    method: "POST",
    json: {
      event,
      businessDate,
      ...(gapSize === null ? {} : { gapSize }),
    },
  });
  assert(result.response.ok && result.payload?.ok === true, `${event}_metric_failed`);
}

function selectUiReservationPlan(board) {
  const table = officialTables(board).find((item) => (
    Array.isArray(item.reservationIds)
    && item.reservationIds.length === 0
    && Array.isArray(item.blockIds)
    && item.blockIds.length === 0
  ));
  assert(table, "ui_reservation_plan_missing");
  const startAt = Date.now() + 3 * 60 * 60_000;
  return {
    tableDisplayCode: table.displayCode,
    startAt,
    endAt: startAt + 60 * 60_000,
  };
}

async function runUiRegression(config, reservationId, uiReservationPlan) {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome",
    headless: true,
  });
  try {
    const context = await browser.newContext({
      httpCredentials: {
        username: config.basicUser,
        password: config.basicPassword,
      },
      extraHTTPHeaders: {
        "x-vercel-protection-bypass": config.protectionBypass,
      },
      viewport: { width: 1194, height: 834 },
    });
    const page = await context.newPage();
    const failures = [];
    page.on("console", (message) => {
      if (message.type() === "error") failures.push("console_error");
    });
    page.on("response", (response) => {
      if (response.status() >= 500) failures.push(`http_${response.status()}`);
    });

    await page.goto(`${config.origin.origin}/?view=list&date=${config.businessDate}`, {
      waitUntil: "networkidle",
    });
    await page.getByLabel("Owner専用PIN").fill(config.pin);
    await page.getByRole("button", { name: "ログイン" }).click();
    await page.getByRole("navigation", { name: "主要ナビゲーション" }).waitFor();

    for (const view of ["List", "Floor", "Chart"]) {
      const button = page.getByRole("button", { name: view, exact: true });
      await button.click();
      await assertEventually(
        async () => await button.getAttribute("aria-current") === "page",
        `ui_${view}_navigation_failed`,
      );
    }

    const uiReservationPublicCode = await runUiReservationCreateAndEdit(
      page,
      uiReservationPlan,
      config.businessDate,
    );

    await page.getByRole("button", { name: "メニュー", exact: true }).click();
    await page.getByText("Owner session", { exact: true }).waitFor();
    await page.getByRole("button", { name: "メニューを閉じる" }).click();

    await page.getByRole("button", { name: "List", exact: true }).click();
    const search = page.getByRole("toolbar", { name: "表示と絞り込み" })
      .getByPlaceholder("番号 / ゲスト / 席");
    await search.fill(uiReservationPublicCode);
    const statusFilter = page.getByLabel("予約ステータス");
    for (const value of [
      "attention",
      "expected",
      "late",
      "arrived",
      "seated",
      "bill_requested",
      "all",
    ]) {
      await statusFilter.selectOption(value);
      await page.waitForTimeout(250);
      await assertEventually(
        async () => {
          const routeFilter = new URL(page.url()).searchParams.get("filter");
          return await statusFilter.inputValue() === value
            && routeFilter === (value === "all" ? null : value);
        },
        `ui_status_filter_failed:${value}`,
      );
    }
    await search.fill(uiReservationPublicCode);
    const queue = page.getByLabel("例外と到着queue");
    const openQueue = queue.getByRole("button", { name: "例外queueを開く" });
    if (await openQueue.count()) {
      await openQueue.click();
      await queue.getByRole("button", { name: "例外queueを閉じる" }).waitFor();
    }
    const queueItem = queue
      .getByRole("button")
      .filter({ hasText: uiReservationPublicCode });
    await queueItem.waitFor();
    await queueItem.click();
    await page.locator('aside[aria-label="予約インスペクター"]:visible').waitFor();
    await search.fill("");

    await page.getByRole("button", { name: "Floor", exact: true }).click();
    const staffFilter = page.getByLabel("担当スタッフでFloorを絞り込み");
    await staffFilter.selectOption("unassigned");
    assert(await staffFilter.inputValue() === "unassigned", "ui_staff_filter_unassigned_failed");
    const staffOptions = await staffFilter.locator("option").evaluateAll((options) =>
      options.map((option) => option.value).filter((value) => value && value !== "unassigned"),
    );
    assert(staffOptions.length >= 1, "ui_staff_filter_member_missing");
    await staffFilter.selectOption(staffOptions[0]);
    assert(await staffFilter.inputValue() === staffOptions[0], "ui_staff_filter_member_failed");
    await staffFilter.selectOption("");

    await page.getByRole("button", { name: "List", exact: true }).click();
    const dateInput = page.getByLabel("営業日");
    await dateInput.fill(config.alternateBusinessDate);
    await page.waitForTimeout(300);
    await dateInput.fill(config.businessDate);
    await page.waitForTimeout(300);

    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await page.getByText("オフライン", { exact: true }).first().waitFor();
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("navigation", { name: "主要ナビゲーション" }).waitFor();
    assert(
      await page.locator(`button[aria-label*="${reservationId}"]`).count() === 0,
      "ui_exposed_internal_reservation_id",
    );

    await page.getByRole("button", { name: /ログアウト/u }).first().click();
    await page.getByLabel("Owner専用PIN").waitFor();

    assert(failures.length === 0, `ui_runtime_failures:${[...new Set(failures)].join(",")}`);
    await context.close();
    return browser;
  } catch (error) {
    await browser.close().catch(() => undefined);
    throw error;
  }
}

async function runUiReservationCreateAndEdit(page, plan, businessDate) {
  await page.getByRole("button", { name: /^新規オペレーション/u }).click();
  const dialog = page.getByRole("dialog", { name: "新規オペレーション" });
  await dialog.getByRole("tab", { name: "8段階予約" }).click();
  let wizard = dialog.locator('section[aria-label^="予約作成"]');

  await wizard.getByRole("button", { name: "次へ" }).click();
  await wizard.getByLabel("開始", { exact: true }).fill(tokyoLocalInput(plan.startAt));
  await wizard.getByLabel("終了", { exact: true }).fill(tokyoLocalInput(plan.endAt));
  await wizard.getByRole("button", { name: "次へ" }).click();
  await wizard.getByLabel("人数", { exact: true }).fill("2");
  await wizard.getByRole("button", { name: "次へ" }).click();
  await wizard.getByRole("group", { name: "予約卓" })
    .getByText(plan.tableDisplayCode, { exact: true })
    .click();
  await wizard.getByRole("button", { name: "次へ" }).click();
  await wizard.getByLabel("氏名", { exact: true }).fill("Release Candidate UI Guest");
  await wizard.getByLabel("Eメール", { exact: true }).fill("release-candidate-ui@example.com");
  await wizard.getByRole("button", { name: "次へ" }).click();
  await wizard.getByLabel("入口表示名", { exact: true }).fill("RC UI Guest");
  await wizard.getByLabel("現場共有メモ", { exact: true }).fill("UI wizard release checkpoint");
  await wizard.getByRole("button", { name: "次へ" }).click();
  await wizard.getByRole("button", { name: "次へ" }).click();
  const createResponsePromise = waitForUiOperationResponse(page);
  await wizard.getByRole("button", { name: "競合確認して作成" }).click();
  const createPayload = await assertUiOperationSucceeded(
    createResponsePromise,
    "ui_reservation_create",
  );
  const uiReservationId = requireUuid(
    createPayload.reservationId,
    "ui_created_reservation_id_missing",
  );
  await dialog.waitFor({ state: "detached" });

  const boardResponse = await page.request.get(
    new URL(
      `/api/admin/vip-floor?date=${encodeURIComponent(businessDate)}`,
      page.url(),
    ).href,
  );
  const boardPayload = await boardResponse.json().catch(() => ({}));
  assert(
    boardResponse.ok() && boardPayload?.ok === true,
    `ui_created_board_read_failed:${boardResponse.status()}`,
  );
  const uiReservation = findReservation(boardPayload, uiReservationId);
  const uiReservationPublicCode = uiReservation.publicCode;
  assert(
    typeof uiReservationPublicCode === "string"
      && uiReservationPublicCode.length > 0
      && !uiReservationPublicCode.includes(uiReservationId),
    "ui_created_public_code_missing",
  );

  const listButton = page.getByRole("button", { name: "List", exact: true });
  await listButton.click();
  await assertEventually(
    async () => await listButton.getAttribute("aria-current") === "page",
    "ui_create_list_navigation_failed",
  );
  const search = page.getByRole("toolbar", { name: "表示と絞り込み" })
    .getByPlaceholder("番号 / ゲスト / 席");
  await search.fill(uiReservationPublicCode);
  await page.getByRole("button", {
    name: `${uiReservationPublicCode}の詳細を開く`,
    exact: true,
  }).click();
  const inspector = page.locator('aside[aria-label="予約インスペクター"]:visible');
  await inspector.waitFor();
  await inspector.getByRole("button", { name: "予約編集" }).click();

  const editDialog = page.getByRole("dialog", { name: "予約編集" });
  wizard = editDialog.locator('section[aria-label^="予約編集"]');
  await wizard.getByRole("button", { name: "次へ" }).click();
  await wizard.getByRole("button", { name: "次へ" }).click();
  await wizard.getByLabel("人数", { exact: true }).fill("3");
  await wizard.getByRole("button", { name: "次へ" }).click();
  await wizard.getByRole("button", { name: "次へ" }).click();
  await wizard.getByRole("button", { name: "次へ" }).click();
  await wizard.getByLabel("入口表示名", { exact: true }).fill("RC UI Guest Edited");
  await wizard.getByRole("button", { name: "次へ" }).click();
  await wizard.getByRole("button", { name: "次へ" }).click();
  const editResponsePromise = waitForUiOperationResponse(page);
  await wizard.getByRole("button", { name: "競合確認して更新" }).click();
  await assertUiOperationSucceeded(editResponsePromise, "ui_reservation_edit");
  await editDialog.waitFor({ state: "detached" });
  await search.fill(uiReservationPublicCode);
  await page.getByText(uiReservationPublicCode, { exact: true }).first().waitFor();
  return uiReservationPublicCode;
}

function waitForUiOperationResponse(page) {
  return page.waitForResponse((response) => (
    new URL(response.url()).pathname === "/api/admin/vip-floor/operations"
    && response.request().method() === "POST"
  ));
}

async function assertUiOperationSucceeded(responsePromise, stage) {
  const response = await responsePromise;
  const payload = await response.json().catch(() => ({}));
  assert(
    response.ok() && payload?.ok === true,
    `${stage}_failed:${response.status()}:${safeCommandFailureCode(payload)}`,
  );
  return payload;
}

function tokyoLocalInput(timestamp) {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  }).format(new Date(timestamp)).replace(" ", "T");
}

async function loadConfiguration() {
  const envPath = process.env.GHOST_VIPAPP_E2E_ENV_FILE ?? "";
  const manifestPath = process.env.GHOST_VIPAPP_RELEASE_MANIFEST_PATH ?? "";
  const env = parseEnvFile(await readMode600File(envPath, "e2e_env_file"));
  const manifestSource = await readMode600File(manifestPath, "release_manifest");
  let manifest;
  try {
    manifest = JSON.parse(manifestSource);
  } catch {
    throw new Error("release_manifest_invalid_json");
  }
  assert(manifest && typeof manifest === "object" && !Array.isArray(manifest), "release_manifest_invalid");

  const trialRunId = required(manifest, "trialRunId");
  const businessDate = required(manifest, "businessDate");
  const alternateBusinessDate = required(manifest, "alternateBusinessDate");
  assert(RC_RUN_ID_PATTERN.test(trialRunId), "release_candidate_run_id_invalid");
  assert(DATE_PATTERN.test(businessDate), "release_candidate_business_date_invalid");
  assert(DATE_PATTERN.test(alternateBusinessDate), "release_candidate_alternate_date_invalid");
  assert(businessDate !== alternateBusinessDate, "release_candidate_dates_must_differ");

  const allowInsecureLocalhost =
    process.env.GHOST_VIPAPP_STAGING_ALLOW_INSECURE_LOCALHOST === "1";
  const origin = manifestOrigin(manifest, "vip", allowInsecureLocalhost);
  const backendOrigin = manifestOrigin(manifest, "backend", allowInsecureLocalhost);
  assert(origin.hostname !== "ghost-vipapp.vercel.app", "production_vip_origin_rejected");
  assert(backendOrigin.hostname !== "ghost-ruby-one.vercel.app", "production_backend_rejected");
  assert(origin.hostname === manifest.vip.host, "release_candidate_vip_host_mismatch");
  assert(
    constantTimeEqual(
      required(env, "GHOST_VIPAPP_RELEASE_VIP_HOST"),
      origin.hostname,
    ),
    "release_candidate_vip_host_not_confirmed",
  );
  assert(
    constantTimeEqual(
      required(env, "GHOST_VIPAPP_RELEASE_BACKEND_HOST"),
      backendOrigin.hostname,
    ),
    "release_candidate_backend_host_not_confirmed",
  );
  assert(
    constantTimeEqual(required(env, "GHOST_VIPAPP_ALLOW_STAGING_MUTATION"), CONFIRMATION),
    "staging_mutation_confirmation_missing",
  );

  const allowTestScript =
    process.env.GHOST_VIPAPP_E2E_TEST_ALLOW_LOCAL_SCRIPTS === "1"
    && origin.hostname === "localhost";
  const scripts = {
    seedScript: "seed-vip-manager-release-candidate.mjs",
    expireSessionsScript: "expire-vip-manager-release-candidate-sessions.mjs",
    cleanupScript: "cleanup-vip-manager-trial.mjs",
    verifyScript: "verify-vip-manager-release-candidate.mjs",
  };
  const scriptFingerprints = manifest.lifecycleScriptSha256;
  assert(
    scriptFingerprints
      && typeof scriptFingerprints === "object"
      && !Array.isArray(scriptFingerprints),
    "lifecycle_script_fingerprints_missing",
  );
  for (const [key, expectedName] of Object.entries(scripts)) {
    const expectedSha256 = required(scriptFingerprints, key);
    assert(
      FINGERPRINT_PATTERN.test(expectedSha256),
      `lifecycle_script_fingerprint_invalid:${expectedName}`,
    );
    await assertWebsiteScript(
      required(manifest, key),
      expectedName,
      expectedSha256,
      allowTestScript,
    );
  }
  const lifecycleEnvFile = required(manifest, "websiteLifecycleEnvFile");
  const lifecycleEnv = parseEnvFile(
    await readMode600File(lifecycleEnvFile, "website_lifecycle_env_file"),
  );
  assert(
    constantTimeEqual(
      required(lifecycleEnv, "GHOST_VIP_RELEASE_CANDIDATE_PIN"),
      required(env, "VIPAPP_OWNER_PIN"),
    ),
    "release_candidate_pin_sources_mismatch",
  );

  return {
    origin,
    backendOrigin,
    trialRunId,
    businessDate,
    alternateBusinessDate,
    lifecycleEnvFile,
    allowTestScript,
    scriptFingerprints,
    seedScript: manifest.seedScript,
    expireSessionsScript: manifest.expireSessionsScript,
    cleanupScript: manifest.cleanupScript,
    verifyScript: manifest.verifyScript,
    basicUser: required(env, "VIPAPP_BASIC_USER"),
    basicPassword: required(env, "VIPAPP_BASIC_PASSWORD"),
    pin: required(env, "VIPAPP_OWNER_PIN"),
    protectionBypass: required(env, "GHOST_VIPAPP_PROTECTION_BYPASS"),
  };
}

function lifecycleArgs(config, phase, includeDate) {
  return [
    "--confirm-staging",
    "--trial-run-id", config.trialRunId,
    "--phase", phase,
    ...(includeDate ? ["--business-date", config.businessDate] : []),
  ];
}

async function runRequiredLifecycle(scriptPath, expectedName, args, config) {
  const result = await runLifecycleScript(
    scriptPath,
    expectedName,
    required(config.scriptFingerprints, scriptKeyForName(expectedName)),
    args,
    config.lifecycleEnvFile,
    config.allowTestScript,
  );
  assert(result.code === 0, `release_candidate_lifecycle_failed:${expectedName}`);
}

async function runLifecycleScript(
  scriptPath,
  expectedName,
  expectedSha256,
  args,
  lifecycleEnvFile,
  allowTestScript,
) {
  await assertWebsiteScript(scriptPath, expectedName, expectedSha256, allowTestScript);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        PATH: process.env.PATH ?? "",
        GHOST_VIP_MANAGER_LIFECYCLE_ENV_FILE: lifecycleEnvFile,
      },
    });
    child.stdout.resume();
    child.stderr.resume();
    child.on("error", () => resolve({ code: 1 }));
    child.on("close", (code) => resolve({ code: code ?? 1 }));
  });
}

async function assertWebsiteScript(
  scriptPath,
  expectedName,
  expectedSha256,
  allowTestScript,
) {
  assert(typeof scriptPath === "string" && path.isAbsolute(scriptPath), "lifecycle_script_path_invalid");
  assert(FINGERPRINT_PATTERN.test(expectedSha256), "lifecycle_script_fingerprint_invalid");
  const resolved = await realpath(scriptPath);
  assert(resolved === path.resolve(scriptPath), `lifecycle_script_symlink_rejected:${expectedName}`);
  const parsed = path.parse(scriptPath);
  assert(parsed.base === expectedName, `lifecycle_script_path_rejected:${expectedName}`);
  if (!allowTestScript) {
    assert(
      path.basename(parsed.dir) === "scripts",
      `lifecycle_script_path_rejected:${expectedName}`,
    );
    const packageSource = await readFile(path.join(path.dirname(parsed.dir), "package.json"), "utf8");
    let packageManifest;
    try {
      packageManifest = JSON.parse(packageSource);
    } catch {
      throw new Error("lifecycle_script_package_invalid");
    }
    assert(packageManifest?.name === "website", "lifecycle_script_package_rejected");
  }
  const actualSha256 = createHash("sha256")
    .update(await readFile(resolved))
    .digest("hex");
  assert(
    constantTimeEqual(actualSha256, expectedSha256),
    `lifecycle_script_fingerprint_mismatch:${expectedName}`,
  );
}

function scriptKeyForName(expectedName) {
  const keys = {
    "seed-vip-manager-release-candidate.mjs": "seedScript",
    "expire-vip-manager-release-candidate-sessions.mjs": "expireSessionsScript",
    "cleanup-vip-manager-trial.mjs": "cleanupScript",
    "verify-vip-manager-release-candidate.mjs": "verifyScript",
  };
  const key = keys[expectedName];
  assert(key, "lifecycle_script_name_unknown");
  return key;
}

function manifestOrigin(manifest, key, allowInsecureLocalhost) {
  const value = manifest[key];
  assert(value && typeof value === "object" && !Array.isArray(value), `release_manifest_${key}_missing`);
  let origin;
  try {
    origin = new URL(value.origin);
  } catch {
    throw new Error(`release_manifest_${key}_origin_invalid`);
  }
  const loopback = ["localhost", "127.0.0.1", "::1"].includes(origin.hostname);
  assert(origin.protocol === "https:" || (allowInsecureLocalhost && loopback && origin.protocol === "http:"), `release_manifest_${key}_origin_requires_https`);
  assert(!origin.username && !origin.password, `release_manifest_${key}_credentials_forbidden`);
  assert(origin.pathname === "/" && !origin.search && !origin.hash, `release_manifest_${key}_origin_not_canonical`);
  assert(value.host === origin.hostname, `release_manifest_${key}_host_mismatch`);
  assert(FINGERPRINT_PATTERN.test(value.fingerprint ?? ""), `release_manifest_${key}_fingerprint_invalid`);
  const expected = createHash("sha256").update(origin.origin).digest("hex");
  assert(constantTimeEqual(value.fingerprint, expected), `release_manifest_${key}_fingerprint_mismatch`);
  return origin;
}

async function readMode600File(filePath, code) {
  await assertMode600File(filePath, code);
  return readFile(filePath, "utf8");
}

async function assertMode600File(filePath, code) {
  assert(typeof filePath === "string" && path.isAbsolute(filePath), `${code}_path_invalid`);
  const metadata = await stat(filePath);
  assert(metadata.isFile(), `${code}_not_file`);
  assert((metadata.mode & 0o777) === 0o600, `${code}_must_be_mode_600`);
}

function parseEnvFile(source) {
  const values = {};
  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/u.exec(line);
    assert(match, "e2e_env_file_invalid");
    const quoted = /^(?:"([\s\S]*)"|'([\s\S]*)')$/u.exec(match[2]);
    values[match[1]] = quoted ? (quoted[1] ?? quoted[2] ?? "") : match[2];
  }
  return values;
}

function required(source, key) {
  const value = source[key];
  assert(typeof value === "string" && value.length > 0, `release_required_value_missing:${key}`);
  return value;
}

function requireUuid(value, code) {
  assert(typeof value === "string" && UUID_PATTERN.test(value), code);
  return value;
}

function positiveInteger(value, code) {
  assert(typeof value === "number" && Number.isSafeInteger(value) && value >= 1, code);
  return value;
}

async function assertEventually(predicate, code) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await predicate()) return;
    await delay(100);
  }
  throw new Error(code);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    emit("staging_release_regression_failed", { error: safeErrorCode(error) });
    process.exitCode = 1;
  });
}
