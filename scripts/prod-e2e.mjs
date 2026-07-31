#!/usr/bin/env node

import {
  SafeHttpClient,
  asTokyoDate,
  assert,
  emit,
  safeErrorCode,
} from "./lib/e2e-http.mjs";

const ORIGIN = process.env.GHOST_VIPAPP_ORIGIN ?? "https://ghost-vipapp.vercel.app";
const basicUser = process.env.VIPAPP_BASIC_USER ?? "";
const basicPassword = process.env.VIPAPP_BASIC_PASSWORD ?? "";
const ADMIN_SESSION_COOKIE = "ghost_vipapp_admin_session";

export const PRODUCTION_READ_ONLY_RULES = Object.freeze([
  { method: "GET", path: "/" },
  { method: "GET", path: "/api/admin/session" },
  { method: "DELETE", path: "/api/admin/session" },
  { method: "GET", path: "/api/admin/vip-floor" },
]);

function parseOrigin() {
  const origin = new URL(ORIGIN);
  assert(!origin.username && !origin.password, "origin_must_not_contain_credentials");
  assert(origin.pathname === "/" && !origin.search && !origin.hash, "origin_must_not_contain_path");
  const localTest = process.env.GHOST_VIPAPP_SMOKE_ALLOW_INSECURE_LOCALHOST === "1"
    && (origin.hostname === "127.0.0.1" || origin.hostname === "localhost" || origin.hostname === "::1");
  assert(origin.protocol === "https:" || localTest, "production_smoke_requires_https");
  return origin;
}

function findSearchProbe(board) {
  const rows = Array.isArray(board?.reservations) ? board.reservations : [];
  const safeFields = ["publicCode", "status", "lifecycleStatus"];
  for (const row of rows) {
    for (const field of safeFields) {
      if (typeof row?.[field] === "string" && row[field].trim()) {
        return row[field].trim();
      }
    }
  }
  return null;
}

function countLocalSearchHits(board, query) {
  if (!query) return 0;
  const rows = Array.isArray(board?.reservations) ? board.reservations : [];
  return rows.filter((row) => (
    [row?.publicCode, row?.status, row?.lifecycleStatus]
      .some((value) => typeof value === "string" && value.includes(query))
  )).length;
}

async function main() {
  const origin = parseOrigin();
  assert(basicUser && basicPassword, "basic_auth_missing");

  const client = new SafeHttpClient({
    origin,
    basicUser,
    basicPassword,
    rules: PRODUCTION_READ_ONLY_RULES,
  });
  let sessionIssued = false;

  try {
    emit("production_read_only_smoke_started", { mutationRequests: 0 });

    const unauthenticated = await client.request("/", { basic: false });
    assert(unauthenticated.status === 401, "unauthenticated_guard_not_401");

    const session = await client.requestJson("/api/admin/session");
    assert(session.response.ok && session.payload?.ok === true, `session_read_failed:${session.response.status}`);
    assert(client.jar.value(ADMIN_SESSION_COOKIE), "basic_owner_session_cookie_missing");
    sessionIssued = true;

    const today = asTokyoDate(new Date());
    const alternateDate = asTokyoDate(new Date(Date.now() - 86_400_000));
    const current = await client.requestJson(`/api/admin/vip-floor?date=${encodeURIComponent(today)}`);
    assert(current.response.ok, `board_read_failed:${current.response.status}`);
    const alternate = await client.requestJson(`/api/admin/vip-floor?date=${encodeURIComponent(alternateDate)}`);
    assert(alternate.response.ok, `alternate_board_read_failed:${alternate.response.status}`);

    const probe = findSearchProbe(current.payload);
    const searchHitCount = countLocalSearchHits(current.payload, probe);
    assert(!probe || searchHitCount > 0, "local_search_probe_failed");

    const logout = await client.requestJson("/api/admin/session", { method: "DELETE" });
    assert(logout.response.ok, `logout_failed:${logout.response.status}`);
    sessionIssued = false;
    // Basic access intentionally survives Owner logout for up to eight hours.
    // Only the backend admin session must be removed here.
    assert(client.jar.value(ADMIN_SESSION_COOKIE) === null, "logout_session_cookie_not_cleared");

    const businessMutations = client.ledger.filter(({ method, pathname }) => (
      method !== "GET"
      && pathname !== "/api/admin/session"
    ));
    assert(businessMutations.length === 0, "business_mutation_detected");

    emit("production_read_only_smoke_completed", {
      authenticatedRead: true,
      authMode: "basic_only",
      currentBoardRead: true,
      alternateDateRead: true,
      localSearchChecked: true,
      logoutChecked: true,
      rowsObserved: Array.isArray(current.payload?.reservations)
        ? current.payload.reservations.length
        : 0,
      mutationRequests: 0,
    });
  } finally {
    if (sessionIssued) {
      await client.request("/api/admin/session", { method: "DELETE" }).catch(() => undefined);
    }
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    emit("production_read_only_smoke_failed", { error: safeErrorCode(error), mutationRequests: 0 });
    process.exitCode = 1;
  });
}
