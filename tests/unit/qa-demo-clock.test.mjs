import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = ts.createSourceFile("a11y-visual.mjs", readFileSync(
  new URL("../../scripts/a11y-visual.mjs", import.meta.url), "utf8",
), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const install = source.statements.find((node) =>
  ts.isFunctionDeclaration(node) && node.name?.text === "installSyntheticRoutes");

async function syntheticDemo(scenario) {
  const wallTime = Date.parse("2027-01-01T00:00:00Z");
  class WallDate extends Date {
    constructor(...args) { super(...(args.length ? args : [wallTime])); }
    static now() { return wallTime; }
  }
  const browser = vm.createContext({ Date: class extends WallDate {}, window: {} });
  const routes = new Map();
  const page = {
    async addInitScript(fn, argument) {
      browser.argument = argument;
      vm.runInContext(`(${fn.toString()})(argument)`, browser);
    },
    async route(pattern, callback) { routes.set(pattern, callback); },
  };
  const context = vm.createContext({ Date: WallDate });
  vm.runInContext(`${install.getText(source)}; globalThis.install = installSyntheticRoutes;`, context);
  await context.install(page, scenario);
  async function request(pattern) {
    let response;
    await routes.get(pattern)({ fulfill(value) { response = value; } });
    return { status: response.status, body: JSON.parse(response.body) };
  }
  return {
    now: vm.runInContext("Date.now()", browser),
    session: await request("**/api/admin/session"),
    lease: await request("**/api/admin/demo/lease"),
  };
}

test("authenticated visual demo remains valid after the real fixture expiry date", async () => {
  const { now, session, lease } = await syntheticDemo({ demoMode: "authenticated" });
  assert.equal(session.body.authenticated, true);
  assert.equal(lease.status, 200);
  assert.ok(now >= Date.parse(session.body.startsAt));
  assert.ok(now < Date.parse(session.body.expiresAt), "browser must be inside the synthetic demo window");
  assert.equal(Date.parse(lease.body.serverNow), now);
  assert.ok(Date.parse(lease.body.leaseExpiresAt) > now);
  assert.equal(Date.parse(lease.body.leaseExpiresAt) - now, session.body.leaseIntervalMs);
});

test("explicit near-expiry clock remains authoritative", async () => {
  const fixedNow = "2026-08-27T12:00:00+09:00";
  const { now, session, lease } = await syntheticDemo({ demoMode: "authenticated", fixedNow });
  assert.equal(now, Date.parse(fixedNow));
  assert.equal(Date.parse(lease.body.serverNow), now);
  assert.ok(Date.parse(session.body.expiresAt) - now < 24 * 60 * 60_000);
});

test("expired scenario still denies session and lease", async () => {
  const { session, lease } = await syntheticDemo({ demoMode: "expired" });
  assert.equal(session.status, 410);
  assert.equal(session.body.authenticated, false);
  assert.equal(lease.status, 410);
  assert.equal(lease.body.error, "demo_expired");
});
