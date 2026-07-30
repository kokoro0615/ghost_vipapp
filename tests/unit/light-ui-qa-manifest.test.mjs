import assert from "node:assert/strict";
import test from "node:test";

import {
  buildQaSummary,
  QA_REQUIRED_STATES,
  QA_VIEWPORTS,
  safeArtifactName,
} from "../../scripts/light-ui-qa-manifest.mjs";

test("light UI QA freezes the exact Chromium and WebKit release matrix", () => {
  assert.deepEqual(
    QA_VIEWPORTS.map(({ browser, width, height }) => `${browser}-${width}x${height}`),
    [
      "chromium-1440x900",
      "chromium-1366x768",
      "chromium-1194x834",
      "chromium-1024x768",
      "chromium-768x1024",
      "chromium-390x844",
      "chromium-375x812",
      "chromium-320x800",
      "webkit-1194x834",
    ],
  );
  for (const state of [
    "login",
    "demo-login",
    "demo-reset",
    "demo-near-expiry",
    "demo-expired",
    "list",
    "floor",
    "chart",
    "menu",
    "queue",
    "inspector",
    "turnover-release",
    "turnover-next-check-in",
    "turnover-checked-in",
    "walk-in",
    "block",
    "reservation-edit",
    "waitlist",
    "staff",
    "customer",
    "slo",
    "loading",
    "empty",
    "error",
    "offline",
    "stale",
    "reconnecting",
    "conflict",
    "read-only",
  ]) {
    assert.ok(QA_REQUIRED_STATES.includes(state), `missing QA state: ${state}`);
  }
  assert.equal(QA_REQUIRED_STATES.filter((state) => state.startsWith("reservation-create-")).length, 8);
  assert.equal(QA_REQUIRED_STATES.filter((state) => state.startsWith("command-")).length, 7);
});

test("light UI QA summary fails closed when a state or viewport is absent", () => {
  const results = QA_VIEWPORTS.flatMap(({ browser, width, height }) =>
    QA_REQUIRED_STATES.map((state) => ({
      state,
      viewport: `${browser}-${width}x${height}`,
      screenshot: `${browser}-${width}x${height}/${safeArtifactName(state)}.jpg`,
    })));
  const complete = buildQaSummary(results, "/tmp/evidence");
  assert.equal(complete.ok, true);
  assert.equal(complete.screenshots, QA_VIEWPORTS.length * QA_REQUIRED_STATES.length);

  const incomplete = buildQaSummary(
    results.filter((result) =>
      result.state !== "conflict" && result.viewport !== "chromium-375x812"),
    "/tmp/evidence",
  );
  assert.equal(incomplete.ok, false);
  assert.deepEqual(incomplete.missingStates, ["conflict"]);
  assert.deepEqual(incomplete.missingViewports, ["chromium-375x812"]);
});
