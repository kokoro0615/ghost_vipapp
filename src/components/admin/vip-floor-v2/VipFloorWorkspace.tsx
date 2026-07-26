"use client";

import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { type FormEvent, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  CalendarPlus,
  CalendarDays,
  ChartNoAxesGantt,
  ClipboardList,
  LayoutGrid,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelRightClose,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  UsersRound,
  WifiOff,
  X,
} from "lucide-react";

import { CommandCenter } from "./commands/CommandCenter";
import { buildQueueGroups, matchesReservation, toUiReservations } from "./contract/viewModel";
import type { CommandKind, WorkspaceView } from "./contract/uiTypes";
import FloorView from "./floor/FloorView";
import { Inspector, INSPECTOR_TABS, type InspectorTab } from "./inspector/Inspector";
import { OperationCenter } from "./operations/OperationCenter";
import { ExceptionRail } from "./shell/ExceptionRail";
import { useVipFloorWorkspace } from "./state/useVipFloorWorkspace";
import { StaffPanel } from "./staff/StaffPanel";
import { WaitlistPanel } from "./waitlist/WaitlistPanel";
import styles from "./VipFloorWorkspace.module.css";
import { canExecuteVipCommand } from "@/lib/adminPermissions";
import type { OperationOptions } from "./contract/uiTypes";
import type { WaitlistEntry } from "./contract/uiTypes";
import type { StaffWorkspaceData } from "./contract/uiTypes";

const ChartView = dynamic(() => import("./chart/ChartView"), {
  loading: () => <WorkspaceSkeleton label="Chartを準備中" />,
});
const ReservationListView = dynamic(() => import("./list/ReservationListView"), {
  loading: () => <WorkspaceSkeleton label="予約一覧を準備中" />,
});

const ROUTE_VIEWS = new Set(["floor", "list", "chart"]);
const STATUS_FILTERS = new Set(["all", "attention", "expected", "late", "arrived", "seated", "bill_requested"]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

function parseWorkspaceView(value: string | null): WorkspaceView {
  if (!value || !ROUTE_VIEWS.has(value)) return "list";
  if (value === "floor" || value === "list") return value;
  return "timeline";
}

function parseInspectorTab(value: string | null): InspectorTab {
  return INSPECTOR_TABS.some((tab) => tab.key === value) ? value as InspectorTab : "overview";
}

export default function VipFloorWorkspace() {
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
    loadWaitlist,
    runWaitlistAction,
    loadStaff,
    runStaffAction,
    auth,
    businessDate,
    offline,
    login,
    logout,
    loadBoard,
    setBusinessDate,
  } = useVipFloorWorkspace(initialBusinessDate);
  const [pin, setPin] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [operationOpen, setOperationOpen] = useState(false);
  const [operationOptions, setOperationOptions] = useState<OperationOptions | null>(null);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [staffOpen, setStaffOpen] = useState(false);
  const [staffData, setStaffData] = useState<StaffWorkspaceData | null>(null);
  const [staffFilter, setStaffFilter] = useState("");
  const inspectorTab = parseInspectorTab(searchParams.get("detail"));
  const deferredQuery = useDeferredValue(state.query);
  const allReservations = useMemo(() => toUiReservations(state.board), [state.board]);
  const reservations = useMemo(() => allReservations.filter((item) => {
    const statusMatch = state.statusFilter === "all"
      || item.serviceStatus === state.statusFilter
      || (state.statusFilter === "attention" && Boolean(item.exceptionLabel));
    return statusMatch && matchesReservation(item, deferredQuery);
  }), [allReservations, deferredQuery, state.statusFilter]);
  const queueGroups = useMemo(() => buildQueueGroups(reservations), [reservations]);
  const selectedReservation = allReservations.find((item) => item.id === state.selectedReservationId) ?? null;
  const isOwner = auth.status === "authenticated" && auth.session.role === "owner";
  const canMutate = isOwner;
  const canCommand = (kind: CommandKind) => canMutate
    && auth.status === "authenticated"
    && !!auth.session?.role
    && canExecuteVipCommand(auth.session.role, kind);

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

  const readOnly = offline
    || ["loading", "stale", "reconnecting", "error", "read_only"].includes(state.globalState)
    || !state.board.operations.adminMutationEnabled
    || !canMutate;

  const updateRoute = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    const query = params.toString();
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams]);

  useEffect(() => {
    const nextView = parseWorkspaceView(searchParams.get("view"));
    if (state.view !== nextView) dispatch({ type: "view", view: nextView });

    const nextQuery = searchParams.get("q") ?? "";
    if (state.query !== nextQuery) dispatch({ type: "query", query: nextQuery });

    const status = searchParams.get("filter");
    const nextStatus = status && STATUS_FILTERS.has(status) ? status : "all";
    if (state.statusFilter !== nextStatus) dispatch({ type: "statusFilter", status: nextStatus });

    const date = searchParams.get("date");
    if (date && DATE_PATTERN.test(date) && date !== businessDate) setBusinessDate(date);
  }, [businessDate, dispatch, searchParams, setBusinessDate, state.query, state.statusFilter, state.view]);

  function switchView(view: WorkspaceView) {
    dispatch({ type: "view", view });
    setMenuOpen(false);
    updateRoute({ view: view === "timeline" ? "chart" : view });
  }

  function changeInspectorTab(tab: InspectorTab) {
    updateRoute({ detail: tab === "overview" ? null : tab });
  }

  function selectReservation(id: string) {
    dispatch({ type: "selectReservation", reservationId: id });
  }

  function openCommand(kind: CommandKind) {
    if (!selectedReservation || readOnly || !canCommand(kind)) return;
    dispatch({ type: "openCommand", kind });
  }

  async function openOperation() {
    if (readOnly || !isOwner) return;
    setOperationOpen(true);
    setOperationOptions(await loadOperationOptions());
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

  async function submitPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const success = await login(pin);
    if (success) setPin("");
  }

  if (auth.status !== "authenticated") {
    return (
      <main className={styles.loginShell}>
        <form className={styles.loginPanel} onSubmit={submitPin}>
          <div className={styles.loginMark}><span>G</span></div>
          <p className={styles.loginEyebrow}>GHOST OSAKA · OWNER ACCESS</p>
          <h1>現場オペレーション</h1>
          <p className={styles.loginMessage} role="status">{state.message}</p>
          <label>
            Owner専用PIN
            <input
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/gu, "").slice(0, 8))}
              inputMode="numeric"
              autoComplete="one-time-code"
              minLength={4}
              maxLength={8}
              autoFocus
              aria-describedby="pin-security"
            />
          </label>
          <p id="pin-security" className={styles.loginHint}>Owner PINは端末へ保存されません。</p>
          <button type="submit" disabled={state.pending || pin.length < 4}>
            <ShieldCheck size={17} />
            {state.pending || auth.status === "checking" ? "確認中…" : "ログイン"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className={styles.workspace} data-state={state.globalState}>
      <a href="#vip-workspace-main" className={styles.skipLink}>メイン作業領域へ</a>

      <header className={styles.serviceRibbon}>
        <div className={styles.venueIdentity}>
          <span>GHOST OSAKA</span>
            <strong>VIP MANAGER</strong>
        </div>
        <label className={styles.ribbonControl}>
          <CalendarDays size={15} />
          <span>営業日</span>
          <input
            type="date"
            aria-label="営業日"
            value={businessDate}
            onChange={(event) => {
              if (event.target.value) {
                setBusinessDate(event.target.value);
                updateRoute({ date: event.target.value });
              }
            }}
          />
        </label>
        <div className={styles.ribbonControl} aria-label="営業枠">
          <Radio size={15} />
          <span>営業枠</span>
          <strong>22:00–05:00</strong>
        </div>
        <div className={styles.operatorIdentity}>
          <span>{auth.session.displayName ?? "Owner"} · {isOwner ? "Owner" : "閲覧のみ"}</span>
          <button type="button" onClick={() => void logout()}><LogOut size={14} />ログアウト</button>
        </div>
        <div className={styles.syncStatus} data-state={state.globalState}>
          {offline ? <WifiOff size={14} /> : <RefreshCw size={14} />}
          <span>{state.globalState === "healthy"
            ? "同期済み"
            : state.globalState === "loading"
              ? "読込中"
              : state.globalState === "stale"
                ? "オフライン"
                : state.globalState === "error"
                  ? "読込失敗"
                  : state.globalState === "read_only"
                    ? "閲覧のみ"
                    : "予約なし"}</span>
          <strong className="tabular-nums">
            {new Intl.DateTimeFormat("ja-JP", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Tokyo",
            }).format(new Date(state.board.generatedAt))}
          </strong>
        </div>
      </header>

      <section className={styles.mobileSummary} aria-label="本日のVIP予約サマリー">
        <div><span>本日のVIP予約</span><strong>{state.board.totals.reservationCount}</strong></div>
        <div data-alert={state.board.totals.unassignedReservationCount > 0 || undefined}>
          <span>例外 / 未割当</span>
          <strong>{queueGroups.slice(0, 3).reduce((count, group) => count + group.reservationIds.length, 0)}</strong>
        </div>
        <button type="button" onClick={() => void loadBoard()} disabled={state.pending}>
          <RefreshCw size={17} />再読込
        </button>
      </section>

      <ExceptionRail
        groups={queueGroups}
        reservations={reservations}
        selectedId={state.selectedReservationId}
        collapsed={state.queueCollapsed}
        query={state.query}
        onQuery={(query) => dispatch({ type: "query", query })}
        onSelect={selectReservation}
        onCollapse={(collapsed) => dispatch({ type: "queueCollapsed", collapsed })}
      />

      <section className={styles.primaryArea} id="vip-workspace-main">
        <div className={styles.workspaceToolbar} role="toolbar" aria-label="表示と絞り込み">
          <div className={styles.currentViewMark}>
            {state.view === "list" ? <ClipboardList size={16} /> : state.view === "floor" ? <LayoutGrid size={16} /> : <ChartNoAxesGantt size={16} />}
            <span>{state.view === "list" ? "List" : state.view === "floor" ? "Floor" : "Chart"}</span>
          </div>
          <label className={styles.toolbarSearch}>
            <Search size={14} />
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
            type="button"
            className={styles.paneButton}
            onClick={() => dispatch({ type: "queueCollapsed", collapsed: !state.queueCollapsed })}
            aria-label="キューパネルを切替"
          >
            <PanelLeftClose size={16} />
          </button>
          <button
            type="button"
            className={styles.paneButton}
            onClick={() => dispatch({ type: "inspectorCollapsed", collapsed: !state.inspectorCollapsed })}
            aria-label="インスペクターパネルを切替"
          >
            <PanelRightClose size={16} />
          </button>
        </div>

        {["stale", "read_only"].includes(state.globalState) || !isOwner ? (
          <div className={styles.stateBanner} role="status" data-tone="warning">
            {offline ? <WifiOff size={16} /> : <AlertTriangle size={16} />}
            <strong>{offline ? "オフライン" : !isOwner ? "Owner専用・閲覧のみ" : "閲覧のみ"}</strong>
            <span>{!isOwner ? "更新操作と個人情報の閲覧はOwnerだけが実行できます。" : state.stateDescription}</span>
          </div>
        ) : null}

        <div className={styles.liveMessage} aria-live="polite">
          <span data-pending={state.pending || undefined}>{state.pending ? "処理中" : "更新中"}</span>
          <p>{state.message}</p>
          <strong className="tabular-nums">REV {state.board.boardRevision}</strong>
        </div>

        <div className={styles.viewFrame}>
          {state.globalState === "loading" ? <WorkspaceSkeleton label="VIP Floorを読み込んでいます" /> : null}
          {state.globalState === "error" ? <ErrorState description={state.stateDescription} onRetry={() => void loadBoard()} /> : null}
          {state.globalState === "empty" ? <EmptyState businessDate={businessDate} onRetry={() => void loadBoard()} /> : null}
          {!["loading", "error", "empty"].includes(state.globalState) && state.view === "floor" ? (
            <FloorView
              board={state.board}
              reservations={reservations}
              selectedReservationId={state.selectedReservationId}
              selectedTableId={state.selectedTableId}
              onSelectTable={(tableId, reservationId) => dispatch({ type: "selectTable", tableId, reservationId })}
              onOpenAssignment={() => openCommand("assignment")}
              staffData={staffData}
              staffFilter={staffFilter}
            />
          ) : null}
          {!["loading", "error", "empty"].includes(state.globalState) && state.view === "timeline" ? (
            <ChartView
              board={state.board}
              reservations={reservations}
              selectedReservationId={state.selectedReservationId}
              zoom={state.timelineZoom}
              onZoom={(zoom) => dispatch({ type: "zoom", zoom })}
              onSelect={selectReservation}
            />
          ) : null}
          {!["loading", "error", "empty"].includes(state.globalState) && state.view === "list" ? (
            <ReservationListView
              reservations={reservations}
              selectedReservationId={state.selectedReservationId}
              density={state.density}
              onDensity={(density) => dispatch({ type: "density", density })}
              onSelect={selectReservation}
            />
          ) : null}
        </div>
      </section>

      <div className={styles.desktopInspector}>
        <Inspector
          board={state.board}
          reservation={selectedReservation}
          selectedTableId={state.selectedTableId}
          history={state.history}
          collapsed={state.inspectorCollapsed}
          instance="desktop"
          readOnly={readOnly}
          activeTab={inspectorTab}
          canCommand={canCommand}
          onTabChange={changeInspectorTab}
          onCollapse={(collapsed) => dispatch({ type: "inspectorCollapsed", collapsed })}
          onCommand={openCommand}
        />
      </div>

      {menuOpen ? (
        <section className={styles.shellMenu} aria-label="メニュー">
          <header>
            <div><span>GHOST OSAKA</span><strong>メニュー</strong></div>
            <button type="button" onClick={() => setMenuOpen(false)} aria-label="メニューを閉じる"><X size={18} /></button>
          </header>
          <div className={styles.shellMenuGrid}>
            <button type="button" data-active={state.view === "timeline" || undefined} onClick={() => switchView("timeline")}>
              <ChartNoAxesGantt size={18} /><span>Chart</span><small>時間軸</small>
            </button>
            <button type="button" onClick={() => void loadBoard()} disabled={state.pending}>
              <RefreshCw size={18} /><span>再読込</span><small>台帳同期</small>
            </button>
            <button type="button" onClick={() => void openWaitlist()}>
              <BellRing size={18} /><span>Waitlist</span><small>呼出・30分期限</small>
            </button>
            <span aria-disabled="true"><UsersRound size={18} /><span>顧客</span><small>準備中</small></span>
            <button type="button" onClick={() => void openStaff()}>
              <ShieldCheck size={18} /><span>担当卓</span><small>スタッフMaster</small>
            </button>
            <button type="button" onClick={() => void logout()}>
              <LogOut size={18} /><span>ログアウト</span><small>Owner session</small>
            </button>
          </div>
        </section>
      ) : null}

      <nav className={styles.bottomNav} aria-label="主要ナビゲーション">
        <button
          type="button"
          disabled={readOnly || !isOwner}
          aria-label={`新規オペレーション（${isOwner ? "Walk-inまたは受付ブロック" : "Owner専用"}）`}
          onClick={() => void openOperation()}
        >
          <CalendarPlus size={19} /><span>新規 / Walk-in</span><small>{isOwner ? "即時来店・ブロック" : "Ownerのみ"}</small>
        </button>
        <button type="button" aria-current={state.view === "list" ? "page" : undefined} data-active={state.view === "list" || undefined} onClick={() => switchView("list")}>
          <ClipboardList size={19} /><span>List</span>
        </button>
        <button type="button" aria-current={state.view === "floor" ? "page" : undefined} data-active={state.view === "floor" || undefined} onClick={() => switchView("floor")}>
          <LayoutGrid size={19} /><span>Floor</span>
        </button>
        <button
          type="button"
          aria-expanded={menuOpen}
          data-active={menuOpen || state.view === "timeline" || undefined}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Menu size={19} /><span>メニュー</span>
        </button>
      </nav>

      <div
        className={styles.mobileSheet}
        data-open={state.mobileInspectorOpen || undefined}
        role={state.mobileInspectorOpen ? "dialog" : undefined}
        aria-modal={state.mobileInspectorOpen || undefined}
        aria-label="予約詳細"
      >
        <button
          type="button"
          className={styles.sheetClose}
          onClick={() => dispatch({ type: "mobileInspector", open: false })}
        >
          <X size={17} />閉じる
        </button>
        <Inspector
          board={state.board}
          reservation={selectedReservation}
          selectedTableId={state.selectedTableId}
          history={state.history}
          instance="mobile"
          readOnly={readOnly}
          activeTab={inspectorTab}
          canCommand={canCommand}
          onTabChange={changeInspectorTab}
          onCommand={openCommand}
        />
      </div>

      <CommandCenter
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
        open={operationOpen}
        pending={state.pending}
        board={state.board}
        options={operationOptions}
        selectedTableId={state.selectedTableId}
        staffData={staffData}
        onClose={() => {
          setOperationOpen(false);
          setOperationOptions(null);
        }}
        onRun={runOperation}
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
    </main>
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
      <AlertTriangle size={30} />
      <h2>予約状態を読み込めません</h2>
      <p>{description}</p>
      <button type="button" className={styles.primaryButton} onClick={onRetry}>
        <RefreshCw size={16} />再読込
      </button>
    </div>
  );
}

function EmptyState({ businessDate, onRetry }: { businessDate: string; onRetry: () => void }) {
  return (
    <div className={styles.centerState}>
      <LayoutGrid size={30} />
      <h2>この営業日の予約はありません</h2>
      <p>{businessDate} のGHOST予約台帳は空です。営業日を切り替えるか、最新状態を再読込してください。</p>
      <button type="button" className={styles.primaryButton} onClick={onRetry}>
        <RefreshCw size={16} />再読込
      </button>
    </div>
  );
}
