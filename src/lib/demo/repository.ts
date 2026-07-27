"use client";

import type {
  CustomerDetail,
  LiveCommandDraft,
  OperationDraft,
  OperationOptions,
  StaffAction,
  StaffWorkspaceData,
  WaitlistAction,
} from "@/components/admin/vip-floor-v2/contract/uiTypes";
import {
  DEMO_FIRST_BUSINESS_DATE,
  DEMO_LAST_BUSINESS_DATE,
  DEMO_EXPIRES_AT,
  DEMO_SCHEMA_VERSION,
  DEMO_STORAGE_PREFIX,
  type DemoAuditEvent,
  type DemoCustomerLinkDraft,
  type DemoCustomerPatch,
  type DemoEnvelope,
  type DemoMutationResult,
  type DemoOperationKind,
  type DemoRepositoryErrorCode,
  type DemoRepositorySnapshot,
} from "@/lib/demo/contract";
import {
  calculateDemoTotals,
  createDeterministicDemoEnvelope,
} from "@/lib/demo/fixtures";
import {
  DemoValidationError,
  assertDemoBusinessDate,
  assertSyntheticNote,
  validateCustomerPatch,
  validateOperationDraft,
  validateStaffAction,
  validateWaitlistAction,
} from "@/lib/demo/validation";
import {
  VIP_FLOOR_SCHEMA_VERSION,
  type ReservationBlockV2,
  type VipFloorAssignmentV2,
  type VipFloorBoardV2,
  type VipFloorReservationV2,
  type VipServiceStatus,
} from "@/lib/vipFloorV2Contract";

const REVISION_CHANNEL = "ghost-vip-demo-revision";
const BLOCK_REPEAT_DAYS = new Set([1, 7, 14]);

type RepositoryConfig = {
  workspaceId: string;
  dataVersion: string;
};

type RevisionMessage = {
  workspaceId: string;
  dataVersion: string;
  businessDate: string;
  revision: number;
};

type MutationOutcome = {
  action?: DemoOperationKind;
  entityId: string | null;
  entityVersion: number;
  createdCount?: number;
  summary: string;
};

export class DemoRepositoryError extends Error {
  readonly code: DemoRepositoryErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: DemoRepositoryErrorCode,
    message: string,
    status = 400,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "DemoRepositoryError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function plusMinutes(timestamp: string, minutes: number): string {
  return new Date(Date.parse(timestamp) + minutes * 60_000).toISOString();
}

function plusDays(timestamp: string, days: number): string {
  const value = new Date(timestamp);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString();
}

function plusBusinessDays(businessDate: string, days: number): string {
  const value = new Date(`${businessDate}T12:00:00+09:00`);
  value.setUTCDate(value.getUTCDate() + days);
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(value);
}

function overlaps(leftStart: string, leftEnd: string, rightStart: string, rightEnd: string) {
  return Date.parse(leftStart) < Date.parse(rightEnd)
    && Date.parse(rightStart) < Date.parse(leftEnd);
}

function assertInterval(startAt: string, endAt: string) {
  if (
    !Number.isFinite(Date.parse(startAt))
    || !Number.isFinite(Date.parse(endAt))
    || Date.parse(startAt) >= Date.parse(endAt)
  ) {
    throw new DemoRepositoryError(
      "INVALID_SYNTHETIC_INPUT",
      "デモ営業時間内の有効な開始・終了日時を指定してください。",
    );
  }
}

function envelopeMatches(
  value: unknown,
  config: RepositoryConfig,
  businessDate: string,
): value is DemoEnvelope {
  if (!isRecord(value)) return false;
  return value.schemaVersion === DEMO_SCHEMA_VERSION
    && value.dataVersion === config.dataVersion
    && value.workspaceId === config.workspaceId
    && value.businessDate === businessDate
    && value.expiresAt === DEMO_EXPIRES_AT
    && Number.isInteger(value.boardRevision)
    && Number(value.boardRevision) > 0
    && Array.isArray(value.tables)
    && Array.isArray(value.reservations)
    && Array.isArray(value.assignments)
    && Array.isArray(value.blocks)
    && Array.isArray(value.notes)
    && Array.isArray(value.waitlist)
    && isRecord(value.staff)
    && isRecord(value.customers)
    && Array.isArray(value.auditHistory)
    && isRecord(value.idempotency);
}

function toBoard(envelope: DemoEnvelope): VipFloorBoardV2 {
  return {
    schemaVersion: VIP_FLOOR_SCHEMA_VERSION,
    generatedAt: envelope.generatedAt,
    boardRevision: envelope.boardRevision,
    businessDay: cloneValue(envelope.businessDay),
    capabilities: cloneValue(envelope.capabilities),
    sections: cloneValue(envelope.sections),
    tables: cloneValue(envelope.tables),
    reservations: cloneValue(envelope.reservations),
    assignments: cloneValue(envelope.assignments),
    unassignedReservationIds: cloneValue(envelope.unassignedReservationIds),
    blocks: cloneValue(envelope.blocks),
    notes: cloneValue(envelope.notes),
    totals: cloneValue(envelope.totals),
    operations: cloneValue(envelope.operations),
  };
}

function transitionAllowed(current: VipServiceStatus | null, next: VipServiceStatus) {
  if (current === next) return true;
  const terminal = new Set<VipServiceStatus>(["completed", "no_show"]);
  if (current && terminal.has(current)) return false;
  const order: VipServiceStatus[] = [
    "expected",
    "late",
    "no_contact",
    "arrived",
    "partial_arrival",
    "seated",
    "bottle_pending",
    "bottle_served",
    "bill_requested",
    "paid",
    "resetting",
    "completed",
  ];
  if (next === "no_show") return current !== "seated" && current !== "completed";
  const currentIndex = current ? order.indexOf(current) : -1;
  const nextIndex = order.indexOf(next);
  return nextIndex >= 0 && nextIndex >= currentIndex;
}

export class BrowserDemoRepository {
  readonly workspaceId: string;
  readonly dataVersion: string;
  private readOnly = false;
  private readonly revisions = new Map<string, number>();
  private channel: BroadcastChannel | null = null;

  constructor(config: RepositoryConfig) {
    this.workspaceId = config.workspaceId;
    this.dataVersion = config.dataVersion;
    if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
      try {
        this.channel = new BroadcastChannel(REVISION_CHANNEL);
      } catch {
        this.channel = null;
      }
    }
  }

  private storageKey(businessDate: string) {
    return `ghost-vip-demo:${this.workspaceId}:${this.dataVersion}:${businessDate}`;
  }

  private storage(): Storage {
    if (typeof window === "undefined" || !window.localStorage) {
      this.readOnly = true;
      throw new DemoRepositoryError(
        "STORAGE_UNAVAILABLE",
        "ブラウザのローカル保存領域を利用できません。",
        503,
      );
    }
    return window.localStorage;
  }

  private assertWritable() {
    if (this.readOnly) {
      throw new DemoRepositoryError(
        "READ_ONLY",
        "ローカル保存エラーのためデモは読み取り専用です。",
        503,
      );
    }
  }

  private write(envelope: DemoEnvelope) {
    this.assertWritable();
    try {
      this.storage().setItem(this.storageKey(envelope.businessDate), JSON.stringify(envelope));
    } catch {
      this.readOnly = true;
      throw new DemoRepositoryError(
        "STORAGE_UNAVAILABLE",
        "変更は保存されず、デモは読み取り専用になりました。",
        503,
      );
    }
  }

  private writeMany(envelopes: DemoEnvelope[]) {
    this.assertWritable();
    const storage = this.storage();
    const prior = envelopes.map((envelope) => {
      const key = this.storageKey(envelope.businessDate);
      return { key, raw: storage.getItem(key) };
    });
    let written = 0;
    try {
      for (const envelope of envelopes) {
        storage.setItem(this.storageKey(envelope.businessDate), JSON.stringify(envelope));
        written += 1;
      }
    } catch {
      try {
        for (let index = written - 1; index >= 0; index -= 1) {
          const snapshot = prior[index];
          if (snapshot.raw === null) storage.removeItem(snapshot.key);
          else storage.setItem(snapshot.key, snapshot.raw);
        }
      } catch {
        // A failed rollback leaves the lane closed; no further mutation is allowed.
      }
      this.readOnly = true;
      throw new DemoRepositoryError(
        "STORAGE_UNAVAILABLE",
        "繰り返し変更を保存できず、ローカル台帳を読み取り専用にしました。",
        503,
      );
    }
    for (const envelope of envelopes) {
      this.publish(envelope.businessDate, envelope.boardRevision);
    }
  }

  private publish(businessDate: string, revision: number) {
    this.revisions.set(businessDate, revision);
    try {
      this.channel?.postMessage({
        workspaceId: this.workspaceId,
        dataVersion: this.dataVersion,
        businessDate,
        revision,
      } satisfies RevisionMessage);
    } catch {
      // The repository remains usable when cross-tab messaging is unavailable.
    }
  }

  private reseed(businessDate: string) {
    const envelope = createDeterministicDemoEnvelope({
      businessDate,
      workspaceId: this.workspaceId,
      dataVersion: this.dataVersion,
    });
    this.write(envelope);
    this.publish(businessDate, envelope.boardRevision);
    return envelope;
  }

  private read(businessDate: string): DemoEnvelope {
    try {
      assertDemoBusinessDate(businessDate);
    } catch (error) {
      if (error instanceof DemoValidationError) {
        throw new DemoRepositoryError(
          "DATE_OUTSIDE_DEMO_WINDOW",
          "デモ期間外の日付です。",
        );
      }
      throw error;
    }

    let raw: string | null;
    try {
      raw = this.storage().getItem(this.storageKey(businessDate));
    } catch {
      this.readOnly = true;
      throw new DemoRepositoryError(
        "STORAGE_UNAVAILABLE",
        "ブラウザのローカル保存領域を読み取れません。",
        503,
      );
    }
    if (!raw) return this.reseed(businessDate);

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return this.reseed(businessDate);
    }
    if (
      !envelopeMatches(parsed, this, businessDate)
      || parsed.schemaVersion !== DEMO_SCHEMA_VERSION
      || parsed.dataVersion !== this.dataVersion
      || parsed.workspaceId !== this.workspaceId
      || parsed.businessDate !== businessDate
    ) {
      return this.reseed(businessDate);
    }
    if (Date.now() >= Date.parse(parsed.expiresAt)) {
      try {
        this.storage().removeItem(this.storageKey(businessDate));
      } catch {
        this.readOnly = true;
        throw new DemoRepositoryError(
          "STORAGE_UNAVAILABLE",
          "期限切れのローカルデモ台帳を削除できません。",
          503,
        );
      }
      throw new DemoRepositoryError(
        "DEMO_EXPIRED",
        "このデモの利用期間は終了しました。",
        410,
      );
    }
    this.revisions.set(businessDate, parsed.boardRevision);
    return cloneValue(parsed);
  }

  private reservation(
    envelope: DemoEnvelope,
    id: string,
    expectedVersion?: number,
  ) {
    const entity = envelope.reservations.find((item) => item.id === id);
    if (!entity) throw new DemoRepositoryError("NOT_FOUND", "予約が見つかりません。", 404);
    if (expectedVersion !== undefined && entity.version !== expectedVersion) {
      throw new DemoRepositoryError(
        "VERSION_CONFLICT",
        "予約が別タブで更新されています。",
        409,
        { entityId: id, expectedVersion, currentVersion: entity.version },
      );
    }
    return entity;
  }

  private tableVersions(
    envelope: DemoEnvelope,
    tableIds: string[],
    expected: Array<{ tableId: string; expectedVersion: number }> = [],
  ) {
    if (new Set(tableIds).size !== tableIds.length) {
      throw new DemoRepositoryError(
        "TABLE_CONFLICT",
        "同じ卓を複数回指定できません。",
        409,
      );
    }
    const versionMap = new Map(expected.map((item) => [item.tableId, item.expectedVersion]));
    for (const tableId of tableIds) {
      const table = envelope.tables.find((item) => item.id === tableId);
      if (!table) throw new DemoRepositoryError("NOT_FOUND", "卓が見つかりません。", 404);
      const expectedVersion = versionMap.get(tableId);
      if (expectedVersion !== undefined && expectedVersion !== table.version) {
        throw new DemoRepositoryError(
          "TABLE_CONFLICT",
          "卓が別タブで更新されています。",
          409,
          { tableId, expectedVersion, currentVersion: table.version },
        );
      }
      if (table.operationalLocked) {
        throw new DemoRepositoryError("TABLE_CONFLICT", "この卓は現在ロックされています。", 409);
      }
    }
  }

  private availability(
    envelope: DemoEnvelope,
    tableIds: string[],
    startAt: string,
    endAt: string,
    ignoredReservationId?: string,
    ignoredBlockId?: string,
  ) {
    assertInterval(startAt, endAt);
    const reservation = envelope.reservations.find(
      (item) =>
        item.id !== ignoredReservationId
        && item.lifecycleStatus !== "cancelled"
        && item.tableIds.some((id) => tableIds.includes(id))
        && overlaps(startAt, endAt, item.scheduledStartAt, item.scheduledEndAt),
    );
    if (reservation) {
      throw new DemoRepositoryError(
        "TABLE_CONFLICT",
        "指定時間に重複する予約があります。",
        409,
        { reservationId: reservation.id },
      );
    }
    const block = envelope.blocks.find(
      (item) =>
        item.id !== ignoredBlockId
        && item.scope === "all_operations"
        && (item.targets.venueWide || item.targets.tableIds.some((id) => tableIds.includes(id)))
        && overlaps(startAt, endAt, item.startAt, item.endAt),
    );
    if (block) {
      throw new DemoRepositoryError(
        "BLOCK_CONFLICT",
        "指定時間に重複する全業務ブロックがあります。",
        409,
        { blockId: block.id },
      );
    }
  }

  private blockAvailability(
    envelope: DemoEnvelope,
    tableIds: string[],
    venueWide: boolean,
    scope: "online_only" | "all_operations",
    startAt: string,
    endAt: string,
    ignoredBlockId?: string,
  ) {
    assertInterval(startAt, endAt);
    if (scope === "all_operations") {
      const reservation = envelope.reservations.find(
        (item) =>
          item.lifecycleStatus !== "cancelled"
          && (venueWide || item.tableIds.some((id) => tableIds.includes(id)))
          && overlaps(startAt, endAt, item.scheduledStartAt, item.scheduledEndAt),
      );
      if (reservation) {
        throw new DemoRepositoryError(
          "TABLE_CONFLICT",
          "全業務ブロックと重複する予約があります。",
          409,
          { reservationId: reservation.id },
        );
      }
    }
    const block = envelope.blocks.find(
      (item) =>
        item.id !== ignoredBlockId
        && (
          venueWide
          || item.targets.venueWide
          || item.targets.tableIds.some((id) => tableIds.includes(id))
        )
        && overlaps(startAt, endAt, item.startAt, item.endAt),
    );
    if (block) {
      throw new DemoRepositoryError(
        "BLOCK_CONFLICT",
        "指定時間に重複するブロックがあります。",
        409,
        { blockId: block.id },
      );
    }
  }

  private bumpTables(envelope: DemoEnvelope, tableIds: string[]) {
    for (const tableId of new Set(tableIds)) {
      const table = envelope.tables.find((item) => item.id === tableId);
      if (table) table.version += 1;
    }
  }

  private normalize(envelope: DemoEnvelope, updatedAt: string) {
    const prior = new Map(envelope.assignments.map((item) => [item.id, item]));
    const assignments: VipFloorAssignmentV2[] = [];
    for (const reservation of envelope.reservations) {
      reservation.assignmentIds = reservation.tableIds.map((tableId) => {
        const id = `${reservation.id}:${tableId}`;
        const current = prior.get(id);
        assignments.push({
          id,
          version: current?.version ?? reservation.version,
          reservationId: reservation.id,
          tableId,
          lockStatus: current?.lockStatus ?? "confirmed",
          assignmentRole: current?.assignmentRole ?? "primary",
          startAt: reservation.scheduledStartAt,
          endAt: reservation.scheduledEndAt,
          updatedAt,
        });
        return id;
      });
    }
    envelope.assignments = assignments;
    for (const table of envelope.tables) {
      table.reservationIds = envelope.reservations
        .filter((item) => item.tableIds.includes(table.id))
        .map((item) => item.id);
      table.blockIds = envelope.blocks
        .filter((item) => item.targets.venueWide || item.targets.tableIds.includes(table.id))
        .map((item) => item.id);
    }
    envelope.unassignedReservationIds = envelope.reservations
      .filter((item) => item.tableIds.length === 0)
      .map((item) => item.id);
    envelope.totals = calculateDemoTotals(envelope);
    envelope.generatedAt = updatedAt;
  }

  private mutate(
    businessDate: string,
    operation: DemoOperationKind,
    idempotencyKey: string,
    request: unknown,
    apply: (envelope: DemoEnvelope, at: string) => MutationOutcome,
  ): DemoMutationResult {
    this.assertWritable();
    if (!idempotencyKey.trim()) {
      throw new DemoRepositoryError(
        "INVALID_SYNTHETIC_INPUT",
        "idempotencyキーが必要です。",
      );
    }
    const current = this.read(businessDate);
    const fingerprint = stableStringify({ operation, request });
    const replay = current.idempotency[idempotencyKey];
    if (replay) {
      if (replay.fingerprint !== fingerprint) {
        throw new DemoRepositoryError(
          "IDEMPOTENCY_MISMATCH",
          "同じidempotencyキーが別の操作で使用されています。",
          409,
        );
      }
      return { ...cloneValue(replay.result), reused: true };
    }

    const envelope = cloneValue(current);
    const at = new Date().toISOString();
    let outcome: MutationOutcome;
    try {
      outcome = apply(envelope, at);
    } catch (error) {
      if (error instanceof DemoValidationError) {
        throw new DemoRepositoryError("INVALID_SYNTHETIC_INPUT", error.message);
      }
      throw error;
    }
    this.normalize(envelope, at);
    envelope.boardRevision += 1;
    const action = outcome.action ?? operation;
    const auditLogId = `demo-audit-${envelope.boardRevision}-${envelope.auditHistory.length + 1}`;
    const audit: DemoAuditEvent = {
      id: auditLogId,
      operation: action,
      actorMode: "demo",
      at,
      businessDate,
      entityId: outcome.entityId,
      beforeVersion: Math.max(0, outcome.entityVersion - 1) || null,
      afterVersion: outcome.entityVersion,
      boardRevision: envelope.boardRevision,
      summary: outcome.summary,
    };
    envelope.auditHistory.push(audit);
    const result: DemoMutationResult = {
      ok: true,
      action,
      entityVersion: outcome.entityVersion,
      boardRevision: envelope.boardRevision,
      auditLogId,
      reused: false,
      ...(outcome.createdCount === undefined ? {} : { createdCount: outcome.createdCount }),
    };
    envelope.idempotency[idempotencyKey] = { fingerprint, result: cloneValue(result) };
    if (!envelopeMatches(envelope, this, businessDate)) {
      throw new DemoRepositoryError(
        "INVALID_SYNTHETIC_INPUT",
        "ローカル台帳の検証に失敗しました。",
      );
    }
    this.write(envelope);
    this.publish(businessDate, envelope.boardRevision);
    return result;
  }

  loadSnapshot(businessDate: string): DemoRepositorySnapshot {
    const envelope = this.read(businessDate);
    return { envelope, board: toBoard(envelope) };
  }

  loadBoard(businessDate: string) {
    return toBoard(this.read(businessDate));
  }

  loadOperationOptions(businessDate: string): OperationOptions {
    const envelope = this.read(businessDate);
    return {
      ok: true,
      businessDay: {
        id: envelope.businessDay.id,
        businessDate,
        operatingStartAt: envelope.businessDay.operatingStartAt,
        operatingEndAt: envelope.businessDay.operatingEndAt,
      },
      offerings: [{
        id: "demo-offering-vip",
        name: "GHOST OSAKA VIP デモ",
        minGuests: 1,
        maxGuests: 24,
        minSpendYen: 0,
      }],
    };
  }

  loadWaitlist(businessDate: string) {
    return { ok: true as const, entries: cloneValue(this.read(businessDate).waitlist) };
  }

  loadStaff(businessDate: string): StaffWorkspaceData {
    const envelope = this.read(businessDate);
    return {
      ok: true,
      eventDayId: envelope.businessDay.id,
      staffMembers: cloneValue(envelope.staff.staffMembers),
      tableAssignments: cloneValue(envelope.staff.tableAssignments),
    };
  }

  loadCustomer(businessDate: string, customerId: string) {
    const customer = this.read(businessDate).customers[customerId];
    if (!customer) throw new DemoRepositoryError("NOT_FOUND", "顧客が見つかりません。", 404);
    return { ok: true as const, customer: cloneValue(customer) as CustomerDetail };
  }

  runCommand(
    businessDate: string,
    draft: LiveCommandDraft,
    idempotencyKey: string,
  ) {
    return this.mutate(businessDate, draft.kind, idempotencyKey, draft, (envelope, at) => {
      const reservation = this.reservation(envelope, draft.reservationId, draft.expectedVersion);
      if (draft.kind === "check_in") {
        if (!transitionAllowed(reservation.serviceStatus, "arrived")) {
          throw new DemoRepositoryError(
            "INVALID_STATE_TRANSITION",
            "この予約はチェックインできません。",
            409,
          );
        }
        reservation.lifecycleStatus = "checked_in";
        reservation.serviceStatus = "arrived";
        reservation.actualSeatedAt = draft.payload.occurredAt ?? at;
      } else if (draft.kind === "arrival_time") {
        reservation.actualSeatedAt = draft.payload.occurredAt ?? at;
        if (reservation.serviceStatus === "expected" || reservation.serviceStatus === "late") {
          reservation.serviceStatus = "arrived";
        }
      } else if (draft.kind === "service_status") {
        const status = draft.payload.serviceStatus;
        if (!status || !transitionAllowed(reservation.serviceStatus, status)) {
          throw new DemoRepositoryError(
            "INVALID_STATE_TRANSITION",
            "このサービス状態への変更はできません。",
            409,
          );
        }
        reservation.serviceStatus = status;
        if (status === "seated") reservation.actualSeatedAt = draft.payload.occurredAt ?? at;
        if (status === "completed") reservation.completedAt = draft.payload.occurredAt ?? at;
      } else if (draft.kind === "assignment") {
        const tableIds = draft.payload.tableIds ?? [];
        this.tableVersions(envelope, tableIds);
        this.availability(
          envelope,
          tableIds,
          reservation.scheduledStartAt,
          reservation.scheduledEndAt,
          reservation.id,
        );
        const prior = [...reservation.tableIds];
        reservation.tableIds = [...tableIds];
        this.bumpTables(envelope, [...prior, ...tableIds]);
      } else if (draft.kind === "seat_extension") {
        const minutes = draft.payload.extendMinutes;
        if (!minutes || !Number.isInteger(minutes) || minutes < 5 || minutes > 180) {
          throw new DemoRepositoryError(
            "INVALID_SYNTHETIC_INPUT",
            "延長時間は5〜180分で指定してください。",
          );
        }
        const nextEnd = plusMinutes(reservation.scheduledEndAt, minutes);
        this.availability(
          envelope,
          reservation.tableIds,
          reservation.scheduledStartAt,
          nextEnd,
          reservation.id,
        );
        reservation.scheduledEndAt = nextEnd;
        reservation.expectedReleaseAt = nextEnd;
        this.bumpTables(envelope, reservation.tableIds);
      } else {
        const body = assertSyntheticNote(draft.payload.note, "note");
        if (!body) {
          throw new DemoRepositoryError(
            "INVALID_SYNTHETIC_INPUT",
            "デモ注記を入力してください。",
          );
        }
        const note = envelope.notes.find((item) => item.reservationId === reservation.id);
        if (note) {
          note.body = body;
          note.updatedAt = at;
          note.version += 1;
        } else {
          envelope.notes.push({
            id: `demo-note-local-${envelope.boardRevision + 1}-${envelope.notes.length + 1}`,
            reservationId: reservation.id,
            kind: "floor",
            body,
            pinned: false,
            version: 1,
            updatedAt: at,
          });
        }
        reservation.operatorNote = body;
      }
      reservation.updatedAt = at;
      reservation.version += 1;
      return {
        entityId: reservation.id,
        entityVersion: reservation.version,
        summary: `デモ：予約操作 ${draft.kind}`,
      };
    });
  }

  runOperation(
    businessDate: string,
    draft: OperationDraft,
    idempotencyKey: string,
  ) {
    try {
      validateOperationDraft(draft);
    } catch (error) {
      if (error instanceof DemoValidationError) {
        throw new DemoRepositoryError("INVALID_SYNTHETIC_INPUT", error.message);
      }
      throw error;
    }
    if (draft.kind === "block_create" && draft.payload.repeatDays > 1) {
      return this.runBlockRepeat(businessDate, draft, idempotencyKey);
    }
    const operation: DemoOperationKind =
      draft.kind === "walk_in" ? "walk_in"
        : draft.kind === "block_create" && draft.payload.repeatDays > 1 ? "block_repeat"
          : draft.kind;
    return this.mutate(businessDate, operation, idempotencyKey, draft, (envelope, at) => {
      if (draft.kind === "reservation_create" || draft.kind === "walk_in") {
        const payload = draft.payload;
        assertInterval(payload.scheduledStartAt, payload.scheduledEndAt);
        this.tableVersions(envelope, payload.tableIds, payload.expectedTableVersions);
        this.availability(
          envelope,
          payload.tableIds,
          payload.scheduledStartAt,
          payload.scheduledEndAt,
        );
        const id = `demo-reservation-local-${envelope.boardRevision + 1}-${envelope.reservations.length + 1}`;
        const guestLabel = payload.guestLabel ?? (
          draft.kind === "reservation_create" ? draft.payload.displayName : null
        ) ?? "デモゲスト";
        const reservation: VipFloorReservationV2 = {
          id,
          version: 1,
          publicCode: `DEMO-LOCAL-${envelope.boardRevision + 1}`,
          businessDate,
          lifecycleStatus: "confirmed",
          serviceStatus: draft.kind === "walk_in" ? "arrived" : draft.payload.serviceStatus,
          sourceChannel: draft.kind === "walk_in" ? "walk_in" : draft.payload.sourceChannel,
          scheduledStartAt: payload.scheduledStartAt,
          scheduledEndAt: payload.scheduledEndAt,
          expectedReleaseAt: payload.scheduledEndAt,
          actualSeatedAt: draft.kind === "walk_in" ? at : null,
          completedAt: null,
          guestCount: { total: payload.guestCount, adults: payload.guestCount, children: 0 },
          assignmentIds: [],
          tableIds: [...payload.tableIds],
          customer: {
            customerId: null,
            displayLabel: guestLabel,
            masked: false,
          },
          payment: null,
          notes: [],
          flags: draft.kind === "walk_in" ? ["walk_in"] : [],
          bookingOfferingId: payload.offeringId,
          bookingStaffMemberId:
            draft.kind === "reservation_create" ? draft.payload.bookingStaffMemberId : null,
          notificationPreference: "none",
          operatorNote: payload.operatorNote,
          updatedAt: at,
        };
        if (draft.kind === "reservation_create" && draft.payload.existingCustomerId) {
          const customer = envelope.customers[draft.payload.existingCustomerId];
          if (!customer) {
            throw new DemoRepositoryError("NOT_FOUND", "顧客が見つかりません。", 404);
          }
          reservation.customer = {
            customerId: customer.id,
            displayLabel: customer.displayName,
            masked: false,
          };
          customer.reservationHistory.push({
            reservationId: id,
            publicCode: reservation.publicCode,
            businessDate,
            scheduledStartAt: reservation.scheduledStartAt,
            guestCount: reservation.guestCount.total,
            lifecycleStatus: reservation.lifecycleStatus,
            serviceStatus: reservation.serviceStatus,
          });
          customer.linkHistory.push({
            eventId: `demo-link-${id}-${customer.linkHistory.length + 1}`,
            reservationId: id,
            linked: true,
            unlinked: false,
            resolutionMethod: "demo_local",
            createdAt: at,
          });
          customer.version += 1;
          customer.updatedAt = at;
        } else if (draft.kind === "reservation_create") {
          const customerId = `00000000-0000-4000-8000-${String(
            envelope.reservations.length + 100,
          ).padStart(12, "0")}`;
          const customer = {
            id: customerId,
            profilePresent: true,
            profileVersion: 1,
            languageCode: draft.payload.languageCode,
            displayName: draft.payload.displayName,
            nameKana: null,
            phone: null,
            email: draft.payload.email,
            allergies: null,
            preferences: null,
            attributes: {
              nationalityCode: null,
              birthDate: null,
              anniversaryDate: null,
              vipRank: null,
            },
            aggregates: { synthetic: true, visitCount: 0 },
            reservationHistory: [{
              reservationId: id,
              publicCode: reservation.publicCode,
              businessDate,
              scheduledStartAt: reservation.scheduledStartAt,
              guestCount: reservation.guestCount.total,
              lifecycleStatus: reservation.lifecycleStatus,
              serviceStatus: reservation.serviceStatus,
            }],
            linkHistory: [{
              eventId: `demo-link-${id}-1`,
              reservationId: id,
              linked: true,
              unlinked: false,
              resolutionMethod: "demo_local",
              createdAt: at,
            }],
            version: 1,
            updatedAt: at,
          };
          envelope.customers[customerId] = customer;
          reservation.customer = {
            customerId,
            displayLabel: customer.displayName,
            masked: false,
          };
        }
        envelope.reservations.push(reservation);
        this.bumpTables(envelope, reservation.tableIds);
        return {
          entityId: id,
          entityVersion: 1,
          summary: draft.kind === "walk_in"
            ? "デモ：ウォークイン予約を作成"
            : "デモ：予約を作成",
        };
      }

      if (draft.kind === "reservation_update") {
        const reservation = this.reservation(
          envelope,
          draft.payload.reservationId,
          draft.payload.expectedVersion,
        );
        assertInterval(draft.payload.scheduledStartAt, draft.payload.scheduledEndAt);
        this.tableVersions(
          envelope,
          draft.payload.tableIds,
          draft.payload.expectedTableVersions,
        );
        this.availability(
          envelope,
          draft.payload.tableIds,
          draft.payload.scheduledStartAt,
          draft.payload.scheduledEndAt,
          reservation.id,
        );
        if (!transitionAllowed(reservation.serviceStatus, draft.payload.serviceStatus)) {
          throw new DemoRepositoryError(
            "INVALID_STATE_TRANSITION",
            "このサービス状態への変更はできません。",
            409,
          );
        }
        const priorTables = [...reservation.tableIds];
        reservation.bookingOfferingId = draft.payload.offeringId;
        reservation.scheduledStartAt = draft.payload.scheduledStartAt;
        reservation.scheduledEndAt = draft.payload.scheduledEndAt;
        reservation.expectedReleaseAt = draft.payload.scheduledEndAt;
        reservation.guestCount = {
          total: draft.payload.guestCount,
          adults: draft.payload.guestCount,
          children: 0,
        };
        reservation.tableIds = [...draft.payload.tableIds];
        reservation.sourceChannel = draft.payload.sourceChannel;
        reservation.serviceStatus = draft.payload.serviceStatus;
        reservation.bookingStaffMemberId = draft.payload.bookingStaffMemberId;
        reservation.notificationPreference = "none";
        reservation.operatorNote = draft.payload.operatorNote;
        if (reservation.customer) {
          reservation.customer.displayLabel = draft.payload.guestLabel;
        }
        reservation.updatedAt = at;
        reservation.version += 1;
        this.bumpTables(envelope, [...priorTables, ...reservation.tableIds]);
        return {
          entityId: reservation.id,
          entityVersion: reservation.version,
          summary: "デモ：予約を更新",
        };
      }

      if (draft.kind === "block_create") {
        assertInterval(draft.payload.startAt, draft.payload.endAt);
        if (!BLOCK_REPEAT_DAYS.has(draft.payload.repeatDays)) {
          throw new DemoRepositoryError(
            "INVALID_SYNTHETIC_INPUT",
            "繰り返し日は1、7、14のいずれかです。",
          );
        }
        this.tableVersions(envelope, draft.payload.seatResourceIds);
        const count = draft.payload.repeatDays;
        let firstId = "";
        let createdCount = 0;
        for (let index = 0; index < count; index += 1) {
          if (plusBusinessDays(businessDate, index) > DEMO_LAST_BUSINESS_DATE) break;
          const startAt = plusDays(draft.payload.startAt, index);
          const endAt = plusDays(draft.payload.endAt, index);
          this.blockAvailability(
            envelope,
            draft.payload.seatResourceIds,
            draft.payload.venueWide,
            draft.payload.scope,
            startAt,
            endAt,
          );
          const id = `demo-block-local-${envelope.boardRevision + 1}-${envelope.blocks.length + 1}`;
          if (!firstId) firstId = id;
          const block: ReservationBlockV2 = {
            id,
            version: 1,
            scope: draft.payload.scope,
            kind: draft.payload.blockKind,
            startAt,
            endAt,
            memo: draft.payload.memo,
            targets: {
              venueWide: draft.payload.venueWide,
              sectionIds: [],
              tableIds: [...draft.payload.seatResourceIds],
            },
            updatedAt: at,
          };
          envelope.blocks.push(block);
          createdCount += 1;
        }
        this.bumpTables(envelope, draft.payload.seatResourceIds);
        return {
          action: count > 1 ? "block_repeat" : "block_create",
          entityId: firstId,
          entityVersion: 1,
          createdCount,
          summary: count > 1 ? "デモ：繰り返しブロックを作成" : "デモ：ブロックを作成",
        };
      }

      const block = envelope.blocks.find((item) => item.id === draft.payload.blockId);
      if (!block) throw new DemoRepositoryError("NOT_FOUND", "ブロックが見つかりません。", 404);
      if (block.version !== draft.payload.expectedVersion) {
        throw new DemoRepositoryError(
          "VERSION_CONFLICT",
          "ブロックが別タブで更新されています。",
          409,
          {
            expectedVersion: draft.payload.expectedVersion,
            currentVersion: block.version,
          },
        );
      }
      if (draft.kind === "block_cancel") {
        const nextVersion = block.version + 1;
        envelope.blocks = envelope.blocks.filter((item) => item.id !== block.id);
        this.bumpTables(envelope, block.targets.tableIds);
        return {
          entityId: block.id,
          entityVersion: nextVersion,
          summary: "デモ：ブロックを取消",
        };
      }
      assertInterval(draft.payload.startAt, draft.payload.endAt);
      this.tableVersions(envelope, draft.payload.seatResourceIds);
      this.blockAvailability(
        envelope,
        draft.payload.seatResourceIds,
        draft.payload.venueWide,
        draft.payload.scope,
        draft.payload.startAt,
        draft.payload.endAt,
        block.id,
      );
      const priorTables = [...block.targets.tableIds];
      block.scope = draft.payload.scope;
      block.kind = draft.payload.blockKind;
      block.startAt = draft.payload.startAt;
      block.endAt = draft.payload.endAt;
      block.memo = draft.payload.memo;
      block.targets = {
        venueWide: draft.payload.venueWide,
        sectionIds: [],
        tableIds: [...draft.payload.seatResourceIds],
      };
      block.updatedAt = at;
      block.version += 1;
      this.bumpTables(envelope, [...priorTables, ...block.targets.tableIds]);
      return {
        entityId: block.id,
        entityVersion: block.version,
        summary: "デモ：ブロックを更新",
      };
    });
  }

  private runBlockRepeat(
    businessDate: string,
    draft: Extract<OperationDraft, { kind: "block_create" }>,
    idempotencyKey: string,
  ): DemoMutationResult {
    this.assertWritable();
    if (!idempotencyKey.trim()) {
      throw new DemoRepositoryError("INVALID_SYNTHETIC_INPUT", "idempotencyキーが必要です。");
    }
    if (!BLOCK_REPEAT_DAYS.has(draft.payload.repeatDays) || draft.payload.repeatDays <= 1) {
      throw new DemoRepositoryError("INVALID_SYNTHETIC_INPUT", "繰り返し日は7または14です。");
    }
    const lastDate = plusBusinessDays(businessDate, draft.payload.repeatDays - 1);
    if (businessDate < DEMO_FIRST_BUSINESS_DATE || lastDate > DEMO_LAST_BUSINESS_DATE) {
      throw new DemoRepositoryError(
        "DATE_OUTSIDE_DEMO_WINDOW",
        "繰り返し結果がデモ期間を越えます。",
      );
    }

    const fingerprint = stableStringify({ operation: "block_repeat", request: draft });
    const origin = this.read(businessDate);
    const replay = origin.idempotency[idempotencyKey];
    if (replay) {
      if (replay.fingerprint !== fingerprint) {
        throw new DemoRepositoryError(
          "IDEMPOTENCY_MISMATCH",
          "同じidempotencyキーが別の操作で使用されています。",
          409,
        );
      }
      return { ...cloneValue(replay.result), reused: true };
    }

    const at = new Date().toISOString();
    const envelopes: DemoEnvelope[] = [];
    let firstId = "";
    let firstAuditId = "";
    let originRevision = 0;
    for (let index = 0; index < draft.payload.repeatDays; index += 1) {
      const occurrenceDate = plusBusinessDays(businessDate, index);
      const envelope = cloneValue(index === 0 ? origin : this.read(occurrenceDate));
      const startAt = plusDays(draft.payload.startAt, index);
      const endAt = plusDays(draft.payload.endAt, index);
      this.tableVersions(envelope, draft.payload.seatResourceIds);
      this.availability(envelope, draft.payload.seatResourceIds, startAt, endAt);
      const id = `demo-block-repeat-${businessDate}-${index + 1}-${envelope.boardRevision + 1}`;
      if (!firstId) firstId = id;
      envelope.blocks.push({
        id,
        version: 1,
        scope: draft.payload.scope,
        kind: draft.payload.blockKind,
        startAt,
        endAt,
        memo: draft.payload.memo,
        targets: {
          venueWide: draft.payload.venueWide,
          sectionIds: [],
          tableIds: [...draft.payload.seatResourceIds],
        },
        updatedAt: at,
      });
      this.bumpTables(envelope, draft.payload.seatResourceIds);
      this.normalize(envelope, at);
      envelope.boardRevision += 1;
      const auditLogId = `demo-audit-repeat-${businessDate}-${index + 1}-${envelope.boardRevision}`;
      if (!firstAuditId) firstAuditId = auditLogId;
      envelope.auditHistory.push({
        id: auditLogId,
        operation: "block_repeat",
        actorMode: "demo",
        at,
        businessDate: occurrenceDate,
        entityId: id,
        beforeVersion: null,
        afterVersion: 1,
        boardRevision: envelope.boardRevision,
        summary: `デモ：繰り返しブロック ${index + 1}/${draft.payload.repeatDays}`,
      });
      if (index === 0) originRevision = envelope.boardRevision;
      envelopes.push(envelope);
    }
    const result: DemoMutationResult = {
      ok: true,
      action: "block_repeat",
      entityVersion: 1,
      boardRevision: originRevision,
      auditLogId: firstAuditId,
      reused: false,
      createdCount: envelopes.length,
    };
    envelopes[0].idempotency[idempotencyKey] = { fingerprint, result: cloneValue(result) };
    for (const envelope of envelopes) {
      if (!envelopeMatches(envelope, this, envelope.businessDate)) {
        throw new DemoRepositoryError(
          "INVALID_SYNTHETIC_INPUT",
          "繰り返しローカル台帳の検証に失敗しました。",
        );
      }
    }
    this.writeMany(envelopes);
    return result;
  }

  runWaitlist(
    businessDate: string,
    action: WaitlistAction,
    idempotencyKey: string,
  ) {
    try {
      validateWaitlistAction(action);
    } catch (error) {
      if (error instanceof DemoValidationError) {
        throw new DemoRepositoryError("INVALID_SYNTHETIC_INPUT", error.message);
      }
      throw error;
    }
    const operation = `waitlist_${action.action}` as DemoOperationKind;
    return this.mutate(businessDate, operation, idempotencyKey, action, (envelope, at) => {
      if (action.action === "create") {
        const id = `demo-waitlist-local-${envelope.boardRevision + 1}-${envelope.waitlist.length + 1}`;
        envelope.waitlist.push({
          id,
          eventDayId: action.payload.eventDayId,
          guestCount: action.payload.guestCount,
          guestLabel: action.payload.guestLabel,
          email: action.payload.email,
          status: "waiting",
          storedStatus: "waiting",
          calledAt: null,
          callExpiresAt: null,
          seatedReservationId: null,
          version: 1,
          createdAt: at,
          updatedAt: at,
        });
        return { entityId: id, entityVersion: 1, summary: "デモ：待機列へ追加" };
      }
      const entry = envelope.waitlist.find(
        (item) => item.id === action.payload.waitlistEntryId,
      );
      if (!entry) throw new DemoRepositoryError("NOT_FOUND", "待機客が見つかりません。", 404);
      if (entry.version !== action.payload.expectedVersion) {
        throw new DemoRepositoryError(
          "VERSION_CONFLICT",
          "待機列が別タブで更新されています。",
          409,
        );
      }
      if (action.action === "call") {
        if (entry.status !== "waiting") {
          throw new DemoRepositoryError(
            "INVALID_STATE_TRANSITION",
            "待機中のゲストのみ呼出できます。",
            409,
          );
        }
        entry.status = "called";
        entry.storedStatus = "called";
        entry.calledAt = at;
        entry.callExpiresAt = plusMinutes(at, 30);
      } else if (action.action === "expire") {
        if (entry.status !== "waiting" && entry.status !== "called") {
          throw new DemoRepositoryError(
            "INVALID_STATE_TRANSITION",
            "この待機客は期限切れにできません。",
            409,
          );
        }
        entry.status = "expired";
        entry.storedStatus = "expired";
      } else if (action.action === "cancel") {
        if (entry.status === "seated" || entry.status === "expired") {
          throw new DemoRepositoryError(
            "INVALID_STATE_TRANSITION",
            "この待機客は取消できません。",
            409,
          );
        }
        entry.status = "cancelled";
        entry.storedStatus = "cancelled";
      } else {
        if (entry.status !== "waiting" && entry.status !== "called") {
          throw new DemoRepositoryError(
            "INVALID_STATE_TRANSITION",
            "この待機客は着席できません。",
            409,
          );
        }
        if (!action.payload.reservationId) {
          throw new DemoRepositoryError(
            "INVALID_SYNTHETIC_INPUT",
            "着席には予約が必要です。",
          );
        }
        const reservation = this.reservation(envelope, action.payload.reservationId);
        if (!transitionAllowed(reservation.serviceStatus, "seated")) {
          throw new DemoRepositoryError(
            "INVALID_STATE_TRANSITION",
            "予約を着席状態にできません。",
            409,
          );
        }
        reservation.serviceStatus = "seated";
        reservation.actualSeatedAt = at;
        reservation.updatedAt = at;
        reservation.version += 1;
        entry.status = "seated";
        entry.storedStatus = "seated";
        entry.seatedReservationId = reservation.id;
      }
      entry.updatedAt = at;
      entry.version += 1;
      return {
        entityId: entry.id,
        entityVersion: entry.version,
        summary: `デモ：待機列 ${action.action}`,
      };
    });
  }

  runStaff(businessDate: string, action: StaffAction, idempotencyKey: string) {
    try {
      validateStaffAction(action);
    } catch (error) {
      if (error instanceof DemoValidationError) {
        throw new DemoRepositoryError("INVALID_SYNTHETIC_INPUT", error.message);
      }
      throw error;
    }
    const operation = action.action === "assign" ? "staff_assignment" : `staff_${action.action}`;
    return this.mutate(
      businessDate,
      operation as DemoOperationKind,
      idempotencyKey,
      action,
      (envelope, at) => {
        if (action.action === "create") {
          const id = `demo-staff-local-${envelope.boardRevision + 1}-${envelope.staff.staffMembers.length + 1}`;
          envelope.staff.staffMembers.push({
            id,
            displayName: action.payload.displayName,
            active: true,
            version: 1,
            createdAt: at,
            updatedAt: at,
          });
          return { entityId: id, entityVersion: 1, summary: "デモ：スタッフを作成" };
        }
        if (action.action === "update") {
          const staff = envelope.staff.staffMembers.find(
            (item) => item.id === action.payload.staffMemberId,
          );
          if (!staff) {
            throw new DemoRepositoryError("NOT_FOUND", "スタッフが見つかりません。", 404);
          }
          if (staff.version !== action.payload.expectedVersion) {
            throw new DemoRepositoryError(
              "VERSION_CONFLICT",
              "スタッフが別タブで更新されています。",
              409,
            );
          }
          staff.displayName = action.payload.displayName;
          staff.active = action.payload.active;
          staff.updatedAt = at;
          staff.version += 1;
          return {
            entityId: staff.id,
            entityVersion: staff.version,
            summary: "デモ：スタッフを更新",
          };
        }
        this.tableVersions(envelope, [action.payload.tableId]);
        const existing = envelope.staff.tableAssignments.find(
          (item) => item.tableId === action.payload.tableId,
        );
        if (
          existing
          && action.payload.expectedAssignmentVersion !== null
          && existing.version !== action.payload.expectedAssignmentVersion
        ) {
          throw new DemoRepositoryError(
            "VERSION_CONFLICT",
            "卓担当が別タブで更新されています。",
            409,
          );
        }
        if (!action.payload.staffMemberId) {
          if (!existing) {
            throw new DemoRepositoryError("NOT_FOUND", "卓担当が見つかりません。", 404);
          }
          const nextVersion = existing.version + 1;
          envelope.staff.tableAssignments = envelope.staff.tableAssignments.filter(
            (item) => item.id !== existing.id,
          );
          return {
            entityId: existing.id,
            entityVersion: nextVersion,
            summary: "デモ：卓担当を解除",
          };
        }
        const staff = envelope.staff.staffMembers.find(
          (item) => item.id === action.payload.staffMemberId,
        );
        if (!staff) {
          throw new DemoRepositoryError("NOT_FOUND", "スタッフが見つかりません。", 404);
        }
        if (!staff.active) {
          throw new DemoRepositoryError(
            "INVALID_STATE_TRANSITION",
            "無効なスタッフは担当に設定できません。",
            409,
          );
        }
        if (existing) {
          existing.staffMemberId = staff.id;
          existing.updatedAt = at;
          existing.version += 1;
          return {
            entityId: existing.id,
            entityVersion: existing.version,
            summary: "デモ：卓担当を更新",
          };
        }
        const id = `demo-staff-assignment-${envelope.boardRevision + 1}-${envelope.staff.tableAssignments.length + 1}`;
        envelope.staff.tableAssignments.push({
          id,
          tableId: action.payload.tableId,
          staffMemberId: staff.id,
          version: 1,
          createdAt: at,
          updatedAt: at,
        });
        return { entityId: id, entityVersion: 1, summary: "デモ：卓担当を設定" };
      },
    );
  }

  updateCustomer(
    businessDate: string,
    customerId: string,
    patch: DemoCustomerPatch,
    idempotencyKey: string,
  ) {
    try {
      validateCustomerPatch(patch);
    } catch (error) {
      if (error instanceof DemoValidationError) {
        throw new DemoRepositoryError("INVALID_SYNTHETIC_INPUT", error.message);
      }
      throw error;
    }
    const operation: DemoOperationKind = "customer_attributes";
    return this.mutate(
      businessDate,
      operation,
      idempotencyKey,
      { customerId, patch },
      (envelope, at) => {
        const customer = envelope.customers[customerId];
        if (!customer) {
          throw new DemoRepositoryError("NOT_FOUND", "顧客が見つかりません。", 404);
        }
        if (customer.version !== patch.expectedVersion) {
          throw new DemoRepositoryError(
            "VERSION_CONFLICT",
            "顧客属性が別タブで更新されています。",
            409,
          );
        }
        customer.attributes = {
          nationalityCode: patch.nationalityCode,
          birthDate: patch.birthDate,
          anniversaryDate: patch.anniversaryDate,
          vipRank: patch.vipRank,
        };
        customer.profileVersion = (customer.profileVersion ?? 0) + 1;
        customer.updatedAt = at;
        customer.version += 1;
        return {
          entityId: customer.id,
          entityVersion: customer.version,
          summary: "デモ：顧客属性を更新",
        };
      },
    );
  }

  relinkCustomer(
    businessDate: string,
    draft: DemoCustomerLinkDraft,
    idempotencyKey: string,
  ) {
    const operation: DemoOperationKind = draft.customerId
      ? "customer_relink"
      : "customer_unlink";
    return this.mutate(businessDate, operation, idempotencyKey, draft, (envelope, at) => {
      const reservation = this.reservation(
        envelope,
        draft.reservationId,
        draft.expectedVersion,
      );
      const priorId = typeof reservation.customer?.customerId === "string"
        ? reservation.customer.customerId
        : null;
      if (priorId === draft.customerId) {
        throw new DemoRepositoryError(
          "INVALID_STATE_TRANSITION",
          "顧客リンクは既に同じ状態です。",
          409,
        );
      }
      if (priorId) {
        const prior = envelope.customers[priorId];
        if (prior) {
          prior.linkHistory.push({
            eventId: `demo-unlink-${reservation.id}-${prior.linkHistory.length + 1}`,
            reservationId: reservation.id,
            linked: false,
            unlinked: true,
            resolutionMethod: "demo_local",
            createdAt: at,
          });
          prior.version += 1;
          prior.updatedAt = at;
        }
      }
      if (draft.customerId) {
        const customer = envelope.customers[draft.customerId];
        if (!customer) {
          throw new DemoRepositoryError("NOT_FOUND", "顧客が見つかりません。", 404);
        }
        reservation.customer = {
          customerId: customer.id,
          displayLabel: customer.displayName,
          masked: false,
        };
        customer.linkHistory.push({
          eventId: `demo-link-${reservation.id}-${customer.linkHistory.length + 1}`,
          reservationId: reservation.id,
          linked: true,
          unlinked: false,
          resolutionMethod: "demo_local",
          createdAt: at,
        });
        customer.version += 1;
        customer.updatedAt = at;
      } else {
        reservation.customer = null;
      }
      reservation.updatedAt = at;
      reservation.version += 1;
      return {
        entityId: reservation.id,
        entityVersion: reservation.version,
        summary: draft.customerId ? "デモ：顧客を再リンク" : "デモ：顧客リンクを解除",
      };
    });
  }

  loadObservability(businessDate: string): Record<string, unknown> {
    const envelope = this.read(businessDate);
    return {
      ok: true,
      mode: "demo",
      workspaceId: this.workspaceId,
      businessDate,
      boardRevision: envelope.boardRevision,
      auditEventCount: envelope.auditHistory.length,
      idempotencyCount: Object.keys(envelope.idempotency).length,
      read_only: this.readOnly,
      notification: { enabled: false, channel: "none", local: true },
    };
  }

  reset(businessDate: string): DemoMutationResult {
    this.assertWritable();
    const current = this.read(businessDate);
    const envelope = createDeterministicDemoEnvelope({
      businessDate,
      workspaceId: this.workspaceId,
      dataVersion: this.dataVersion,
    });
    const at = new Date().toISOString();
    envelope.boardRevision = current.boardRevision + 1;
    envelope.generatedAt = at;
    const auditLogId = `demo-audit-reset-${envelope.boardRevision}`;
    envelope.auditHistory.push({
      id: auditLogId,
      operation: "reset",
      actorMode: "demo",
      at,
      businessDate,
      entityId: null,
      beforeVersion: current.boardRevision,
      afterVersion: 1,
      boardRevision: envelope.boardRevision,
      summary: "デモ：確認済みのローカルリセット",
    });
    this.write(envelope);
    this.publish(businessDate, envelope.boardRevision);
    return {
      ok: true,
      action: "reset",
      entityVersion: 1,
      boardRevision: envelope.boardRevision,
      auditLogId,
      reused: false,
    };
  }

  purgeExpired() {
    this.assertWritable();
    const storage = this.storage();
    const prefix = `${DEMO_STORAGE_PREFIX}${this.workspaceId}:`;
    const keys: string[] = [];
    try {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (!key || !key.startsWith(prefix)) continue;
        const raw = storage.getItem(key);
        try {
          const parsed = raw ? JSON.parse(raw) as Partial<DemoEnvelope> : null;
          if (
            !parsed
            || parsed.schemaVersion !== DEMO_SCHEMA_VERSION
            || parsed.dataVersion !== this.dataVersion
            || parsed.workspaceId !== this.workspaceId
            || !parsed.expiresAt
            || Date.now() >= Date.parse(parsed.expiresAt)
          ) {
            keys.push(key);
          }
        } catch {
          keys.push(key);
        }
      }
      for (const key of keys) storage.removeItem(key);
    } catch {
      this.readOnly = true;
      throw new DemoRepositoryError(
        "STORAGE_UNAVAILABLE",
        "期限切れデータを削除できません。",
        503,
      );
    }
  }

  subscribe(businessDate: string, onRevisionGap: () => void) {
    if (!this.channel) return () => undefined;
    const listener = (event: MessageEvent<RevisionMessage>) => {
      const message = event.data;
      if (
        !message
        || message.workspaceId !== this.workspaceId
        || message.dataVersion !== this.dataVersion
        || message.businessDate !== businessDate
        || !Number.isInteger(message.revision)
      ) {
        return;
      }
      const previous = this.revisions.get(businessDate) ?? 0;
      this.revisions.set(businessDate, Math.max(previous, message.revision));
      if (message.revision > previous) {
        // Any unseen revision triggers a reload; a gap is necessarily covered as well.
        onRevisionGap();
      }
    };
    this.channel.addEventListener("message", listener);
    return () => this.channel?.removeEventListener("message", listener);
  }
}

export function createDemoRepository(config: RepositoryConfig) {
  return new BrowserDemoRepository(config);
}
