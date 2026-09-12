import type {
  TicketOperationCommand,
  TicketOperationMutationResponse,
  TicketOperationsCapabilities,
  TicketOperationsCapabilitiesResponse,
  TicketOperationsOrderResponse,
  TicketOperationsQueueResponse,
  TicketOperationScope,
} from "@/lib/ticketOperationsContract";

const DEMO_TICKET_DATASET = "DEMO-TICKET";
const DEMO_PUBLIC_CODE = "GT-DEMO20260811";
const DEMO_ORDER_ID = "10000000-0000-4000-8000-000000000001";
const DEMO_REVIEW_ID = "10000000-0000-4000-8000-000000000002";
const DEMO_SESSION_ID = "10000000-0000-4000-8000-000000000003";
const DEMO_EMAIL_JOB_ID = "10000000-0000-4000-8000-000000000004";
const DEMO_EVENT_SESSION_ID = "10000000-0000-4000-8000-000000000005";
const DEMO_ADMISSION_IDS = Array.from(
  { length: 20 },
  (_, index) => `10000000-0000-4000-8000-${String(index + 6).padStart(12, "0")}`,
);
const DEMO_ADMISSION_TWO = DEMO_ADMISSION_IDS[1];

export type DemoTicketOperationsStore = {
  capabilities: TicketOperationsCapabilities;
  queue: TicketOperationsQueueResponse;
  order: TicketOperationsOrderResponse;
  results: Map<string, TicketOperationMutationResponse>;
};

function nowIso() {
  return new Date().toISOString();
}

export function createDemoTicketOperationsStore(
  capabilities: TicketOperationsCapabilities,
): DemoTicketOperationsStore {
  const eventSession = {
    eventSessionId: DEMO_EVENT_SESSION_ID,
    eventTitle: `${DEMO_TICKET_DATASET} · 合成イベント`,
    eventDate: "2026-08-11",
    doorsAt: "2026-08-11T12:30:00.000Z",
    admissionOpensAt: "2026-08-11T12:00:00.000Z",
    admissionClosesAt: "2026-08-11T17:30:00.000Z",
    state: "open" as const,
  };
  const health = {
    emailProvider: "disabled" as const,
    outboxRetryCount: 1,
    outboxDeadCount: 0,
    webhookFreshness: "fresh" as const,
    lastWebhookAt: "2026-08-11T13:01:00.000Z",
  };
  const order = {
    publicCode: DEMO_PUBLIC_CODE,
    maskedEmail: "de••••@example.invalid",
    environment: "test" as const,
    expectedVersion: 4,
    eventSession,
    wallet: {
      state: "active" as const,
      activeSessionCount: 1,
      activeSessions: [{
        sessionId: DEMO_SESSION_ID,
        expectedVersion: 3,
        createdAt: "2026-08-11T12:40:00.000Z",
        expiresAt: "2026-08-19T14:59:59.000Z",
      }],
      lastVerifiedAt: "2026-08-11T12:40:00.000Z",
      freshAuthenticationUntil: "2026-08-12T00:40:00.000Z",
      otpDelivery: "delivered" as const,
      otpRateLimit: "cooldown" as const,
      challengeState: "prepared" as const,
    },
    admissions: DEMO_ADMISSION_IDS.map((admissionId, index) => ({
      admissionId,
      serial: index + 1,
      label: index === 19
        ? "一般 / GENERAL ADMISSION 🎙️ 最終券"
        : `一般 ${index + 1}枚目`,
      status: index === 1 ? "admitted" as const : index === 2 ? "void" as const : "issued" as const,
      admittedAt: index === 1 ? "2026-08-11T13:00:30.000Z" : null,
    })),
    refundReview: {
      reviewId: DEMO_REVIEW_ID,
      status: "pending" as const,
      expectedVersion: 2,
      observationVersion: 1,
      observationHash: "a".repeat(64),
      amountMinor: 6500,
      currency: "JPY",
      providerEventId: "demo-provider-event-001",
      selectedAdmissionIds: [],
      conflictReason: "券別配分を確認してください。",
      moneyMayHaveMoved: true,
      authorityResolvable: true,
      observationHistoryState: "complete" as const,
      observationHistoryReason: null,
      resolutionOptions: ["apply_and_void", "record_admitted_exception"] as Array<
        "apply_and_void" | "record_admitted_exception"
      >,
    },
    emailJobs: [{
      emailJobId: DEMO_EMAIL_JOB_ID,
      purpose: "recovery" as const,
      status: "retry" as const,
      attemptCount: 2,
      nextAttemptAt: "2026-08-11T13:10:00.000Z",
      expectedVersion: 2,
      retryable: true,
    }],
    timeline: [
      {
        auditId: "10000000-0000-4000-8000-000000000008",
        type: "admission_confirmed",
        label: "1枚を入場済みに確定",
        occurredAt: "2026-08-11T13:00:30.000Z",
        actorLabel: "合成Owner",
        reason: null,
      },
      {
        auditId: "10000000-0000-4000-8000-000000000009",
        type: "refund_review_opened",
        label: "返金確認を作成",
        occurredAt: "2026-08-11T13:02:00.000Z",
        actorLabel: "合成worker",
        reason: "券別配分が必要",
      },
    ],
    safeRecoveryInstruction: "購入者端末でWalletを再読込し、届かない場合は受付で公開注文番号を確認してください。",
  };
  const queueItems = [
    {
      id: DEMO_ORDER_ID,
      kind: "admission" as const,
      priority: "urgent" as const,
      publicCode: DEMO_PUBLIC_CODE,
      maskedEmail: order.maskedEmail,
      eventTitle: eventSession.eventTitle,
      eventDate: eventSession.eventDate,
      environment: "test" as const,
      status: "issued",
      statusLabel: "未入場 1枚",
      summary: "入口でWallet復旧を待っています。",
      updatedAt: "2026-08-11T13:04:00.000Z",
      expectedVersion: order.expectedVersion,
    },
    {
      id: "10000000-0000-4000-8000-000000000010",
      kind: "refund_review" as const,
      priority: "attention" as const,
      publicCode: DEMO_PUBLIC_CODE,
      maskedEmail: order.maskedEmail,
      eventTitle: eventSession.eventTitle,
      eventDate: eventSession.eventDate,
      environment: "test" as const,
      status: "pending",
      statusLabel: "返金確認",
      summary: "券別配分の確定が必要です。",
      updatedAt: "2026-08-11T13:02:00.000Z",
      expectedVersion: order.expectedVersion,
    },
    {
      id: "10000000-0000-4000-8000-000000000012",
      kind: "checkout_review" as const,
      priority: "urgent" as const,
      publicCode: DEMO_PUBLIC_CODE,
      maskedEmail: order.maskedEmail,
      eventTitle: eventSession.eventTitle,
      eventDate: eventSession.eventDate,
      environment: "test" as const,
      status: "provider_outcome_unknown",
      statusLabel: "決済結果不明",
      summary: "Checkout決済の終端と発行状況を確認してください。",
      updatedAt: "2026-08-11T13:03:00.000Z",
      expectedVersion: order.expectedVersion,
    },
    {
      id: "10000000-0000-4000-8000-000000000011",
      kind: "email_delivery" as const,
      priority: "normal" as const,
      publicCode: DEMO_PUBLIC_CODE,
      maskedEmail: order.maskedEmail,
      eventTitle: eventSession.eventTitle,
      eventDate: eventSession.eventDate,
      environment: "test" as const,
      status: "retry",
      statusLabel: "送信待ち",
      summary: "復旧メールの再投入が可能です。",
      updatedAt: "2026-08-11T13:03:00.000Z",
      expectedVersion: order.expectedVersion,
    },
  ];

  return {
    capabilities: { ...capabilities },
    queue: {
      ok: true,
      serverNow: nowIso(),
      environment: "test",
      eventSessions: [eventSession],
      recentAdmissions: [{
        admissionId: DEMO_ADMISSION_TWO,
        publicCode: DEMO_PUBLIC_CODE,
        eventTitle: eventSession.eventTitle,
        admittedCount: 1,
        admittedAt: "2026-08-11T13:00:30.000Z",
      }],
      health,
      items: queueItems,
    },
    order: { ok: true, serverNow: nowIso(), health, order },
    results: new Map(),
  };
}

export function readDemoTicketCapabilities(
  store: DemoTicketOperationsStore,
): TicketOperationsCapabilitiesResponse {
  return {
    ok: true,
    serverNow: nowIso(),
    capabilities: { ...store.capabilities },
    readiness: {
      managerOperations: store.capabilities.managerOperationsEnabled ? "ready" : "disabled",
      refundReview: store.capabilities.refundReviewEnabled ? "ready" : "disabled",
    },
  };
}

export function readDemoTicketQueue(
  store: DemoTicketOperationsStore,
  scope: TicketOperationScope,
): TicketOperationsQueueResponse {
  return {
    ...store.queue,
    serverNow: nowIso(),
    eventSessions: scope === "all" ? store.queue.eventSessions : [],
    recentAdmissions: scope === "all" ? store.queue.recentAdmissions : [],
    items: store.queue.items.filter((item) => (
      scope === "all" || item.kind === "refund_review" || item.kind === "checkout_review"
    )),
  };
}

export function readDemoTicketOrder(
  store: DemoTicketOperationsStore,
  orderPublicCode: string,
): TicketOperationsOrderResponse | null {
  return orderPublicCode === store.order.order.publicCode
    ? { ...store.order, serverNow: nowIso() }
    : null;
}

function appendDemoAudit(
  store: DemoTicketOperationsStore,
  idempotencyKey: string,
  label: string,
  reason: string,
) {
  store.order.order.timeline = [{
    auditId: idempotencyKey,
    type: "demo_owner_operation",
    label,
    occurredAt: nowIso(),
    actorLabel: "合成Owner",
    reason,
  }, ...store.order.order.timeline];
}

export function applyDemoTicketOperation(
  store: DemoTicketOperationsStore,
  command: TicketOperationCommand,
  idempotencyKey: string,
): TicketOperationMutationResponse {
  const existing = store.results.get(idempotencyKey);
  if (existing) return { ...existing, reused: true, serverNow: nowIso() };

  const nextVersion = store.order.order.expectedVersion + 1;
  if (command.action === "session_revoke") {
    store.order.order.wallet.activeSessions = store.order.order.wallet.activeSessions.filter(
      (session) => session.sessionId !== command.sessionId,
    );
    store.order.order.wallet.activeSessionCount = store.order.order.wallet.activeSessions.length;
    store.order.order.wallet.state = "revoked";
    appendDemoAudit(store, idempotencyKey, "Wallet sessionを失効", command.reason);
  } else if (command.action === "assisted_admission") {
    store.order.order.admissions = store.order.order.admissions.map((admission) => (
      command.admissionIds.includes(admission.admissionId)
        ? { ...admission, status: "admitted", admittedAt: nowIso() }
        : admission
    ));
    appendDemoAudit(store, idempotencyKey, "Owner補助入場を確定", command.reason);
  } else if (command.action === "refund_resolve") {
    if (store.order.order.refundReview) store.order.order.refundReview.status = "resolved";
    if (command.resolution === "apply_and_void") {
      const ids = new Set(command.allocations.map((allocation) => allocation.admissionId));
      store.order.order.admissions = store.order.order.admissions.map((admission) => (
        ids.has(admission.admissionId) && admission.status === "issued"
          ? { ...admission, status: "void", admittedAt: null }
          : admission
      ));
    }
    appendDemoAudit(store, idempotencyKey, "返金確認を解決", command.reason);
  } else if (command.action === "email_retry") {
    store.order.order.emailJobs = store.order.order.emailJobs.map((job) => (
      job.emailJobId === command.emailJobId
        ? { ...job, status: "queued", retryable: false, nextAttemptAt: nowIso() }
        : job
    ));
    appendDemoAudit(store, idempotencyKey, command.issueRecoveryMail
      ? "復旧メールを合成キューへ追加"
      : "メールを合成キューへ再投入", command.reason);
  }
  if (command.action.startsWith("entry_")) throw new Error("order_entry_requires_server_demo");

  store.order.order.expectedVersion = nextVersion;
  store.order.serverNow = nowIso();
  store.queue.serverNow = store.order.serverNow;
  store.queue.items = store.queue.items.map((item) => (
    item.publicCode === store.order.order.publicCode
      ? { ...item, expectedVersion: nextVersion, updatedAt: store.order.serverNow }
      : item
  ));
  const result: TicketOperationMutationResponse = {
    ok: true,
    action: command.action,
    entityVersion: nextVersion,
    auditLogId: idempotencyKey,
    reused: false,
    serverNow: store.order.serverNow,
  };
  store.results.set(idempotencyKey, result);
  return result;
}
