import "server-only";

export function isGhostVipMaintenanceMode() {
  return process.env.GHOST_VIP_MAINTENANCE_MODE === "true";
}
