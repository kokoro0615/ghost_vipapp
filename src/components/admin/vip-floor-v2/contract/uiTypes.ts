import type { VipFloorBoardV2, VipServiceStatus } from "@/lib/vipFloorV2Contract";

export const WORKSPACE_VIEWS = ["floor", "timeline", "list"] as const;
export type WorkspaceView = (typeof WORKSPACE_VIEWS)[number];

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
  "arrival_time",
  "assignment",
  "seat_extension",
  "note",
] as const;
export type CommandKind = (typeof COMMAND_KINDS)[number];

export type LiveCommandDraft = {
  kind: CommandKind;
  reservationId: string;
  expectedUpdatedAt: string;
  payload: {
    reason: string;
    occurredAt?: string;
    serviceStatus?: VipServiceStatus;
    tableIds?: string[];
    extendMinutes?: number;
    note?: string;
  };
};

export type CommandOutcome =
  | { ok: true; message: string }
  | { ok: false; code: string; message: string; recovery: string };

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

export type WorkspaceState = {
  board: VipFloorBoardV2;
  globalState: GlobalUiState;
  stateDescription: string;
  view: WorkspaceView;
  selectedReservationId: string | null;
  selectedTableId: string | null;
  sectionId: string;
  query: string;
  statusFilter: string;
  density: "compact" | "comfortable";
  timelineZoom: 15 | 30 | 60;
  queueCollapsed: boolean;
  inspectorCollapsed: boolean;
  mobileInspectorOpen: boolean;
  command: { open: boolean; kind: CommandKind; step: 1 | 2 };
  pending: boolean;
  message: string;
  conflict: CommandOutcome | null;
  history: HistoryEntry[];
};
