import type {
  TicketOperationFailure,
  TicketOperationKind,
  TicketOperationQueueItem,
  TicketOperationsCapabilities,
  TicketOperationsCapabilitiesResponse,
  TicketOperationsOrderResponse,
  TicketOperationsQueueResponse,
} from "@/lib/ticketOperationsContract";

export type TicketQueueFilter = "all" | TicketOperationKind;

export type TicketOperationsErrorState = {
  error: TicketOperationFailure["error"] | "offline" | "unknown";
  currentVersion: number | null;
  message: string;
  recovery: string | null;
};

export type TicketOperationsState = {
  capabilitiesResponse: TicketOperationsCapabilitiesResponse | null;
  capabilitiesReady: boolean;
  queue: TicketOperationsQueueResponse | null;
  order: TicketOperationsOrderResponse | null;
  selectedPublicCode: string | null;
  queuePending: boolean;
  orderPending: boolean;
  mutationPending: boolean;
  error: TicketOperationsErrorState | null;
  statusMessage: string;
};

export const INITIAL_TICKET_OPERATIONS_STATE: TicketOperationsState = {
  capabilitiesResponse: null,
  capabilitiesReady: false,
  queue: null,
  order: null,
  selectedPublicCode: null,
  queuePending: false,
  orderPending: false,
  mutationPending: false,
  error: null,
  statusMessage: "",
};

export type TicketOperationsStateAction =
  | { type: "capabilities_pending" }
  | { type: "capabilities_loaded"; response: TicketOperationsCapabilitiesResponse }
  | { type: "capabilities_failed"; error: TicketOperationsErrorState }
  | { type: "queue_pending" }
  | { type: "queue_loaded"; response: TicketOperationsQueueResponse }
  | { type: "queue_failed"; error: TicketOperationsErrorState }
  | { type: "order_pending"; publicCode: string }
  | { type: "order_loaded"; response: TicketOperationsOrderResponse }
  | { type: "order_failed"; error: TicketOperationsErrorState }
  | { type: "selection_cleared" }
  | { type: "mutation_pending" }
  | { type: "mutation_succeeded"; message: string }
  | { type: "mutation_failed"; error: TicketOperationsErrorState }
  | { type: "error_cleared" };

export function ticketOperationsReducer(
  state: TicketOperationsState,
  action: TicketOperationsStateAction,
): TicketOperationsState {
  switch (action.type) {
    case "capabilities_pending":
      return { ...state, capabilitiesReady: false, error: null };
    case "capabilities_loaded":
      return {
        ...state,
        capabilitiesResponse: action.response,
        capabilitiesReady: true,
        error: null,
      };
    case "capabilities_failed":
      return { ...state, capabilitiesReady: true, error: action.error };
    case "queue_pending":
      return { ...state, queuePending: true };
    case "queue_loaded":
      return { ...state, queue: action.response, queuePending: false, error: null };
    case "queue_failed":
      return { ...state, queuePending: false, error: action.error };
    case "order_pending":
      return {
        ...state,
        selectedPublicCode: action.publicCode,
        orderPending: true,
        error: null,
      };
    case "order_loaded":
      return { ...state, order: action.response, orderPending: false, error: null };
    case "order_failed":
      return { ...state, order: null, orderPending: false, error: action.error };
    case "selection_cleared":
      return { ...state, selectedPublicCode: null, order: null, error: null };
    case "mutation_pending":
      return { ...state, mutationPending: true, error: null, statusMessage: "" };
    case "mutation_succeeded":
      return {
        ...state,
        mutationPending: false,
        error: null,
        statusMessage: action.message,
      };
    case "mutation_failed":
      return { ...state, mutationPending: false, error: action.error };
    case "error_cleared":
      return { ...state, error: null };
  }
}

export function filterTicketOperationItems(
  items: TicketOperationQueueItem[],
  query: string,
  filter: TicketQueueFilter,
  capabilities: TicketOperationsCapabilities,
) {
  const normalized = query.trim().toLocaleLowerCase("ja-JP");
  return items.filter((item) => {
    const refundCapabilityKind = item.kind === "refund_review" || item.kind === "checkout_review";
    if (!capabilities.managerOperationsEnabled && !refundCapabilityKind) return false;
    if (!capabilities.refundReviewEnabled && refundCapabilityKind) return false;
    if (filter !== "all" && item.kind !== filter) return false;
    if (!normalized) return true;
    return [
      item.publicCode,
      item.maskedEmail,
      item.eventTitle,
      item.statusLabel,
    ].some((value) => value.toLocaleLowerCase("ja-JP").includes(normalized));
  });
}

export function describeTicketOperationFailure(
  error: TicketOperationFailure["error"] | "offline" | "unknown",
  currentVersion: number | null,
) {
  switch (error) {
    case "version_conflict":
      return currentVersion
        ? `別の操作で更新されました。現在は v${currentVersion} です。再読込してください。`
        : "別の操作で更新されました。再読込してください。";
    case "outside_admission_window":
      return "現在は入場受付時間外です。営業枠を確認してください。";
    case "payment_not_settled":
      return "支払確定を確認できないため、入場処理を実行できません。";
    case "ticket_refunded":
      return "返金済みの券は入場処理できません。返金確認を開いてください。";
    case "wrong_environment":
      return "LIVE / TEST 環境が一致しません。対象を確認してください。";
    case "provider_disabled":
      return "送信事業者が無効です。復旧後にメールを再投入してください。";
    case "terminal_state":
      return "この記録は確定済みです。再実行せず監査履歴を確認してください。";
    case "capability_disabled":
      return "この操作はbackendで無効です。Owner設定を確認してください。";
    case "not_found":
      return "対象が見つかりません。公開注文番号を確認してください。";
    case "invalid_request":
      return "入力内容を確認してください。";
    case "offline":
      return "オフラインです。回線を再接続してから状態を再読込してください。";
    default:
      return "操作を完了できません。状態を再読込してから再実行してください。";
  }
}

export function ticketOperationKindLabel(kind: TicketOperationKind) {
  switch (kind) {
    case "admission": return "入場";
    case "refund_review": return "返金確認";
    case "checkout_review": return "Checkout確認";
    case "email_delivery": return "メール";
    case "wallet_session": return "Wallet";
  }
}
