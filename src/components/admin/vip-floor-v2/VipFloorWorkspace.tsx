"use client";

import dynamic from "next/dynamic";
import { useDeferredValue, useMemo } from "react";
import { AlertTriangle, CalendarDays, ChartNoAxesGantt, CirclePlus, ClipboardList, Command, LayoutGrid, Menu, PanelLeftClose, PanelRightClose, Radio, RefreshCw, Search, ShieldCheck, Sparkles, UsersRound, X } from "lucide-react";

import { CommandCenter } from "./commands/CommandCenter";
import { buildQueueGroups, matchesReservation, toUiReservations } from "./contract/viewModel";
import type { CommandKind, ScenarioKey, WorkspaceView } from "./contract/uiTypes";
import { fixtureScenarios, getFixtureScenario } from "./data/fixtureScenarios";
import FloorView from "./floor/FloorView";
import { Inspector } from "./inspector/Inspector";
import { ExceptionRail } from "./shell/ExceptionRail";
import { useVipFloorWorkspace } from "./state/useVipFloorWorkspace";
import styles from "./VipFloorWorkspace.module.css";

const TimelineView = dynamic(() => import("./timeline/TimelineView"), { loading: () => <WorkspaceSkeleton label="時間軸を準備中" /> });
const ReservationListView = dynamic(() => import("./list/ReservationListView"), { loading: () => <WorkspaceSkeleton label="予約一覧を準備中" /> });

const viewOptions: Array<{ key: WorkspaceView; label: string; icon: typeof LayoutGrid }> = [
  { key: "floor", label: "Floor", icon: LayoutGrid },
  { key: "timeline", label: "Timeline", icon: ChartNoAxesGantt },
  { key: "list", label: "List", icon: ClipboardList },
];

export default function VipFloorWorkspace() {
  const { state, dispatch, runCommand } = useVipFloorWorkspace(getFixtureScenario("healthy"));
  const deferredQuery = useDeferredValue(state.query);
  const allReservations = useMemo(() => toUiReservations(state.board), [state.board]);
  const reservations = useMemo(() => allReservations.filter((item) => {
    const statusMatch = state.statusFilter === "all" || item.serviceStatus === state.statusFilter || (state.statusFilter === "attention" && Boolean(item.exceptionLabel));
    const sectionMatch = state.sectionId === "all" || item.tableIds.some((tableId) => state.board.tables.find((table) => table.id === tableId)?.sectionId === state.sectionId) || item.tableIds.length === 0;
    return statusMatch && sectionMatch && matchesReservation(item, deferredQuery);
  }), [allReservations, deferredQuery, state.board.tables, state.sectionId, state.statusFilter]);
  const queueGroups = useMemo(() => buildQueueGroups(reservations), [reservations]);
  const selectedReservation = allReservations.find((item) => item.id === state.selectedReservationId) ?? null;
  const readOnly = Boolean(state.scenario.readOnly || !state.board.operations.adminMutationEnabled);
  const globalState = state.scenario.state;

  function selectReservation(id: string) {
    dispatch({ type: "selectReservation", reservationId: id });
  }

  function openCommand(kind: CommandKind) {
    dispatch({ type: "openCommand", kind });
  }

  return (
    <main className={styles.workspace} data-state={globalState}>
      <a href="#vip-workspace-main" className={styles.skipLink}>メイン作業領域へ</a>
      <nav className={styles.navRail} aria-label="VIP Floor主要操作">
        <div className={styles.ghostMark} aria-label="GHOST Osaka"><span>G</span></div>
        {viewOptions.map(({ key, label, icon: Icon }) => <button key={key} type="button" aria-label={`${label} view`} title={label} data-active={state.view === key || undefined} onClick={() => dispatch({ type: "view", view: key })}><Icon size={19} /></button>)}
        <span className={styles.navDivider} />
        <button type="button" aria-label="店頭VIPを作成" title="店頭VIP" onClick={() => openCommand("walk_in")} disabled={readOnly}><CirclePlus size={19} /></button>
        <button type="button" aria-label="予約ブロックを管理" title="Block" onClick={() => openCommand("block")} disabled={readOnly}><ShieldCheck size={19} /></button>
        <button type="button" aria-label="command centerを開く" title="Command" onClick={() => openCommand(selectedReservation ? "service_status" : "walk_in")}><Command size={19} /></button>
        <span className={styles.navSpacer} />
        <div className={styles.fixtureStamp}><Sparkles size={15} /><span>FIXTURE</span></div>
      </nav>

      <header className={styles.serviceRibbon}>
        <div className={styles.venueIdentity}>
          <span>GHOST OSAKA</span>
          <strong>VIP FLOOR OPERATIONS</strong>
        </div>
        <label className={styles.ribbonControl}><CalendarDays size={15} /><span>営業日</span><input type="date" value={state.board.businessDay.businessDate} readOnly /></label>
        <label className={styles.ribbonControl}><Radio size={15} /><span>Service</span><select defaultValue="main"><option value="main">MAIN / 22:00-05:00</option><option value="opening">OPENING / 21:00</option></select></label>
        <label className={styles.scenarioControl}><span>Scenario</span><select value={state.scenario.key} onChange={(event) => dispatch({ type: "scenario", scenario: getFixtureScenario(event.target.value as ScenarioKey) })}>{fixtureScenarios.map((scenario) => <option value={scenario.key} key={scenario.key}>{scenario.label}</option>)}</select></label>
        <div className={styles.syncStatus} data-state={globalState}><RefreshCw size={14} /><span>{globalState === "healthy" ? "同期済み" : globalState === "loading" ? "読込中" : globalState === "stale" ? "更新遅延" : globalState === "reconnecting" ? "再接続中" : globalState === "error" ? "読込失敗" : globalState === "read_only" ? "閲覧のみ" : "開店前"}</span><strong className="tabular-nums">22:14</strong></div>
      </header>

      <section className={styles.mobileSummary} aria-label="本日のVIP予約概要">
        <div><span>本日のVIP予約</span><strong>{state.board.totals.reservationCount}</strong></div>
        <div data-alert={state.board.totals.unassignedReservationCount > 0 || undefined}><span>例外 / 未割当</span><strong>{queueGroups.slice(0, 3).reduce((count, group) => count + group.reservationIds.length, 0)}</strong></div>
        <button type="button" onClick={() => openCommand("walk_in")} disabled={readOnly}><CirclePlus size={17} />店頭VIP</button>
      </section>

      <ExceptionRail groups={queueGroups} reservations={reservations} selectedId={state.selectedReservationId} collapsed={state.queueCollapsed} query={state.query} onQuery={(query) => dispatch({ type: "query", query })} onSelect={selectReservation} onCollapse={(collapsed) => dispatch({ type: "queueCollapsed", collapsed })} />

      <section className={styles.primaryArea} id="vip-workspace-main">
        <div className={styles.workspaceToolbar} role="toolbar" aria-label="表示とfilter">
          <div className={styles.mobileMenuMark}><Menu size={17} /><span>VIP FLOOR</span></div>
          <div className={styles.viewSwitcher} role="tablist" aria-label="作業view">
            {viewOptions.map(({ key, label, icon: Icon }) => <button key={key} type="button" role="tab" aria-selected={state.view === key} data-active={state.view === key || undefined} onClick={() => dispatch({ type: "view", view: key })}><Icon size={15} />{label}</button>)}
          </div>
          <label className={styles.toolbarSearch}><Search size={14} /><span className="sr-only">予約検索</span><input value={state.query} onChange={(event) => dispatch({ type: "query", query: event.target.value })} placeholder="番号 / ゲスト / 席" /></label>
          <label className={styles.toolbarSelect}><span>Section</span><select value={state.sectionId} onChange={(event) => dispatch({ type: "section", sectionId: event.target.value })}><option value="all">ALL</option>{state.board.sections.map((section) => <option value={section.id} key={section.id}>{section.name}</option>)}</select></label>
          <label className={styles.toolbarSelect}><span>Status</span><select value={state.statusFilter} onChange={(event) => dispatch({ type: "statusFilter", status: event.target.value })}><option value="all">ALL</option><option value="attention">要確認</option><option value="expected">来店予定</option><option value="late">遅延</option><option value="seated">着席</option><option value="bill_requested">会計</option></select></label>
          <button type="button" className={styles.paneButton} onClick={() => dispatch({ type: "queueCollapsed", collapsed: !state.queueCollapsed })} aria-label="queue paneを切替"><PanelLeftClose size={16} /></button>
          <button type="button" className={styles.paneButton} onClick={() => dispatch({ type: "inspectorCollapsed", collapsed: !state.inspectorCollapsed })} aria-label="inspector paneを切替"><PanelRightClose size={16} /></button>
        </div>

        {globalState === "stale" || globalState === "reconnecting" || globalState === "read_only" ? <div className={styles.stateBanner} role="status" data-tone={globalState === "read_only" ? "warning" : "neutral"}><AlertTriangle size={16} /><strong>{state.scenario.label}</strong><span>{state.scenario.description}</span></div> : null}

        <div className={styles.liveMessage} aria-live="polite"><span data-pending={state.pending || undefined}>{state.pending ? "処理中" : "READY"}</span><p>{state.message}</p><strong className="tabular-nums">REV {state.board.boardRevision}</strong></div>

        <div className={styles.viewFrame}>
          {globalState === "loading" ? <WorkspaceSkeleton label="VIP Floorを読み込んでいます" /> : null}
          {globalState === "error" ? <ErrorState description={state.scenario.description} onRetry={() => dispatch({ type: "retryRead" })} /> : null}
          {globalState === "empty" ? <EmptyState onWalkIn={() => openCommand("walk_in")} /> : null}
          {!["loading", "error", "empty"].includes(globalState) && state.view === "floor" ? <FloorView board={state.board} reservations={reservations} selectedReservationId={state.selectedReservationId} selectedTableId={state.selectedTableId} sectionId={state.sectionId} onSelectTable={(tableId, reservationId) => dispatch({ type: "selectTable", tableId, reservationId })} onOpenAssignment={() => openCommand("assignment")} /> : null}
          {!["loading", "error", "empty"].includes(globalState) && state.view === "timeline" ? <TimelineView board={state.board} reservations={reservations} selectedReservationId={state.selectedReservationId} sectionId={state.sectionId} zoom={state.timelineZoom} onZoom={(zoom) => dispatch({ type: "zoom", zoom })} onSelect={selectReservation} /> : null}
          {!["loading", "error", "empty"].includes(globalState) && state.view === "list" ? <ReservationListView reservations={reservations} selectedReservationId={state.selectedReservationId} density={state.density} onDensity={(density) => dispatch({ type: "density", density })} onSelect={selectReservation} /> : null}
        </div>
      </section>

      <div className={styles.desktopInspector}><Inspector board={state.board} reservation={selectedReservation} selectedTableId={state.selectedTableId} history={state.history} collapsed={state.inspectorCollapsed} instance="desktop" readOnly={readOnly} onCollapse={(collapsed) => dispatch({ type: "inspectorCollapsed", collapsed })} onCommand={openCommand} /></div>

      <div className={styles.mobileDock} aria-label="mobile primary actions">
        <button type="button" onClick={() => dispatch({ type: "mobileInspector", open: true })} disabled={!selectedReservation && !state.selectedTableId}><UsersRound size={18} />詳細</button>
        <button type="button" className={styles.dockPrimary} onClick={() => openCommand(selectedReservation ? "check_in" : "walk_in")} disabled={readOnly}><CirclePlus size={18} />{selectedReservation ? "Check in" : "店頭VIP"}</button>
        <button type="button" onClick={() => openCommand(selectedReservation ? "assignment" : "block")} disabled={readOnly}><Command size={18} />操作</button>
      </div>

      <div className={styles.mobileSheet} data-open={state.mobileInspectorOpen || undefined} role={state.mobileInspectorOpen ? "dialog" : undefined} aria-modal={state.mobileInspectorOpen || undefined} aria-label="予約詳細">
        <button type="button" className={styles.sheetClose} onClick={() => dispatch({ type: "mobileInspector", open: false })}><X size={17} />閉じる</button>
        <Inspector board={state.board} reservation={selectedReservation} selectedTableId={state.selectedTableId} history={state.history} instance="mobile" readOnly={readOnly} onCommand={openCommand} />
      </div>

      <CommandCenter open={state.command.open} kind={state.command.kind} step={state.command.step} resultMode={state.command.resultMode} pending={state.pending} board={state.board} reservation={selectedReservation} selectedTableId={state.selectedTableId} conflict={state.conflict && !state.conflict.ok ? state.conflict : null} onClose={() => dispatch({ type: "closeCommand" })} onStep={(step) => dispatch({ type: "commandStep", step })} onResultMode={(mode) => dispatch({ type: "resultMode", mode })} onRun={(draft) => void runCommand(draft)} />
    </main>
  );
}

function WorkspaceSkeleton({ label }: { label: string }) {
  return <div className={styles.skeletonState} aria-busy="true" aria-label={label}><div /><div /><div /><div /><div /><span>{label}</span></div>;
}

function ErrorState({ description, onRetry }: { description: string; onRetry: () => void }) {
  return <div className={styles.centerState} role="alert"><AlertTriangle size={30} /><h2>予約状態を読み込めません</h2><p>{description}</p><button type="button" className={styles.primaryButton} onClick={onRetry}><RefreshCw size={16} />保存済みfixtureを復元</button></div>;
}

function EmptyState({ onWalkIn }: { onWalkIn: () => void }) {
  return <div className={styles.centerState}><LayoutGrid size={30} /><h2>本日の予約はまだありません</h2><p>開店前の座席を確認するか、入口受付から店頭VIPを作成できます。</p><button type="button" className={styles.primaryButton} onClick={onWalkIn}><CirclePlus size={16} />店頭VIPを作成</button></div>;
}
