import type {
  TicketOperationCommand,
  TicketOperationFailure,
  TicketOperationMutationResponse,
  TicketOperationsCapabilitiesResponse,
  TicketOperationsOrderResponse,
  TicketOperationsQueueResponse,
  TicketOperationScope,
} from "@/lib/ticketOperationsContract";

import {
  applyDemoTicketOperation,
  type DemoTicketOperationsStore,
  readDemoTicketCapabilities,
  readDemoTicketOrder,
  readDemoTicketQueue,
} from "./demo";

export type TicketOperationsMode = "production" | "demo";

export type TicketOperationsApiContext = {
  mode: TicketOperationsMode;
  demoStore: DemoTicketOperationsStore;
};

export type PreparedTicketOperation = TicketOperationCommand & {
  idempotencyKey: string;
};

export class TicketOperationsApiError extends Error {
  readonly failure: TicketOperationFailure | null;
  readonly status: number;

  constructor(status: number, failure: TicketOperationFailure | null) {
    super(failure?.error ?? "ticket_operations_request_failed");
    this.failure = failure;
    this.status = status;
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as T | TicketOperationFailure | null;
  if (!response.ok) {
    const failure = payload && typeof payload === "object" && "ok" in payload && payload.ok === false
      ? payload as TicketOperationFailure
      : null;
    throw new TicketOperationsApiError(response.status, failure);
  }
  if (!payload || typeof payload !== "object") {
    throw new TicketOperationsApiError(502, null);
  }
  return payload as T;
}

function productionRequest(path: string, init: RequestInit = {}) {
  return fetch(path, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      accept: "application/json",
      ...init.headers,
    },
  });
}

export async function loadCapabilities(
  context: TicketOperationsApiContext,
  signal?: AbortSignal,
): Promise<TicketOperationsCapabilitiesResponse> {
  if (context.mode === "demo") {
    const demo = readDemoTicketCapabilities(context.demoStore);
    return demo;
  }
  return readJson<TicketOperationsCapabilitiesResponse>(await productionRequest(
    "/api/admin/vip-floor/tickets/capabilities",
    { signal },
  ));
}

export async function loadTicketOperationsQueue(
  context: TicketOperationsApiContext,
  scope: TicketOperationScope,
  signal?: AbortSignal,
): Promise<TicketOperationsQueueResponse> {
  if (context.mode === "demo") {
    const demo = readDemoTicketQueue(context.demoStore, scope);
    return demo;
  }
  return readJson<TicketOperationsQueueResponse>(await productionRequest(
    `/api/admin/vip-floor/tickets/queue?scope=${scope}`,
    { signal },
  ));
}

export async function loadTicketOperationsOrder(
  context: TicketOperationsApiContext,
  orderPublicCode: string,
  scope: TicketOperationScope,
  signal?: AbortSignal,
): Promise<TicketOperationsOrderResponse> {
  if (context.mode === "demo") {
    const demo = readDemoTicketOrder(context.demoStore, orderPublicCode);
    if (!demo) {
      throw new TicketOperationsApiError(404, {
        ok: false,
        error: "not_found",
        currentVersion: null,
        recovery: "合成注文番号を確認してください。",
      });
    }
    return demo;
  }
  return readJson<TicketOperationsOrderResponse>(await productionRequest(
    `/api/admin/vip-floor/tickets/orders/${encodeURIComponent(orderPublicCode)}?scope=${scope}`,
    { signal },
  ));
}

const MUTATION_PATHS = {
  entry_rotate: "/api/admin/vip-floor/tickets/entry/rotate",
  entry_revoke: "/api/admin/vip-floor/tickets/entry/revoke",
  entry_resend: "/api/admin/vip-floor/tickets/entry/resend",
  entry_exception: "/api/admin/vip-floor/tickets/entry/exception",
  session_revoke: "/api/admin/vip-floor/tickets/sessions/revoke",
  assisted_admission: "/api/admin/vip-floor/tickets/admissions/assist",
  refund_resolve: "/api/admin/vip-floor/tickets/refund-reviews/resolve",
  email_retry: "/api/admin/vip-floor/tickets/email-jobs/retry",
} as const;

export async function runTicketOperation(
  context: TicketOperationsApiContext,
  prepared: PreparedTicketOperation,
): Promise<TicketOperationMutationResponse> {
  const { idempotencyKey, action, ...command } = prepared;
  if (context.mode === "demo") {
    const demo = applyDemoTicketOperation(
      context.demoStore,
      { action, ...command } as TicketOperationCommand,
      idempotencyKey,
    );
    return demo;
  }
  return readJson<TicketOperationMutationResponse>(await productionRequest(
    MUTATION_PATHS[action],
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify(command),
    },
  ));
}
