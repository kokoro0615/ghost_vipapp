import "server-only";

import { NextResponse } from "next/server";

import type {
  TicketAdmissionSummary,
  TicketAuditEvent,
  TicketCapabilityReadiness,
  TicketEmailJob,
  TicketEnvironment,
  TicketEventSessionRail,
  TicketOperationAction,
  TicketOperationCommand,
  TicketOperationFailure,
  TicketOperationKind,
  TicketOperationMutationResponse,
  TicketOperationPriority,
  TicketOperationQueueItem,
  TicketOperationsCapabilities,
  TicketOperationsCapabilitiesResponse,
  TicketOperationsHealth,
  TicketOperationsOrder,
  TicketOperationsOrderResponse,
  TicketOperationsQueueResponse,
  TicketRefundResolution,
  TicketRefundReview,
  TicketWalletState,
} from "@/lib/ticketOperationsContract";
import { ghostAdminFetch } from "./ghostAdminProxy";
import { readVipTicketOperationsDisplayCapabilities } from "./ticketOperationsDisplayFlags";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const IDEMPOTENCY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const ORDER_PUBLIC_CODE_PATTERN = /^GT-[A-Z0-9]{8,24}$/u;
const EVENT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const CURRENCY_PATTERN = /^[A-Z]{3}$/u;
const MASKED_EMAIL_PATTERN = /^[^@\s]{1,80}@[^@\s]{1,190}$/u;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;

const ENVIRONMENTS = new Set<TicketEnvironment>(["live", "test"]);
const READINESS = new Set<TicketCapabilityReadiness>(["ready", "disabled", "degraded"]);
const EVENT_STATES = new Set<TicketEventSessionRail["state"]>(["scheduled", "open", "closed"]);
const EMAIL_PROVIDERS = new Set<TicketOperationsHealth["emailProvider"]>(["ready", "disabled", "degraded"]);
const WEBHOOK_FRESHNESS = new Set<TicketOperationsHealth["webhookFreshness"]>(["fresh", "stale", "unknown"]);
const ITEM_KINDS = new Set<TicketOperationKind>([
  "admission",
  "refund_review",
  "checkout_review",
  "email_delivery",
  "wallet_session",
]);
const ITEM_PRIORITIES = new Set<TicketOperationPriority>(["urgent", "attention", "normal"]);
const ADMISSION_STATES = new Set<TicketAdmissionSummary["status"]>(["issued", "admitted", "void"]);
const WALLET_STATES = new Set<TicketWalletState["state"]>(["not_started", "active", "expired", "revoked"]);
const OTP_DELIVERY_STATES = new Set<TicketWalletState["otpDelivery"]>(["not_requested", "queued", "delivered", "failed", "suppressed"]);
const OTP_RATE_STATES = new Set<TicketWalletState["otpRateLimit"]>(["available", "cooldown", "blocked"]);
const CHALLENGE_STATES = new Set<TicketWalletState["challengeState"]>(["none", "prepared", "expired", "committed"]);
const REFUND_RESOLUTIONS = new Set<TicketRefundResolution>([
  "apply_and_void",
  "record_admitted_exception",
  "dismiss_no_money_moved",
]);
const REFUND_OBSERVATION_HISTORY_STATES = new Set<TicketRefundReview["observationHistoryState"]>([
  "complete",
  "legacy_incomplete",
]);
const EMAIL_PURPOSES = new Set<TicketEmailJob["purpose"]>(["otp", "wallet_access", "recovery"]);
const EMAIL_STATES = new Set<TicketEmailJob["status"]>(["queued", "retry", "sent", "dead", "suppressed"]);
const MUTATION_ACTIONS = new Set<TicketOperationAction>([
  "session_revoke",
  "assisted_admission",
  "refund_resolve",
  "email_retry",
]);
const FAILURE_CODES = new Set<TicketOperationFailure["error"]>([
  "capability_disabled",
  "invalid_request",
  "not_found",
  "version_conflict",
  "outside_admission_window",
  "payment_not_settled",
  "ticket_refunded",
  "wrong_environment",
  "provider_disabled",
  "terminal_state",
  "operation_failed",
]);

const MAX_COMMAND_BODY_BYTES = 8 * 1024;
const TICKET_OPERATIONS_READ_PATHS = new Set([
  "/api/admin/v2/tickets/capabilities",
  "/api/admin/v2/tickets/queue?scope=all",
  "/api/admin/v2/tickets/queue?scope=refund",
]);
const TICKET_OPERATIONS_MUTATION_PATHS = new Set([
  "/api/admin/v2/tickets/search",
  "/api/admin/v2/tickets/sessions/revoke",
  "/api/admin/v2/tickets/admissions/assist",
  "/api/admin/v2/tickets/refund-reviews/resolve",
  "/api/admin/v2/tickets/email-jobs/retry",
]);
const TICKET_OPERATIONS_ORDER_PATH = /^\/api\/admin\/v2\/tickets\/orders\/GT-[A-Z0-9]{8,24}\?scope=(?:all|refund)$/u;

export class TicketOperationsProjectionError extends Error {
  constructor() {
    super("ticket_operations_upstream_contract_invalid");
  }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TicketOperationsProjectionError();
  }
  return value as Record<string, unknown>;
}

function successRecord(value: unknown): Record<string, unknown> {
  const source = record(value);
  if (source.ok !== true) throw new TicketOperationsProjectionError();
  return source;
}

function text(value: unknown, maxLength = 500): string {
  if (typeof value !== "string" || value.length < 1 || value.length > maxLength) {
    throw new TicketOperationsProjectionError();
  }
  return value;
}

function optionalText(value: unknown, maxLength = 500): string | null {
  if (value === null || value === undefined) return null;
  return text(value, maxLength);
}

function iso(value: unknown): string {
  const candidate = text(value, 40);
  if (Number.isNaN(Date.parse(candidate))) throw new TicketOperationsProjectionError();
  return candidate;
}

function optionalIso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return iso(value);
}

function integer(value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new TicketOperationsProjectionError();
  }
  return value as number;
}

function bool(value: unknown): boolean {
  if (typeof value !== "boolean") throw new TicketOperationsProjectionError();
  return value;
}

function oneOf<T extends string>(value: unknown, allowed: Set<T>): T {
  if (typeof value !== "string" || !allowed.has(value as T)) {
    throw new TicketOperationsProjectionError();
  }
  return value as T;
}

function uuid(value: unknown): string {
  const candidate = text(value, 36);
  if (!UUID_PATTERN.test(candidate)) throw new TicketOperationsProjectionError();
  return candidate;
}

function publicCode(value: unknown): string {
  const candidate = text(value, 27);
  if (!ORDER_PUBLIC_CODE_PATTERN.test(candidate)) throw new TicketOperationsProjectionError();
  return candidate;
}

function currency(value: unknown): string {
  const candidate = text(value, 3).toUpperCase();
  if (!CURRENCY_PATTERN.test(candidate)) throw new TicketOperationsProjectionError();
  return candidate;
}

function sha256(value: unknown): string {
  const candidate = text(value, 64);
  if (!SHA256_PATTERN.test(candidate)) throw new TicketOperationsProjectionError();
  return candidate;
}

function maskedEmail(value: unknown): string {
  const candidate = text(value, 271);
  if (!MASKED_EMAIL_PATTERN.test(candidate) || !/[•*]/u.test(candidate.split("@")[0] ?? "")) {
    throw new TicketOperationsProjectionError();
  }
  return candidate;
}

function safeRecoveryInstruction(value: unknown): string {
  const candidate = text(value, 500);
  const unmaskedAddress = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu;
  const secretMarker = /\b(?:otp|token|secret|admission[_ -]?code)\s*[:=]/iu;
  if (unmaskedAddress.test(candidate) || secretMarker.test(candidate)) {
    throw new TicketOperationsProjectionError();
  }
  return candidate;
}

function array<T>(value: unknown, projector: (entry: unknown) => T, maximum = 200): T[] {
  if (!Array.isArray(value) || value.length > maximum) throw new TicketOperationsProjectionError();
  return value.map(projector);
}

function projectEventSession(value: unknown): TicketEventSessionRail {
  const source = record(value);
  const eventDate = text(source.eventDate, 10);
  if (!EVENT_DATE_PATTERN.test(eventDate)) throw new TicketOperationsProjectionError();
  return {
    eventSessionId: uuid(source.eventSessionId),
    eventTitle: text(source.eventTitle, 160),
    eventDate,
    doorsAt: iso(source.doorsAt),
    admissionOpensAt: iso(source.admissionOpensAt),
    admissionClosesAt: iso(source.admissionClosesAt),
    state: oneOf(source.state, EVENT_STATES),
  };
}

function projectHealth(value: unknown): TicketOperationsHealth {
  const source = record(value);
  return {
    emailProvider: oneOf(source.emailProvider, EMAIL_PROVIDERS),
    outboxRetryCount: integer(source.outboxRetryCount, 0, 1_000_000),
    outboxDeadCount: integer(source.outboxDeadCount, 0, 1_000_000),
    webhookFreshness: oneOf(source.webhookFreshness, WEBHOOK_FRESHNESS),
    lastWebhookAt: optionalIso(source.lastWebhookAt),
  };
}

function projectQueueItem(value: unknown): TicketOperationQueueItem {
  const source = record(value);
  const eventDate = text(source.eventDate, 10);
  const kind = oneOf(source.kind, ITEM_KINDS);
  const status = text(source.status, 48);
  if (!EVENT_DATE_PATTERN.test(eventDate)) throw new TicketOperationsProjectionError();
  return {
    id: uuid(source.id),
    kind,
    priority: oneOf(source.priority, ITEM_PRIORITIES),
    publicCode: publicCode(source.publicCode),
    maskedEmail: maskedEmail(source.maskedEmail),
    eventTitle: text(source.eventTitle, 160),
    eventDate,
    environment: oneOf(source.environment, ENVIRONMENTS),
    status,
    statusLabel: text(source.statusLabel, 80),
    summary: text(source.summary, 240),
    updatedAt: iso(source.updatedAt),
    expectedVersion: integer(source.expectedVersion, 1, 2_147_483_647),
  };
}

export function projectTicketOperationsCapabilities(
  value: unknown,
  mirror: TicketOperationsCapabilities,
): TicketOperationsCapabilitiesResponse {
  const source = successRecord(value);
  const capabilities = record(source.capabilities);
  const readiness = record(source.readiness);
  return {
    ok: true,
    serverNow: iso(source.serverNow),
    capabilities: {
      managerOperationsEnabled:
        mirror.managerOperationsEnabled && bool(capabilities.managerOperationsEnabled),
      refundReviewEnabled:
        mirror.refundReviewEnabled && bool(capabilities.refundReviewEnabled),
    },
    readiness: {
      managerOperations: mirror.managerOperationsEnabled
        ? oneOf(readiness.managerOperations, READINESS)
        : "disabled",
      refundReview: mirror.refundReviewEnabled
        ? oneOf(readiness.refundReview, READINESS)
        : "disabled",
    },
  };
}

export function projectTicketOperationsQueue(value: unknown): TicketOperationsQueueResponse {
  const source = successRecord(value);
  return {
    ok: true,
    serverNow: iso(source.serverNow),
    environment: oneOf(source.environment, ENVIRONMENTS),
    eventSessions: array(source.eventSessions, projectEventSession, 32),
    recentAdmissions: array(source.recentAdmissions, (entry) => {
      const admission = record(entry);
      return {
        admissionId: uuid(admission.admissionId),
        publicCode: publicCode(admission.publicCode),
        eventTitle: text(admission.eventTitle, 160),
        admittedCount: integer(admission.admittedCount, 1, 20),
        admittedAt: iso(admission.admittedAt),
      };
    }, 100),
    health: projectHealth(source.health),
    items: array(source.items, projectQueueItem, 500),
  };
}

function projectWallet(value: unknown): TicketWalletState {
  const source = record(value);
  return {
    state: oneOf(source.state, WALLET_STATES),
    activeSessionCount: integer(source.activeSessionCount, 0, 100),
    activeSessions: array(source.activeSessions, (entry) => {
      const session = record(entry);
      return {
        sessionId: uuid(session.sessionId),
        expectedVersion: integer(session.expectedVersion, 1, 2_147_483_647),
        createdAt: iso(session.createdAt),
        expiresAt: iso(session.expiresAt),
      };
    }, 100),
    lastVerifiedAt: optionalIso(source.lastVerifiedAt),
    freshAuthenticationUntil: optionalIso(source.freshAuthenticationUntil),
    otpDelivery: oneOf(source.otpDelivery, OTP_DELIVERY_STATES),
    otpRateLimit: oneOf(source.otpRateLimit, OTP_RATE_STATES),
    challengeState: oneOf(source.challengeState, CHALLENGE_STATES),
  };
}

function projectRefundReview(value: unknown): TicketRefundReview | null {
  if (value === null || value === undefined) return null;
  const source = record(value);
  const authorityResolvable = bool(source.authorityResolvable);
  const observationHistoryState = oneOf(
    source.observationHistoryState,
    REFUND_OBSERVATION_HISTORY_STATES,
  );
  const observationHistoryReason = optionalText(source.observationHistoryReason, 300);
  const resolutionOptions = array(
    source.resolutionOptions,
    (entry) => oneOf(entry, REFUND_RESOLUTIONS),
    3,
  );
  if (
    (observationHistoryState === "legacy_incomplete"
      && (authorityResolvable || resolutionOptions.length > 0 || observationHistoryReason === null))
    || (observationHistoryState === "complete" && observationHistoryReason !== null)
  ) {
    throw new TicketOperationsProjectionError();
  }
  return {
    reviewId: uuid(source.reviewId),
    status: oneOf(source.status, new Set<TicketRefundReview["status"]>(["pending", "resolved"])),
    expectedVersion: integer(source.expectedVersion, 1, 2_147_483_647),
    observationVersion: integer(source.observationVersion, 1, 2_147_483_647),
    observationHash: sha256(source.observationHash),
    amountMinor: integer(source.amountMinor, 0),
    currency: currency(source.currency),
    providerEventId: text(source.providerEventId, 255),
    selectedAdmissionIds: array(source.selectedAdmissionIds, uuid, 20),
    conflictReason: optionalText(source.conflictReason, 300),
    moneyMayHaveMoved: bool(source.moneyMayHaveMoved),
    authorityResolvable,
    observationHistoryState,
    observationHistoryReason,
    resolutionOptions,
  };
}

function projectEmailJob(value: unknown): TicketEmailJob {
  const source = record(value);
  return {
    emailJobId: uuid(source.emailJobId),
    purpose: oneOf(source.purpose, EMAIL_PURPOSES),
    status: oneOf(source.status, EMAIL_STATES),
    attemptCount: integer(source.attemptCount, 0, 100),
    nextAttemptAt: optionalIso(source.nextAttemptAt),
    expectedVersion: integer(source.expectedVersion, 1, 2_147_483_647),
    retryable: bool(source.retryable),
  };
}

function projectAuditEvent(value: unknown): TicketAuditEvent {
  const source = record(value);
  return {
    auditId: uuid(source.auditId),
    type: text(source.type, 80),
    label: text(source.label, 160),
    occurredAt: iso(source.occurredAt),
    actorLabel: text(source.actorLabel, 80),
    reason: optionalText(source.reason, 500),
  };
}

function projectOrder(value: unknown): TicketOperationsOrder {
  const source = record(value);
  return {
    publicCode: publicCode(source.publicCode),
    maskedEmail: maskedEmail(source.maskedEmail),
    environment: oneOf(source.environment, ENVIRONMENTS),
    expectedVersion: integer(source.expectedVersion, 1, 2_147_483_647),
    eventSession: projectEventSession(source.eventSession),
    wallet: projectWallet(source.wallet),
    admissions: array(source.admissions, (entry) => {
      const admission = record(entry);
      return {
        admissionId: uuid(admission.admissionId),
        serial: integer(admission.serial, 1, 20),
        label: text(admission.label, 80),
        status: oneOf(admission.status, ADMISSION_STATES),
        admittedAt: optionalIso(admission.admittedAt),
      };
    }, 20),
    refundReview: projectRefundReview(source.refundReview),
    emailJobs: array(source.emailJobs, projectEmailJob, 100),
    timeline: array(source.timeline, projectAuditEvent, 200),
    safeRecoveryInstruction: safeRecoveryInstruction(source.safeRecoveryInstruction),
  };
}

export function projectTicketOperationsOrder(value: unknown): TicketOperationsOrderResponse {
  const source = successRecord(value);
  return {
    ok: true,
    serverNow: iso(source.serverNow),
    health: projectHealth(source.health),
    order: projectOrder(source.order),
  };
}

export function projectTicketOperationMutation(value: unknown): TicketOperationMutationResponse {
  const source = successRecord(value);
  return {
    ok: true,
    action: oneOf(source.action, MUTATION_ACTIONS),
    entityVersion: integer(source.entityVersion, 1, 2_147_483_647),
    auditLogId: uuid(source.auditLogId),
    reused: bool(source.reused),
    serverNow: iso(source.serverNow),
  };
}

export function projectTicketOperationFailure(value: unknown): TicketOperationFailure {
  const source = record(value);
  return {
    ok: false,
    error: oneOf(source.error, FAILURE_CODES),
    currentVersion:
      source.currentVersion === null || source.currentVersion === undefined
        ? null
        : integer(source.currentVersion, 1, 2_147_483_647),
    recovery: optionalText(source.recovery, 500),
  };
}

export function ticketOperationsJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function ticketOperationsUpstreamFailure(value: unknown, status: number) {
  try {
    return ticketOperationsJson(projectTicketOperationFailure(value), status);
  } catch {
    return ticketOperationsJson(
      {
        ok: false,
        error: "operation_failed",
        currentVersion: null,
        recovery: "状態を再読込してから再実行してください。",
      } satisfies TicketOperationFailure,
      status >= 400 && status <= 599 ? status : 502,
    );
  }
}

export function ticketOperationsContractFailure() {
  return ticketOperationsJson(
    {
      ok: false,
      error: "operation_failed",
      currentVersion: null,
      recovery: "上流の応答契約を確認してください。",
    } satisfies TicketOperationFailure,
    502,
  );
}

export function requireVipTicketCapability(
  capability: "any" | "manager" | "refund",
) {
  const capabilities = readVipTicketOperationsDisplayCapabilities();
  const allowed = capability === "any"
    ? capabilities.managerOperationsEnabled || capabilities.refundReviewEnabled
    : capability === "manager"
      ? capabilities.managerOperationsEnabled
      : capabilities.refundReviewEnabled;
  return allowed
    ? { ok: true as const, capabilities }
    : {
        ok: false as const,
        response: ticketOperationsJson(
          { ok: false, error: "ticket_operation_capability_disabled" },
          404,
        ),
      };
}

export function ticketOperationsFetch(
  path: string,
  init: RequestInit,
  token: string,
) {
  const method = (init.method ?? "GET").toUpperCase();
  const allowed = method === "GET"
    ? TICKET_OPERATIONS_READ_PATHS.has(path) || TICKET_OPERATIONS_ORDER_PATH.test(path)
    : method === "POST" && TICKET_OPERATIONS_MUTATION_PATHS.has(path);
  if (!allowed) throw new Error("ticket_operations_upstream_path_not_allowed");
  return ghostAdminFetch(path, init, token);
}

export function ticketOperationCommandBody(command: TicketOperationCommand) {
  const body: Record<string, unknown> = { ...command };
  delete body.action;
  return body;
}

function onlyKeys(source: Record<string, unknown>, allowed: readonly string[]) {
  return Object.keys(source).every((key) => allowed.includes(key));
}

function commandReason(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length >= 8 && normalized.length <= 240 ? normalized : null;
}

function commandVersion(value: unknown) {
  return Number.isSafeInteger(value) && (value as number) >= 1 && (value as number) <= 2_147_483_647
    ? value as number
    : null;
}

function commandUuid(value: unknown) {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

function commandSha256(value: unknown) {
  return typeof value === "string" && SHA256_PATTERN.test(value) ? value : null;
}

function commandPublicCode(value: unknown) {
  return typeof value === "string" && ORDER_PUBLIC_CODE_PATTERN.test(value) ? value : null;
}

export async function readBoundedCommandBody(request: Request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_COMMAND_BODY_BYTES) return null;
  if (!request.body) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    byteLength += result.value.byteLength;
    if (byteLength > MAX_COMMAND_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(result.value);
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

export async function readTicketOperationCommand(
  request: Request,
  action: TicketOperationAction,
): Promise<
  | { ok: true; command: TicketOperationCommand; idempotencyKey: string }
  | { ok: false; response: NextResponse }
> {
  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey || !IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return {
      ok: false,
      response: ticketOperationsJson({ ok: false, error: "invalid_idempotency_key" }, 400),
    };
  }
  const source = await readBoundedCommandBody(request);
  if (!source) {
    return {
      ok: false,
      response: ticketOperationsJson({ ok: false, error: "invalid_request" }, 400),
    };
  }
  const body = source;
  const reason = commandReason(body.reason);
  const expectedVersion = commandVersion(body.expectedVersion);
  if (!reason || !expectedVersion) {
    return {
      ok: false,
      response: ticketOperationsJson({ ok: false, error: "invalid_request" }, 400),
    };
  }

  let command: TicketOperationCommand | null = null;
  if (action === "session_revoke" && onlyKeys(body, ["orderPublicCode", "sessionId", "expectedVersion", "reason"])) {
    const orderPublicCode = commandPublicCode(body.orderPublicCode);
    const sessionId = commandUuid(body.sessionId);
    if (orderPublicCode && sessionId) {
      command = { action, orderPublicCode, sessionId, expectedVersion, reason };
    }
  }
  if (action === "assisted_admission" && onlyKeys(body, ["orderPublicCode", "environment", "eventSessionId", "admissionIds", "expectedVersion", "reason"])) {
    const orderPublicCode = commandPublicCode(body.orderPublicCode);
    const environment = typeof body.environment === "string" && ENVIRONMENTS.has(body.environment as TicketEnvironment)
      ? body.environment as TicketEnvironment
      : null;
    const eventSessionId = commandUuid(body.eventSessionId);
    const admissionIds = Array.isArray(body.admissionIds)
      ? [...new Set(body.admissionIds.map(commandUuid).filter((value): value is string => Boolean(value)))]
      : [];
    if (
      orderPublicCode
      && environment
      && eventSessionId
      && admissionIds.length >= 1
      && admissionIds.length <= 20
      && admissionIds.length === (body.admissionIds as unknown[]).length
    ) {
      command = { action, orderPublicCode, environment, eventSessionId, admissionIds, expectedVersion, reason };
    }
  }
  if (action === "refund_resolve" && onlyKeys(body, [
    "reviewId", "resolution", "allocations", "expectedVersion",
    "observationVersion", "observationHash", "reason",
  ])) {
    const reviewId = commandUuid(body.reviewId);
    const observationVersion = commandVersion(body.observationVersion);
    const observationHash = commandSha256(body.observationHash);
    const resolution = typeof body.resolution === "string" && REFUND_RESOLUTIONS.has(body.resolution as TicketRefundResolution)
      ? body.resolution as TicketRefundResolution
      : null;
    const allocations = Array.isArray(body.allocations) && body.allocations.length <= 20
      ? body.allocations.map((entry) => {
          if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
          const allocation = entry as Record<string, unknown>;
          if (!onlyKeys(allocation, ["admissionId", "amountMinor"])) return null;
          const admissionId = commandUuid(allocation.admissionId);
          const amountMinor = Number.isSafeInteger(allocation.amountMinor)
            && (allocation.amountMinor as number) >= 1
            ? allocation.amountMinor as number
            : null;
          return admissionId && amountMinor !== null ? { admissionId, amountMinor } : null;
        })
      : [];
    const allocationRequired = resolution === "apply_and_void"
      || resolution === "record_admitted_exception";
    if (
      reviewId
      && observationVersion
      && observationHash
      && resolution
      && allocations.every((entry) => entry !== null)
      && new Set(allocations.map((entry) => entry?.admissionId)).size === allocations.length
      && (allocationRequired ? allocations.length >= 1 : allocations.length === 0)
    ) {
      command = {
        action,
        reviewId,
        resolution,
        allocations: allocations as Array<{ admissionId: string; amountMinor: number }>,
        expectedVersion,
        observationVersion,
        observationHash,
        reason,
      };
    }
  }
  if (action === "email_retry" && onlyKeys(body, ["emailJobId", "issueRecoveryMail", "expectedVersion", "reason"])) {
    const emailJobId = commandUuid(body.emailJobId);
    if (emailJobId && typeof body.issueRecoveryMail === "boolean") {
      command = {
        action,
        emailJobId,
        issueRecoveryMail: body.issueRecoveryMail,
        expectedVersion,
        reason,
      };
    }
  }

  return command
    ? { ok: true, command, idempotencyKey }
    : {
        ok: false,
        response: ticketOperationsJson({ ok: false, error: "invalid_request" }, 400),
      };
}
