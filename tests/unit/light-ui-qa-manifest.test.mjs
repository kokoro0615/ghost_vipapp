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
      /* The venue device leads the matrix: an iPad (8th generation) is
       * 1080×810pt landscape and 810×1080pt portrait. Everything after it is
       * regression cover for the shells that still exist. */
      "chromium-1080x810",
      "chromium-810x1080",
      "chromium-1440x900",
      "chromium-1366x768",
      "chromium-1194x834",
      "chromium-1024x768",
      "chromium-768x1024",
      "chromium-390x844",
      "chromium-375x812",
      "chromium-320x800",
      /* Safari is the browser the venue actually uses, so the device viewport
       * is pinned for WebKit too and reported as not-run where the host cannot
       * launch it. */
      "webkit-1080x810",
      "webkit-1194x834",
    ],
  );
  /* Touch emulation is part of the contract, not a detail of the run: without
   * it the harness drives a mouse browser at a tablet size and cannot observe
   * hover that latches on tap. */
  for (const key of ["chromium-1080x810", "chromium-810x1080", "webkit-1080x810"]) {
    const entry = QA_VIEWPORTS.find(
      ({ browser, width, height }) => `${browser}-${width}x${height}` === key,
    );
    assert.equal(entry.touch, true, `${key} must be audited as a touch device`);
    assert.equal(entry.scale, 2, `${key} must render at the panel's 2x density`);
  }
  /* An iPad ships with motion on. Auditing the venue device only under
   * `reduce` leaves the timeline's four infinite phase signals, and the floor
   * plan's two, permanently unobserved. */
  for (const key of ["chromium-1080x810", "chromium-810x1080"]) {
    const entry = QA_VIEWPORTS.find(
      ({ browser, width, height }) => `${browser}-${width}x${height}` === key,
    );
    assert.equal(entry.motion, true, `${key} must be audited with motion running`);
  }
  /* …and the reduced-motion path must still be covered somewhere. */
  assert.ok(
    QA_VIEWPORTS.some((entry) => !entry.motion),
    "at least one viewport must audit prefers-reduced-motion",
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
    "chart-phases",
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
