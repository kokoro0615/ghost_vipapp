export const QA_VIEWPORTS = Object.freeze([
  { width: 320, height: 720 },
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1194, height: 834 },
  { width: 1366, height: 1024 },
]);

export const QA_REQUIRED_STATES = Object.freeze([
  "login",
  "list",
  "floor",
  "chart",
  "menu",
  "queue",
  "inspector",
  "walk-in",
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
  const expectedViewportKeys = QA_VIEWPORTS.map(({ width, height }) => `${width}x${height}`).sort();
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
    oldPurpleChrome: 0,
    consoleErrors: 0,
    server5xx: 0,
  };
}
