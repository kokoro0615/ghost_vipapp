import assert from "node:assert/strict";
import test from "node:test";

import {
  CookieJar,
  SafeHttpClient,
  assertStagingOrigin,
} from "../../scripts/lib/e2e-http.mjs";

test("CookieJar stores and clears an HttpOnly session without exposing values", () => {
  const jar = new CookieJar();
  jar.absorb(new Headers({
    "set-cookie": "ghost_vipapp_admin_session=top-secret; HttpOnly; Secure; Path=/api",
  }));
  assert.equal(jar.size, 1);
  assert.match(jar.header(), /^ghost_vipapp_admin_session=/u);

  jar.absorb(new Headers({
    "set-cookie": "ghost_vipapp_admin_session=; Max-Age=0; HttpOnly; Secure; Path=/api",
  }));
  assert.equal(jar.size, 0);
  assert.equal(jar.header(), "");
});

test("staging origin guard rejects production and ambiguous hosts", () => {
  assert.throws(
    () => assertStagingOrigin("https://ghost-vipapp.vercel.app"),
    /production_origin_rejected/u,
  );
  assert.throws(
    () => assertStagingOrigin("https://ghost-vipapp.example.com"),
    /staging_hostname_not_allowlisted/u,
  );
  assert.equal(
    assertStagingOrigin("https://ghost-vipapp-staging.example.com").hostname,
    "ghost-vipapp-staging.example.com",
  );
});

test("SafeHttpClient refuses a business mutation outside its allowlist before fetch", async () => {
  let fetchCalled = false;
  const client = new SafeHttpClient({
    origin: "https://ghost-vipapp.vercel.app",
    basicUser: "user",
    basicPassword: "password",
    rules: [{ method: "GET", path: "/api/admin/vip-floor" }],
    fetchImpl: async () => {
      fetchCalled = true;
      return new Response();
    },
  });

  await assert.rejects(
    () => client.request("/api/admin/vip-floor/commands", { method: "POST", json: {} }),
    /network_request_not_allowlisted/u,
  );
  assert.equal(fetchCalled, false);
});
