import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import { runNodeScript } from "../helpers/script-runner.mjs";

test("production smoke performs auth lifecycle and reads without business mutation", async (t) => {
  const requests = [];
  const sessionCookie = "session-secret-never-log";
  const server = createServer((request, response) => {
    const url = new URL(request.url, "http://localhost");
    requests.push({ method: request.method, pathname: url.pathname });
    const hasBasic = request.headers.authorization === `Basic ${Buffer.from("user:password").toString("base64")}`;
    const hasSession = request.headers.cookie?.includes(`ghost_vipapp_admin_session=${sessionCookie}`);

    response.setHeader("content-type", "application/json");
    if (url.pathname === "/" && !hasBasic) {
      response.statusCode = 401;
      response.end(JSON.stringify({ ok: false }));
      return;
    }
    if (url.pathname === "/api/admin/session/pin" && request.method === "POST" && hasBasic) {
      response.setHeader(
        "set-cookie",
        `ghost_vipapp_admin_session=${sessionCookie}; HttpOnly; Path=/api; SameSite=Strict`,
      );
      response.end(JSON.stringify({ ok: true }));
      return;
    }
    if (url.pathname === "/api/admin/session" && request.method === "DELETE" && hasBasic && hasSession) {
      response.setHeader(
        "set-cookie",
        "ghost_vipapp_admin_session=; Max-Age=0; HttpOnly; Path=/api; SameSite=Strict",
      );
      response.end(JSON.stringify({ ok: true }));
      return;
    }
    if (url.pathname === "/api/admin/session" && request.method === "GET") {
      response.statusCode = hasBasic && hasSession ? 200 : 401;
      response.end(JSON.stringify(hasBasic && hasSession ? { ok: true, role: "owner" } : { ok: false }));
      return;
    }
    if (url.pathname === "/api/admin/vip-floor" && request.method === "GET" && hasBasic && hasSession) {
      response.end(JSON.stringify({
        reservations: [{ id: "fixture-id", publicCode: "E2E-READ", status: "expected" }],
      }));
      return;
    }
    response.statusCode = 500;
    response.end(JSON.stringify({ ok: false }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const address = server.address();
  const result = await runNodeScript("scripts/prod-e2e.mjs", {
    GHOST_VIPAPP_ORIGIN: `http://127.0.0.1:${address.port}`,
    GHOST_VIPAPP_SMOKE_ALLOW_INSECURE_LOCALHOST: "1",
    VIPAPP_BASIC_USER: "user",
    VIPAPP_BASIC_PASSWORD: "password",
    VIPAPP_OWNER_PIN: "123456",
  });

  assert.equal(result.code, 0, result.stderr || result.stdout);
  assert.doesNotMatch(result.stdout, /session-secret-never-log|123456|password/u);
  assert.match(result.stdout, /"mutationRequests":0/u);
  assert.equal(
    requests.some(({ pathname }) => pathname.includes("commands")),
    false,
  );
  assert.deepEqual(
    [...new Set(requests.filter(({ method }) => method !== "GET").map(({ method, pathname }) => `${method} ${pathname}`))],
    ["POST /api/admin/session/pin", "DELETE /api/admin/session"],
  );
});
