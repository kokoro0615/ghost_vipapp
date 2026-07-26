export type VipAdminRole = "staff" | "manager" | "owner" | "engineer" | "accountant";

export type VipCommandKind =
  | "service_status"
  | "check_in"
  | "arrival_time"
  | "assignment"
  | "seat_extension"
  | "note";

export const ALL_VIP_COMMAND_KINDS = [
  "service_status",
  "check_in",
  "arrival_time",
  "assignment",
  "seat_extension",
  "note",
] as const satisfies readonly VipCommandKind[];

const commandPolicy: Record<VipAdminRole, ReadonlySet<VipCommandKind>> = {
  staff: new Set(["service_status", "check_in", "arrival_time", "seat_extension", "note"]),
  manager: new Set(["service_status", "check_in", "arrival_time", "assignment", "seat_extension", "note"]),
  owner: new Set(["service_status", "check_in", "arrival_time", "assignment", "seat_extension", "note"]),
  engineer: new Set(["service_status", "check_in", "arrival_time", "assignment", "seat_extension", "note"]),
  accountant: new Set(["service_status", "check_in", "arrival_time", "seat_extension", "note"]),
};

export function normalizeVipAdminRole(value: unknown): VipAdminRole | null {
  if (value === "staff" || value === "manager" || value === "owner" || value === "engineer" || value === "accountant") {
    return value;
  }
  return null;
}

export function canExecuteVipCommand(role: VipAdminRole | null, kind: VipCommandKind) {
  return role ? commandPolicy[role].has(kind) : false;
}
