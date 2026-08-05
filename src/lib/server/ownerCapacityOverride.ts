const FIXED_REASON = "管理画面操作";
const OWNER_CAPACITY_OVERRIDE_PREFIX = "Owner capacity override: ";

type CapacityOverrideInput = {
  readonly capacityOverride?: unknown;
  readonly confirmedCapacityOverride?: unknown;
  readonly capacityOverrideReason?: unknown;
};

export function parseOwnerCapacityOverride(input: CapacityOverrideInput) {
  if (input.capacityOverride !== undefined) {
    return { ok: false as const, error: "raw_capacity_override_forbidden" };
  }
  const confirmationSupplied = input.confirmedCapacityOverride !== undefined;
  const reasonSupplied = input.capacityOverrideReason !== undefined;
  if (!confirmationSupplied && !reasonSupplied) {
    return { ok: true as const, capacityOverride: false, reason: FIXED_REASON };
  }
  if (input.confirmedCapacityOverride !== true || typeof input.capacityOverrideReason !== "string") {
    return { ok: false as const, error: "capacity_override_confirmation_required" };
  }
  const reason = input.capacityOverrideReason.trim();
  if (reason.length < 1 || reason.length > 240) {
    return { ok: false as const, error: "invalid_capacity_override_reason" };
  }
  return {
    ok: true as const,
    capacityOverride: true,
    reason: `${OWNER_CAPACITY_OVERRIDE_PREFIX}${reason}`,
  };
}
