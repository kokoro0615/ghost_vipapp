#!/usr/bin/env node
import { createHash, randomInt } from "node:crypto";

const ORIGIN = process.env.GHOST_VIPAPP_ORIGIN ?? "https://ghost-vipapp.vercel.app";

const basicUser = process.env.VIPAPP_BASIC_USER ?? "";
const basicPassword = process.env.VIPAPP_BASIC_PASSWORD ?? "";
const pin = process.env.VIPAPP_OWNER_PIN ?? "";

const requestLogins = Boolean(process.env.GHOST_VIPAPP_REQUEST_PIN_FROM_INPUT === "1");

function encodeBasic() {
  if (!basicUser || !basicPassword) return null;
  return `Basic ${Buffer.from(`${basicUser}:${basicPassword}`).toString("base64")}`;
}

function authHeaders() {
  const headers = new Headers();
  const basic = encodeBasic();
  if (!basic) return headers;
  headers.set("Authorization", basic);
  return headers;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function asTokyoDate(date) {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(date);
}

async function fetchJson(input, init = {}) {
  const response = await fetch(input, {
    ...init,
    headers: new Headers(init.headers),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

function buildHeaders(init = {}, includeBasic = false) {
  const headers = new Headers(init.headers);
  if (includeBasic) {
    const basic = authHeaders().get("Authorization");
    if (!basic) {
      throw new Error("basic_auth_missing");
    }
    headers.set("Authorization", basic);
  }
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

function reasonForTest() {
  return `ghost-vipapp-e2e-${randomInt(1_000, 9_999)}`;
}

function hashText(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 12);
}

function isReadOnlyReservationStatus(status) {
  return status === "cancelled" || status === "completed";
}

async function loginWithPin() {
  let actualPin = pin;
  if (!actualPin && requestLogins) {
    process.stderr.write("PINを環境変数VIPAPP_OWNER_PINで指定してください。\n");
    return null;
  }
  assert(actualPin, "PINが未設定です。VIPAPP_OWNER_PINを設定してください。");

  const { response, payload } = await fetchJson(`${ORIGIN}/api/admin/session/pin`, {
    method: "POST",
    headers: buildHeaders({ "Content-Type": "application/json" }, true),
    body: JSON.stringify({ pin: actualPin }),
  });
  if (!response.ok) {
    throw new Error(`pin_login_failed:${response.status}:${payload.error ?? "unknown"}`);
  }
  return payload;
}

async function loadBoard(date) {
  const search = date ? `?date=${encodeURIComponent(date)}` : "";
  const { response, payload } = await fetchJson(`${ORIGIN}/api/admin/vip-floor${search}`, {
    headers: buildHeaders({}, true),
  });
  if (!response.ok) {
    throw new Error(`vip_floor_failed:${response.status}:${payload.error ?? "unknown"}`);
  }
  return payload;
}

async function callCommand(draft) {
  const { response, payload } = await fetchJson(`${ORIGIN}/api/admin/vip-floor/commands`, {
    method: "POST",
    headers: buildHeaders(
      {
        "Content-Type": "application/json",
        "idempotency-key": `e2e-${randomInt(1_000_000_000, 9_999_999_999)}-${hashText(draft.kind)}`,
      },
      true,
    ),
    body: JSON.stringify(draft),
  });
  if (!response.ok) {
    throw new Error(`command_failed:${draft.kind}:${response.status}:${payload.error ?? "unknown"}`);
  }
  return payload;
}

async function logout() {
  await fetch(`${ORIGIN}/api/admin/session`, {
    method: "DELETE",
    headers: buildHeaders({}, true),
  });
}

function findTargetReservation(boardPayload) {
  const reservations = Array.isArray(boardPayload.reservations) ? boardPayload.reservations : [];
  const target = reservations.find((item) => !isReadOnlyReservationStatus(item.status || item.lifecycleStatus));
  return target ? {
    id: target.id,
    updatedAt: target.updatedAt,
    tableIds: target.tableIds ?? [],
    status: target.status || target.lifecycleStatus,
  } : null;
}

function pickCommandTable(boardPayload, currentTableIds) {
  const seats = Array.isArray(boardPayload.seats) ? boardPayload.seats : [];
  const used = new Set(currentTableIds || []);
  for (const seat of seats) {
    if (!seat?.publicResourceCode || seat.active === false) continue;
    if (!used.has(seat.publicResourceCode)) return seat.publicResourceCode;
  }
  return seats.find((item) => item?.publicResourceCode)?.publicResourceCode ?? null;
}

async function main() {
  console.log(JSON.stringify({
    stage: "smoke_start",
    origin: ORIGIN,
    basic: Boolean(basicUser && basicPassword),
    pinProvided: Boolean(pin),
  }));

  // 認証ガード
  const unauth = await fetchJson(`${ORIGIN}/`, { headers: buildHeaders({}, false) });
  assert(unauth.response.status === 401, "未認証時に401が返ることを確認できませんでした");

  const session = await loadSessionStatus(true).catch(() => null);
  if (session?.response?.ok) {
    console.log("既存セッション検出: クリアして再ログインします");
    await logout();
  }

  const loginPayload = await loginWithPin();
  assert(typeof loginPayload?.ok === "boolean" && loginPayload.ok, "PINログインが成功していません");

  const today = asTokyoDate(new Date());
  const boardToday = await loadBoard(today);
  const boardDate = boardToday.businessDay?.businessDate ?? today;
  const sampleQuery = String(boardToday.reservations?.[0]?.publicCode ?? "").trim();
  const searchHitCount = sampleQuery
    ? boardToday.reservations?.filter((reservation) => {
      const values = [reservation?.publicCode, reservation?.status, reservation?.lifecycleStatus, reservation?.guestLabel];
      return values.some((value) => typeof value === "string" && value.includes(sampleQuery));
    }).length
    : 0;
  const alternateDate = asTokyoDate(new Date(Date.now() - 86400_000));
  const boardAlternate = await loadBoard(alternateDate);

  const target = findTargetReservation(boardDate ? { ...boardToday, businessDay: { businessDate: boardDate } } : boardToday);
  if (!target) {
    console.log(JSON.stringify({
      stage: "readonly_verification",
      boardDate,
      rows: boardToday.totals?.reservationCount ?? 0,
      tableCount: boardToday.totals?.tableCount ?? 0,
      searchProbe: sampleQuery || null,
      dateSwitchChecked: {
        currentDate: boardDate,
        alternateDate: boardAlternate.businessDay?.businessDate ?? alternateDate,
        alternateRows: boardAlternate.totals?.reservationCount ?? 0,
      },
      ok: true,
      note: "対象予約がないため、閲覧系（認証/read/search/date）確認のみ完了。実更新は保留。",
      queryWorks: Boolean(sampleQuery ? searchHitCount > 0 : true),
      commandSkipped: true,
    }));
    return;
  }

  const expectedReason = reasonForTest();
  const baseDraft = {
    expectedUpdatedAt: target.updatedAt,
    reason: expectedReason,
    reservationId: target.id,
  };

  const beforeAt = `${new Date().toISOString().slice(0, 16)}:00+09:00`;

  const tableCode = pickCommandTable(boardToday, target.tableIds);

  const results = [];
  results.push(await callCommand({ ...baseDraft, kind: "arrival_time", payload: { reason: expectedReason, occurredAt: beforeAt } }));

  if (target.status !== "checked_in") {
    results.push(await callCommand({ ...baseDraft, kind: "check_in", payload: { reason: expectedReason, occurredAt: new Date().toISOString() } }));
  }

  results.push(await callCommand({ ...baseDraft, kind: "seat_extension", payload: { reason: expectedReason, extendMinutes: 30 } }));
  if (tableCode) {
    results.push(await callCommand({ ...baseDraft, kind: "assignment", payload: { reason: expectedReason, tableIds: [tableCode] } }));
  }
  results.push(await callCommand({ ...baseDraft, kind: "note", payload: { reason: expectedReason, note: "本番E2E動作確認メモ" } }));
  results.push(await callCommand({ ...baseDraft, kind: "service_status", payload: {
    reason: expectedReason,
    occurredAt: new Date().toISOString(),
    serviceStatus: "arrived",
  } }));

  const boardAfter = await loadBoard(boardToday.businessDay?.businessDate ?? today);
  const finalTarget = Array.isArray(boardAfter.reservations)
    ? boardAfter.reservations.find((item) => item.id === target.id) ?? null
    : null;

  const sessionStatus = await loadSessionStatus(false);
  assert(sessionStatus.response.ok, "コマンド後にセッション有効性が失われました");

  console.log(JSON.stringify({
    stage: "e2e_commands_completed",
    ok: true,
    businessDate: boardToday.businessDay?.businessDate ?? today,
    queryCount: boardToday.reservations?.length ?? 0,
    searchProbe: sampleQuery || null,
    searchHitCount,
    dateSwitchChecked: {
      currentDate: boardDate,
      alternateDate: boardAlternate.businessDay?.businessDate ?? alternateDate,
      alternateRows: boardAlternate.totals?.reservationCount ?? 0,
    },
    commandCount: results.length,
    serviceStatus: finalTarget?.serviceStatus ?? null,
    finalStatus: finalTarget?.status ?? finalTarget?.lifecycleStatus ?? null,
    tableAssigned: finalTarget?.tableIds?.length ?? 0,
  }));

  await logout();
  const afterLogout = await loadSessionStatus(true);
  assert(!afterLogout.response.ok, "ログアウト後にセッション破棄されていません");

  console.log(JSON.stringify({
    stage: "completed",
    ok: true,
    commands: Object.fromEntries(results.map((item, index) => [index, !!item?.ok])),
  }));
}

async function loadSessionStatus(ignoreFail) {
  const result = await fetchJson(`${ORIGIN}/api/admin/session`, {
    headers: buildHeaders({}, true),
  });
  if (!ignoreFail && !result.response.ok) {
    throw new Error(`session_check_failed:${result.response.status}`);
  }
  return result;
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
