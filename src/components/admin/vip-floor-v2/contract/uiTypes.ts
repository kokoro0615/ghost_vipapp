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
  "walk_in_cancel",
] as const;
export type CommandKind = (typeof COMMAND_KINDS)[number];

export const WALK_IN_CANCELLATION_REASONS = [
  "mistake",
  "duplicate",
  "guest_request",
  "venue_decision",
] as const;
export type WalkInCancellationReason = (typeof WALK_IN_CANCELLATION_REASONS)[number];

export type LiveCommandDraft = {
  kind: CommandKind;
  reservationId: string;
  expectedVersion: number;
  payload: {
    occurredAt?: string;
    serviceStatus?: VipServiceStatus;
    tableIds?: string[];
    extendMinutes?: number;
    note?: string;
    sourceChannel?: "walk_in";
    cancelReason?: WalkInCancellationReason;
    reasonNote?: string;
  };
};

export type OperationOptions = {
  ok: true;
  businessDay: {
    id: string;
    businessDate: string;
    operatingStartAt: string;
    operatingEndAt: string;
  };
  offerings: Array<{
    id: string;
    name: string;
    minGuests: number;
    maxGuests: number;
    minSpendYen: number;
    compatibleTableIds: string[] | null;
  }>;
};

export type WalkInDraft = {
  kind: "walk_in";
  payload: {
    eventDayId: string;
    offeringId: string;
    scheduledStartAt: string;
    scheduledEndAt: string;
    guestCount: number;
    tableIds: string[];
    guestLabel: string | null;
    operatorNote: string | null;
    expectedTableVersions: Array<{ tableId: string; expectedVersion: number }>;
  };
};

export type BlockCreateDraft = {
  kind: "block_create";
  payload: {
    eventDayId: string;
    businessDate: string;
    scope: "online_only" | "all_operations";
    blockKind: "manual" | "maintenance" | "owner_hold" | "event";
    startAt: string;
    endAt: string;
    memo: string | null;
    seatResourceIds: string[];
    venueWide: boolean;
    repeatDays: number;
  };
};

export type BlockUpdateDraft = {
  kind: "block_update";
  payload: {
    blockId: string;
    expectedVersion: number;
    scope: "online_only" | "all_operations";
    blockKind: "manual" | "maintenance" | "owner_hold" | "event";
    startAt: string;
    endAt: string;
    memo: string | null;
    seatResourceIds: string[];
    venueWide: boolean;
  };
};

export type BlockCancelDraft = {
  kind: "block_cancel";
  payload: {
    blockId: string;
    expectedVersion: number;
  };
};

export type ReservationCreateDraft = {
  kind: "reservation_create";
  payload: {
    eventDayId: string;
    offeringId: string;
    scheduledStartAt: string;
    scheduledEndAt: string;
    guestCount: number;
    tableIds: string[];
    expectedTableVersions: Array<{ tableId: string; expectedVersion: number }>;
    existingCustomerId: string | null;
    displayName: string | null;
    phone: string | null;
    email: string | null;
    languageCode: string | null;
    guestLabel: string | null;
    operatorNote: string | null;
    sourceChannel: "admin_hold" | "online";
    serviceStatus: VipServiceStatus;
    bookingStaffMemberId: string | null;
    notificationPreference: "none" | "email";
  };
};

export type ReservationUpdateDraft = {
  kind: "reservation_update";
  payload: {
    reservationId: string;
    expectedVersion: number;
    offeringId: string;
    scheduledStartAt: string;
    scheduledEndAt: string;
    guestCount: number;
    tableIds: string[];
    expectedTableVersions: Array<{ tableId: string; expectedVersion: number }>;
    guestLabel: string | null;
    operatorNote: string | null;
    sourceChannel: "admin_hold" | "online";
    serviceStatus: VipServiceStatus;
    bookingStaffMemberId: string | null;
    notificationPreference: "none" | "email";
  };
};

export type OperationDraft =
  | WalkInDraft
  | BlockCreateDraft
  | BlockUpdateDraft
  | BlockCancelDraft
  | ReservationCreateDraft
  | ReservationUpdateDraft;

export type WaitlistStatus = "waiting" | "called" | "expired" | "seated" | "cancelled";

export type WaitlistEntry = {
  id: string;
  eventDayId: string;
  guestCount: number;
  guestLabel: string | null;
  email: string | null;
  status: WaitlistStatus;
  storedStatus: WaitlistStatus;
  calledAt: string | null;
  callExpiresAt: string | null;
  seatedReservationId: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type WaitlistAction =
  | {
      action: "create";
      payload: {
        eventDayId: string;
        guestCount: number;
        guestLabel: string | null;
        email: string | null;
      };
    }
  | {
      action: "call" | "expire" | "cancel" | "seat";
      payload: {
        waitlistEntryId: string;
        expectedVersion: number;
        reservationId: string | null;
      };
    };

export type StaffMember = {
  id: string;
  displayName: string;
  active: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type TableStaffAssignment = {
  id: string;
  tableId: string;
  staffMemberId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type StaffWorkspaceData = {
  ok: true;
  eventDayId: string;
  staffMembers: StaffMember[];
  tableAssignments: TableStaffAssignment[];
};

export type StaffAction =
  | { action: "create"; payload: { displayName: string } }
  | {
      action: "update";
      payload: {
        staffMemberId: string;
        expectedVersion: number;
        displayName: string;
        active: boolean;
      };
    }
  | {
      action: "assign";
      payload: {
        eventDayId: string;
        tableId: string;
        staffMemberId: string | null;
        expectedAssignmentVersion: number | null;
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
  sourceChannel: "online" | "admin_hold" | "walk_in";
  sourceLabel: string;
  exceptionLabel: string | null;
  flags: string[];
  version: number;
  customerMasked: boolean;
  customerId: string | null;
  bookingOfferingId: string | null;
  bookingStaffMemberId: string | null;
  notificationPreference: "none" | "email";
  operatorNote: string | null;
};

export type HistoryEntry = {
  id: string;
  at: string;
  actor: string;
  label: string;
  detail: string;
};

export type CustomerDetail = {
  id: string;
  profilePresent: boolean;
  profileVersion: number | null;
  languageCode: string | null;
  displayName: string | null;
  nameKana: string | null;
  phone: string | null;
  email: string | null;
  allergies: string | null;
  preferences: string | null;
  attributes: {
    nationalityCode: string | null;
    birthDate: string | null;
    anniversaryDate: string | null;
    vipRank: string | null;
  } | null;
  aggregates: Record<string, unknown>;
  reservationHistory: Array<{
    reservationId: string;
    publicCode: string;
    businessDate: string | null;
    scheduledStartAt: string;
    guestCount: number;
    lifecycleStatus: string;
    serviceStatus: string | null;
  }>;
  linkHistory: Array<{
    eventId: string;
    reservationId: string;
    linked: boolean;
    unlinked: boolean;
    resolutionMethod: string;
    createdAt: string;
  }>;
};

export type WorkspaceState = {
  board: VipFloorBoardV2;
  globalState: GlobalUiState;
  stateDescription: string;
  view: WorkspaceView;
  selectedReservationId: string | null;
  selectedTableId: string | null;
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
