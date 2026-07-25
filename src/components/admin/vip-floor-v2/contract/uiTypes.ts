import type {
  AssignmentCommand,
  CancellationCommand,
  CustomerProfileCommand,
  ReservationNoteCommand,
  ScheduleCommand,
  SeatExtensionCommand,
  ServiceStatusCommand,
  VipBlockCreateCommand,
  VipFloorBoardV2,
  VipFloorErrorCode,
  WalkInCommand,
} from "@/lib/vipFloorV2Contract";

export const WORKSPACE_VIEWS = ["floor", "timeline", "list"] as const;
export type WorkspaceView = (typeof WORKSPACE_VIEWS)[number];

export const SCENARIO_KEYS = [
  "healthy",
  "opening_empty",
  "loading",
  "stale",
  "reconnecting",
  "read_error",
  "read_only",
  "masked_customer",
  "late_no_contact",
  "partial_arrival",
  "service_progression",
  "unassigned",
  "connected_tables",
  "table_locked",
  "reservation_block",
  "capacity_warning",
  "version_conflict",
  "table_time_conflict",
  "refund_review",
  "long_labels",
  "dense_stress",
] as const;
export type ScenarioKey = (typeof SCENARIO_KEYS)[number];

export type GlobalUiState =
  | "healthy"
  | "empty"
  | "loading"
  | "stale"
  | "reconnecting"
  | "error"
  | "read_only";

export const COMMAND_KINDS = [
  "service_status",
  "check_in",
  "assignment",
  "schedule",
  "seat_extension",
  "block",
  "note",
  "walk_in",
  "cancel_refund",
  "customer",
] as const;
export type CommandKind = (typeof COMMAND_KINDS)[number];

export type FixtureResultMode =
  | "success"
  | "validation"
  | "permission"
  | "version_conflict"
  | "time_conflict"
  | "block_conflict"
  | "capacity_override";

export type FixtureCommandDraft =
  | { kind: "service_status"; reservationId: string; payload: ServiceStatusCommand }
  | { kind: "check_in"; reservationId: string; payload: ServiceStatusCommand }
  | { kind: "assignment"; reservationId: string; payload: AssignmentCommand }
  | { kind: "schedule"; reservationId: string; payload: ScheduleCommand }
  | { kind: "seat_extension"; reservationId: string; payload: SeatExtensionCommand }
  | { kind: "block"; operation: "create" | "edit" | "remove"; reservationId: string | null; blockId: string | null; payload: VipBlockCreateCommand }
  | { kind: "note"; operation: "create" | "edit" | "pin"; reservationId: string; payload: ReservationNoteCommand }
  | { kind: "walk_in"; reservationId: null; payload: WalkInCommand }
  | { kind: "cancel_refund"; reservationId: string; payload: CancellationCommand }
  | { kind: "customer"; reservationId: string; payload: CustomerProfileCommand };

export type FixtureCommandOutcome =
  | {
      ok: true;
      board: VipFloorBoardV2;
      message: string;
      auditLabel: string;
    }
  | {
      ok: false;
      code: VipFloorErrorCode;
      message: string;
      recovery: string;
    };

export type ScenarioDefinition = {
  key: ScenarioKey;
  label: string;
  state: GlobalUiState;
  description: string;
  defaultView?: WorkspaceView;
  defaultSelection?: string | null;
  readOnly?: boolean;
  board: VipFloorBoardV2;
};

export type QueueGroup = {
  key: string;
  label: string;
  severity: "critical" | "warning" | "routine";
  reservationIds: string[];
};

export type UiReservation = {
  id: string;
  publicCode: string;
  guestLabel: string;
  serviceStatus: string;
  serviceLabel: string;
  lifecycleStatus: string;
  startAt: string;
  endAt: string;
  startLabel: string;
  endLabel: string;
  guestCount: number;
  tableIds: string[];
  tableCodes: string[];
  sourceLabel: string;
  exceptionLabel: string | null;
  flags: string[];
  version: number;
  customerMasked: boolean;
};

export type HistoryEntry = {
  id: string;
  at: string;
  actor: string;
  label: string;
  detail: string;
};
