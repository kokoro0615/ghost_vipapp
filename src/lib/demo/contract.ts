import type {
  ReservationBlockV2,
  ReservationNoteSummaryV2,
  VipFloorAssignmentV2,
  VipFloorBoardV2,
  VipFloorReservationV2,
  VipFloorTotalsV2,
  VipTableV2,
} from "@/lib/vipFloorV2Contract";
import type {
  CustomerDetail,
  OperationDraft,
  OperationOptions,
  StaffAction,
  StaffMember,
  TableStaffAssignment,
  WaitlistAction,
  WaitlistEntry,
} from "@/components/admin/vip-floor-v2/contract/uiTypes";

export const DEMO_SCHEMA_VERSION = "ghost-vip-demo.v1" as const;
export const DEMO_STORAGE_PREFIX = "ghost-vip-demo:" as const;
export const DEMO_TIME_ZONE = "Asia/Tokyo" as const;
export const DEMO_FIRST_BUSINESS_DATE = "2026-07-27" as const;
export const DEMO_LAST_BUSINESS_DATE = "2026-08-27" as const;
export const DEMO_STARTS_AT = "2026-07-27T00:00:00+09:00" as const;
export const DEMO_EXPIRES_AT = "2026-08-27T23:59:59+09:00" as const;
export const DEMO_LEASE_MAX_MS = 60_000 as const;

export const DEMO_OPERATION_KINDS = [
  "reservation_create",
  "reservation_update",
  "check_in",
  "arrival_time",
  "service_status",
  "assignment",
  "seat_extension",
  "note",
  "walk_in_cancel",
  "walk_in",
  "waitlist_create",
  "waitlist_call",
  "waitlist_expire",
  "waitlist_cancel",
  "waitlist_seat",
  "block_create",
  "block_update",
  "block_cancel",
  "block_repeat",
  "staff_create",
  "staff_update",
  "staff_assignment",
  "customer_update",
  "customer_attributes",
  "customer_unlink",
  "customer_relink",
  "reset",
] as const;

export type DemoOperationKind = (typeof DEMO_OPERATION_KINDS)[number];

export type DemoPublicConfig = {
  mode: "demo";
  workspaceId: string;
  dataVersion: string;
  startsAt: typeof DEMO_STARTS_AT;
  expiresAt: typeof DEMO_EXPIRES_AT;
  leaseIntervalMs: typeof DEMO_LEASE_MAX_MS;
};

export type DemoLease = DemoPublicConfig & {
  ok: true;
  serverNow: string;
  leaseExpiresAt: string;
};

export type DemoAuditEvent = {
  id: string;
  operation: DemoOperationKind | "seed" | "data_version_reset";
  actorMode: "demo";
  at: string;
  businessDate: string;
  entityId: string | null;
  beforeVersion: number | null;
  afterVersion: number | null;
  boardRevision: number;
  summary: string;
};

export type DemoCustomer = CustomerDetail & {
  version: number;
  updatedAt: string;
};

export type DemoStaffState = {
  staffMembers: StaffMember[];
  tableAssignments: TableStaffAssignment[];
};

export type DemoIdempotencyRecord = {
  fingerprint: string;
  result: DemoMutationResult;
};

export type DemoEnvelope = {
  schemaVersion: typeof DEMO_SCHEMA_VERSION;
  dataVersion: string;
  workspaceId: string;
  businessDate: string;
  seededAt: string;
  generatedAt: string;
  expiresAt: typeof DEMO_EXPIRES_AT;
  boardRevision: number;
  businessDay: VipFloorBoardV2["businessDay"];
  capabilities: VipFloorBoardV2["capabilities"];
  sections: VipFloorBoardV2["sections"];
  tables: VipTableV2[];
  reservations: VipFloorReservationV2[];
  assignments: VipFloorAssignmentV2[];
  unassignedReservationIds: string[];
  blocks: ReservationBlockV2[];
  notes: ReservationNoteSummaryV2[];
  totals: VipFloorTotalsV2;
  operations: VipFloorBoardV2["operations"];
  waitlist: WaitlistEntry[];
  staff: DemoStaffState;
  customers: Record<string, DemoCustomer>;
  auditHistory: DemoAuditEvent[];
  idempotency: Record<string, DemoIdempotencyRecord>;
};

export type DemoMutationResult = {
  ok: true;
  action: DemoOperationKind;
  entityVersion: number;
  boardRevision: number;
  auditLogId: string;
  reused?: boolean;
  createdCount?: number;
};

export type DemoRepositoryErrorCode =
  | "DEMO_EXPIRED"
  | "DATE_OUTSIDE_DEMO_WINDOW"
  | "STORAGE_UNAVAILABLE"
  | "INVALID_SYNTHETIC_INPUT"
  | "VERSION_CONFLICT"
  | "TABLE_CONFLICT"
  | "BLOCK_CONFLICT"
  | "INVALID_STATE_TRANSITION"
  | "IDEMPOTENCY_MISMATCH"
  | "NOT_FOUND"
  | "READ_ONLY";

export type DemoRepositorySnapshot = {
  envelope: DemoEnvelope;
  board: VipFloorBoardV2;
};

export type DemoCustomerPatch = {
  expectedVersion: number;
  nationalityCode: string | null;
  birthDate: string | null;
  anniversaryDate: string | null;
  vipRank: string | null;
};

export type DemoCustomerLinkDraft = {
  reservationId: string;
  expectedVersion: number;
  customerId: string | null;
};

export type DemoTransportResult<T> = {
  ok: boolean;
  status: number;
  payload: T;
};

export interface DemoTransport {
  readonly mode: "demo";
  renewLease(): Promise<DemoTransportResult<DemoLease>>;
  loadBoard(businessDate: string): Promise<DemoTransportResult<VipFloorBoardV2>>;
  loadOperationOptions(businessDate: string): Promise<DemoTransportResult<OperationOptions>>;
  runCommand(
    draft: import("@/components/admin/vip-floor-v2/contract/uiTypes").LiveCommandDraft,
    idempotencyKey: string,
  ): Promise<DemoTransportResult<DemoMutationResult>>;
  runOperation(
    draft: OperationDraft,
    idempotencyKey: string,
  ): Promise<DemoTransportResult<DemoMutationResult>>;
  loadWaitlist(businessDate: string): Promise<DemoTransportResult<{ ok: true; entries: WaitlistEntry[] }>>;
  runWaitlist(
    businessDate: string,
    action: WaitlistAction,
    idempotencyKey: string,
  ): Promise<DemoTransportResult<DemoMutationResult>>;
  loadStaff(businessDate: string): Promise<DemoTransportResult<import("@/components/admin/vip-floor-v2/contract/uiTypes").StaffWorkspaceData>>;
  runStaff(
    businessDate: string,
    action: StaffAction,
    idempotencyKey: string,
  ): Promise<DemoTransportResult<DemoMutationResult>>;
  loadCustomer(
    businessDate: string,
    customerId: string,
  ): Promise<DemoTransportResult<{ ok: true; customer: CustomerDetail }>>;
  updateCustomer(
    businessDate: string,
    customerId: string,
    patch: DemoCustomerPatch,
    idempotencyKey: string,
  ): Promise<DemoTransportResult<DemoMutationResult>>;
  relinkCustomer(
    businessDate: string,
    draft: DemoCustomerLinkDraft,
    idempotencyKey: string,
  ): Promise<DemoTransportResult<DemoMutationResult>>;
  loadObservability(businessDate: string): Promise<DemoTransportResult<Record<string, unknown>>>;
  reset(businessDate: string): Promise<DemoTransportResult<DemoMutationResult>>;
  purgeExpired(): void;
  subscribe(businessDate: string, onRevisionGap: () => void): () => void;
}
