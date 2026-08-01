import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

const PATHS = Object.freeze({
  access: "src/lib/demo/accessContract.ts",
  session: "src/lib/demo/session.server.ts",
  proxy: "src/proxy.ts",
  sessionRoute: "src/app/api/admin/session/route.ts",
  leaseRoute: "src/app/api/admin/demo/lease/route.ts",
  ownerProxy: "src/lib/server/ghostAdminProxy.ts",
});

async function readRequired(relativePath) {
  try {
    return await readFile(path.join(root, relativePath), "utf8");
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      assert.fail(`planned source missing: ${relativePath}`);
    }
    throw error;
  }
}

function assertContainsAll(source, markers, label) {
  for (const marker of markers) {
    assert.match(source, marker, `${label} missing contract marker ${marker}`);
  }
}

function indexOfMatch(source, pattern) {
  const match = pattern.exec(source);
  return match ? match.index : -1;
}

test("dual Basic authentication resolves a server-trusted lane with constant-time credential checks", async () => {
  const access = await readRequired(PATHS.access);

  assertContainsAll(access, [
    /export\s+const\s+TRUSTED_ACCESS_LANE_HEADER\b/u,
    /export\s+const\s+OWNER_SESSION_COOKIE\b/u,
    /export\s+const\s+DEMO_SESSION_COOKIE\b/u,
    /export\s+(?:async\s+)?function\s+resolveBasicAccessLane\s*\(/u,
    /timingSafeEqual/u,
    /owner/u,
    /demo/u,
  ], PATHS.access);
  assert.match(access, /node:crypto/u, "credential comparison must use Node crypto");
  assert.notEqual(
    access.match(/OWNER_SESSION_COOKIE\s*=\s*["']([^"']+)["']/u)?.[1],
    access.match(/DEMO_SESSION_COOKIE\s*=\s*["']([^"']+)["']/u)?.[1],
    "owner and demo cookies must have different names",
  );
  assert.doesNotMatch(access, /NEXT_PUBLIC_/u, "access secrets must never be public env");
});

test("proxy overwrites spoofed lane claims and derives the internal header only from verified Basic credentials", async () => {
  const [access, proxy] = await Promise.all([
    readRequired(PATHS.access),
    readRequired(PATHS.proxy),
  ]);

  assert.match(proxy, /resolveBasicAccessRequest/u);
  assert.match(proxy, /TRUSTED_ACCESS_LANE_HEADER/u);
  assertContainsAll(proxy, [
    /VIPAPP_BASIC_USER/u,
    /VIPAPP_BASIC_PASSWORD/u,
    /VIPAPP_DEMO_ENABLED/u,
    /VIPAPP_DEMO_BASIC_USER/u,
    /VIPAPP_DEMO_BASIC_PASSWORD/u,
  ], PATHS.proxy);
  assert.match(
    proxy,
    /(?:headers|requestHeaders)\.(?:delete|set)\(\s*TRUSTED_ACCESS_LANE_HEADER/u,
    "proxy must overwrite/remove a client-supplied lane header",
  );
  assert.match(
    proxy,
    /NextResponse\.next\(\s*\{[\s\S]*request\s*:\s*\{[\s\S]*headers/u,
    "verified lane must be forwarded as an internal request header",
  );
  const resolveIndex = proxy.indexOf("resolveBasicAccessRequest");
  const forwardIndex = indexOfMatch(
    proxy,
    /NextResponse\.next\(\s*\{[\s\S]*request\s*:\s*\{[\s\S]*headers/u,
  );
  assert.ok(resolveIndex >= 0 && forwardIndex > resolveIndex, "lane must be resolved before forwarding");
  assert.doesNotMatch(
    access,
    /(?:x-access-lane|x-ghost-[\w-]*lane)\s*\?\?/u,
    "client lane claims must not be a fallback input to Basic resolution",
  );
});

test("proxy converts verified Basic auth into a signed HttpOnly access cookie for subrequests without Authorization", async () => {
  const [access, proxy] = await Promise.all([
    readRequired(PATHS.access),
    readRequired(PATHS.proxy),
  ]);
  const boundary = `${access}\n${proxy}`;

  assertContainsAll(boundary, [
    /BASIC_ACCESS_COOKIE/u,
    /BASIC_ACCESS_MAX_AGE_SECONDS/u,
    /createBasicAccessSession/u,
    /resolveBasicAccessRequest/u,
    /createHmac/u,
    /timingSafeEqual/u,
    /request\.cookies\.get\(\s*BASIC_ACCESS_COOKIE\s*\)/u,
    /httpOnly\s*:\s*true/iu,
    /sameSite\s*:\s*["']strict["']/iu,
    /path\s*:\s*["']\/["']/iu,
    /maxAge\s*:\s*BASIC_ACCESS_MAX_AGE_SECONDS/u,
  ], "Basic access session boundary");
  assert.doesNotMatch(boundary, /NEXT_PUBLIC_/u);
  assert.match(
    proxy,
    /WWW-Authenticate[\s\S]*Basic realm=/u,
    "the initial Basic challenge must remain fail-closed",
  );
});

test("owner and demo cookies are isolated and the opposite lane cookie is cleared", async () => {
  const [access, proxy, sessionRoute] = await Promise.all([
    readRequired(PATHS.access),
    readRequired(PATHS.proxy),
    readRequired(PATHS.sessionRoute),
  ]);
  const boundary = `${access}\n${proxy}\n${sessionRoute}`;

  assertContainsAll(boundary, [
    /OWNER_SESSION_COOKIE/u,
    /DEMO_SESSION_COOKIE/u,
    /sameSite\s*:\s*["']strict["']/iu,
    /httpOnly\s*:\s*true/iu,
    /secure\s*:\s*(?:true|process\.env\.NODE_ENV\s*===\s*["']production["'])/iu,
  ], "session cookie boundary");
  assert.match(
    boundary,
    /(?:clear|delete|expire)[A-Za-z]*(?:Owner|Admin)[A-Za-z]*(?:Cookie|Session)|cookies\.set\(\s*OWNER_SESSION_COOKIE[\s\S]{0,240}maxAge\s*:\s*0/iu,
    "demo lane must clear/expire the owner cookie",
  );
  assert.match(
    boundary,
    /(?:clear|delete|expire)[A-Za-z]*Demo[A-Za-z]*(?:Cookie|Session)|cookies\.set\(\s*DEMO_SESSION_COOKIE[\s\S]{0,240}maxAge\s*:\s*0/iu,
    "owner lane must clear/expire the demo cookie",
  );
  assert.match(boundary, /TRUSTED_ACCESS_LANE_HEADER/u);
  assert.match(boundary, /mode\s*[:=]\s*["']demo["']/u);
});

test("demo Basic sessions use signed, bounded claims without Production proxying", async () => {
  const session = await readRequired(PATHS.session);

  assertContainsAll(session, [
    /timingSafeEqual/u,
    /createHmac/u,
    /mode\s*:\s*["']demo["']/u,
    /role\s*:\s*["']owner-compatible-demo["']/u,
    /\bworkspaceId\b/u,
    /\biat\b/u,
    /\bexp\b/u,
    /\bjti\b/u,
    /randomUUID|randomBytes/u,
    /VIPAPP_DEMO_SESSION_HMAC_SECRET/u,
  ], PATHS.session);
  assert.doesNotMatch(session, /PIN|scrypt|VIPAPP_DEMO_PIN/u);
  assert.doesNotMatch(session, /ghostAdminFetch/u);
  assert.doesNotMatch(session, /GHOST_ADMIN_API_ORIGIN|ghost-ruby-one|Authorization\s*:/iu);
  assert.doesNotMatch(session, /NEXT_PUBLIC_/u);
  assert.doesNotMatch(
    session,
    /process\.env\.(?:VIPAPP_DEMO_PIN|VIPAPP_DEMO_BASIC_PASSWORD)\b/u,
    "raw demo Basic password must not be read by demo session code",
  );
});

test("session route branches on the trusted Basic lane without a secondary credential route", async () => {
  const [sessionRoute, ownerProxy] = await Promise.all([
    readRequired(PATHS.sessionRoute),
    readRequired(PATHS.ownerProxy),
  ]);
  const routes = `${sessionRoute}\n${ownerProxy}`;

  assertContainsAll(routes, [
    /TRUSTED_ACCESS_LANE_HEADER/u,
    /["']owner["']/u,
    /["']demo["']/u,
    /ghostAdminFetch/u,
    /sign[A-Za-z]*Demo[A-Za-z]*(?:Session|Claim)|createDemoSession/u,
  ], "session routes");
  assert.match(sessionRoute, /export\s+async\s+function\s+GET/u);
  assert.match(sessionRoute, /export\s+async\s+function\s+DELETE/u);
  assert.match(ownerProxy, /ghost_vipapp_admin_session/u, "owner cookie name must remain stable");
  assert.match(ownerProxy, /ghostAdminFetch\("\/api\/admin\/session"/u);
  assert.match(ownerProxy, /ghostAdminFetch\("\/api\/admin\/session\/basic-owner"/u);
  assert.doesNotMatch(routes, /\/api\/admin\/session\/pin|verifyDemoPin/u);
  assert.doesNotMatch(
    routes,
    /mode\s*:\s*request|role\s*:\s*request|headers\.get\([^)]*mode/iu,
    "session mode must not come from a client claim",
  );

  const demoBranch = routes.match(
    /(?:lane|accessLane)\s*===\s*["']demo["'][\s\S]{0,2200}/u,
  )?.[0] ?? "";
  assert.ok(demoBranch, "trusted demo lane branch is required");
  assert.doesNotMatch(
    demoBranch.slice(0, 1200),
    /ghostAdminFetch/u,
    "demo branch must complete without a Production session request",
  );
});

test("verified Owner Basic access is exchanged through the dedicated server-only endpoint", async () => {
  const [sessionRoute, ownerProxy] = await Promise.all([
    readRequired(PATHS.sessionRoute),
    readRequired(PATHS.ownerProxy),
  ]);
  const bridge = `${sessionRoute}\n${ownerProxy}`;

  assertContainsAll(bridge, [
    /GHOST_BASIC_OWNER_SESSION_SECRET/u,
    /x-ghost-vipapp-owner-session-secret/u,
    /\/api\/admin\/session\/basic-owner/u,
    /loginBasicOwnerSession/u,
    /setAdminToken/u,
  ], "Owner Basic session bridge");
  assert.match(
    sessionRoute,
    /if\s*\(!token\)[\s\S]*loginBasicOwnerSession\(\)[\s\S]*setAdminToken/u,
    "a missing Owner admin cookie must be exchanged only inside the trusted Owner route",
  );
  assert.doesNotMatch(bridge, /PIN|deriveBasicOwnerPin|set_admin_pin_v7|VIPAPP_SUPABASE_SERVICE_ROLE_KEY/u);
  assert.doesNotMatch(bridge, /NEXT_PUBLIC_/u);
});

test("demo lease is same-origin, fail-closed, server-timed, and never longer than 60 seconds", async () => {
  const lease = await readRequired(PATHS.leaseRoute);

  assertContainsAll(lease, [
    /export\s+async\s+function\s+GET/u,
    /TRUSTED_ACCESS_LANE_HEADER/u,
    /DEMO_SESSION_COOKIE/u,
    /VIPAPP_DEMO_ENABLED/u,
    /VIPAPP_DEMO_STARTS_AT/u,
    /VIPAPP_DEMO_EXPIRES_AT/u,
    /verify[A-Za-z]*Demo[A-Za-z]*(?:Session|Claim)/u,
    /Date\.now\(\)|new Date\(\)/u,
    /status\s*:\s*401/u,
    /status\s*:\s*410/u,
  ], PATHS.leaseRoute);
  assert.match(
    lease,
    /Math\.min\([^)]*(?:60_?000|60)[^)]*\)|(?:lease|expiresIn|ttl|maxAge)[A-Za-z]*\s*[:=][^;\n]*(?:60_?000|60)\b/u,
    "lease lifetime must be capped at 60 seconds",
  );
  assert.doesNotMatch(lease, /ghostAdminFetch|GHOST_ADMIN_API_ORIGIN/u);
  assert.doesNotMatch(lease, /request\.json\(\)[\s\S]{0,300}(?:startsAt|expiresAt)/u);
});

test("exact demo window and fail-closed expiry are bound into server authentication", async () => {
  const [session, lease] = await Promise.all([
    readRequired(PATHS.session),
    readRequired(PATHS.leaseRoute),
  ]);
  const serverBoundary = `${session}\n${lease}`;

  assertContainsAll(serverBoundary, [
    /2026-07-27T00:00:00\+09:00/u,
    /2026-08-27T23:59:59\+09:00/u,
    /Asia\/Tokyo/u,
  ], "demo access window");
  assert.match(serverBoundary, /expired|expiry|expires/iu);
  assert.match(serverBoundary, /status\s*:\s*410/u);
});
