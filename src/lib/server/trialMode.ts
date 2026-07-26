import "server-only";

/**
 * Trial mode is intentionally evaluated only on the server.  Client UI receives
 * the resulting boolean, never the environment value or any backend credential.
 */
export function isGhostVipTrialMode() {
  return process.env.GHOST_VIP_TRIAL_MODE === "true";
}
