import { isBusinessDate } from "./vipFloorV2Contract";

export type VipFloorDayState = "missing" | "closed";

export function readVipFloorDayStateEvent(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;
  if (
    (payload.state !== "missing" && payload.state !== "closed")
    || !isBusinessDate(payload.businessDate)
  ) {
    return null;
  }
  return {
    state: payload.state as VipFloorDayState,
    businessDate: payload.businessDate,
    reason: typeof payload.reason === "string" ? payload.reason : null,
  };
}
