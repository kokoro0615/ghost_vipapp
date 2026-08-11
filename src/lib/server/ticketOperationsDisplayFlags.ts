import "server-only";

import type { TicketOperationsCapabilities } from "@/lib/ticketOperationsContract";

function enabled(value: string | undefined) {
  return value === "true";
}

export function readVipTicketOperationsDisplayCapabilities(): TicketOperationsCapabilities {
  return {
    managerOperationsEnabled: enabled(
      process.env.FEATURE_TICKET_MANAGER_OPERATIONS_ENABLED,
    ),
    refundReviewEnabled: enabled(
      process.env.FEATURE_TICKET_REFUND_REVIEW_ENABLED,
    ),
  };
}

export function hasVipTicketOperationsDisplayCapability() {
  const capabilities = readVipTicketOperationsDisplayCapabilities();
  return capabilities.managerOperationsEnabled || capabilities.refundReviewEnabled;
}
