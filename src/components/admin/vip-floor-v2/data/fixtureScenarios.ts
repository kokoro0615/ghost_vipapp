import type { VipFloorBoardV2 } from "@/lib/vipFloorV2Contract";

import type { ScenarioDefinition, ScenarioKey } from "../contract/uiTypes";
import { calculateTotals, createDenseBoard, createHealthyBoard } from "./fixtures";

function deriveBoard(mutator: (board: VipFloorBoardV2) => void) {
  const board = createHealthyBoard();
  mutator(board);
  board.unassignedReservationIds = board.reservations.filter((item) => item.tableIds.length === 0).map((item) => item.id);
  board.totals = calculateTotals(board);
  return board;
}

const definitions: ScenarioDefinition[] = [
  { key: "healthy", label: "通常営業", state: "healthy", description: "到着、着席、会計、例外が混在する営業中のボード。", board: createHealthyBoard() },
  { key: "opening_empty", label: "開店前", state: "empty", description: "本日の予約はまだありません。店頭受付は利用できます。", board: deriveBoard((board) => { board.reservations = []; board.assignments = []; board.notes = []; }) },
  { key: "loading", label: "読込中", state: "loading", description: "座席、時間軸、予約行と同じ寸法のskeleton。", board: createHealthyBoard() },
  { key: "stale", label: "更新遅延", state: "stale", description: "最終同期から90秒経過。既知の状態を保持。", board: createHealthyBoard() },
  { key: "reconnecting", label: "再接続中", state: "reconnecting", description: "fixture clockを再同期中。操作は一時保留。", board: createHealthyBoard(), readOnly: true },
  { key: "read_error", label: "読込エラー", state: "error", description: "保存済みの最終状態へ戻るか再試行できます。", board: createHealthyBoard() },
  { key: "read_only", label: "閲覧のみ", state: "read_only", description: "capabilityが無い端末の閲覧専用状態。", readOnly: true, board: deriveBoard((board) => { board.operations.adminMutationEnabled = false; Object.assign(board.capabilities, { changeServiceStatus: false, changeAssignments: false, changeSchedule: false, manageBlocks: false, cancelReservation: false }); }) },
  { key: "masked_customer", label: "顧客マスク", state: "healthy", description: "顧客情報を最小表示に固定。", defaultSelection: "G7A91F", board: createHealthyBoard() },
  { key: "late_no_contact", label: "遅延・未達", state: "healthy", description: "遅延かつ連絡未達を最優先queueへ表示。", defaultSelection: "G8F22A", board: createHealthyBoard() },
  { key: "partial_arrival", label: "一部到着", state: "healthy", description: "グループの一部到着を色以外のstripe cueで表示。", defaultSelection: "G40E11", board: createHealthyBoard() },
  { key: "service_progression", label: "接客進行", state: "healthy", description: "着席、ボトル待ち、提供、会計、支払、リセットを同時確認。", board: createHealthyBoard() },
  { key: "unassigned", label: "未割当", state: "healthy", description: "未割当trayと代替割当commandを検証。", defaultSelection: "G77B10", board: createHealthyBoard() },
  { key: "connected_tables", label: "結合席", state: "healthy", description: "複数tableへ接続された予約。", defaultSelection: "G29D04", board: createHealthyBoard() },
  { key: "table_locked", label: "席ロック", state: "healthy", description: "現場ロックと理由をnode、list、inspectorへ表示。", board: createHealthyBoard() },
  { key: "reservation_block", label: "予約ブロック", state: "healthy", description: "table scopeのmaintenance block。", board: createHealthyBoard() },
  { key: "capacity_warning", label: "定員警告", state: "healthy", description: "override reasonなしでは確定できない状態。", defaultSelection: "G90F21", board: createHealthyBoard() },
  { key: "version_conflict", label: "版競合", state: "healthy", description: "別端末更新後のversion conflictを再現。", defaultSelection: "G31C20", board: createHealthyBoard() },
  { key: "table_time_conflict", label: "時間競合", state: "healthy", description: "同一tableの時間重複と再選択導線。", defaultSelection: "G55E90", board: deriveBoard((board) => { board.reservations[9].flags.push("time_conflict"); }) },
  { key: "refund_review", label: "返金確認", state: "healthy", description: "取消理由、返金判断、影響確認を必須化。", defaultSelection: "G13A88", board: createHealthyBoard() },
  { key: "long_labels", label: "長いラベル", state: "healthy", description: "日本語と英語が混在する長い名称の折返しを確認。", defaultSelection: "G7A91F", board: deriveBoard((board) => { board.reservations[0].customer = { displayNameMasked: "株式会社サンプル御一行様 / International Guest Coordination Team", masked: true }; board.tables[0].name = "ROYAL VIP / 特別イベント長名称検証席"; }) },
  { key: "dense_stress", label: "56予約", state: "healthy", description: "50件超のlist/chart描画と入力応答を確認。", defaultView: "list", board: createDenseBoard() },
];

export const fixtureScenarios = definitions;
export const fixtureScenarioByKey = new Map(definitions.map((scenario) => [scenario.key, scenario]));

export function getFixtureScenario(key: ScenarioKey | string) {
  return fixtureScenarioByKey.get(key as ScenarioKey) ?? fixtureScenarioByKey.get("healthy")!;
}
