import assert from "node:assert/strict";
import test from "node:test";

import {
  buildQaSummary,
  QA_REQUIRED_STATES,
  QA_VIEWPORTS,
  safeArtifactName,
} from "../../scripts/light-ui-qa-manifest.mjs";

test("light UI QA freezes six required viewports and complete operational states", () => {
  assert.deepEqual(QA_VIEWPORTS.map(({ width }) => width), [320, 375, 768, 1024, 1194, 1366]);
  for (const state of [
    "login",
    "list",
    "floor",
    "chart",
    "menu",
    "queue",
    "inspector",
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
  assert.equal(QA_REQUIRED_STATES.filter((state) => state.startsWith("command-")).length, 6);
});

test("light UI QA summary fails closed when a state or viewport is absent", () => {
  const results = QA_VIEWPORTS.flatMap(({ width, height }) =>
    QA_REQUIRED_STATES.map((state) => ({
      state,
      viewport: `${width}x${height}`,
      screenshot: `${width}x${height}/${safeArtifactName(state)}.jpg`,
    })));
  const complete = buildQaSummary(results, "/tmp/evidence");
  assert.equal(complete.ok, true);
  assert.equal(complete.screenshots, QA_VIEWPORTS.length * QA_REQUIRED_STATES.length);

  const incomplete = buildQaSummary(
    results.filter((result) => result.state !== "conflict" && result.viewport !== "375x812"),
    "/tmp/evidence",
  );
  assert.equal(incomplete.ok, false);
  assert.deepEqual(incomplete.missingStates, ["conflict"]);
  assert.deepEqual(incomplete.missingViewports, ["375x812"]);
});
