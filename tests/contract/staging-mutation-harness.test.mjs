import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import { runNodeScript } from "../helpers/script-runner.mjs";

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

test("staging harness uses only its own fixture, advances version, verifies audit, and cleans up", async (t) => {
  let fixtureId = null;
  const reservationId = "00000000-0000-4000-8000-000000000001";
  const auditLogId = "audit-e2e";
  const sessionCookie = "staging-session-secret";
  let version = 1;
  let fixtureExists = false;
  const requests = [];

  const server = createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    requests.push({ method: request.method, pathname: url.pathname });
    const hasBasic = request.headers.authorization === `Basic ${Buffer.from("user:password").toString("base64")}`;
    const hasSession = request.headers.cookie?.includes(`ghost_vipapp_admin_session=${sessionCookie}`);
    response.setHeader("content-type", "application/json");

    if (url.pathname === "/api/admin/session/pin" && request.method === "POST" && hasBasic) {
      response.setHeader("set-cookie", `ghost_vipapp_admin_session=${sessionCookie}; HttpOnly; Path=/api`);
      response.end(JSON.stringify({ ok: true }));
      return;
    }
    if (url.pathname === "/api/admin/session" && request.method === "DELETE" && hasSession) {
      response.setHeader("set-cookie", "ghost_vipapp_admin_session=; Max-Age=0; HttpOnly; Path=/api");
      response.end(JSON.stringify({ ok: true }));
      return;
    }
    if (url.pathname === "/api/admin/session" && request.method === "GET") {
      response.statusCode = hasSession ? 200 : 401;
      response.end(JSON.stringify({ ok: hasSession }));
      return;
    }
    if (url.pathname === "/api/admin/e2e/fixtures" && request.method === "POST" && hasSession) {
      const body = await readJsonBody(request);
      fixtureId = body.fixtureId;
      fixtureExists = true;
      response.end(JSON.stringify({
        ok: true,
        fixture: {
          id: fixtureId,
          reservationId,
          businessDate: "2026-07-26",
          marker: "E2E削除可",
          notificationMode: "disabled",
          cleanupRequired: true,
        },
      }));
      return;
    }
    if (url.pathname === "/api/admin/vip-floor" && request.method === "GET" && hasSession) {
      response.end(JSON.stringify({
        reservations: fixtureExists ? [{
          id: reservationId,
          version,
          fixtureMarker: "E2E削除可",
        }] : [],
      }));
      return;
    }
    if (url.pathname === "/api/admin/vip-floor/commands" && request.method === "POST" && hasSession) {
      version = 2;
      response.end(JSON.stringify({ ok: true, auditLogId, entityVersion: version }));
      return;
    }
    if (fixtureId && url.pathname === `/api/admin/e2e/fixtures/${fixtureId}/audit` && request.method === "GET" && hasSession) {
      response.end(JSON.stringify({ ok: true, entries: [{ id: auditLogId }] }));
      return;
    }
    if (fixtureId && url.pathname === `/api/admin/e2e/fixtures/${fixtureId}` && request.method === "DELETE" && hasSession) {
      fixtureExists = false;
      response.end(JSON.stringify({
        ok: true,
        deleted: true,
        orphanCounts: {
          reservations: 0,
          customers: 0,
          blocks: 0,
          waitlist: 0,
          outbox: 0,
          audit: 0,
        },
      }));
      return;
    }
    response.statusCode = 500;
    response.end(JSON.stringify({ ok: false }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const address = server.address();
  const result = await runNodeScript("scripts/staging-mutation-e2e.mjs", {
    GHOST_VIPAPP_STAGING_ORIGIN: `http://127.0.0.1:${address.port}`,
    GHOST_VIPAPP_STAGING_ALLOW_INSECURE_LOCALHOST: "1",
    GHOST_VIPAPP_ALLOW_STAGING_MUTATION: "E2E削除可",
    VIPAPP_BASIC_USER: "user",
    VIPAPP_BASIC_PASSWORD: "password",
    VIPAPP_OWNER_PIN: "123456",
  });

  assert.equal(result.code, 0, result.stderr || result.stdout);
  assert.equal(fixtureExists, false);
  assert.doesNotMatch(result.stdout, /staging-session-secret|123456|password/u);
  assert.match(result.stdout, /"versionAdvanced":true/u);
  assert.match(result.stdout, /"auditVerified":true/u);
  assert.match(result.stdout, /"cleanupVerified":true/u);
  assert.deepEqual(
    requests.filter(({ method }) => method === "POST").map(({ pathname }) => pathname),
    ["/api/admin/session/pin", "/api/admin/e2e/fixtures", "/api/admin/vip-floor/commands"],
  );
});

test("staging harness refuses the canonical production hostname before network access", async () => {
  const result = await runNodeScript("scripts/staging-mutation-e2e.mjs", {
    GHOST_VIPAPP_STAGING_ORIGIN: "https://ghost-vipapp.vercel.app",
    GHOST_VIPAPP_ALLOW_STAGING_MUTATION: "E2E削除可",
    VIPAPP_BASIC_USER: "user",
    VIPAPP_BASIC_PASSWORD: "password",
    VIPAPP_OWNER_PIN: "123456",
  });
  assert.equal(result.code, 1);
  assert.match(result.stdout, /production_origin_rejected/u);
});

test("staging harness attempts fixture cleanup when a mutation fails", async (t) => {
  const sessionCookie = "failure-cleanup-session";
  let fixtureId = null;
  let cleanupCalled = false;
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    const hasSession = request.headers.cookie?.includes(`ghost_vipapp_admin_session=${sessionCookie}`);
    response.setHeader("content-type", "application/json");

    if (url.pathname === "/api/admin/session/pin" && request.method === "POST") {
      response.setHeader("set-cookie", `ghost_vipapp_admin_session=${sessionCookie}; HttpOnly; Path=/api`);
      response.end(JSON.stringify({ ok: true }));
      return;
    }
    if (url.pathname === "/api/admin/e2e/fixtures" && request.method === "POST" && hasSession) {
      const body = await readJsonBody(request);
      fixtureId = body.fixtureId;
      response.end(JSON.stringify({
        ok: true,
        fixture: {
          id: fixtureId,
          reservationId: "00000000-0000-4000-8000-000000000002",
          businessDate: "2026-07-26",
          marker: "E2E削除可",
          notificationMode: "disabled",
          cleanupRequired: true,
        },
      }));
      return;
    }
    if (url.pathname === "/api/admin/vip-floor" && request.method === "GET" && hasSession) {
      response.end(JSON.stringify({
        reservations: [{
          id: "00000000-0000-4000-8000-000000000002",
          version: 1,
        }],
      }));
      return;
    }
    if (url.pathname === "/api/admin/vip-floor/commands" && request.method === "POST" && hasSession) {
      response.statusCode = 409;
      response.end(JSON.stringify({ ok: false, error: "expected_test_failure" }));
      return;
    }
    if (fixtureId && url.pathname === `/api/admin/e2e/fixtures/${fixtureId}` && request.method === "DELETE" && hasSession) {
      cleanupCalled = true;
      response.end(JSON.stringify({
        ok: true,
        deleted: true,
        orphanCounts: {
          reservations: 0,
          customers: 0,
          blocks: 0,
          waitlist: 0,
          outbox: 0,
          audit: 0,
        },
      }));
      return;
    }
    if (url.pathname === "/api/admin/session" && request.method === "DELETE") {
      response.setHeader("set-cookie", "ghost_vipapp_admin_session=; Max-Age=0; HttpOnly; Path=/api");
      response.end(JSON.stringify({ ok: true }));
      return;
    }
    if (url.pathname === "/api/admin/session" && request.method === "GET") {
      response.statusCode = 401;
      response.end(JSON.stringify({ ok: false }));
      return;
    }
    response.statusCode = 500;
    response.end(JSON.stringify({ ok: false }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const address = server.address();
  const result = await runNodeScript("scripts/staging-mutation-e2e.mjs", {
    GHOST_VIPAPP_STAGING_ORIGIN: `http://127.0.0.1:${address.port}`,
    GHOST_VIPAPP_STAGING_ALLOW_INSECURE_LOCALHOST: "1",
    GHOST_VIPAPP_ALLOW_STAGING_MUTATION: "E2E削除可",
    VIPAPP_BASIC_USER: "user",
    VIPAPP_BASIC_PASSWORD: "password",
    VIPAPP_OWNER_PIN: "123456",
  });

  assert.equal(result.code, 1);
  assert.equal(cleanupCalled, true);
  assert.match(result.stdout, /fixture_mutation_failed:409/u);
  assert.doesNotMatch(result.stdout, /failure-cleanup-session|123456|password/u);
});
