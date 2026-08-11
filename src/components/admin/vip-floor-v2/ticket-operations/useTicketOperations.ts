"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import type {
  TicketOperationCommand,
  TicketOperationsCapabilities,
  TicketOperationScope,
} from "@/lib/ticketOperationsContract";

import {
  loadCapabilities,
  loadTicketOperationsOrder,
  loadTicketOperationsQueue,
  type PreparedTicketOperation,
  runTicketOperation,
  TicketOperationsApiError,
  type TicketOperationsApiContext,
  type TicketOperationsMode,
} from "./api";
import { createDemoTicketOperationsStore } from "./demo";
import {
  describeTicketOperationFailure,
  INITIAL_TICKET_OPERATIONS_STATE,
  ticketOperationsReducer,
  type TicketOperationsErrorState,
} from "./state";

export type { TicketOperationsErrorState } from "./state";

const QUEUE_POLL_INTERVAL_MS = 5_000;
const DISABLED_CAPABILITIES: TicketOperationsCapabilities = {
  managerOperationsEnabled: false,
  refundReviewEnabled: false,
};

type Options = {
  open: boolean;
  mode: TicketOperationsMode;
  displayCapabilities: TicketOperationsCapabilities;
};

function offlineErrorState(): TicketOperationsErrorState {
  return {
    error: "offline",
    currentVersion: null,
    message: describeTicketOperationFailure("offline", null),
    recovery: null,
  };
}

function errorState(error: unknown): TicketOperationsErrorState {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return offlineErrorState();
  }
  if (error instanceof TicketOperationsApiError && error.failure) {
    return {
      error: error.failure.error,
      currentVersion: error.failure.currentVersion,
      message: describeTicketOperationFailure(
        error.failure.error,
        error.failure.currentVersion,
      ),
      recovery: error.failure.recovery,
    };
  }
  return {
    error: "unknown",
    currentVersion: null,
    message: describeTicketOperationFailure("unknown", null),
    recovery: null,
  };
}

export function useTicketOperations({ open, mode, displayCapabilities }: Options) {
  const demoStore = useMemo(
    () => createDemoTicketOperationsStore({
      managerOperationsEnabled: displayCapabilities.managerOperationsEnabled,
      refundReviewEnabled: displayCapabilities.refundReviewEnabled,
    }),
    [
      displayCapabilities.managerOperationsEnabled,
      displayCapabilities.refundReviewEnabled,
    ],
  );
  const apiContext = useMemo<TicketOperationsApiContext>(() => ({
    mode,
    demoStore,
  }), [demoStore, mode]);
  const [state, dispatch] = useReducer(
    ticketOperationsReducer,
    INITIAL_TICKET_OPERATIONS_STATE,
  );
  const {
    capabilitiesResponse,
    capabilitiesReady,
    queue,
    order,
    selectedPublicCode,
    queuePending,
    orderPending,
    mutationPending,
    error,
    statusMessage,
  } = state;
  const capabilitySequence = useRef(0);
  const queueSequence = useRef(0);
  const orderSequence = useRef(0);

  const capabilities = useMemo(
    () => capabilitiesResponse?.capabilities ?? DISABLED_CAPABILITIES,
    [capabilitiesResponse],
  );
  const queueRequest = {
    scope: capabilities.managerOperationsEnabled ? "all" : "refund",
  } satisfies { scope: TicketOperationScope };
  const scope = queueRequest.scope;

  useEffect(() => {
    if (!open) return;
    const sequence = ++capabilitySequence.current;
    const controller = new AbortController();
    dispatch({ type: "capabilities_pending" });
    void loadCapabilities(apiContext, controller.signal).then((response) => {
      if (sequence !== capabilitySequence.current) return;
      dispatch({ type: "capabilities_loaded", response });
    }).catch((cause) => {
      if (controller.signal.aborted || sequence !== capabilitySequence.current) return;
      dispatch({ type: "capabilities_failed", error: errorState(cause) });
    });
    return () => {
      controller.abort();
      capabilitySequence.current += 1;
    };
  }, [apiContext, open]);

  const refreshQueue = useCallback(async () => {
    if (!open || !capabilitiesReady) return null;
    if (!capabilities.managerOperationsEnabled && !capabilities.refundReviewEnabled) return null;
    const sequence = ++queueSequence.current;
    dispatch({ type: "queue_pending" });
    try {
      const response = await loadTicketOperationsQueue(apiContext, scope);
      if (sequence === queueSequence.current) {
        dispatch({ type: "queue_loaded", response });
      }
      return response;
    } catch (cause) {
      if (sequence === queueSequence.current) {
        dispatch({ type: "queue_failed", error: errorState(cause) });
      }
      return null;
    }
  }, [apiContext, capabilities, capabilitiesReady, open, scope]);

  const loadOrder = useCallback(async (publicCode: string) => {
    if (!open || !capabilitiesReady) return null;
    const sequence = ++orderSequence.current;
    dispatch({ type: "order_pending", publicCode });
    try {
      const response = await loadTicketOperationsOrder(apiContext, publicCode, scope);
      if (sequence === orderSequence.current) {
        dispatch({ type: "order_loaded", response });
      }
      return response;
    } catch (cause) {
      if (sequence === orderSequence.current) {
        dispatch({ type: "order_failed", error: errorState(cause) });
      }
      return null;
    }
  }, [apiContext, capabilitiesReady, open, scope]);

  const refreshSelectedOrder = useCallback(async () => {
    if (!selectedPublicCode) return null;
    return loadOrder(selectedPublicCode);
  }, [loadOrder, selectedPublicCode]);

  useEffect(() => {
    if (!open || !capabilitiesReady) return;
    if (!capabilities.managerOperationsEnabled && !capabilities.refundReviewEnabled) return;
    void refreshQueue();
    const poll = window.setInterval(() => {
      void refreshQueue();
      if (selectedPublicCode) void loadOrder(selectedPublicCode);
    }, QUEUE_POLL_INTERVAL_MS);
    return () => window.clearInterval(poll);
  }, [
    capabilities.managerOperationsEnabled,
    capabilities.refundReviewEnabled,
    capabilitiesReady,
    loadOrder,
    open,
    refreshQueue,
    selectedPublicCode,
  ]);

  useEffect(() => {
    if (!open) return;
    const handleOffline = () => dispatch({
      type: "queue_failed",
      error: offlineErrorState(),
    });
    const handleOnline = () => {
      dispatch({ type: "error_cleared" });
      void refreshQueue();
      void refreshSelectedOrder();
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [open, refreshQueue, refreshSelectedOrder]);

  const prepareOperation = useCallback((
    command: TicketOperationCommand,
  ): PreparedTicketOperation => {
    if (!Number.isSafeInteger(command.expectedVersion) || command.expectedVersion < 1) {
      throw new Error("ticket_operation_expected_version_invalid");
    }
    return { ...command, idempotencyKey: crypto.randomUUID() };
  }, []);

  const executeOperation = useCallback(async (prepared: PreparedTicketOperation) => {
    dispatch({ type: "mutation_pending" });
    try {
      const result = await runTicketOperation(apiContext, prepared);
      dispatch({
        type: "mutation_succeeded",
        message: result.reused
          ? "同じ操作の確定結果を再表示しました。"
          : "操作を確定し、監査履歴へ記録しました。",
      });
      await refreshQueue();
      await refreshSelectedOrder();
      return { ok: true as const, result };
    } catch (cause) {
      const nextError = errorState(cause);
      dispatch({ type: "mutation_failed", error: nextError });
      return { ok: false as const, error: nextError };
    }
  }, [apiContext, refreshQueue, refreshSelectedOrder]);

  const clearSelection = useCallback(() => {
    dispatch({ type: "selection_cleared" });
  }, []);

  return {
    capabilities,
    readiness: capabilitiesResponse?.readiness ?? null,
    capabilitiesReady,
    queue,
    order,
    selectedPublicCode,
    queuePending,
    orderPending,
    mutationPending,
    error,
    statusMessage,
    scope,
    loadOrder,
    refreshQueue,
    refreshSelectedOrder,
    clearSelection,
    clearError: () => dispatch({ type: "error_cleared" }),
    prepareOperation,
    executeOperation,
  };
}
