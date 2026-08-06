"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import type { SloPayload } from "../observability/ObservabilityPanel";
import type {
  DemoCustomerLinkDraft,
  DemoCustomerPatch,
  DemoPublicConfig,
  DemoTransport,
} from "@/lib/demo/contract";
import { createDemoTransport } from "@/lib/demo/transport";
import {
  adaptLegacyVipBoard,
  createEmptyVipBoard,
  type LegacyVipBoard,
} from "@/lib/vipFloorLegacy";
import { canExecuteVipCommand, type VipAdminRole } from "@/lib/adminPermissions";
import {
  isBusinessDate,
  VIP_FLOOR_SCHEMA_VERSION,
  type VipFloorBoardV2,
} from "@/lib/vipFloorV2Contract";
import {
  classifyBoardRevision,
  purgeSafeBoardCache,
  readSafeBoardCache,
  writeSafeBoardCache,
} from "@/lib/vipFloorRealtime";
import { readVipOperationFailure } from "@/lib/vipFloorClientErrors";
import { readVipFloorDayStateEvent } from "@/lib/vipFloorDayState";

import type {
  LiveCommandDraft,
  OperationDraft,
  OperationOptions,
  StaffAction,
  StaffWorkspaceData,
  WaitlistAction,
  WaitlistEntry,
  CustomerDetail,
} from "../contract/uiTypes";
import { createInitialState, workspaceReducer } from "./reducer";

type Session = {
  ok: boolean;
  authenticated?: boolean;
  mode?: "owner" | "demo";
  role?: VipAdminRole | "owner-compatible-demo";
  displayName?: string | null;
  error?: string;
  sessionExpiresAt?: string;
} & Partial<DemoPublicConfig>;

type AuthState =
  | { status: "checking"; session: null }
  | { status: "locked"; session: null }
  | { status: "unauthenticated"; session: null }
  | { status: "authenticated"; session: Session };

const STREAM_RECONNECT_GRACE_MS = 6_000;

function currentBusinessDate() {
  const businessClock = new Date(Date.now() - 5 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(businessClock);
}

function readErrorMessage(status: number, payload: Record<string, unknown>) {
  return readVipOperationFailure(status, payload).message;
}

function readDemoConfig(payload: Session): DemoPublicConfig | null {
  if (
    payload.mode !== "demo"
    || typeof payload.workspaceId !== "string"
    || typeof payload.dataVersion !== "string"
    || payload.startsAt !== "2026-07-27T00:00:00+09:00"
    || payload.expiresAt !== "2026-08-27T23:59:59+09:00"
    || payload.leaseIntervalMs !== 60_000
  ) {
    return null;
  }
  return {
    mode: "demo",
    workspaceId: payload.workspaceId,
    dataVersion: payload.dataVersion,
    startsAt: payload.startsAt,
    expiresAt: payload.expiresAt,
    leaseIntervalMs: payload.leaseIntervalMs,
  };
}

export function useVipFloorWorkspace(initialBusinessDate?: string) {
  const [initialDate] = useState(() => initialBusinessDate ?? currentBusinessDate());
  const [state, dispatch] = useReducer(workspaceReducer, createEmptyVipBoard(initialDate), createInitialState);
  const [auth, setAuth] = useState<AuthState>({ status: "checking", session: null });
  const [businessDate, setBusinessDateState] = useState(initialDate);
  const [offline, setOffline] = useState(false);
  const [demoConfig, setDemoConfig] = useState<DemoPublicConfig | null>(null);
  const [demoLeaseState, setDemoLeaseState] = useState<
    "inactive" | "checking" | "active" | "read_only" | "expired"
  >("inactive");
  const demoTransportRef = useRef<DemoTransport | null>(null);
  const authMode = auth.status === "authenticated" ? auth.session.mode ?? "owner" : null;
  const isDemo = auth.status === "authenticated" && auth.session.mode === "demo";
  const operatorAuthorized = auth.status === "authenticated"
    && (auth.session.role === "owner" || auth.session.role === "owner-compatible-demo");
  const workspaceMutationBlocked = offline
    || ["loading", "stale", "reconnecting", "error", "read_only"].includes(state.globalState)
    || !state.board.operations.adminMutationEnabled;
  const operationOptionsBlocked = offline
    || ["loading", "error"].includes(state.globalState);
  const mutationBlocked = workspaceMutationBlocked
    || (isDemo && demoLeaseState !== "active");

  const loadBoard = useCallback(async (date: string, mode: "initial" | "refresh" = "refresh") => {
    const demoTransport = demoTransportRef.current;
    if (demoTransport) {
      if (mode === "initial") {
        dispatch({
          type: "globalState",
          state: "loading",
          description: "browser-local合成台帳を読み込んでいます。",
          message: "DEMO · 合成予約を読み込んでいます",
        });
      }
      const result = await demoTransport.loadBoard(date);
      if (!result.ok) {
        const payload = result.payload as unknown as Record<string, unknown>;
        dispatch({
          type: "globalState",
          state: payload.read_only === true ? "read_only" : "error",
          description: typeof payload.message === "string"
            ? payload.message
            : "browser-local合成台帳を読み込めません。",
          message: "DEMO · ローカル台帳を確認してください",
        });
        return false;
      }
      dispatch({
        type: "hydrate",
        board: result.payload,
        message: "DEMO · browser-local合成台帳",
      });
      return true;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setOffline(true);
      const cachedBoard = readSafeBoardCache(date);
      if (cachedBoard) dispatch({ type: "hydrate", board: cachedBoard, message: "安全な最終台帳を表示中" });
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
    }

    try {
      const response = await fetch(`/api/admin/vip-floor?date=${encodeURIComponent(date)}`, {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (response.status === 401) {
        purgeSafeBoardCache();
        setAuth({ status: "unauthenticated", session: null });
        dispatch({
          type: "globalState",
          state: "error",
          description: "管理セッションが終了しました。",
          message: "ユーザー名とパスワードで再接続してください",
        });
        return false;
      }
      const dayState = readVipFloorDayStateEvent(payload.dayState);
      if (dayState && dayState.businessDate === date) {
        purgeSafeBoardCache();
        dispatch({
          type: "hydrate",
          board: createEmptyVipBoard(date),
          message: dayState.state === "closed" ? "休業日" : "営業日未登録",
        });
        dispatch({
          type: "globalState",
          state: "empty",
          description: dayState.state === "closed"
            ? `この営業日は休業です${dayState.reason ? `（${dayState.reason}）` : ""}。`
            : "この営業日はまだ登録されていません。",
          message: dayState.state === "closed" ? "休業日" : "営業日未登録",
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
      if (isVipFloorBoardV2(payload)) writeSafeBoardCache(board);
      setOffline(false);
      return true;
    } catch {
      const cachedBoard = readSafeBoardCache(date);
      if (cachedBoard) dispatch({ type: "hydrate", board: cachedBoard, message: "安全な最終台帳を表示中" });
      dispatch({
        type: "globalState",
        state: cachedBoard ? "stale" : "error",
        description: cachedBoard
          ? "通信が切断されたため、個人情報を除いた最終台帳を閲覧専用で表示しています。"
          : "通信が切断されました。保存済みの予約は変更していません。",
        message: cachedBoard
          ? "安全な最終台帳 — 更新操作は停止中"
          : "接続を確認して再読込してください",
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
        const publicDemoConfig = readDemoConfig(payload);
        if (publicDemoConfig) setDemoConfig(publicDemoConfig);
        if (!response.ok || !payload.ok) {
          if (response.status === 410 && publicDemoConfig) {
            setDemoLeaseState("expired");
          }
          if (response.status === 401 || response.status === 410 || response.status === 423) {
            purgeSafeBoardCache();
          }
          setAuth(response.status === 423
            ? { status: "locked", session: null }
            : { status: "unauthenticated", session: null });
          dispatch({
            type: "globalState",
            state: "loading",
            description: "Basic認証を確認できませんでした。",
            message: "ユーザー名とパスワードで再接続してください",
          });
          return;
        }
        if (payload.mode === "demo") {
          if (!publicDemoConfig || payload.role !== "owner-compatible-demo") {
            setAuth({ status: "unauthenticated", session: null });
            setDemoLeaseState("read_only");
            return;
          }
          demoTransportRef.current = createDemoTransport(publicDemoConfig);
          try {
            demoTransportRef.current.purgeExpired();
          } catch {
            setDemoLeaseState("read_only");
          }
          setDemoLeaseState("checking");
        } else {
          demoTransportRef.current = null;
          setDemoConfig(null);
          setDemoLeaseState("inactive");
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
    if (
      auth.status !== "authenticated"
      || authMode !== "demo"
      || !demoConfig
      || !demoTransportRef.current
    ) {
      return;
    }
    let cancelled = false;
    const renew = async () => {
      const transport = demoTransportRef.current;
      if (!transport) return;
      const result = await transport.renewLease();
      if (cancelled) return;
      if (result.ok) {
        setDemoLeaseState("active");
        setOffline(false);
        return;
      }
      if (result.status === 410) {
        setDemoLeaseState("expired");
        try {
          transport.purgeExpired();
        } catch {
          // The expiry boundary remains fail-closed if browser storage is unavailable.
        }
      } else {
        setDemoLeaseState("read_only");
      }
    };
    void renew();
    const interval = window.setInterval(
      () => void renew(),
      Math.min(demoConfig.leaseIntervalMs, 60_000),
    );
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [auth.status, authMode, demoConfig]);

  useEffect(() => {
    const markOffline = () => {
      setOffline(true);
      if (demoTransportRef.current) setDemoLeaseState("read_only");
      dispatch({
        type: "globalState",
        state: "stale",
        description: "オフラインです。最後に読み込んだ予約を表示しています。",
        message: "オフライン — 更新操作は停止中",
      });
    };
    const markOnline = () => {
      setOffline(false);
      if (auth.status === "authenticated") {
        if (auth.session.mode === "demo" && demoTransportRef.current) {
          setDemoLeaseState("checking");
          void demoTransportRef.current.renewLease().then((result) => {
            setDemoLeaseState(result.ok ? "active" : result.status === 410 ? "expired" : "read_only");
          });
        }
        void loadBoard(businessDate);
      }
    };
    window.addEventListener("offline", markOffline);
    window.addEventListener("online", markOnline);
    return () => {
      window.removeEventListener("offline", markOffline);
      window.removeEventListener("online", markOnline);
    };
  }, [auth, businessDate, loadBoard]);

  useEffect(() => {
    if (
      auth.status !== "authenticated"
      || authMode === "demo"
      || typeof EventSource === "undefined"
      || state.board.businessDay.businessDate !== businessDate
    ) {
      return;
    }

    const revisionAtConnect = state.board.boardRevision;
    const events = new EventSource(
      `/api/admin/vip-floor/events?date=${encodeURIComponent(businessDate)}&since=${revisionAtConnect}`,
    );
    let streamUnavailable = false;
    let revisionRefreshPending = false;
    let reconnectTimer: number | null = null;

    const markStreamUnavailable = () => {
      if (streamUnavailable) return;
      streamUnavailable = true;
      void reportRealtimeMetric({
        event: "realtime_unavailable",
        businessDate,
      });
      dispatch({
        type: "globalState",
        state: "stale",
        description: "更新通知が中断しました。最後に確認した台帳を閲覧専用で表示しています。",
        message: "再接続中 — 更新操作は停止中",
      });
    };

    const scheduleStreamUnavailable = () => {
      if (reconnectTimer !== null) return;
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        markStreamUnavailable();
      }, STREAM_RECONNECT_GRACE_MS);
    };

    events.addEventListener("open", () => {
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    });

    events.addEventListener("ready", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent<string>).data) as {
          businessDate?: unknown;
          revision?: unknown;
        };
        if (
          payload.businessDate !== businessDate
          || payload.revision !== revisionAtConnect
          || !streamUnavailable
        ) {
          return;
        }
        streamUnavailable = false;
        const globalState = state.board.reservations.length === 0
          ? "empty"
          : state.board.operations.adminMutationEnabled
            ? "healthy"
            : "read_only";
        dispatch({
          type: "globalState",
          state: globalState,
          description: globalState === "read_only"
            ? "GHOST側の更新スイッチが停止中です。予約は閲覧できます。"
            : "GHOST予約台帳と同期済みです。",
          message: `REV ${revisionAtConnect} / 更新通知へ再接続済み`,
        });
      } catch {
        markStreamUnavailable();
      }
    });

    events.addEventListener("revision", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent<string>).data) as {
          businessDate?: unknown;
          revision?: unknown;
        };
        if (
          typeof payload.businessDate !== "string"
          || typeof payload.revision !== "number"
        ) {
          return;
        }
        const decision = classifyBoardRevision({
          currentBusinessDate: businessDate,
          currentRevision: revisionAtConnect,
          incomingBusinessDate: payload.businessDate,
          incomingRevision: payload.revision,
        });
        if (decision === "ignore") return;
        if (decision === "gap_refresh") {
          void reportRealtimeMetric({
            event: "realtime_gap",
            businessDate,
            gapSize: Math.max(0, payload.revision - revisionAtConnect - 1),
          });
          dispatch({
            type: "globalState",
            state: "reconnecting",
            description: "台帳revisionの欠番を検知したため、全件を再取得しています。",
            message: `REV ${revisionAtConnect} → ${payload.revision} / 欠番回復中`,
          });
        }
        if (revisionRefreshPending) return;
        revisionRefreshPending = true;
        void loadBoard(businessDate).finally(() => {
          revisionRefreshPending = false;
        });
      } catch {
        markStreamUnavailable();
      }
    });
    events.addEventListener("day_state", (event) => {
      try {
        const payload = readVipFloorDayStateEvent(
          JSON.parse((event as MessageEvent<string>).data),
        );
        if (!payload || payload.businessDate !== businessDate) {
          markStreamUnavailable();
          return;
        }
        events.close();
        purgeSafeBoardCache();
        dispatch({
          type: "hydrate",
          board: createEmptyVipBoard(businessDate),
          message: payload.state === "closed" ? "休業日" : "営業日未登録",
        });
        dispatch({
          type: "globalState",
          state: "empty",
          description: payload.state === "closed"
            ? `この営業日は休業です${payload.reason ? `（${payload.reason}）` : ""}。`
            : "この営業日はまだ登録されていません。",
          message: payload.state === "closed" ? "休業日" : "営業日未登録",
        });
      } catch {
        markStreamUnavailable();
      }
    });
    events.addEventListener("unavailable", markStreamUnavailable);
    events.addEventListener("error", scheduleStreamUnavailable);

    return () => {
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      events.close();
    };
  }, [
    auth.status,
    authMode,
    businessDate,
    loadBoard,
    state.board.boardRevision,
    state.board.businessDay.businessDate,
    state.board.operations.adminMutationEnabled,
    state.board.reservations.length,
  ]);

  useEffect(() => {
    if (authMode !== "demo" || !demoTransportRef.current) return;
    return demoTransportRef.current.subscribe(businessDate, () => {
      dispatch({
        type: "globalState",
        state: "reconnecting",
        description: "別タブのdemo revisionを検知したため、ローカル台帳を再取得しています。",
        message: "DEMO · revision同期中",
      });
      void loadBoard(businessDate);
    });
  }, [authMode, businessDate, loadBoard]);

  const reconnect = useCallback(async () => {
    dispatch({ type: "pending", pending: true });
    try {
      const response = await fetch("/api/admin/session", {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({})) as Session & Record<string, unknown>;
      if (!response.ok || !payload.ok) {
        const publicDemoConfig = readDemoConfig(payload);
        if (publicDemoConfig) setDemoConfig(publicDemoConfig);
        if (response.status === 410 && publicDemoConfig) setDemoLeaseState("expired");
        if (response.status === 401 || response.status === 410 || response.status === 423) {
          purgeSafeBoardCache();
          setAuth(response.status === 423
            ? { status: "locked", session: null }
            : { status: "unauthenticated", session: null });
        }
        dispatch({
          type: "commandOutcome",
          outcome: {
            ok: false,
            code: readVipOperationFailure(response.status, payload).code,
            message: "Basic認証を確認できませんでした。",
            recovery: "ブラウザでユーザー名とパスワードを確認して再接続してください。",
          },
        });
        return false;
      }
      const publicDemoConfig = readDemoConfig(payload);
      if (payload.mode === "demo") {
        if (!publicDemoConfig || payload.role !== "owner-compatible-demo") return false;
        setDemoConfig(publicDemoConfig);
        demoTransportRef.current = createDemoTransport(publicDemoConfig);
        setDemoLeaseState("checking");
      } else {
        setDemoConfig(null);
        demoTransportRef.current = null;
        setDemoLeaseState("inactive");
      }
      setAuth({ status: "authenticated", session: payload });
      dispatch({ type: "commandOutcome", outcome: { ok: true, message: "再接続しました" } });
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

  const unlock = useCallback(async (credentials: { username: string; password: string }) => {
    dispatch({ type: "pending", pending: true });
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (!response.ok || payload.ok !== true) {
        setAuth({ status: "locked", session: null });
        dispatch({
          type: "commandOutcome",
          outcome: {
            ok: false,
            code: "UNAUTHENTICATED",
            message: "認証情報を確認できませんでした。",
            recovery: "Ownerのユーザー名とパスワードを入力し直してください。",
          },
        });
        return false;
      }
      setAuth({ status: "checking", session: null });
      return reconnect();
    } catch {
      setAuth({ status: "locked", session: null });
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
    } finally {
      dispatch({ type: "pending", pending: false });
    }
  }, [reconnect]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/admin/session", { method: "DELETE" });
    } finally {
      purgeSafeBoardCache();
      demoTransportRef.current = null;
      setDemoLeaseState(demoConfig ? "checking" : "inactive");
      setAuth({ status: "locked", session: null });
      dispatch({
        type: "globalState",
        state: "loading",
        description: "端末をロックしました。認証情報を入力し直してください。",
        message: "Ownerアクセスを終了しました",
      });
    }
  }, [demoConfig]);

  const setBusinessDate = useCallback((date: string) => {
    setBusinessDateState(date);
    if (auth.status === "authenticated") return loadBoard(date, "initial");
    return Promise.resolve(false);
  }, [auth.status, loadBoard]);

  const runCommand = useCallback(async (draft: LiveCommandDraft) => {
    if (mutationBlocked) {
      dispatch({
        type: "commandOutcome",
        outcome: {
          ok: false,
          code: offline ? "OFFLINE" : "STALE_READ_ONLY",
          message: offline
            ? "オフライン中は更新できません。"
            : "台帳の連続性を確認できないため更新を停止しています。",
          recovery: "接続復帰後に予約を再読込してください。",
        },
      });
      return false;
    }
    dispatch({ type: "pending", pending: true });
    try {
      if (
        !auth.session
        || (
          auth.session.role !== "owner-compatible-demo"
          && !canExecuteVipCommand((auth.session.role as VipAdminRole | undefined) ?? null, draft.kind)
        )
      ) {
        dispatch({
          type: "commandOutcome",
          outcome: {
            ok: false,
            code: "INSUFFICIENT_ROLE",
            message: "この操作を実行する権限がありません。",
            recovery: "Ownerのユーザー名とパスワードでページを開き直してください。",
          },
        });
        return false;
      }

      const demoTransport = demoTransportRef.current;
      if (demoTransport) {
        const result = await demoTransport.runCommand(draft, crypto.randomUUID());
        if (!result.ok) {
          const payload = result.payload as unknown as Record<string, unknown>;
          if (result.status === 410) setDemoLeaseState("expired");
          else if (payload.read_only === true) setDemoLeaseState("read_only");
          const outcome = {
            ok: false as const,
            code: String(payload.code ?? result.status),
            message: typeof payload.message === "string" ? payload.message : "合成予約を保存できませんでした。",
            recovery: "DEMO台帳を再読込してrevisionとleaseを確認してください。",
          };
          if (result.status === 409) await loadBoard(businessDate);
          dispatch({
            type: "commandOutcome",
            outcome,
          });
          return false;
        }
        const releasedSeat = draft.kind === "service_status"
          && draft.payload.serviceStatus === "completed";
        dispatch({
          type: "commandOutcome",
          outcome: {
            ok: true,
            message: releasedSeat
              ? `DEMO · 退店処理を完了し、席を開放しました（監査ID ${result.payload.auditLogId}）`
              : draft.kind === "walk_in_cancel"
              ? `DEMO · 合成Walk-inを取り消しました（監査ID ${result.payload.auditLogId}）`
              : `DEMO · 合成予約を保存しました（監査ID ${result.payload.auditLogId}）`,
          },
        });
        dispatch({
          type: "history",
          entry: {
            id: crypto.randomUUID(),
            at: new Date().toISOString(),
            actor: "Demo Operator",
            label: result.payload.action,
            detail: `${draft.reservationId} / 監査ID ${result.payload.auditLogId}`,
          },
        });
        await loadBoard(businessDate);
        return true;
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
        if (response.status === 401 || response.status === 410) {
          purgeSafeBoardCache();
          setAuth({ status: "unauthenticated", session: null });
        }
        const outcome = {
          ok: false as const,
          code: readVipOperationFailure(response.status, payload).code,
          message: readErrorMessage(response.status, payload),
          recovery: response.status === 409
            ? "最新状態を読み込み、内容を確認してから再実行してください。"
            : "入力内容と通信状態を確認してください。",
        };
        if (response.status === 409) await loadBoard(businessDate);
        dispatch({
          type: "commandOutcome",
          outcome,
        });
        return false;
      }

      const labels: Record<LiveCommandDraft["kind"], string> = {
        check_in: "チェックイン",
        arrival_time: "到着時刻",
        seat_extension: "利用延長",
        assignment: "卓の変更",
        note: "スタッフメモ",
        service_status: "接客状態",
        walk_in_cancel: "Walk-in取消",
      };
      const auditLogId = typeof payload.auditLogId === "string" ? payload.auditLogId : null;
      const action = typeof payload.action === "string" ? payload.action : labels[draft.kind];
      const releasedSeat = draft.kind === "service_status"
        && draft.payload.serviceStatus === "completed";
      const message = releasedSeat
        ? `退店処理を完了し、席を開放しました${auditLogId ? `（監査ID ${auditLogId}）` : ""}`
        : auditLogId
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
      return true;
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
      return false;
    }
  }, [auth.session, businessDate, loadBoard, mutationBlocked, offline]);

  const loadOperationOptions = useCallback(async (targetBusinessDate = businessDate) => {
    // Options are a read. Keep them reachable from a read-only, stale, or
    // reconnecting board so the intake desk can move away from an event-day-
    // missing date. runOperation still enforces the target board's mutation
    // and continuity contract.
    if (operationOptionsBlocked || !operatorAuthorized) return null;

    try {
      const demoTransport = demoTransportRef.current;
      if (demoTransport) {
        if (demoLeaseState !== "active") {
          const lease = await demoTransport.renewLease();
          if (!lease.ok) {
            const payload = lease.payload as unknown as Record<string, unknown>;
            if (lease.status === 410) {
              setDemoLeaseState("expired");
              try {
                demoTransport.purgeExpired();
              } catch {
                // Keep the demo fail-closed if browser storage is unavailable.
              }
            } else {
              setDemoLeaseState("read_only");
            }
            dispatch({
              type: "commandOutcome",
              outcome: {
                ok: false,
                code: String(payload.code ?? lease.status),
                message: typeof payload.message === "string"
                  ? payload.message
                  : "DEMOの操作権限を確認できませんでした。",
                recovery: "通信状態を確認し、営業日を再読込してください。",
              },
            });
            return null;
          }
          setDemoLeaseState("active");
          setOffline(false);
        }
        const result = await demoTransport.loadOperationOptions(targetBusinessDate);
        if (!result.ok) {
          const payload = result.payload as unknown as Record<string, unknown>;
          dispatch({
            type: "commandOutcome",
            outcome: {
              ok: false,
              code: String(payload.code ?? result.status),
              message: typeof payload.message === "string" ? payload.message : "合成候補を取得できません。",
              recovery: "DEMO営業日を確認してください。",
            },
          });
          return null;
        }
        return result.payload;
      }
      const response = await fetch(
        `/api/admin/vip-floor/options?date=${encodeURIComponent(targetBusinessDate)}`,
        { cache: "no-store" },
      );
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;

      if (!response.ok || payload.ok !== true) {
        const eventDayMissing = payload.error === "event_day_not_found";
        const eventDayClosed = payload.error === "event_day_closed";
        dispatch({
          type: "commandOutcome",
          outcome: {
            ok: false,
            code: readVipOperationFailure(response.status, payload).code,
            message: eventDayMissing || eventDayClosed
              ? eventDayClosed
                ? "選択した営業日は休業です。"
                : "選択した日は予約受付対象として登録されていません。"
              : readErrorMessage(response.status, payload),
            recovery: eventDayMissing || eventDayClosed
              ? "営業中の候補日を選ぶか、営業日設定を確認してください。"
              : "営業日を再読込し、Owner sessionを確認してください。",
          },
        });
        return null;
      }

      return payload as OperationOptions;
    } catch {
      dispatch({
        type: "commandOutcome",
        outcome: {
          ok: false,
          code: "NETWORK_ERROR",
          message: "作成候補を取得できませんでした。",
          recovery: "通信状態を確認して再試行してください。",
        },
      });
      return null;
    }
  }, [
    businessDate,
    demoLeaseState,
    operationOptionsBlocked,
    operatorAuthorized,
  ]);

  const loadOperationBusinessDays = useCallback(async (afterBusinessDate = businessDate) => {
    if (
      operationOptionsBlocked
      || !operatorAuthorized
      || demoTransportRef.current
      || !isBusinessDate(afterBusinessDate)
    ) {
      return [];
    }

    try {
      const response = await fetch(
        `/api/admin/vip-floor/business-days?after=${encodeURIComponent(afterBusinessDate)}&limit=3`,
        { cache: "no-store" },
      );
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (!response.ok || payload.ok !== true || !Array.isArray(payload.businessDates)) {
        return [];
      }
      return payload.businessDates.filter(
        (value): value is string => isBusinessDate(value),
      ).slice(0, 3);
    } catch {
      // Suggestions are a non-blocking recovery aid. The operator can still use
      // the controlled date field when this read is unavailable.
      return [];
    }
  }, [businessDate, operationOptionsBlocked, operatorAuthorized]);

  const runOperation = useCallback(async (draft: OperationDraft) => {
    if (mutationBlocked || !operatorAuthorized) {
      dispatch({
        type: "commandOutcome",
        outcome: {
          ok: false,
          code: offline
            ? "OFFLINE"
            : mutationBlocked
              ? "STALE_READ_ONLY"
              : "INSUFFICIENT_ROLE",
          message: offline
            ? "オフライン中は作成できません。"
            : mutationBlocked
              ? "台帳の連続性を確認できないため作成を停止しています。"
              : "この操作はOwner専用です。",
          recovery: offline
            ? "接続復帰後に台帳を再読込してください。"
            : "Ownerのユーザー名とパスワードでページを開き直してください。",
        },
      });
      return false;
    }

    dispatch({ type: "pending", pending: true });

    try {
      const demoTransport = demoTransportRef.current;
      if (demoTransport) {
        const result = await demoTransport.runOperation(draft, crypto.randomUUID());
        if (!result.ok) {
          const payload = result.payload as unknown as Record<string, unknown>;
          if (result.status === 410) setDemoLeaseState("expired");
          const outcome = {
            ok: false as const,
            code: String(payload.code ?? result.status),
            message: typeof payload.message === "string" ? payload.message : "合成オペレーションを保存できません。",
            recovery: payload.code === "INVALID_SYNTHETIC_INPUT"
              ? "ゲスト表示名と入力した現場メモに「デモ」または「DEMO」を含め、電話番号・メール・秘密情報を削除してください。"
              : "卓競合、version、leaseを確認してください。",
          };
          if (result.status === 409) await loadBoard(businessDate);
          dispatch({
            type: "commandOutcome",
            outcome,
          });
          return false;
        }
        const createdCount = result.payload.createdCount
          ? `（${result.payload.createdCount}日分）`
          : "";
        dispatch({
          type: "commandOutcome",
          outcome: { ok: true, message: `DEMO · 合成オペレーションを保存しました${createdCount}` },
        });
        await loadBoard(businessDate);
        return true;
      }
      const response = await fetch("/api/admin/vip-floor/operations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify(draft),
      });
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;

      if (!response.ok) {
        const failure = readVipOperationFailure(response.status, payload);
        const outcome = {
          ok: false as const,
          code: failure.code,
          message: failure.message,
          recovery: Number(payload.completedCount ?? 0) > 0
            ? "繰返しの一部だけ保存済みです。台帳を再読込して対象日を確認してください。"
            : failure.recovery,
        };
        await loadBoard(businessDate);
        dispatch({
          type: "commandOutcome",
          outcome,
        });
        return false;
      }

      const labels: Record<OperationDraft["kind"], string> = {
        walk_in: "Walk-inを登録しました",
        reservation_create: "予約を作成しました",
        reservation_update: "予約を更新しました",
        block_create: "受付ブロックを保存しました",
        block_update: "受付ブロックを更新しました",
        block_cancel: "受付ブロックを解除しました",
      };
      const label = labels[draft.kind];
      const createdCount = typeof payload.createdCount === "number"
        ? `（${payload.createdCount}日分）`
        : "";
      dispatch({
        type: "commandOutcome",
        outcome: { ok: true, message: `${label}${createdCount}` },
      });
      await loadBoard(businessDate);
      return true;
    } catch {
      dispatch({
        type: "commandOutcome",
        outcome: {
          ok: false,
          code: "NETWORK_ERROR",
          message: "保存結果を確認できませんでした。",
          recovery: "再送せず、まず台帳を再読込して反映状態を確認してください。",
        },
      });
      return false;
    }
  }, [businessDate, loadBoard, mutationBlocked, offline, operatorAuthorized]);

  const loadWaitlist = useCallback(async () => {
    if (offline || !operatorAuthorized) return null;
    try {
      const demoTransport = demoTransportRef.current;
      if (demoTransport) {
        const result = await demoTransport.loadWaitlist(businessDate);
        return result.ok ? result.payload.entries : null;
      }
      const response = await fetch(
        `/api/admin/vip-floor/waitlist?date=${encodeURIComponent(businessDate)}`,
        { cache: "no-store" },
      );
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (!response.ok || payload.ok !== true || !Array.isArray(payload.entries)) {
        dispatch({
          type: "commandOutcome",
          outcome: {
            ok: false,
            code: readVipOperationFailure(response.status, payload).code,
            message: readErrorMessage(response.status, payload),
            recovery: "Owner sessionと営業日を確認して再読込してください。",
          },
        });
        return null;
      }
      return payload.entries as WaitlistEntry[];
    } catch {
      dispatch({
        type: "commandOutcome",
        outcome: {
          ok: false,
          code: "NETWORK_ERROR",
          message: "Waitlistを取得できませんでした。",
          recovery: "通信状態を確認して再試行してください。",
        },
      });
      return null;
    }
  }, [businessDate, offline, operatorAuthorized]);

  const runWaitlistAction = useCallback(async (draft: WaitlistAction) => {
    if (mutationBlocked || !operatorAuthorized) {
      dispatch({
        type: "commandOutcome",
        outcome: {
          ok: false,
          code: mutationBlocked ? "STALE_READ_ONLY" : "INSUFFICIENT_ROLE",
          message: "台帳が閲覧専用か、この操作を行う権限がありません。",
          recovery: "接続とOwner sessionを確認して再読込してください。",
        },
      });
      return false;
    }
    dispatch({ type: "pending", pending: true });
    try {
      const demoTransport = demoTransportRef.current;
      if (demoTransport) {
        const result = await demoTransport.runWaitlist(
          businessDate,
          draft,
          crypto.randomUUID(),
        );
        if (!result.ok) {
          const payload = result.payload as unknown as Record<string, unknown>;
          if (result.status === 410) setDemoLeaseState("expired");
          dispatch({
            type: "commandOutcome",
            outcome: {
              ok: false,
              code: String(payload.code ?? result.status),
              message: typeof payload.message === "string" ? payload.message : "合成Waitlistを保存できません。",
              recovery: "Waitlistのversion、状態、leaseを確認してください。",
            },
          });
          return false;
        }
        dispatch({
          type: "commandOutcome",
          outcome: { ok: true, message: `DEMO · Waitlist ${draft.action} を保存しました` },
        });
        await loadBoard(businessDate);
        return true;
      }
      const response = await fetch("/api/admin/vip-floor/waitlist", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify(draft),
      });
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (!response.ok) {
        dispatch({
          type: "commandOutcome",
          outcome: {
            ok: false,
            code: readVipOperationFailure(response.status, payload).code,
            message: readErrorMessage(response.status, payload),
            recovery: response.status === 409
              ? "Waitlistを再読込して最新versionから実行してください。"
              : "入力内容と30分期限を確認してください。",
          },
        });
        return false;
      }
      const labels: Record<WaitlistAction["action"], string> = {
        create: "Waitlistへ登録しました",
        call: "ゲストを呼出しました（30分）",
        expire: "呼出期限切れへ更新しました",
        cancel: "Waitlistを取消しました",
        seat: "予約へ紐付けて着席済みにしました",
      };
      dispatch({
        type: "commandOutcome",
        outcome: { ok: true, message: labels[draft.action] },
      });
      await loadBoard(businessDate);
      return true;
    } catch {
      dispatch({
        type: "commandOutcome",
        outcome: {
          ok: false,
          code: "NETWORK_ERROR",
          message: "Waitlistの保存結果を確認できませんでした。",
          recovery: "再送せずWaitlistと台帳を再読込してください。",
        },
      });
      return false;
    }
  }, [businessDate, loadBoard, mutationBlocked, operatorAuthorized]);

  const loadStaff = useCallback(async () => {
    if (offline || !operatorAuthorized) return null;
    try {
      const demoTransport = demoTransportRef.current;
      if (demoTransport) {
        const result = await demoTransport.loadStaff(businessDate);
        return result.ok ? result.payload : null;
      }
      const response = await fetch(
        `/api/admin/vip-floor/staff?date=${encodeURIComponent(businessDate)}`,
        { cache: "no-store" },
      );
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (
        !response.ok
        || payload.ok !== true
        || !Array.isArray(payload.staffMembers)
        || !Array.isArray(payload.tableAssignments)
      ) {
        return null;
      }
      return payload as StaffWorkspaceData;
    } catch {
      return null;
    }
  }, [businessDate, offline, operatorAuthorized]);

  const runStaffAction = useCallback(async (draft: StaffAction) => {
    if (mutationBlocked || !operatorAuthorized) return false;
    dispatch({ type: "pending", pending: true });
    try {
      const demoTransport = demoTransportRef.current;
      if (demoTransport) {
        const result = await demoTransport.runStaff(
          businessDate,
          draft,
          crypto.randomUUID(),
        );
        if (!result.ok) {
          if (result.status === 410) setDemoLeaseState("expired");
          return false;
        }
        dispatch({
          type: "commandOutcome",
          outcome: { ok: true, message: `DEMO · スタッフ ${draft.action} を保存しました` },
        });
        await loadBoard(businessDate);
        return true;
      }
      const response = await fetch("/api/admin/vip-floor/staff", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify(draft),
      });
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (!response.ok) {
        dispatch({
          type: "commandOutcome",
          outcome: {
            ok: false,
            code: readVipOperationFailure(response.status, payload).code,
            message: readErrorMessage(response.status, payload),
            recovery: response.status === 409
              ? "担当卓を再読込し、最新versionで再実行してください。"
              : "Owner sessionと入力内容を確認してください。",
          },
        });
        return false;
      }
      const labels: Record<StaffAction["action"], string> = {
        create: "スタッフを登録しました",
        update: "スタッフmasterを更新しました",
        assign: "担当卓を更新しました",
      };
      dispatch({ type: "commandOutcome", outcome: { ok: true, message: labels[draft.action] } });
      await loadBoard(businessDate);
      return true;
    } catch {
      dispatch({
        type: "commandOutcome",
        outcome: {
          ok: false,
          code: "NETWORK_ERROR",
          message: "担当卓の保存結果を確認できませんでした。",
          recovery: "再送せず、担当卓を再読込してください。",
        },
      });
      return false;
    }
  }, [businessDate, loadBoard, mutationBlocked, operatorAuthorized]);

  const loadCustomer = useCallback(async (customerId: string) => {
    const demoTransport = demoTransportRef.current;
    if (demoTransport) {
      const result = await demoTransport.loadCustomer(businessDate, customerId);
      return result.ok ? result.payload.customer : null;
    }
    try {
      const response = await fetch(
        `/api/admin/vip-floor/customers/${encodeURIComponent(customerId)}`,
        { cache: "no-store" },
      );
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
      return response.ok && payload.ok === true && payload.customer
        ? payload.customer as CustomerDetail
        : null;
    } catch {
      return null;
    }
  }, [businessDate]);

  const updateCustomer = useCallback(async (
    customerId: string,
    patch: DemoCustomerPatch & { eventDayId: string; reservationId: string },
  ) => {
    if (mutationBlocked || !operatorAuthorized) return false;
    const demoTransport = demoTransportRef.current;
    if (demoTransport) {
      const {
        expectedVersion,
        nationalityCode,
        birthDate,
        anniversaryDate,
        vipRank,
      } = patch;
      const result = await demoTransport.updateCustomer(
        businessDate,
        customerId,
        { expectedVersion, nationalityCode, birthDate, anniversaryDate, vipRank },
        crypto.randomUUID(),
      );
      if (result.status === 410) setDemoLeaseState("expired");
      return result.ok;
    }
    try {
      const response = await fetch(
        `/api/admin/vip-floor/customers/${encodeURIComponent(customerId)}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            "idempotency-key": crypto.randomUUID(),
          },
          body: JSON.stringify(patch),
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  }, [businessDate, mutationBlocked, operatorAuthorized]);

  const relinkCustomer = useCallback(async (draft: DemoCustomerLinkDraft) => {
    if (mutationBlocked || !operatorAuthorized) return false;
    const demoTransport = demoTransportRef.current;
    if (demoTransport) {
      const result = await demoTransport.relinkCustomer(
        businessDate,
        draft,
        crypto.randomUUID(),
      );
      if (result.status === 410) setDemoLeaseState("expired");
      return result.ok;
    }
    try {
      const response = await fetch(
        `/api/admin/vip-floor/reservations/${encodeURIComponent(draft.reservationId)}/customer-link`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            "idempotency-key": crypto.randomUUID(),
          },
          body: JSON.stringify({
            expectedVersion: draft.expectedVersion,
            customerId: draft.customerId,
          }),
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  }, [businessDate, mutationBlocked, operatorAuthorized]);

  const loadObservability = useCallback(async (): Promise<SloPayload | null> => {
    const demoTransport = demoTransportRef.current;
    if (demoTransport) {
      const result = await demoTransport.loadObservability(businessDate);
      if (!result.ok) return null;
      const auditEventCount = Number(result.payload.auditEventCount ?? 0);
      return {
        generatedAt: new Date().toISOString(),
        windowMinutes: 60,
        metrics: {
          commandCount: auditEventCount,
          commandErrorRate: 0,
          commandP95Ms: 0,
          boardReadP95Ms: 0,
          outboxDeadCount: 0,
          realtimeGapCount: 0,
          realtimeUnavailableCount: 0,
        },
        targets: {},
        alerts: {},
      };
    }
    try {
      const response = await fetch("/api/admin/vip-floor/observability?windowMinutes=60", {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
      return response.ok && payload.ok === true && payload.metrics && payload.alerts
        ? payload as unknown as SloPayload
        : null;
    } catch {
      return null;
    }
  }, [businessDate]);

  const resetDemo = useCallback(async () => {
    const demoTransport = demoTransportRef.current;
    if (!demoTransport || mutationBlocked) return false;
    dispatch({ type: "pending", pending: true });
    const result = await demoTransport.reset(businessDate);
    if (!result.ok) {
      if (result.status === 410) setDemoLeaseState("expired");
      dispatch({
        type: "commandOutcome",
        outcome: {
          ok: false,
          code: String(result.status),
          message: "合成台帳を初期化できませんでした。",
          recovery: "leaseとbrowser-local storageを確認してください。",
        },
      });
      return false;
    }
    dispatch({
      type: "commandOutcome",
      outcome: { ok: true, message: "DEMO · 合成台帳を初期状態へ戻しました" },
    });
    await loadBoard(businessDate);
    return true;
  }, [businessDate, loadBoard, mutationBlocked]);

  return {
    state,
    dispatch,
    runCommand,
    runOperation,
    loadOperationOptions,
    loadOperationBusinessDays,
    loadWaitlist,
    runWaitlistAction,
    loadStaff,
    runStaffAction,
    loadCustomer,
    updateCustomer,
    relinkCustomer,
    loadObservability,
    resetDemo,
    auth,
    demo: {
      enabled: Boolean(demoConfig),
      config: demoConfig,
      leaseState: demoLeaseState,
    },
    businessDate,
    offline,
    reconnect,
    unlock,
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

async function reportRealtimeMetric(input: {
  event: "realtime_gap" | "realtime_unavailable";
  businessDate: string;
  gapSize?: number;
}) {
  try {
    await fetch("/api/admin/vip-floor/observability", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      keepalive: true,
    });
  } catch {
    // Metrics must not affect reconnect or board recovery.
  }
}
