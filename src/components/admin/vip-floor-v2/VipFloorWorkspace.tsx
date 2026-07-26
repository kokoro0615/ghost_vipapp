"use client";

import dynamic from "next/dynamic";
import { type FormEvent, useDeferredValue, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChartNoAxesGantt,
  ClipboardList,
  Command,
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
import { Inspector } from "./inspector/Inspector";
import { ExceptionRail } from "./shell/ExceptionRail";
import { useVipFloorWorkspace } from "./state/useVipFloorWorkspace";
import styles from "./VipFloorWorkspace.module.css";
import { canExecuteVipCommand } from "@/lib/adminPermissions";

const TimelineView = dynamic(() => import("./timeline/TimelineView"), {
  loading: () => <WorkspaceSkeleton label="時間軸を準備中" />,
});
const ReservationListView = dynamic(() => import("./list/ReservationListView"), {
  loading: () => <WorkspaceSkeleton label="予約一覧を準備中" />,
});

const viewOptions: Array<{ key: WorkspaceView; label: string; icon: typeof LayoutGrid }> = [
  { key: "floor", label: "フロア", icon: LayoutGrid },
  { key: "timeline", label: "時間軸", icon: ChartNoAxesGantt },
  { key: "list", label: "一覧", icon: ClipboardList },
];

export default function VipFloorWorkspace() {
  const {
    state,
    dispatch,
    runCommand,
    auth,
    businessDate,
    offline,
    login,
    logout,
    loadBoard,
    setBusinessDate,
  } = useVipFloorWorkspace();
  const [pin, setPin] = useState("");
  const deferredQuery = useDeferredValue(state.query);
  const allReservations = useMemo(() => toUiReservations(state.board), [state.board]);
  const reservations = useMemo(() => allReservations.filter((item) => {
    const statusMatch = state.statusFilter === "all"
      || item.serviceStatus === state.statusFilter
      || (state.statusFilter === "attention" && Boolean(item.exceptionLabel));
    const sectionMatch = state.sectionId === "all"
      || item.tableIds.some((tableId) =>
        state.board.tables.find((table) => table.id === tableId)?.sectionId === state.sectionId)
      || item.tableIds.length === 0;
    return statusMatch && sectionMatch && matchesReservation(item, deferredQuery);
  }), [allReservations, deferredQuery, state.board.tables, state.sectionId, state.statusFilter]);
  const queueGroups = useMemo(() => buildQueueGroups(reservations), [reservations]);
  const selectedReservation = allReservations.find((item) => item.id === state.selectedReservationId) ?? null;
  const canMutate = auth.status === "authenticated"
    && !!auth.session?.role
    && (
      canExecuteVipCommand(auth.session.role, "check_in")
      || canExecuteVipCommand(auth.session.role, "assignment")
      || canExecuteVipCommand(auth.session.role, "arrival_time")
      || canExecuteVipCommand(auth.session.role, "note")
      || canExecuteVipCommand(auth.session.role, "seat_extension")
      || canExecuteVipCommand(auth.session.role, "service_status")
    );
  const canCommand = (kind: CommandKind) => canMutate
    && auth.status === "authenticated"
    && !!auth.session?.role
    && canExecuteVipCommand(auth.session.role, kind);

  const readOnly = offline
    || state.globalState === "read_only"
    || !state.board.operations.adminMutationEnabled;

  function selectReservation(id: string) {
    dispatch({ type: "selectReservation", reservationId: id });
  }

  function openCommand(kind: CommandKind) {
    if (!selectedReservation || readOnly || !canCommand(kind)) return;
    dispatch({ type: "openCommand", kind });
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
          <p className={styles.loginEyebrow}>GHOST OSAKA · VIP FLOOR</p>
          <h1>現場オペレーション</h1>
          <p className={styles.loginMessage} role="status">{state.message}</p>
          <label>
            スタッフPIN
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
          <p id="pin-security" className={styles.loginHint}>個人PINは端末へ保存されません。</p>
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
      <nav className={styles.navRail} aria-label="VIP Floor主要操作">
        <div className={styles.ghostMark} aria-label="GHOST Osaka"><span>G</span></div>
        {viewOptions.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            aria-label={`${label}を表示`}
            title={label}
            data-active={state.view === key || undefined}
            onClick={() => dispatch({ type: "view", view: key })}
          >
            <Icon size={19} />
          </button>
        ))}
        <span className={styles.navDivider} />
        <button type="button" aria-label="予約を再読込" title="再読込" onClick={() => void loadBoard()} disabled={state.pending}>
          <RefreshCw size={19} />
        </button>
        <button
          type="button"
          aria-label="選択予約の操作を開く"
          title="予約操作"
          onClick={() => openCommand("service_status")}
          disabled={readOnly || !selectedReservation || !canCommand("service_status")}
        >
          <Command size={19} />
        </button>
        <span className={styles.navSpacer} />
        <button type="button" aria-label="ログアウト" title="ログアウト" onClick={() => void logout()}>
          <LogOut size={18} />
        </button>
      </nav>

      <header className={styles.serviceRibbon}>
        <div className={styles.venueIdentity}>
          <span>GHOST OSAKA</span>
          <strong>VIP FLOOR OPERATIONS</strong>
        </div>
        <label className={styles.ribbonControl}>
          <CalendarDays size={15} />
          <span>営業日</span>
          <input
            type="date"
            value={businessDate}
            onChange={(event) => {
              if (event.target.value) setBusinessDate(event.target.value);
            }}
          />
        </label>
        <div className={styles.ribbonControl} aria-label="営業枠">
          <Radio size={15} />
          <span>営業枠</span>
          <strong>MAIN / 21:00–05:00</strong>
        </div>
        <div className={styles.operatorIdentity}>
          <span>{auth.session.displayName ?? auth.session.role ?? "staff"}</span>
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
          <div className={styles.mobileMenuMark}><Menu size={17} /><span>VIP FLOOR</span></div>
          <div className={styles.viewSwitcher} role="tablist" aria-label="作業表示">
            {viewOptions.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={state.view === key}
                data-active={state.view === key || undefined}
                onClick={() => dispatch({ type: "view", view: key })}
              >
                <Icon size={15} />{label}
              </button>
            ))}
          </div>
          <label className={styles.toolbarSearch}>
            <Search size={14} />
            <span className="sr-only">予約検索</span>
            <input
              value={state.query}
              onChange={(event) => dispatch({ type: "query", query: event.target.value })}
              placeholder="番号 / ゲスト / 席"
            />
          </label>
          <label className={styles.toolbarSelect}>
            <span>セクション</span>
            <select value={state.sectionId} onChange={(event) => dispatch({ type: "section", sectionId: event.target.value })}>
              <option value="all">全て</option>
              {state.board.sections.map((section) => <option value={section.id} key={section.id}>{section.name}</option>)}
            </select>
          </label>
          <label className={styles.toolbarSelect}>
            <span>ステータス</span>
            <select value={state.statusFilter} onChange={(event) => dispatch({ type: "statusFilter", status: event.target.value })}>
              <option value="all">全て</option>
              <option value="attention">要確認</option>
              <option value="expected">来店予定</option>
              <option value="late">遅延</option>
              <option value="arrived">到着</option>
              <option value="seated">着席</option>
              <option value="bill_requested">会計</option>
            </select>
          </label>
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

        {["stale", "read_only"].includes(state.globalState) ? (
          <div className={styles.stateBanner} role="status" data-tone="warning">
            {offline ? <WifiOff size={16} /> : <AlertTriangle size={16} />}
            <strong>{offline ? "オフライン" : "閲覧のみ"}</strong>
            <span>{state.stateDescription}</span>
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
              sectionId={state.sectionId}
              onSelectTable={(tableId, reservationId) => dispatch({ type: "selectTable", tableId, reservationId })}
              onOpenAssignment={() => openCommand("assignment")}
            />
          ) : null}
          {!["loading", "error", "empty"].includes(state.globalState) && state.view === "timeline" ? (
            <TimelineView
              board={state.board}
              reservations={reservations}
              selectedReservationId={state.selectedReservationId}
              sectionId={state.sectionId}
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
          canCommand={canCommand}
          onCollapse={(collapsed) => dispatch({ type: "inspectorCollapsed", collapsed })}
          onCommand={openCommand}
        />
      </div>

      <div className={styles.mobileDock} aria-label="主要アクション">
        <button
          type="button"
          onClick={() => dispatch({ type: "mobileInspector", open: true })}
          disabled={!selectedReservation && !state.selectedTableId}
        >
          <UsersRound size={18} />詳細
        </button>
        <button
          type="button"
          className={styles.dockPrimary}
          onClick={() => openCommand("check_in")}
          disabled={readOnly || !selectedReservation || !canCommand("check_in")}
        >
          <ShieldCheck size={18} />チェックイン
        </button>
        <button
          type="button"
          onClick={() => openCommand("assignment")}
          disabled={readOnly || !selectedReservation || !canCommand("assignment")}
        >
          <Command size={18} />卓割当
        </button>
      </div>

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
          canCommand={canCommand}
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
