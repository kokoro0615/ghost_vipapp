export type TicketEnvironment = "live" | "test";

export type TicketOperationsCapabilities = {
  managerOperationsEnabled: boolean;
  refundReviewEnabled: boolean;
};

export type TicketCapabilityReadiness = "ready" | "disabled" | "degraded";

export type TicketOperationsCapabilitiesResponse = {
  ok: true;
  serverNow: string;
  capabilities: TicketOperationsCapabilities;
  readiness: {
    managerOperations: TicketCapabilityReadiness;
    refundReview: TicketCapabilityReadiness;
  };
};

export type TicketEventSessionRail = {
  eventSessionId: string;
  eventTitle: string;
  eventDate: string;
  doorsAt: string;
  admissionOpensAt: string;
  admissionClosesAt: string;
  state: "scheduled" | "open" | "closed";
};

export type TicketOperationsHealth = {
  emailProvider: "ready" | "disabled" | "degraded";
  outboxRetryCount: number;
  outboxDeadCount: number;
  webhookFreshness: "fresh" | "stale" | "unknown";
  lastWebhookAt: string | null;
};

export type TicketOperationKind =
  | "admission"
  | "refund_review"
  | "checkout_review"
  | "email_delivery"
  | "wallet_session";

export type TicketOperationPriority = "urgent" | "attention" | "normal";

export type TicketOperationQueueItem = {
  id: string;
  kind: TicketOperationKind;
  priority: TicketOperationPriority;
  publicCode: string;
  maskedEmail: string;
  eventTitle: string;
  eventDate: string;
  environment: TicketEnvironment;
  status: string;
  statusLabel: string;
  summary: string;
  updatedAt: string;
  expectedVersion: number;
};

export type TicketOperationsQueueResponse = {
  ok: true;
  serverNow: string;
  environment: TicketEnvironment;
  eventSessions: TicketEventSessionRail[];
  recentAdmissions: Array<{
    admissionId: string;
    publicCode: string;
    eventTitle: string;
    admittedCount: number;
    admittedAt: string;
  }>;
  health: TicketOperationsHealth;
  items: TicketOperationQueueItem[];
};

export type TicketAdmissionSummary = {
  admissionId: string;
  serial: number;
  label: string;
  status: "issued" | "admitted" | "void";
  admittedAt: string | null;
};

export type TicketWalletState = {
  state: "not_started" | "active" | "expired" | "revoked";
  activeSessionCount: number;
  activeSessions: Array<{
    sessionId: string;
    expectedVersion: number;
    createdAt: string;
    expiresAt: string;
  }>;
  lastVerifiedAt: string | null;
  freshAuthenticationUntil: string | null;
  otpDelivery: "not_requested" | "queued" | "delivered" | "failed" | "suppressed";
  otpRateLimit: "available" | "cooldown" | "blocked";
  challengeState: "none" | "prepared" | "expired" | "committed";
};

export type TicketRefundReview = {
  reviewId: string;
  status: "pending" | "resolved";
  expectedVersion: number;
  observationVersion: number;
  observationHash: string;
  amountMinor: number;
  currency: string;
  providerEventId: string;
  selectedAdmissionIds: string[];
  conflictReason: string | null;
  moneyMayHaveMoved: boolean;
  authorityResolvable: boolean;
  observationHistoryState: "complete" | "legacy_incomplete";
  observationHistoryReason: string | null;
  resolutionOptions: TicketRefundResolution[];
};

export type TicketEmailJob = {
  emailJobId: string;
  purpose: "otp" | "wallet_access" | "recovery";
  status: "queued" | "retry" | "sent" | "dead" | "suppressed";
  attemptCount: number;
  nextAttemptAt: string | null;
  expectedVersion: number;
  retryable: boolean;
};

export type TicketAuditEvent = {
  auditId: string;
  type: string;
  label: string;
  occurredAt: string;
  actorLabel: string;
  reason: string | null;
};

export type TicketOperationsOrder = {
  publicCode: string;
  maskedEmail: string;
  environment: TicketEnvironment;
  expectedVersion: number;
  eventSession: TicketEventSessionRail;
  wallet: TicketWalletState;
  admissions: TicketAdmissionSummary[];
  refundReview: TicketRefundReview | null;
  emailJobs: TicketEmailJob[];
  timeline: TicketAuditEvent[];
  safeRecoveryInstruction: string;
};

export type TicketOperationsOrderResponse = {
  ok: true;
  serverNow: string;
  health: TicketOperationsHealth;
  order: TicketOperationsOrder;
};

export type TicketRefundResolution =
  | "apply_and_void"
  | "record_admitted_exception"
  | "dismiss_no_money_moved";

export type TicketOperationAction =
  | "session_revoke"
  | "assisted_admission"
  | "refund_resolve"
  | "email_retry";

export type TicketSessionRevokeCommand = {
  action: "session_revoke";
  orderPublicCode: string;
  sessionId: string;
  expectedVersion: number;
  reason: string;
};

export type TicketAssistedAdmissionCommand = {
  action: "assisted_admission";
  orderPublicCode: string;
  environment: TicketEnvironment;
  eventSessionId: string;
  admissionIds: string[];
  expectedVersion: number;
  reason: string;
};

export type TicketRefundResolveCommand = {
  action: "refund_resolve";
  reviewId: string;
  resolution: TicketRefundResolution;
  allocations: Array<{ admissionId: string; amountMinor: number }>;
  expectedVersion: number;
  observationVersion: number;
  observationHash: string;
  reason: string;
};

export type TicketEmailRetryCommand = {
  action: "email_retry";
  emailJobId: string;
  issueRecoveryMail: boolean;
  expectedVersion: number;
  reason: string;
};

export type TicketOperationCommand =
  | TicketSessionRevokeCommand
  | TicketAssistedAdmissionCommand
  | TicketRefundResolveCommand
  | TicketEmailRetryCommand;

export type TicketOperationMutationResponse = {
  ok: true;
  action: TicketOperationAction;
  entityVersion: number;
  auditLogId: string;
  reused: boolean;
  serverNow: string;
};

export type TicketOperationFailure = {
  ok: false;
  error:
    | "capability_disabled"
    | "invalid_request"
    | "not_found"
    | "version_conflict"
    | "outside_admission_window"
    | "payment_not_settled"
    | "ticket_refunded"
    | "wrong_environment"
    | "provider_disabled"
    | "terminal_state"
    | "operation_failed";
  currentVersion: number | null;
  recovery: string | null;
};

export type TicketOperationScope = "all" | "refund";
