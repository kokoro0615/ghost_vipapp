"use client";

import { useCallback, useEffect, useReducer, useState } from "react";

import {
  adaptLegacyVipBoard,
  createEmptyVipBoard,
  type LegacyVipBoard,
} from "@/lib/vipFloorLegacy";
import { canExecuteVipCommand, type VipAdminRole } from "@/lib/adminPermissions";
import {
  VIP_FLOOR_SCHEMA_VERSION,
  type VipFloorBoardV2,
} from "@/lib/vipFloorV2Contract";

import type { LiveCommandDraft } from "../contract/uiTypes";
import { createInitialState, workspaceReducer } from "./reducer";

type Session = {
  ok: boolean;
  role?: VipAdminRole;
  displayName?: string | null;
};

type AuthState =
  | { status: "checking"; session: null }
  | { status: "unauthenticated"; session: null }
  | { status: "authenticated"; session: Session };

function currentBusinessDate() {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(new Date());
}

function readErrorMessage(status: number, payload: Record<string, unknown>) {
  if (status === 401) return "セッションが終了しました。PINで再ログインしてください。";
  if (status === 403) return "この操作を行う権限がないか、更新スイッチが停止中です。";
  if (status === 409) return "別の端末で予約が更新されました。最新状態を読み直してください。";
  if (status === 429) return "操作回数が上限に達しました。少し待って再試行してください。";
  return typeof payload.error === "string"
    ? `保存できませんでした（${payload.error}）`
    : "保存できませんでした。通信状態を確認して再試行してください。";
}

export function useVipFloorWorkspace(initialBusinessDate?: string) {
  const [initialDate] = useState(() => initialBusinessDate ?? currentBusinessDate());
  const [state, dispatch] = useReducer(workspaceReducer, createEmptyVipBoard(initialDate), createInitialState);
  const [auth, setAuth] = useState<AuthState>({ status: "checking", session: null });
  const [businessDate, setBusinessDateState] = useState(initialDate);
  const [offline, setOffline] = useState(false);

  const loadBoard = useCallback(async (date: string, mode: "initial" | "refresh" = "refresh") => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setOffline(true);
      dispatch({
        type: "globalState",
        state: "stale",
        description: "オフラインです。最後に読み込んだ予約を表示しています。",
        message: "ネットワーク復帰後に再読込してください",
      });
      return false;
    }

    if (mode === "initial") {
      dispatch({
        type: "globalState",
        state: "loading",
        description: "GHOST予約台帳を読み込んでいます。",
        message: "実予約を読み込んでいます",
      });
    } else {
      dispatch({ type: "pending", pending: true });
    }

    try {
      const response = await fetch(`/api/admin/vip-floor?date=${encodeURIComponent(date)}`, {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (response.status === 401) {
        setAuth({ status: "unauthenticated", session: null });
        dispatch({
          type: "globalState",
          state: "error",
          description: "管理セッションが終了しました。",
          message: "PINで再ログインしてください",
        });
        return false;
      }
      if (!response.ok) {
        dispatch({
          type: "globalState",
          state: "error",
          description: "GHOST予約台帳から応答を取得できませんでした。",
          message: readErrorMessage(response.status, payload),
        });
        return false;
      }
      const board = isVipFloorBoardV2(payload)
        ? payload
        : adaptLegacyVipBoard(payload as unknown as LegacyVipBoard, date);
      dispatch({ type: "hydrate", board, message: "GHOST予約台帳と同期済み" });
      setOffline(false);
      return true;
    } catch {
      dispatch({
        type: "globalState",
        state: "error",
        description: "通信が切断されました。保存済みの予約は変更していません。",
        message: "接続を確認して再読込してください",
      });
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        const payload = await response.json().catch(() => ({})) as Session;
        if (cancelled) return;
        if (!response.ok || !payload.ok) {
          setAuth({ status: "unauthenticated", session: null });
          dispatch({
            type: "globalState",
            state: "loading",
            description: "スタッフPINで認証してください。",
            message: "PINでログインしてください",
          });
          return;
        }
        setAuth({ status: "authenticated", session: payload });
        await loadBoard(initialDate, "initial");
      } catch {
        if (cancelled) return;
        setAuth({ status: "unauthenticated", session: null });
        dispatch({
          type: "globalState",
          state: "error",
          description: "認証サーバーへ接続できませんでした。",
          message: "接続を確認して再試行してください",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialDate, loadBoard]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    if (window.matchMedia("(max-width: 1279px)").matches && desktop.matches) {
      dispatch({ type: "queueCollapsed", collapsed: true });
      dispatch({ type: "inspectorCollapsed", collapsed: true });
    }

    const markOffline = () => {
      setOffline(true);
      dispatch({
        type: "globalState",
        state: "stale",
        description: "オフラインです。最後に読み込んだ予約を表示しています。",
        message: "オフライン — 更新操作は停止中",
      });
    };
    const markOnline = () => {
      setOffline(false);
      if (auth.status === "authenticated") void loadBoard(businessDate);
    };
    window.addEventListener("offline", markOffline);
    window.addEventListener("online", markOnline);
    return () => {
      window.removeEventListener("offline", markOffline);
      window.removeEventListener("online", markOnline);
    };
  }, [auth.status, businessDate, loadBoard]);

  const login = useCallback(async (pin: string) => {
    dispatch({ type: "pending", pending: true });
    try {
      const response = await fetch("/api/admin/session/pin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const payload = await response.json().catch(() => ({})) as Session & Record<string, unknown>;
      if (!response.ok || !payload.ok) {
        dispatch({
          type: "commandOutcome",
          outcome: {
            ok: false,
            code: String(payload.error ?? response.status),
            message: response.status === 429
              ? "試行回数の上限です。時間をおいてください。"
              : "PINを確認してください。",
            recovery: "店舗から発行された個人PINを入力してください。",
          },
        });
        return false;
      }
      setAuth({ status: "authenticated", session: payload });
      dispatch({ type: "commandOutcome", outcome: { ok: true, message: "ログインしました" } });
      return loadBoard(businessDate, "initial");
    } catch {
      dispatch({
        type: "commandOutcome",
        outcome: {
          ok: false,
          code: "NETWORK_ERROR",
          message: "認証サーバーへ接続できません。",
          recovery: "通信状態を確認して再試行してください。",
        },
      });
      return false;
    }
  }, [businessDate, loadBoard]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/admin/session", { method: "DELETE" });
    } finally {
      setAuth({ status: "unauthenticated", session: null });
      dispatch({
        type: "globalState",
        state: "loading",
        description: "スタッフPINで認証してください。",
        message: "ログアウトしました",
      });
    }
  }, []);

  const setBusinessDate = useCallback((date: string) => {
    setBusinessDateState(date);
    if (auth.status === "authenticated") void loadBoard(date, "initial");
  }, [auth.status, loadBoard]);

  const runCommand = useCallback(async (draft: LiveCommandDraft) => {
    if (offline) {
      dispatch({
        type: "commandOutcome",
        outcome: {
          ok: false,
          code: "OFFLINE",
          message: "オフライン中は更新できません。",
          recovery: "接続復帰後に予約を再読込してください。",
        },
      });
      return;
    }
    dispatch({ type: "pending", pending: true });
    try {
      if (!auth.session || !canExecuteVipCommand(auth.session.role ?? null, draft.kind)) {
        dispatch({
          type: "commandOutcome",
          outcome: {
            ok: false,
            code: "INSUFFICIENT_ROLE",
            message: "この操作を実行する権限がありません。",
            recovery: "Owner専用PINでログインしてください。",
          },
        });
        return;
      }

      const response = await fetch("/api/admin/vip-floor/commands", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify(draft),
      });
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (!response.ok) {
        if (response.status === 401) setAuth({ status: "unauthenticated", session: null });
        dispatch({
          type: "commandOutcome",
          outcome: {
            ok: false,
            code: String(payload.error ?? response.status),
            message: readErrorMessage(response.status, payload),
            recovery: response.status === 409
              ? "最新状態を読み込み、内容を確認してから再実行してください。"
              : "入力内容と通信状態を確認してください。",
          },
        });
        if (response.status === 409) await loadBoard(businessDate);
        return;
      }

      const labels: Record<LiveCommandDraft["kind"], string> = {
        check_in: "チェックイン",
        arrival_time: "到着時刻",
        seat_extension: "利用延長",
        assignment: "卓割当",
        note: "スタッフメモ",
        service_status: "接客状態",
      };
      const auditLogId = typeof payload.auditLogId === "string" ? payload.auditLogId : null;
      const action = typeof payload.action === "string" ? payload.action : labels[draft.kind];
      const message = auditLogId
        ? `${labels[draft.kind]}を保存しました（監査ID ${auditLogId}）`
        : `${labels[draft.kind]}を保存しました`;
      dispatch({ type: "commandOutcome", outcome: { ok: true, message } });
      dispatch({
        type: "history",
        entry: {
          id: crypto.randomUUID(),
          at: new Date().toISOString(),
          actor: auth.session?.displayName ?? auth.session?.role ?? "staff",
          label: action,
          detail: `${draft.reservationId} ${auditLogId ? `/ 監査ID ${auditLogId}` : ""}`,
        },
      });
      await loadBoard(businessDate);
    } catch {
      dispatch({
        type: "commandOutcome",
        outcome: {
          ok: false,
          code: "NETWORK_ERROR",
          message: "保存結果を確認できませんでした。",
          recovery: "再実行せず、まず予約を再読込して反映状態を確認してください。",
        },
      });
    }
  }, [auth.session, businessDate, loadBoard, offline]);

  return {
    state,
    dispatch,
    runCommand,
    auth,
    businessDate,
    offline,
    login,
    logout,
    loadBoard: () => loadBoard(businessDate),
    setBusinessDate,
  };
}

function isVipFloorBoardV2(
  payload: Record<string, unknown>,
): payload is Record<string, unknown> & VipFloorBoardV2 {
  return payload.schemaVersion === VIP_FLOOR_SCHEMA_VERSION
    && typeof payload.generatedAt === "string"
    && typeof payload.boardRevision === "number"
    && Array.isArray(payload.tables)
    && Array.isArray(payload.reservations)
    && Array.isArray(payload.assignments)
    && Array.isArray(payload.unassignedReservationIds)
    && Array.isArray(payload.blocks)
    && Array.isArray(payload.notes)
    && typeof payload.businessDay === "object"
    && payload.businessDay !== null
    && typeof payload.capabilities === "object"
    && payload.capabilities !== null
    && typeof payload.operations === "object"
    && payload.operations !== null;
}
