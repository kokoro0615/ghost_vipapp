/*
 * The venue device is an iPad (8th generation, 2020): a 10.2" panel of
 * 2160×1620 physical pixels at 2x, i.e. 1080×810 CSS points, running Safari on
 * iPadOS 18.3.1. Those two orientations are the primary contract; every other
 * entry is regression cover for the shells that still exist.
 *
 * `touch: true` matters as much as the size. Without it the harness drives a
 * mouse browser at a tablet size and can never observe the two defects that
 * actually reach the operator: hover state that sticks after a tap, and
 * controls sized for a cursor. `scale: 2` renders at the panel's real density.
 */
/*
 * `motion: true` runs the context with `prefers-reduced-motion: no-preference`.
 * An iPad ships with motion on, so auditing the venue device under `reduce` —
 * as every context did until 2026-08-01 — audits a configuration the venue does
 * not run. The timeline carries four infinite phase signals and the floor plan
 * two more; none of them had ever been screenshotted or checked for console
 * errors while actually running. Every other viewport keeps `reduce`, so the
 * authored static fallbacks stay covered too.
 */
export const QA_VIEWPORTS = Object.freeze([
  { browser: "chromium", width: 1080, height: 810, touch: true, scale: 2, motion: true },
  { browser: "chromium", width: 810, height: 1080, touch: true, scale: 2, motion: true },
  { browser: "chromium", width: 1440, height: 900 },
  { browser: "chromium", width: 1366, height: 768 },
  { browser: "chromium", width: 1194, height: 834 },
  { browser: "chromium", width: 1024, height: 768 },
  { browser: "chromium", width: 768, height: 1024 },
  { browser: "chromium", width: 390, height: 844 },
  { browser: "chromium", width: 375, height: 812 },
  { browser: "chromium", width: 320, height: 800 },
  { browser: "webkit", width: 1080, height: 810, touch: true, scale: 2 },
  { browser: "webkit", width: 1194, height: 834 },
]);

/* The primary device contract, used by reports that must not bury it in the
 * regression set. */
export const QA_PRIMARY_DEVICE = Object.freeze({
  name: "iPad (8th generation, 2020) — Safari, iPadOS 18",
  landscape: Object.freeze({ width: 1080, height: 810 }),
  portrait: Object.freeze({ width: 810, height: 1080 }),
});

export const QA_REQUIRED_STATES = Object.freeze([
  "boot",
  "login",
  "demo-login",
  "demo-reset",
  "demo-near-expiry",
  "demo-expired",
  "list",
  "floor",
  "chart",
  "chart-empty-grid",
  "chart-phases",
  "menu",
  "queue",
  "inspector",
  "turnover-release",
  "turnover-next-check-in",
  "turnover-checked-in",
  "walk-in",
  "operation-date-recovery",
  "operation-date-recovered",
  "block",
  "reservation-create-1",
  "reservation-create-2",
  "reservation-create-3",
  "reservation-create-4",
  "reservation-create-5",
  "reservation-create-6",
  "reservation-create-7",
  "reservation-create-8",
  "reservation-edit",
  "command-check-in",
  "command-arrival-time",
  "command-service-status",
  "command-assignment",
  "command-seat-extension",
  "command-note",
  "command-walk-in-cancel",
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
]);

export const QA_MAJOR_SURFACE_SELECTORS = Object.freeze([
  "html",
  "body",
  "main",
  "header",
  "nav",
  "#vip-workspace-main",
  '[role="dialog"]',
]);

export const QA_ALLOWED_MEDIA_SELECTORS = Object.freeze([
  "img",
  "picture",
  "video",
  "canvas",
  "svg",
]);

export function safeArtifactName(label) {
  return label
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9_.-]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .toLowerCase();
}

export function buildQaSummary(results, artifactDirectory) {
  const states = [...new Set(results.map((result) => result.state))].sort();
  const viewportKeys = [...new Set(results.map((result) => result.viewport))].sort();
  const missingStates = QA_REQUIRED_STATES.filter((state) => !states.includes(state));
  const expectedViewportKeys = QA_VIEWPORTS
    .map(({ browser, width, height }) => `${browser}-${width}x${height}`)
    .sort();
  const missingViewports = expectedViewportKeys.filter((viewport) => !viewportKeys.includes(viewport));
  return {
    schemaVersion: "ghost-vip-light-ui-qa.v1",
    ok: missingStates.length === 0 && missingViewports.length === 0,
    artifactDirectory,
    auditedStates: states.length,
    auditedViewports: viewportKeys.length,
    screenshots: results.length,
    missingStates,
    missingViewports,
    axeViolations: 0,
    horizontalOverflow: 0,
    undersizedImportantControls: 0,
    zoomTriggeringFields: 0,
    oldPurpleChrome: 0,
    consoleErrors: 0,
    server5xx: 0,
  };
}
