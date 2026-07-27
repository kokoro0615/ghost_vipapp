"use client";

import type {
  LiveCommandDraft,
  OperationDraft,
  StaffAction,
  WaitlistAction,
} from "@/components/admin/vip-floor-v2/contract/uiTypes";
import {
  DEMO_FIRST_BUSINESS_DATE,
  type DemoCustomerLinkDraft,
  type DemoCustomerPatch,
  type DemoLease,
  type DemoPublicConfig,
  type DemoTransport,
  type DemoTransportResult,
} from "@/lib/demo/contract";
import {
  DemoRepositoryError,
  createDemoRepository,
  type BrowserDemoRepository,
} from "@/lib/demo/repository";

const LOCAL_MUTATION_SEMANTICS = {
  optimistic: true,
  rollback: true,
  read_only: true,
  notification: "none",
  delivery: false,
  local: true,
} as const;

type FailurePayload = {
  ok: false;
  mode: "demo";
  code: string;
  message: string;
  details?: Record<string, unknown>;
  optimistic: true;
  rollback: true;
  read_only: boolean;
  notification: "none";
};

function success<T>(payload: T): DemoTransportResult<T> {
  return { ok: true, status: 200, payload };
}

function failure<T>(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): DemoTransportResult<T> {
  const payload: FailurePayload = {
    ok: false,
    mode: "demo",
    code,
    message,
    details,
    optimistic: LOCAL_MUTATION_SEMANTICS.optimistic,
    rollback: LOCAL_MUTATION_SEMANTICS.rollback,
    read_only: code === "READ_ONLY" || code === "STORAGE_UNAVAILABLE",
    notification: "none",
  };
  return { ok: false, status, payload: payload as T };
}

function fromError<T>(error: unknown): DemoTransportResult<T> {
  if (error instanceof DemoRepositoryError) {
    return failure(error.status, error.code, error.message, error.details);
  }
  return failure(500, "LOCAL_DEMO_ERROR", "ローカルデモ操作を完了できませんでした。");
}

function isLease(value: unknown): value is DemoLease {
  if (!value || typeof value !== "object") return false;
  const lease = value as Partial<DemoLease>;
  return lease.ok === true
    && lease.mode === "demo"
    && typeof lease.workspaceId === "string"
    && typeof lease.dataVersion === "string"
    && typeof lease.startsAt === "string"
    && typeof lease.expiresAt === "string"
    && typeof lease.leaseIntervalMs === "number"
    && typeof lease.serverNow === "string"
    && typeof lease.leaseExpiresAt === "string"
    && Number.isFinite(Date.parse(lease.serverNow))
    && Number.isFinite(Date.parse(lease.leaseExpiresAt));
}

class BrowserDemoTransport implements DemoTransport {
  readonly mode = "demo" as const;
  private readonly repository: BrowserDemoRepository;
  private activeBusinessDate: string = DEMO_FIRST_BUSINESS_DATE;

  constructor(private readonly config: DemoPublicConfig) {
    this.repository = createDemoRepository({
      workspaceId: config.workspaceId,
      dataVersion: config.dataVersion,
    });
  }

  async renewLease(): Promise<DemoTransportResult<DemoLease>> {
    let response: Response;
    try {
      response = await fetch("/api/admin/demo/lease", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
        headers: { accept: "application/json" },
      });
    } catch {
      return failure(
        503,
        "LEASE_UNAVAILABLE",
        "デモ変更権限を確認できません。接続を確認してください。",
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return failure(
        response.status || 502,
        "LEASE_INVALID",
        "デモ変更権限の応答を確認できません。",
      );
    }
    if (!response.ok) {
      const body = payload && typeof payload === "object"
        ? payload as Record<string, unknown>
        : {};
      return failure(
        response.status,
        typeof body.code === "string" ? body.code : "LEASE_DENIED",
        typeof body.message === "string"
          ? body.message
          : "デモ変更権限が拒否されました。",
      );
    }
    if (!isLease(payload)) {
      return failure(502, "LEASE_INVALID", "デモ変更権限の形式が正しくありません。");
    }
    if (
      payload.workspaceId !== this.config.workspaceId
      || payload.dataVersion !== this.config.dataVersion
      || payload.startsAt !== this.config.startsAt
      || payload.expiresAt !== this.config.expiresAt
      || payload.leaseIntervalMs !== this.config.leaseIntervalMs
      || Date.parse(payload.serverNow) < Date.parse(payload.startsAt)
      || Date.parse(payload.serverNow) >= Date.parse(payload.expiresAt)
      || Date.parse(payload.leaseExpiresAt) <= Date.parse(payload.serverNow)
      || Date.parse(payload.leaseExpiresAt) - Date.parse(payload.serverNow)
        > this.config.leaseIntervalMs
      || Date.parse(payload.leaseExpiresAt) <= Date.now()
    ) {
      return failure(409, "LEASE_MISMATCH", "デモ変更権限の対象または期限が一致しません。");
    }
    return success(payload);
  }

  private async mutate<T>(run: () => T): Promise<DemoTransportResult<T>> {
    const lease = await this.renewLease();
    if (!lease.ok) return lease as unknown as DemoTransportResult<T>;
    try {
      return success(run());
    } catch (error) {
      return fromError(error);
    }
  }

  async loadBoard(businessDate: string) {
    this.activeBusinessDate = businessDate;
    try {
      return success(this.repository.loadBoard(businessDate));
    } catch (error) {
      return fromError<ReturnType<BrowserDemoRepository["loadBoard"]>>(error);
    }
  }

  async loadOperationOptions(businessDate: string) {
    this.activeBusinessDate = businessDate;
    try {
      return success(this.repository.loadOperationOptions(businessDate));
    } catch (error) {
      return fromError<ReturnType<BrowserDemoRepository["loadOperationOptions"]>>(error);
    }
  }

  async runCommand(draft: LiveCommandDraft, idempotencyKey: string) {
    return this.mutate(() =>
      this.repository.runCommand(this.activeBusinessDate, draft, idempotencyKey));
  }

  async runOperation(draft: OperationDraft, idempotencyKey: string) {
    if (draft.kind === "block_create") {
      this.activeBusinessDate = draft.payload.businessDate;
    }
    return this.mutate(() =>
      this.repository.runOperation(this.activeBusinessDate, draft, idempotencyKey));
  }

  async loadWaitlist(businessDate: string) {
    this.activeBusinessDate = businessDate;
    try {
      return success(this.repository.loadWaitlist(businessDate));
    } catch (error) {
      return fromError<ReturnType<BrowserDemoRepository["loadWaitlist"]>>(error);
    }
  }

  async runWaitlist(
    businessDate: string,
    action: WaitlistAction,
    idempotencyKey: string,
  ) {
    this.activeBusinessDate = businessDate;
    return this.mutate(() =>
      this.repository.runWaitlist(businessDate, action, idempotencyKey));
  }

  async loadStaff(businessDate: string) {
    this.activeBusinessDate = businessDate;
    try {
      return success(this.repository.loadStaff(businessDate));
    } catch (error) {
      return fromError<ReturnType<BrowserDemoRepository["loadStaff"]>>(error);
    }
  }

  async runStaff(
    businessDate: string,
    action: StaffAction,
    idempotencyKey: string,
  ) {
    this.activeBusinessDate = businessDate;
    return this.mutate(() =>
      this.repository.runStaff(businessDate, action, idempotencyKey));
  }

  async loadCustomer(businessDate: string, customerId: string) {
    this.activeBusinessDate = businessDate;
    try {
      return success(this.repository.loadCustomer(businessDate, customerId));
    } catch (error) {
      return fromError<ReturnType<BrowserDemoRepository["loadCustomer"]>>(error);
    }
  }

  async updateCustomer(
    businessDate: string,
    customerId: string,
    patch: DemoCustomerPatch,
    idempotencyKey: string,
  ) {
    this.activeBusinessDate = businessDate;
    return this.mutate(() =>
      this.repository.updateCustomer(businessDate, customerId, patch, idempotencyKey));
  }

  async relinkCustomer(
    businessDate: string,
    draft: DemoCustomerLinkDraft,
    idempotencyKey: string,
  ) {
    this.activeBusinessDate = businessDate;
    return this.mutate(() =>
      this.repository.relinkCustomer(businessDate, draft, idempotencyKey));
  }

  async loadObservability(businessDate: string) {
    this.activeBusinessDate = businessDate;
    try {
      return success(this.repository.loadObservability(businessDate));
    } catch (error) {
      return fromError<Record<string, unknown>>(error);
    }
  }

  async reset(businessDate: string) {
    this.activeBusinessDate = businessDate;
    return this.mutate(() => this.repository.reset(businessDate));
  }

  purgeExpired() {
    this.repository.purgeExpired();
  }

  subscribe(businessDate: string, onRevisionGap: () => void) {
    return this.repository.subscribe(businessDate, onRevisionGap);
  }
}

export function createDemoTransport(config: DemoPublicConfig): DemoTransport {
  return new BrowserDemoTransport(config);
}
