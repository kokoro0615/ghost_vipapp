"use client";

import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { type KeyboardEvent, type ReactNode, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Activity,
  BellRing,
  CalendarPlus,
  ChartNoAxesGantt,
  ClipboardList,
  LayoutGrid,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  TicketCheck,
  WifiOff,
  X,
  RotateCcw,
} from "lucide-react";

import { CommandCenter } from "./commands/CommandCenter";
import { CustomerPanel } from "./customers/CustomerPanel";
import { buildQueueGroups, matchesReservation, toUiReservations } from "./contract/viewModel";
import type { CommandKind, UiReservation, WorkspaceView } from "./contract/uiTypes";
import FloorView from "./floor/FloorView";
import { Inspector, INSPECTOR_TABS, type InspectorTab } from "./inspector/Inspector";
import { OperationCenter } from "./operations/OperationCenter";
import { ObservabilityPanel } from "./observability/ObservabilityPanel";
import { ExceptionRail } from "./shell/ExceptionRail";
import { useVipFloorWorkspace } from "./state/useVipFloorWorkspace";
import { StaffPanel } from "./staff/StaffPanel";
import { TicketOperationsPanel } from "./ticket-operations/TicketOperationsPanel";
import VipBootScreen from "./VipBootScreen";
import { WaitlistPanel } from "./waitlist/WaitlistPanel";
import { DemoCue, DemoModeProvider } from "./demo/DemoMode";
import { DemoExpiryBoundary } from "./demo/DemoExpiryBoundary";
import { DemoResetDialog } from "./demo/DemoResetDialog";
import { BusinessDateField } from "./shell/BusinessDateField";
import styles from "./VipFloorWorkspace.module.css";
import { canExecuteVipCommand } from "@/lib/adminPermissions";
import type { OperationOptions } from "./contract/uiTypes";
import type { WaitlistEntry } from "./contract/uiTypes";
import type { StaffWorkspaceData } from "./contract/uiTypes";
import type { TicketOperationsCapabilities } from "@/lib/ticketOperationsContract";

const ChartView = dynamic(() => import("./chart/ChartView"), {
  loading: () => <WorkspaceSkeleton label="Chartを準備中" />,
});
const ReservationListView = dynamic(() => import("./list/ReservationListView"), {
  loading: () => <WorkspaceSkeleton label="予約一覧を準備中" />,
});

const ROUTE_VIEWS = new Set(["floor", "list", "chart"]);
const STATUS_FILTERS = new Set([
  "all",
  "attention",
  "unassigned",
  "expected",
  "late",
  "arrived",
  "seated",
  "bill_requested",
]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

type TurnoverContext = {
  businessDate: string;
  tableId: string;
  nextReservationId: string;
};

const SYNC_LABEL: Record<string, string> = {
  healthy: "同期済み",
  loading: "読込中",
  stale: "オフライン",
  reconnecting: "再接続中",
  error: "読込失敗",
  read_only: "閲覧のみ",
  empty: "予約なし",
};

function parseWorkspaceView(value: string | null): WorkspaceView {
  if (!value || !ROUTE_VIEWS.has(value)) return "list";
  if (value === "floor" || value === "list") return value;
  return "timeline";
}

function parseInspectorTab(value: string | null): InspectorTab {
  return INSPECTOR_TABS.some((tab) => tab.key === value) ? value as InspectorTab : "overview";
}

function findNextTurnoverReservation(
  current: UiReservation,
  reservations: UiReservation[],
): Omit<TurnoverContext, "businessDate"> | null {
  const releasedTableIds = new Set(current.tableIds);
  if (releasedTableIds.size === 0) return null;

  const next = reservations
    .filter((item) => (
      item.id !== current.id
      && item.lifecycleStatus === "confirmed"
      && !["completed", "no_show"].includes(item.serviceStatus)
      && item.startAt >= current.startAt
      && item.tableIds.some((tableId) => releasedTableIds.has(tableId))
    ))
    .sort((left, right) => left.startAt.localeCompare(right.startAt))
    .at(0);
  const tableId = next?.tableIds.find((candidate) => releasedTableIds.has(candidate));

  return next && tableId ? { tableId, nextReservationId: next.id } : null;
}

function trapKeyboardFocus(event: KeyboardEvent<HTMLElement>, onClose: () => void) {
  if (event.key === "Escape") {
    event.preventDefault();
    onClose();
    return;
  }
  if (event.key !== "Tab") return;
  const controls = [...event.currentTarget.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter((element) => element.getClientRects().length > 0);
  if (!controls.length) return;
  const first = controls[0];
  const last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

type VipFloorWorkspaceProps = {
  ticketOperationsCapabilities: TicketOperationsCapabilities;
};

export default function VipFloorWorkspace({
  ticketOperationsCapabilities,
}: VipFloorWorkspaceProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialBusinessDate = DATE_PATTERN.test(searchParams.get("date") ?? "")
    ? searchParams.get("date") ?? undefined
    : undefined;
  const {
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
    demo,
    businessDate,
    offline,
    reconnect,
    unlock,
    logout,
    loadBoard,
    setBusinessDate,
  } = useVipFloorWorkspace(initialBusinessDate);
  const [menuOpen, setMenuOpen] = useState(false);
  const [operationOpen, setOperationOpen] = useState(false);
  const [editingReservationId, setEditingReservationId] = useState<string | null>(null);
  const [operationOptions, setOperationOptions] = useState<OperationOptions | null>(null);
  const [operationDatePending, setOperationDatePending] = useState(false);
  const [operationBusinessDates, setOperationBusinessDates] = useState<string[]>([]);
  const [operationBusinessDatesPending, setOperationBusinessDatesPending] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [staffOpen, setStaffOpen] = useState(false);
  const [staffData, setStaffData] = useState<StaffWorkspaceData | null>(null);
  const [staffFilter, setStaffFilter] = useState("");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [observabilityOpen, setObservabilityOpen] = useState(false);
  const [ticketOperationsOpen, setTicketOperationsOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [turnoverContext, setTurnoverContext] = useState<TurnoverContext | null>(null);
  const [unlockUsername, setUnlockUsername] = useState("");
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockFailed, setUnlockFailed] = useState(false);
  const menuRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const desktopMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileSheetRef = useRef<HTMLDivElement>(null);
  const inspectorTab = parseInspectorTab(searchParams.get("detail"));
  const deferredQuery = useDeferredValue(state.query);
  const allReservations = useMemo(() => toUiReservations(state.board), [state.board]);
  const reservations = useMemo(() => allReservations.filter((item) => {
    const statusMatch = state.statusFilter === "all"
      || item.serviceStatus === state.statusFilter
      || (state.statusFilter === "attention" && Boolean(item.exceptionLabel))
      || (state.statusFilter === "unassigned" && item.tableIds.length === 0);
    return statusMatch && matchesReservation(item, deferredQuery);
  }), [allReservations, deferredQuery, state.statusFilter]);
  const queueGroups = useMemo(() => buildQueueGroups(reservations), [reservations]);
  const attentionCount = useMemo(
    () => allReservations.filter((item) => Boolean(item.exceptionLabel)).length,
    [allReservations],
  );
  const nextArrival = useMemo(
    () => allReservations
      .filter((item) => item.lifecycleStatus !== "cancelled" && ["expected", "late", "no_contact"].includes(item.serviceStatus))
      .sort((left, right) => left.startAt.localeCompare(right.startAt))
      .at(0)?.startLabel ?? "なし",
    [allReservations],
  );
  const selectedReservation = allReservations.find((item) => item.id === state.selectedReservationId) ?? null;
  const quickAction = selectedReservation?.serviceStatus === "paid"
      && selectedReservation.tableIds.length > 0
    ? "release" as const
    : turnoverContext?.businessDate === businessDate
        && turnoverContext.nextReservationId === selectedReservation?.id
        && selectedReservation.lifecycleStatus === "confirmed"
      ? "next_check_in" as const
      : null;
  const isDemo = auth.status === "authenticated" && auth.session.mode === "demo";
  const isOwner = auth.status === "authenticated"
    && (auth.session.role === "owner" || auth.session.role === "owner-compatible-demo");
  const canMutate = isOwner;
  const ticketOperationsAvailable = isOwner && (
    ticketOperationsCapabilities.managerOperationsEnabled
    || ticketOperationsCapabilities.refundReviewEnabled
  );
  const canCommand = (kind: CommandKind) => canMutate
    && auth.status === "authenticated"
    && !!auth.session?.role
    && (
      auth.session.role === "owner-compatible-demo"
      || canExecuteVipCommand(auth.session.role, kind)
    );

  useEffect(() => {
    if (!isOwner) return;
    let cancelled = false;
    void loadStaff().then((data) => {
      if (!cancelled) setStaffData(data);
    });
    return () => {
      cancelled = true;
    };
  }, [businessDate, isOwner, loadStaff]);

  useEffect(() => {
    if (!menuOpen) return;
    const frame = window.requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>("button")?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [menuOpen]);

  useEffect(() => {
    if (!state.mobileInspectorOpen) return;
    const frame = window.requestAnimationFrame(() => {
      mobileSheetRef.current?.querySelector<HTMLElement>("button")?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [state.mobileInspectorOpen]);

  const readOnly = offline
    || ["loading", "stale", "reconnecting", "error", "read_only"].includes(state.globalState)
    || !state.board.operations.adminMutationEnabled
    || !canMutate;
  // Opening the intake desk is a read action. A day without an event_day falls
  // back to an empty board and its revision stream can become stale, but the
  // operator still needs this entry point to choose a different date for a
  // phone reservation. Actual writes remain guarded by runOperation after the
  // target day's canonical board loads.
  const operationEntryBlocked = offline
    || ["loading", "error"].includes(state.globalState)
    || !isOwner;

  const updateRoute = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(window.location.search);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    const query = params.toString();
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  }, [pathname]);

  useEffect(() => {
    const nextView = parseWorkspaceView(searchParams.get("view"));
    if (state.view !== nextView) dispatch({ type: "view", view: nextView });

    const nextQuery = searchParams.get("q") ?? "";
    if (state.query !== nextQuery) dispatch({ type: "query", query: nextQuery });

    const status = searchParams.get("filter");
    const nextStatus = status && STATUS_FILTERS.has(status) ? status : "all";
    if (state.statusFilter !== nextStatus) dispatch({ type: "statusFilter", status: nextStatus });

    const date = searchParams.get("date");
    // A phone-reservation date switch verifies options and then loads the
    // canonical board before replacing the URL. Do not let the still-old URL
    // race that in-flight load and abort it by restoring the previous date.
    if (
      !operationDatePending
      && date
      && DATE_PATTERN.test(date)
      && date !== businessDate
    ) {
      void setBusinessDate(date);
    }
  }, [
    businessDate,
    dispatch,
    operationDatePending,
    searchParams,
    setBusinessDate,
    state.query,
    state.statusFilter,
    state.view,
  ]);

  function switchView(view: WorkspaceView) {
    dispatch({ type: "view", view });
    setMenuOpen(false);
    updateRoute({ view: view === "timeline" ? "chart" : view });
  }

  function applyStatusFilter(status: string) {
    const next = state.statusFilter === status ? "all" : status;
    dispatch({ type: "statusFilter", status: next });
    updateRoute({ filter: next === "all" ? null : next });
  }

  function changeInspectorTab(tab: InspectorTab) {
    updateRoute({ detail: tab === "overview" ? null : tab });
  }

  function selectReservation(id: string) {
    dispatch({ type: "selectReservation", reservationId: id });
    dispatch({ type: "inspectorCollapsed", collapsed: false });
    if (window.matchMedia("(max-width: 1023px)").matches) {
      dispatch({ type: "mobileInspector", open: true });
    }
  }

  function openCommand(kind: CommandKind) {
    if (!selectedReservation || readOnly || !canCommand(kind)) return;
    dispatch({ type: "openCommand", kind });
  }

  async function runTurnoverAction() {
    if (!selectedReservation || readOnly || state.pending) return;

    if (quickAction === "release") {
      if (!canCommand("service_status")) return;
      const releasedTableId = selectedReservation.tableIds[0] ?? null;
      const next = findNextTurnoverReservation(selectedReservation, allReservations);
      const succeeded = await runCommand({
        kind: "service_status",
        reservationId: selectedReservation.id,
        expectedVersion: selectedReservation.version,
        payload: {
          occurredAt: new Date().toISOString(),
          serviceStatus: "completed",
        },
      });
      if (!succeeded) return;

      setTurnoverContext(next ? { ...next, businessDate } : null);
      if (next) {
        dispatch({ type: "selectReservation", reservationId: next.nextReservationId });
        dispatch({
          type: "selectTable",
          tableId: next.tableId,
          reservationId: next.nextReservationId,
        });
      } else if (releasedTableId) {
        dispatch({ type: "selectTable", tableId: releasedTableId, reservationId: null });
      }
      return;
    }

    if (
      quickAction === "next_check_in"
      && turnoverContext
      && canCommand("check_in")
    ) {
      const succeeded = await runCommand({
        kind: "check_in",
        reservationId: selectedReservation.id,
        expectedVersion: selectedReservation.version,
        payload: { occurredAt: new Date().toISOString() },
      });
      if (succeeded) setTurnoverContext(null);
    }
  }

  async function openOperation() {
    if (operationEntryBlocked) return;
    dispatch({ type: "clearConflict" });
    setEditingReservationId(null);
    setOperationOpen(true);
    setOperationOptions(null);
    setOperationBusinessDates([]);
    setOperationDatePending(true);
    try {
      const nextOptions = await loadOperationOptions();
      setOperationOptions(nextOptions);
      if (!nextOptions) {
        setOperationBusinessDatesPending(true);
        void loadOperationBusinessDays().then(setOperationBusinessDates).finally(() => {
          setOperationBusinessDatesPending(false);
        });
      }
    } finally {
      setOperationDatePending(false);
    }
  }

  async function openReservationEdit() {
    if (readOnly || !isOwner || !selectedReservation) return;
    dispatch({ type: "clearConflict" });
    dispatch({ type: "mobileInspector", open: false });
    setEditingReservationId(selectedReservation.id);
    setOperationOpen(true);
    setOperationBusinessDates([]);
    setOperationOptions(await loadOperationOptions());
  }

  async function changeOperationBusinessDate(nextBusinessDate: string) {
    if (
      !DATE_PATTERN.test(nextBusinessDate)
      || editingReservationId
      || operationDatePending
    ) {
      return false;
    }

    setOperationDatePending(true);
    dispatch({ type: "clearConflict" });
    try {
      const nextOptions = await loadOperationOptions(nextBusinessDate);
      if (!nextOptions) {
        setOperationBusinessDatesPending(true);
        setOperationBusinessDates(await loadOperationBusinessDays(nextBusinessDate));
        setOperationBusinessDatesPending(false);
        return false;
      }

      const boardLoaded = await setBusinessDate(nextBusinessDate);
      if (!boardLoaded) return false;

      setOperationOptions(nextOptions);
      setOperationBusinessDates([]);
      updateRoute({ date: nextBusinessDate });
      return true;
    } finally {
      setOperationDatePending(false);
    }
  }

  async function refreshWaitlist() {
    const entries = await loadWaitlist();
    if (entries) setWaitlistEntries(entries);
  }

  async function openWaitlist() {
    if (!isOwner) return;
    setMenuOpen(false);
    setWaitlistOpen(true);
    await refreshWaitlist();
  }

  async function refreshStaff() {
    setStaffData(await loadStaff());
  }

  async function openStaff() {
    if (!isOwner) return;
    setMenuOpen(false);
    setStaffOpen(true);
    await refreshStaff();
  }

  function openQueue() {
    setMenuOpen(false);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      dispatch({ type: "mobileInspector", open: false });
      setQueueOpen(true);
    } else {
      applyStatusFilter("attention");
    }
  }

  function openTicketOperations() {
    if (!isOwner || !ticketOperationsAvailable) return;
    setMenuOpen(false);
    setTicketOperationsOpen(true);
  }

  function closeTicketOperations() {
    setTicketOperationsOpen(false);
    window.requestAnimationFrame(() => {
      const trigger = [desktopMenuButtonRef.current, menuButtonRef.current]
        .find((element) => element && element.getClientRects().length > 0);
      trigger?.focus();
    });
  }

  if (auth.status !== "authenticated") {
    if (demo.leaseState === "expired" && demo.config) {
      return (
        <DemoModeProvider value={{
          enabled: true,
          expiresAt: demo.config.expiresAt,
          leaseState: "expired",
        }}>
          <DemoExpiryBoundary onLogout={logout} />
        </DemoModeProvider>
      );
    }
    /* The session probe is boot, not a sign-in screen. Rendering the full
     * OWNER ACCESS frame for it built a two-column login page — display
     * wordmark, floor-plan figure, a right column more than half empty — and
     * then threw it away a second later. The probe now shares one frame with
     * the route Suspense fallback and `app/loading.tsx`, so a cold load holds
     * a single surface until the ledger replaces it. */
    if (auth.status === "checking") {
      return <VipBootScreen label="Ownerの認証情報を確認しています。" />;
    }
    if (!demo.config) {
      const lockedOwnerAccess = auth.status === "locked";
      return (
        <DemoModeProvider value={{
          enabled: false,
          expiresAt: null,
          leaseState: "inactive",
        }}>
          <main className={styles.loginShell}>
            <div className={styles.loginFrame}>
              <section className={styles.loginIdentity} aria-label="GHOST Osaka VIP Manager">
                <div className={styles.loginIdentityHead}>
                  <span className={styles.loginMark} aria-hidden>G</span>
                  <div className={styles.loginBrand}>
                    <span>GHOST OSAKA</span>
                    <strong>VIP MANAGER</strong>
                  </div>
                </div>
                <div className={styles.loginIdentityBody} aria-hidden>
                  <span>FLOOR OPERATIONS</span>
                  <strong>VIP<br />MANAGER</strong>
                  <p>予約・来店・VIP席を、ひとつの台帳で。</p>
                </div>
                <figure className={styles.loginPlan}>
                  <div
                    className={styles.loginPlanArtwork}
                    role="img"
                    aria-label="GHOST Osaka 1階VIPフロア座席図"
                  />
                  <figcaption>
                    <span>GHOST OSAKA</span>
                    <strong>1F VIP FLOOR</strong>
                  </figcaption>
                </figure>
              </section>

              <section className={styles.loginPanel} aria-labelledby="owner-access-title">
                <div className={styles.loginAccess}>
                  <span>OWNER ACCESS</span>
                </div>
                <div className={styles.loginIntro}>
                  <h1 id="owner-access-title">
                    {lockedOwnerAccess ? "端末をロックしました" : "接続を完了できませんでした"}
                  </h1>
                  <p>
                    {lockedOwnerAccess
                      ? "Ownerの認証情報を入力し直すまで、予約台帳は開きません。"
                      : "通信状態を確認し、もう一度接続してください。"}
                  </p>
                </div>
                {lockedOwnerAccess ? (
                  <form
                    className={styles.loginUnlockForm}
                    onSubmit={(event) => {
                      event.preventDefault();
                      setUnlockFailed(false);
                      void unlock({ username: unlockUsername, password: unlockPassword }).then((ok) => {
                        if (!ok) {
                          setUnlockPassword("");
                          setUnlockFailed(true);
                        }
                      });
                    }}
                  >
                    <label>
                      <span>ユーザー名</span>
                      <input
                        data-credential
                        name="username"
                        autoComplete="username"
                        value={unlockUsername}
                        onChange={(event) => setUnlockUsername(event.target.value)}
                        required
                      />
                    </label>
                    <label>
                      <span>パスワード</span>
                      <input
                        data-credential
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        value={unlockPassword}
                        onChange={(event) => setUnlockPassword(event.target.value)}
                        aria-invalid={unlockFailed || undefined}
                        required
                      />
                    </label>
                    <p className={styles.loginMessage} data-tone={unlockFailed ? "danger" : undefined} aria-live="polite">
                      {unlockFailed ? "認証情報を確認してください。" : "ブラウザに残るBasic認証だけでは解除できません。"}
                    </p>
                    <button type="submit" disabled={state.pending}>
                      <ShieldCheck size={18} aria-hidden />
                      {state.pending ? "確認中…" : "ロックを解除"}
                    </button>
                  </form>
                ) : (
                  <div className={styles.ownerAccessStatus} role="status" aria-live="polite">
                    <span aria-hidden />
                    再接続が必要です
                  </div>
                )}
                {!lockedOwnerAccess ? (
                  <button type="button" onClick={() => window.location.reload()}>
                    <RefreshCw size={18} aria-hidden />
                    再接続
                  </button>
                ) : null}
                <p className={styles.loginHint}>
                  {lockedOwnerAccess
                    ? "共有端末では、離席前にこのロックを使用してください。"
                    : "ブラウザのBasic認証から直接、管理台帳へ移動します。"}
                </p>
              </section>
            </div>
          </main>
        </DemoModeProvider>
      );
    }
    return (
      <DemoModeProvider value={{
        enabled: true,
        expiresAt: demo.config.expiresAt,
        leaseState: demo.leaseState,
      }}>
        <main className={styles.loginShell}>
          <div className={styles.loginFrame}>
            <section className={styles.loginIdentity} aria-label="GHOST Osaka VIP Manager">
              <div className={styles.loginIdentityHead}>
                <span className={styles.loginMark} aria-hidden>G</span>
                <div className={styles.loginBrand}>
                  <span>GHOST OSAKA</span>
                  <strong>VIP MANAGER</strong>
                </div>
              </div>
              <div className={styles.loginIdentityBody} aria-hidden>
                <span>FLOOR OPERATIONS</span>
                <strong>VIP<br />MANAGER</strong>
                <p>予約・来店・VIP席を、ひとつの台帳で。</p>
              </div>
              <figure className={styles.loginPlan}>
                <div
                  className={styles.loginPlanArtwork}
                  role="img"
                  aria-label="GHOST Osaka 1階VIPフロア座席図"
                />
                <figcaption>
                  <span>GHOST OSAKA</span>
                  <strong>1F VIP FLOOR</strong>
                </figcaption>
              </figure>
            </section>

            <section className={styles.loginPanel} aria-labelledby="demo-access-title">
              <div className={styles.loginAccess}>
                <span>DEMO ACCESS</span>
              </div>
              <div className={styles.loginIntro}>
                <h1 id="demo-access-title">VIP予約デモへ再接続</h1>
                <p>ブラウザのBasic認証を確認して再接続してください。</p>
              </div>
              <DemoCue />
              <button
                type="button"
                aria-label="Basic認証を確認してフロアへ再接続"
                disabled={state.pending}
                onClick={() => void reconnect()}
              >
                <ShieldCheck size={18} aria-hidden />
                {state.pending ? "確認中…" : "再接続"}
              </button>
              <p className={styles.loginHint}>
                合成データのみを使用し、Production予約は変更しません。
              </p>
            </section>
          </div>
        </main>
      </DemoModeProvider>
    );
  }

  if (isDemo && demo.leaseState === "expired") {
    return (
      <DemoModeProvider value={{
        enabled: true,
        expiresAt: demo.config?.expiresAt ?? null,
        leaseState: "expired",
      }}>
        <DemoExpiryBoundary onLogout={logout} />
      </DemoModeProvider>
    );
  }

  const busy = state.pending || ["loading", "reconnecting"].includes(state.globalState);
  const showNotice = ["stale", "read_only"].includes(state.globalState) || !isOwner;
  const pulseItems: Array<{
    key: string;
    label: string;
    value: ReactNode;
    filter?: string;
    alert?: boolean;
    optional?: boolean;
  }> = [
    { key: "total", label: "予約", value: state.board.totals.reservationCount },
    { key: "next", label: "次の来店", value: nextArrival, optional: true },
    { key: "attention", label: "要対応", value: attentionCount, filter: "attention", alert: attentionCount > 0 },
    {
      key: "unassigned",
      label: "卓未定",
      value: state.board.totals.unassignedReservationCount,
      filter: "unassigned",
      alert: state.board.totals.unassignedReservationCount > 0,
    },
  ];

  return (
    <DemoModeProvider value={{
      enabled: isDemo,
      expiresAt: demo.config?.expiresAt ?? null,
      leaseState: demo.leaseState,
    }}>
    <main className={styles.workspace} data-state={state.globalState}>
      <a href="#vip-workspace-main" className={styles.skipLink}>メイン作業領域へ</a>

      <header className={styles.serviceRibbon}>
        <div className={styles.venueIdentity}>
          <span>GHOST OSAKA</span>
          <strong>VIP MANAGER</strong>
        </div>
        <DemoCue compact className={styles.ribbonDemoCue} />
        <BusinessDateField
          variant="ribbon"
          label="営業日"
          value={businessDate}
          onChange={(next) => {
            if (!next) return;
            void setBusinessDate(next);
            updateRoute({ date: next });
          }}
        />
        <div className={styles.pulseCluster} aria-label="本日の稼働状況">
          {pulseItems.map((item) => (item.filter ? (
            <button
              key={item.key}
              type="button"
              data-alert={item.alert || undefined}
              data-zero={item.value === 0 || item.value === "0" ? "" : undefined}
              data-active={state.statusFilter === item.filter || undefined}
              data-optional={item.optional || undefined}
              aria-pressed={state.statusFilter === item.filter}
              onClick={() => applyStatusFilter(item.filter as string)}
            >
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </button>
          ) : (
            <div
              key={item.key}
              data-optional={item.optional || undefined}
              data-zero={item.value === 0 || item.value === "0" ? "" : undefined}
            >
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          )))}
        </div>

        <div className={styles.syncStatus} data-state={state.globalState}>
          {offline ? <WifiOff size={14} aria-hidden /> : <RefreshCw size={14} aria-hidden />}
          <span>{SYNC_LABEL[state.globalState] ?? "同期済み"}</span>
          <strong className="tabular-nums">
            {new Intl.DateTimeFormat("ja-JP", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Tokyo",
            }).format(new Date(state.board.generatedAt))}
          </strong>
        </div>
        <div className={styles.operatorIdentity}>
          <span>{auth.session.displayName ?? "Owner"} / {isDemo ? "デモ" : isOwner ? "Owner" : "閲覧のみ"}</span>
          <button type="button" onClick={() => void logout()}><LogOut size={14} aria-hidden />端末をロック</button>
        </div>
      </header>

      <section className={styles.mobileQueue} data-open={queueOpen || undefined} aria-label="例外キュー">
        <header>
          <div><span>GHOST OSAKA</span><strong>例外キュー</strong></div>
          <button type="button" onClick={() => setQueueOpen(false)} aria-label="例外キューを閉じる"><X size={18} /></button>
        </header>
        <ExceptionRail
          groups={queueGroups}
          reservations={reservations}
          selectedId={state.selectedReservationId}
          collapsed={false}
          query={state.query}
          showSearch
          onQuery={(query) => dispatch({ type: "query", query })}
          onSelect={(id) => {
            selectReservation(id);
            setQueueOpen(false);
          }}
          onCollapse={() => setQueueOpen(false)}
        />
      </section>

      <section className={styles.primaryArea} id="vip-workspace-main">
        <section className={styles.mobileSummary} aria-label="本日のVIP予約サマリー">
          {pulseItems.map((item) => (item.filter ? (
            <button
              key={item.key}
              type="button"
              data-alert={item.alert || undefined}
              data-zero={item.value === 0 || item.value === "0" ? "" : undefined}
              data-active={state.statusFilter === item.filter || undefined}
              data-optional={item.optional || undefined}
              aria-pressed={state.statusFilter === item.filter}
              onClick={() => applyStatusFilter(item.filter as string)}
            >
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </button>
          ) : (
            <div
              key={item.key}
              data-optional={item.optional || undefined}
              data-zero={item.value === 0 || item.value === "0" ? "" : undefined}
            >
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          )))}
          <button
            type="button"
            className={styles.summaryRefresh}
            onClick={() => void loadBoard()}
            disabled={state.pending}
            aria-label="台帳を再読込"
          >
            <RefreshCw size={18} aria-hidden />
          </button>
        </section>

        <div className={styles.workspaceToolbar} role="toolbar" aria-label="表示と絞り込み">
          <button
            type="button"
            className={`${styles.primaryButton} ${styles.desktopCreate}`}
            onClick={() => void openOperation()}
            disabled={operationEntryBlocked}
            aria-label={`新規オペレーション（${isOwner ? "Walk-in・事前予約・受付ブロック" : "Owner専用"}）`}
          >
            <CalendarPlus size={18} aria-hidden />新規受付
          </button>
          <div className={styles.viewSwitcher} role="group" aria-label="表示切替">
            <button type="button" aria-label="List" data-active={state.view === "list" || undefined} onClick={() => switchView("list")}>
              <ClipboardList size={16} aria-hidden /><span>予約一覧</span>
            </button>
            <button type="button" aria-label="Floor" data-active={state.view === "floor" || undefined} onClick={() => switchView("floor")}>
              <LayoutGrid size={16} aria-hidden /><span>フロア</span>
            </button>
            <button type="button" aria-label="Chart" data-active={state.view === "timeline" || undefined} onClick={() => switchView("timeline")}>
              <ChartNoAxesGantt size={16} aria-hidden /><span>チャート</span>
            </button>
          </div>
          <label className={styles.toolbarSearch}>
            <Search size={14} aria-hidden />
            <span className="sr-only">予約検索</span>
            <input
              value={state.query}
              onChange={(event) => {
                dispatch({ type: "query", query: event.target.value });
                updateRoute({ q: event.target.value || null });
              }}
              placeholder="番号 / ゲスト / 席"
            />
          </label>
          <label className={styles.toolbarSelect}>
            <span>ステータス</span>
            <select
              aria-label="予約ステータス"
              value={state.statusFilter}
              onChange={(event) => {
                dispatch({ type: "statusFilter", status: event.target.value });
                updateRoute({ filter: event.target.value === "all" ? null : event.target.value });
              }}
            >
              <option value="all">全て</option>
              <option value="attention">要確認</option>
              <option value="unassigned">卓未定</option>
              <option value="expected">来店予定</option>
              <option value="late">遅延</option>
              <option value="arrived">到着</option>
              <option value="seated">着席</option>
              <option value="bill_requested">会計</option>
            </select>
          </label>
          {state.view === "floor" && staffData ? (
            <label className={styles.toolbarSelect}>
              <span>担当</span>
              <select
                aria-label="担当スタッフでFloorを絞り込み"
                value={staffFilter}
                onChange={(event) => setStaffFilter(event.target.value)}
              >
                <option value="">全担当</option>
                <option value="unassigned">担当なし</option>
                {staffData.staffMembers.filter((member) => member.active).map((member) => (
                  <option key={member.id} value={member.id}>{member.displayName}</option>
                ))}
              </select>
            </label>
          ) : null}
          <button
            ref={desktopMenuButtonRef}
            type="button"
            className={`${styles.paneButton} ${styles.desktopMenu}`}
            aria-label="メニュー"
            aria-expanded={menuOpen}
            data-active={menuOpen || undefined}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Menu size={18} />
          </button>
        </div>

        {showNotice ? (
          <div className={styles.stateBanner} role="status" data-tone={offline ? "danger" : "warning"}>
            {offline ? <WifiOff size={16} aria-hidden /> : <AlertTriangle size={16} aria-hidden />}
            <strong>{offline ? "オフライン" : !isOwner ? "Owner専用・閲覧のみ" : "閲覧のみ"}</strong>
            <span>{!isOwner ? "更新操作と個人情報の閲覧はOwnerだけが実行できます。" : state.stateDescription}</span>
          </div>
        ) : null}

        <div className={styles.liveMessage} aria-live="polite" data-visible={busy || undefined}>
          <span>{state.pending ? "処理中" : "更新中"}</span>
          <p>{state.message}</p>
          <strong className="tabular-nums">REV {state.board.boardRevision}</strong>
        </div>

        <div className={styles.viewFrame}>
          {state.globalState === "loading" ? <WorkspaceSkeleton label="VIP Floorを読み込んでいます" /> : null}
          {state.globalState === "error" ? <ErrorState description={state.stateDescription} onRetry={() => void loadBoard()} /> : null}
          {!["loading", "error"].includes(state.globalState) && state.view === "floor" ? (
            <FloorView
              board={state.board}
              reservations={reservations}
              selectedReservationId={state.selectedReservationId}
              selectedTableId={state.selectedTableId}
              onSelectTable={(tableId, reservationId) => {
                dispatch({ type: "selectTable", tableId, reservationId });
                if (reservationId && window.matchMedia("(max-width: 1023px)").matches) {
                  selectReservation(reservationId);
                }
              }}
              onSelectReservation={selectReservation}
              onOpenAssignment={() => openCommand("assignment")}
              staffData={staffData}
              staffFilter={staffFilter}
            />
          ) : null}
          {!["loading", "error"].includes(state.globalState) && state.view === "timeline" ? (
            <ChartView
              board={state.board}
              reservations={reservations}
              selectedReservationId={state.selectedReservationId}
              zoom={state.timelineZoom}
              onZoom={(zoom) => dispatch({ type: "zoom", zoom })}
              onSelect={selectReservation}
            />
          ) : null}
          {!["loading", "error"].includes(state.globalState) && state.view === "list" ? (
            <ReservationListView
              reservations={reservations}
              selectedReservationId={state.selectedReservationId}
              density={state.density}
              emptyMessage={allReservations.length === 0
                ? "この営業日の予約はありません。新規受付から登録できます。"
                : "一致する予約はありません。検索またはステータス条件を解除してください。"}
              onDensity={(density) => dispatch({ type: "density", density })}
              onSelect={selectReservation}
            />
          ) : null}
        </div>
      </section>

      {/* The right column is either the selected reservation or what needs
          attention — never a second copy of the ledger. */}
      <div className={styles.desktopInspector}>
        {!selectedReservation && !state.selectedTableId && !state.inspectorCollapsed ? (
          <ExceptionRail
            groups={queueGroups}
            reservations={reservations}
            selectedId={state.selectedReservationId}
            collapsed={false}
            query={state.query}
            onQuery={(query) => {
              dispatch({ type: "query", query });
              updateRoute({ q: query || null });
            }}
            onSelect={selectReservation}
            onCollapse={() => dispatch({ type: "inspectorCollapsed", collapsed: true })}
          />
        ) : (
        <Inspector
          board={state.board}
          reservation={selectedReservation}
          selectedTableId={state.selectedTableId}
	          history={state.history}
	          staffData={staffData}
          collapsed={state.inspectorCollapsed}
          instance="desktop"
          readOnly={readOnly}
          pending={state.pending}
          quickAction={quickAction}
          activeTab={inspectorTab}
          canCommand={canCommand}
          onTabChange={changeInspectorTab}
          onCollapse={(collapsed) => dispatch({ type: "inspectorCollapsed", collapsed })}
          onCommand={openCommand}
          onQuickAction={() => void runTurnoverAction()}
          onEdit={() => void openReservationEdit()}
          onCustomerDetails={() => {
            dispatch({ type: "mobileInspector", open: false });
            setCustomerOpen(true);
          }}
        />
        )}
      </div>

      {menuOpen ? (
        <section
          ref={menuRef}
          className={styles.shellMenu}
          role="dialog"
          aria-modal="false"
          aria-labelledby="workspace-menu-title"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setMenuOpen(false);
              menuButtonRef.current?.focus();
            }
          }}
        >
          <header>
            <div><span>GHOST OSAKA</span><strong id="workspace-menu-title">メニュー</strong></div>
            <button type="button" onClick={() => setMenuOpen(false)} aria-label="メニューを閉じる"><X size={18} /></button>
          </header>
          <div className={styles.shellMenuGrid}>
            <button type="button" onClick={() => void loadBoard()} disabled={state.pending}>
              <RefreshCw size={18} aria-hidden /><span>再読込</span>
            </button>
            <button type="button" aria-label="待機リスト" onClick={() => void openWaitlist()}>
              <BellRing size={18} aria-hidden /><span>待機リスト</span>
            </button>
            <button type="button" onClick={openQueue}>
              <AlertTriangle size={18} aria-hidden /><span>要対応</span>
            </button>
            <button type="button" aria-label="SLO 稼働状況" onClick={() => {
              setMenuOpen(false);
              setObservabilityOpen(true);
            }}>
              <Activity size={18} aria-hidden /><span>稼働状況</span>
            </button>
            <button type="button" onClick={() => void openStaff()}>
              <ShieldCheck size={18} aria-hidden /><span>担当卓</span>
            </button>
            {ticketOperationsAvailable ? (
              <button type="button" onClick={openTicketOperations}>
                <TicketCheck size={18} aria-hidden /><span>チケット対応</span>
              </button>
            ) : null}
            {isDemo ? (
              <button type="button" onClick={() => {
                setMenuOpen(false);
                setResetOpen(true);
              }}>
                <RotateCcw size={18} aria-hidden /><span>デモ初期化</span><small>合成台帳のみ</small>
              </button>
            ) : null}
            <button type="button" onClick={() => void logout()}>
              <LogOut size={18} aria-hidden /><span>端末をロック</span>
            </button>
          </div>
        </section>
      ) : null}

      <nav className={styles.primaryNav} aria-label="主要ナビゲーション">
        <button
          type="button"
          disabled={operationEntryBlocked}
          aria-label={`新規オペレーション（${isOwner ? "Walk-in・事前予約・受付ブロック" : "Owner専用"}）`}
          onClick={() => void openOperation()}
        >
          {/* Pinned by tests/contract/operations-adapter.test.mjs: on phones this
              tab is the only place the entry point discloses that it covers both
              reservations and walk-ins, so the qualifier is capability, not decoration. */}
          <CalendarPlus size={20} aria-hidden /><span>受付</span><small>{isOwner ? "予約・Walk-in" : "Ownerのみ"}</small>
        </button>
        <button type="button" aria-label="List" aria-current={state.view === "list" ? "page" : undefined} data-active={state.view === "list" || undefined} onClick={() => switchView("list")}>
          <ClipboardList size={20} aria-hidden /><span>一覧</span>
        </button>
        <button type="button" aria-label="Floor" aria-current={state.view === "floor" ? "page" : undefined} data-active={state.view === "floor" || undefined} onClick={() => switchView("floor")}>
          <LayoutGrid size={20} aria-hidden /><span>フロア</span>
        </button>
        <button type="button" aria-label="Chart" aria-current={state.view === "timeline" ? "page" : undefined} data-active={state.view === "timeline" || undefined} onClick={() => switchView("timeline")}>
          <ChartNoAxesGantt size={20} aria-hidden /><span>チャート</span>
        </button>
        <button
          ref={menuButtonRef}
          type="button"
          aria-label="メニュー"
          aria-expanded={menuOpen}
          data-active={menuOpen || undefined}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Menu size={20} aria-hidden /><span>メニュー</span>
        </button>
      </nav>

      <div
        ref={mobileSheetRef}
        className={styles.mobileSheet}
        data-open={state.mobileInspectorOpen || undefined}
        role={state.mobileInspectorOpen ? "dialog" : undefined}
        aria-modal={state.mobileInspectorOpen || undefined}
        aria-label="予約詳細"
        onKeyDown={(event) => trapKeyboardFocus(event, () => dispatch({ type: "mobileInspector", open: false }))}
      >
        <button
          type="button"
          className={styles.sheetClose}
          onClick={() => dispatch({ type: "mobileInspector", open: false })}
        >
          <X size={18} aria-hidden />閉じる
        </button>
        <Inspector
          board={state.board}
          reservation={selectedReservation}
          selectedTableId={state.selectedTableId}
	          history={state.history}
	          staffData={staffData}
          instance="mobile"
          readOnly={readOnly}
          pending={state.pending}
          quickAction={quickAction}
          activeTab={inspectorTab}
          canCommand={canCommand}
          onTabChange={changeInspectorTab}
          onCommand={openCommand}
          onQuickAction={() => void runTurnoverAction()}
          onEdit={() => void openReservationEdit()}
          onCustomerDetails={() => {
            dispatch({ type: "mobileInspector", open: false });
            setCustomerOpen(true);
          }}
        />
      </div>

      <CommandCenter
        key={`${state.command.kind}:${state.command.open ? "open" : "closed"}`}
        open={state.command.open}
        kind={state.command.kind}
        step={state.command.step}
        pending={state.pending}
        board={state.board}
        reservation={selectedReservation}
        selectedTableId={state.selectedTableId}
        conflict={state.conflict && !state.conflict.ok ? state.conflict : null}
        onClose={() => dispatch({ type: "closeCommand" })}
        onStep={(step) => dispatch({ type: "commandStep", step })}
        onRun={(draft) => void runCommand(draft)}
      />

      <OperationCenter
        key={operationOpen ? "open" : "closed"}
        open={operationOpen}
        pending={state.pending}
        board={state.board}
        options={operationOptions}
        datePending={operationDatePending}
        suggestedBusinessDates={operationBusinessDates}
        suggestionsPending={operationBusinessDatesPending}
        selectedTableId={editingReservationId || !state.selectedReservationId
          ? state.selectedTableId
          : null}
        conflict={state.conflict}
        staffData={staffData}
        editReservation={
          allReservations.find((item) => item.id === editingReservationId) ?? null
        }
        onClose={() => {
          dispatch({ type: "clearConflict" });
          setOperationOpen(false);
          setEditingReservationId(null);
          setOperationOptions(null);
          setOperationBusinessDates([]);
          setOperationDatePending(false);
          setOperationBusinessDatesPending(false);
        }}
        onRun={runOperation}
        onBusinessDateChange={changeOperationBusinessDate}
      />

      <WaitlistPanel
        open={waitlistOpen}
        pending={state.pending}
        board={state.board}
        entries={waitlistEntries}
        onClose={() => setWaitlistOpen(false)}
        onRefresh={refreshWaitlist}
        onAction={runWaitlistAction}
      />

      <StaffPanel
        open={staffOpen}
        pending={state.pending}
        board={state.board}
        data={staffData}
        onClose={() => setStaffOpen(false)}
        onRefresh={refreshStaff}
        onAction={runStaffAction}
      />

      <CustomerPanel
        key={`${selectedReservation?.id ?? "none"}:${customerOpen ? "open" : "closed"}`}
        open={customerOpen}
        eventDayId={state.board.businessDay.id}
        reservation={selectedReservation}
        pending={state.pending}
        onClose={() => setCustomerOpen(false)}
        onLoadCustomer={loadCustomer}
        onSaveCustomer={updateCustomer}
        onRelinkCustomer={relinkCustomer}
        onChanged={async () => {
          await loadBoard();
        }}
      />

      <ObservabilityPanel
        open={observabilityOpen}
        onClose={() => setObservabilityOpen(false)}
        onLoad={loadObservability}
      />
      {ticketOperationsAvailable ? (
        <TicketOperationsPanel
          open={ticketOperationsOpen}
          mode={isDemo ? "demo" : "production"}
          displayCapabilities={ticketOperationsCapabilities}
          onClose={closeTicketOperations}
        />
      ) : null}
      <DemoResetDialog
        open={resetOpen}
        pending={state.pending}
        businessDate={businessDate}
        onCancel={() => setResetOpen(false)}
        onConfirm={async () => {
          const reset = await resetDemo();
          if (reset) setResetOpen(false);
        }}
      />
    </main>
    </DemoModeProvider>
  );
}

function WorkspaceSkeleton({ label }: { label: string }) {
  return (
    <div className={styles.skeletonState} aria-busy="true" aria-label={label}>
      <div /><div /><div /><div /><div /><span>{label}</span>
    </div>
  );
}

function ErrorState({ description, onRetry }: { description: string; onRetry: () => void }) {
  return (
    <div className={styles.centerState} role="alert">
      <AlertTriangle size={28} aria-hidden />
      <h2>予約状態を読み込めません</h2>
      <p>{description}</p>
      <button type="button" className={styles.primaryButton} onClick={onRetry}>
        <RefreshCw size={16} aria-hidden />再読込
      </button>
    </div>
  );
}
