import type { VipFloorBoardV2 } from "@/lib/vipFloorV2Contract";

import type { CommandKind, FixtureCommandOutcome, FixtureResultMode, HistoryEntry, ScenarioDefinition, WorkspaceView } from "../contract/uiTypes";

export type WorkspaceState = {
  scenario: ScenarioDefinition;
  board: VipFloorBoardV2;
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
  command: { open: boolean; kind: CommandKind; step: 1 | 2; resultMode: FixtureResultMode };
  pending: boolean;
  message: string;
  conflict: FixtureCommandOutcome | null;
  history: HistoryEntry[];
};

export type WorkspaceAction =
  | { type: "scenario"; scenario: ScenarioDefinition }
  | { type: "view"; view: WorkspaceView }
  | { type: "selectReservation"; reservationId: string | null }
  | { type: "selectTable"; tableId: string | null; reservationId?: string | null }
  | { type: "section"; sectionId: string }
  | { type: "query"; query: string }
  | { type: "statusFilter"; status: string }
  | { type: "density"; density: WorkspaceState["density"] }
  | { type: "zoom"; zoom: WorkspaceState["timelineZoom"] }
  | { type: "queueCollapsed"; collapsed: boolean }
  | { type: "inspectorCollapsed"; collapsed: boolean }
  | { type: "mobileInspector"; open: boolean }
  | { type: "openCommand"; kind: CommandKind }
  | { type: "closeCommand" }
  | { type: "commandStep"; step: 1 | 2 }
  | { type: "resultMode"; mode: FixtureResultMode }
  | { type: "pending"; pending: boolean }
  | { type: "commandOutcome"; outcome: FixtureCommandOutcome }
  | { type: "retryRead" };

export function createInitialState(scenario: ScenarioDefinition): WorkspaceState {
  const selection = scenario.defaultSelection
    ? scenario.board.reservations.find((item) => item.publicCode === scenario.defaultSelection)?.id ?? null
    : scenario.board.reservations[0]?.id ?? null;
  return {
    scenario,
    board: structuredClone(scenario.board),
    view: scenario.defaultView ?? "list",
    selectedReservationId: selection,
    selectedTableId: scenario.board.reservations.find((item) => item.id === selection)?.tableIds[0] ?? null,
    sectionId: "all",
    query: "",
    statusFilter: "all",
    density: "compact",
    timelineZoom: 30,
    queueCollapsed: false,
    inspectorCollapsed: false,
    mobileInspectorOpen: false,
    command: { open: false, kind: "service_status", step: 1, resultMode: "success" },
    pending: false,
    message: "Fixture only / 外部通信なし",
    conflict: null,
    history: [
      { id: "initial", at: scenario.board.generatedAt, actor: "Fixture Operator", label: "営業ボードを準備", detail: scenario.label },
    ],
  };
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "scenario": {
      const next = createInitialState(action.scenario);
      return { ...next, view: action.scenario.defaultView ?? state.view };
    }
    case "view":
      return { ...state, view: action.view };
    case "selectReservation": {
      const reservation = state.board.reservations.find((item) => item.id === action.reservationId);
      return { ...state, selectedReservationId: action.reservationId, selectedTableId: reservation?.tableIds[0] ?? null, mobileInspectorOpen: Boolean(action.reservationId) };
    }
    case "selectTable":
      return { ...state, selectedTableId: action.tableId, selectedReservationId: action.reservationId ?? null };
    case "section": return { ...state, sectionId: action.sectionId };
    case "query": return { ...state, query: action.query };
    case "statusFilter": return { ...state, statusFilter: action.status };
    case "density": return { ...state, density: action.density };
    case "zoom": return { ...state, timelineZoom: action.zoom };
    case "queueCollapsed": return { ...state, queueCollapsed: action.collapsed };
    case "inspectorCollapsed": return { ...state, inspectorCollapsed: action.collapsed };
    case "mobileInspector": return { ...state, mobileInspectorOpen: action.open };
    case "openCommand": return { ...state, command: { ...state.command, open: true, kind: action.kind, step: 1 }, conflict: null, mobileInspectorOpen: false };
    case "closeCommand": return { ...state, command: { ...state.command, open: false, step: 1 }, pending: false };
    case "commandStep": return { ...state, command: { ...state.command, step: action.step } };
    case "resultMode": return { ...state, command: { ...state.command, resultMode: action.mode } };
    case "pending": return { ...state, pending: action.pending };
    case "commandOutcome": {
      if (!action.outcome.ok) return { ...state, pending: false, conflict: action.outcome, message: action.outcome.message };
      return {
        ...state,
        board: action.outcome.board,
        pending: false,
        conflict: null,
        message: action.outcome.message,
        command: { ...state.command, open: false, step: 1 },
        history: [
          { id: `history-${action.outcome.board.boardRevision}`, at: action.outcome.board.generatedAt, actor: "Fixture Operator", label: action.outcome.auditLabel, detail: action.outcome.message },
          ...state.history,
        ],
      };
    }
    case "retryRead": return { ...state, scenario: { ...state.scenario, state: "healthy" }, message: "保存済みfixture stateを復元しました。" };
  }
}
