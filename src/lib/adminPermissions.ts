export type VipAdminRole = "staff" | "manager" | "owner" | "engineer" | "accountant";

export type VipCommandKind =
  | "service_status"
  | "check_in"
  | "arrival_time"
  | "assignment"
  | "seat_extension"
  | "note"
  | "walk_in_cancel";

export const ALL_VIP_COMMAND_KINDS = [
  "service_status",
  "check_in",
  "arrival_time",
  "assignment",
  "seat_extension",
  "note",
  "walk_in_cancel",
] as const satisfies readonly VipCommandKind[];

const NO_COMMANDS = new Set<VipCommandKind>();
const OWNER_COMMANDS = new Set<VipCommandKind>(ALL_VIP_COMMAND_KINDS);

const commandPolicy: Record<VipAdminRole, ReadonlySet<VipCommandKind>> = {
  staff: NO_COMMANDS,
  manager: NO_COMMANDS,
  owner: OWNER_COMMANDS,
  engineer: NO_COMMANDS,
  accountant: NO_COMMANDS,
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
