// Generated from the backend contracts/vip-manager/v2/runtime-contract.json. Do not edit by hand.
export const VIP_MANAGER_RUNTIME_CONTRACT = {
  "contractVersion": "ghost.vip-manager.v2.1",
  "authentication": {
    "productionAuthority": "basic-only",
    "productionPinAllowed": false,
    "demoPinAllowed": true,
    "sessionCookie": "ghost_admin_session",
    "initialMutationRole": "owner"
  },
  "idempotencyKey": {
    "minimumLength": 8,
    "maximumLength": 128,
    "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$"
  },
  "businessDays": {
    "method": "GET",
    "backendPath": "/api/admin/v2/vip-floor/business-days",
    "consumerPath": "/api/admin/vip-floor/business-days",
    "backendQuery": [
      "afterBusinessDate",
      "limit"
    ],
    "consumerQuery": [
      "after",
      "limit"
    ],
    "maximumSuggestions": 3,
    "initialRole": "owner",
    "successFields": [
      "ok",
      "businessDates"
    ]
  },
  "dayState": {
    "schemaVersion": "vip-floor-day-state.v1",
    "states": [
      "missing",
      "open",
      "closed"
    ],
    "closedReasonRequired": true
  },
  "reservationProvenance": {
    "values": [
      "online",
      "phone",
      "walk_in",
      "admin"
    ],
    "legacyAdminHoldMapsTo": "admin"
  },
  "sharedMemo": {
    "authority": "reservation_notes",
    "kind": "floor",
    "legacyOperatorNote": "compatibility-projection"
  },
  "errorCodes": [
    "INVALID_COMMAND",
    "UNAUTHENTICATED",
    "FORBIDDEN",
    "ADMIN_MUTATION_DISABLED",
    "NOT_FOUND",
    "VERSION_CONFLICT",
    "TABLE_TIME_CONFLICT",
    "BLOCK_CONFLICT",
    "TABLE_LOCKED",
    "INVALID_STATE_TRANSITION",
    "IDEMPOTENCY_MISMATCH",
    "IDEMPOTENCY_IN_PROGRESS",
    "REFUND_PAYMENT_MISSING",
    "REFUND_AMOUNT_INVALID",
    "REFUND_BINDING_INVALID",
    "CAPACITY_WARNING_REQUIRES_OVERRIDE",
    "SLOT_COMPATIBILITY_MISSING",
    "OFFERING_TABLE_MISMATCH"
  ]
} as const;

export const VIP_MANAGER_ERROR_CODES = VIP_MANAGER_RUNTIME_CONTRACT.errorCodes;
export const VIP_MANAGER_MAX_BUSINESS_DAY_SUGGESTIONS = VIP_MANAGER_RUNTIME_CONTRACT.businessDays.maximumSuggestions;
export const VIP_MANAGER_RESERVATION_PROVENANCE = VIP_MANAGER_RUNTIME_CONTRACT.reservationProvenance.values;

export function isValidVipManagerIdempotencyKey(value: unknown): value is string {
  return typeof value === "string"
    && value.length >= VIP_MANAGER_RUNTIME_CONTRACT.idempotencyKey.minimumLength
    && value.length <= VIP_MANAGER_RUNTIME_CONTRACT.idempotencyKey.maximumLength
    && new RegExp(VIP_MANAGER_RUNTIME_CONTRACT.idempotencyKey.pattern, "u").test(value);
}

export function readVipManagerBusinessDates(value: unknown): string[] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;
  if (payload.ok !== true || !Array.isArray(payload.businessDates)) return null;
  if (payload.businessDates.length > VIP_MANAGER_MAX_BUSINESS_DAY_SUGGESTIONS) return null;
  if (!payload.businessDates.every((date) => typeof date === "string")) return null;
  return payload.businessDates as string[];
}

export function isVipManagerReservationProvenance(
  value: unknown,
): value is (typeof VIP_MANAGER_RESERVATION_PROVENANCE)[number] {
  return typeof value === "string"
    && VIP_MANAGER_RESERVATION_PROVENANCE.includes(
      value as (typeof VIP_MANAGER_RESERVATION_PROVENANCE)[number],
    );
}
