import type { VipFloorBoardV2 } from "@/lib/vipFloorV2Contract";

import type {
  CommandKind,
  CommandOutcome,
  GlobalUiState,
  HistoryEntry,
  WorkspaceState,
  WorkspaceView,
} from "../contract/uiTypes";

export type WorkspaceAction =
  | { type: "hydrate"; board: VipFloorBoardV2; message: string; actor?: string }
  | { type: "globalState"; state: GlobalUiState; description: string; message?: string }
  | { type: "view"; view: WorkspaceView }
  | { type: "selectReservation"; reservationId: string | null }
  | { type: "selectTable"; tableId: string | null; reservationId?: string | null }
  | { type: "query"; query: string }
  | { type: "statusFilter"; status: string }
  | { type: "density"; density: WorkspaceState["density"] }
  | { type: "zoom"; zoom: WorkspaceState["timelineZoom"] }
  | { type: "queueCollapsed"; collapsed: boolean }
  | { type: "inspectorCollapsed"; collapsed: boolean }
  | { type: "mobileInspector"; open: boolean }
  | { type: "openCommand"; kind: CommandKind }
  | { type: "closeCommand" }
  | { type: "clearConflict" }
  | { type: "commandStep"; step: 1 | 2 }
  | { type: "pending"; pending: boolean }
  | { type: "commandOutcome"; outcome: CommandOutcome }
  | { type: "history"; entry: HistoryEntry };

export function createInitialState(board: VipFloorBoardV2): WorkspaceState {
  return {
    board,
    globalState: "loading",
    stateDescription: "GHOST予約台帳へ安全に接続しています。",
    view: "list",
    selectedReservationId: null,
    selectedTableId: null,
    query: "",
    statusFilter: "all",
    density: "compact",
    timelineZoom: 30,
    queueCollapsed: false,
    inspectorCollapsed: false,
    mobileInspectorOpen: false,
    command: { open: false, kind: "service_status", step: 1 },
    pending: false,
    message: "認証を確認しています",
    conflict: null,
    history: [],
  };
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "hydrate": {
      const selectionStillExists = state.board.reservations.some((item) => item.id === state.selectedReservationId)
        && action.board.reservations.some((item) => item.id === state.selectedReservationId);
      const selectedReservationId = selectionStillExists
        ? state.selectedReservationId
        : action.board.reservations[0]?.id ?? null;
      const selectedReservation = action.board.reservations.find((item) => item.id === selectedReservationId);
      const globalState = action.board.reservations.length === 0 ? "empty" : action.board.operations.adminMutationEnabled ? "healthy" : "read_only";
      return {
        ...state,
        board: action.board,
        globalState,
        stateDescription: globalState === "read_only"
          ? "GHOST側の更新スイッチが停止中です。予約は閲覧できます。"
          : "GHOST予約台帳と同期済みです。",
        selectedReservationId,
        selectedTableId: selectedReservation?.tableIds[0] ?? null,
        message: action.message,
        pending: false,
        conflict: null,
      };
    }
    case "globalState":
      return { ...state, globalState: action.state, stateDescription: action.description, message: action.message ?? state.message, pending: false };
    case "view":
      return { ...state, view: action.view };
    case "selectReservation": {
      const reservation = state.board.reservations.find((item) => item.id === action.reservationId);
      return { ...state, selectedReservationId: action.reservationId, selectedTableId: reservation?.tableIds[0] ?? null, mobileInspectorOpen: Boolean(action.reservationId) };
    }
    case "selectTable":
      return { ...state, selectedTableId: action.tableId, selectedReservationId: action.reservationId ?? null };
    case "query": return { ...state, query: action.query };
    case "statusFilter": return { ...state, statusFilter: action.status };
    case "density": return { ...state, density: action.density };
    case "zoom": return { ...state, timelineZoom: action.zoom };
    case "queueCollapsed": return { ...state, queueCollapsed: action.collapsed };
    case "inspectorCollapsed": return { ...state, inspectorCollapsed: action.collapsed };
    case "mobileInspector": return { ...state, mobileInspectorOpen: action.open };
    case "openCommand": return { ...state, command: { open: true, kind: action.kind, step: 1 }, conflict: null, mobileInspectorOpen: false };
    case "closeCommand": return { ...state, command: { ...state.command, open: false, step: 1 }, pending: false };
    case "clearConflict": return { ...state, conflict: null };
    case "commandStep": return { ...state, command: { ...state.command, step: action.step } };
    case "pending": return { ...state, pending: action.pending };
    case "commandOutcome":
      return action.outcome.ok
        ? { ...state, pending: false, conflict: null, message: action.outcome.message, command: { ...state.command, open: false, step: 1 } }
        : { ...state, pending: false, conflict: action.outcome, message: action.outcome.message };
    case "history":
      return { ...state, history: [action.entry, ...state.history].slice(0, 20) };
  }
}
