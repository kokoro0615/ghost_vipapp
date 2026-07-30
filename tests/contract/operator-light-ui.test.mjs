import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [globals, layout, workspace, workspaceStyles, floorView, reservationWizard] = await Promise.all([
  readFile(new URL("../../src/app/globals.css", import.meta.url), "utf8"),
  readFile(new URL("../../src/app/layout.tsx", import.meta.url), "utf8"),
  readFile(new URL("../../src/components/admin/vip-floor-v2/VipFloorWorkspace.tsx", import.meta.url), "utf8"),
  readFile(new URL("../../src/components/admin/vip-floor-v2/VipFloorWorkspace.module.css", import.meta.url), "utf8"),
  readFile(new URL("../../src/components/admin/vip-floor-v2/floor/FloorView.tsx", import.meta.url), "utf8"),
  readFile(new URL("../../src/components/admin/vip-floor-v2/operations/ReservationWizard.tsx", import.meta.url), "utf8"),
]);

test("VIP Manager keeps a white operator surface authored in OKLCH", () => {
  assert.match(globals, /--paper:\s*oklch\(0\.9\d+ 0(?:\.\d+)? [\d.]+\)/u);
  assert.match(globals, /--surface:\s*oklch\(1 0 0\)/u);
  assert.match(globals, /--canvas:\s*var\(--paper\)/u);
  // Graphite ink and one champagne accent — never a SaaS blue or a purple.
  assert.match(globals, /--action:\s*oklch\(0\.2\d+ 0\.0\d+ 70\)/u);
  assert.match(globals, /--accent:\s*oklch\(0\.6\d+ 0\.0\d+ 76\)/u);
});

test("the surface is a real light system, not a renamed dark lacquer theme", () => {
  for (const legacyAlias of ["--lacquer-", "--ivory", "--metal", "--muted:", "--line-soft"]) {
    assert.equal(workspaceStyles.includes(legacyAlias), false,
      `legacy dark-theme alias survived: ${legacyAlias}`);
  }
  // Structure comes from tokens, so raw hex and stray px type never appear.
  assert.doesNotMatch(workspaceStyles, /#[0-9a-fA-F]{3,8}\b/u);
  assert.doesNotMatch(workspaceStyles, /Georgia|Times New Roman/u);
});

test("type is one Japanese-first family with tabular figures for every number", () => {
  // M PLUS 2 is pinned because it was the only humane Japanese candidate that
  // measured uniform digit advances AND an effective `tnum`. Zen Kaku Gothic
  // New/Antique, Murecho and BIZ UDPGothic drift 15-19px across a ten-digit
  // string, so a ledger column would jitter. BIZ UDPGothic also ships only
  // 400/700. See docs/ui/VIP_MANAGER_LIGHT_RESERVATION_RESEARCH.md section 4.
  assert.match(layout, /M_PLUS_2/u);
  assert.match(layout, /weight:\s*\["400", "500", "700"\]/u);
  // The retired monospace face is what made the board read as a terminal.
  assert.doesNotMatch(layout, /IBM_Plex_Mono/u);
  assert.doesNotMatch(layout, /BIZ_UDPGothic|Noto_Sans_JP|Zen_Kaku|Murecho|Inter|Roboto/u);
  // Figures stay a distinct register inside that one family, never a re-import.
  assert.match(globals, /--font-figure:\s*var\(--font-ui\)/u);
  assert.match(globals, /font-variant-numeric:\s*tabular-nums/u);
  // Proportional Japanese spacing must not undo the tabular advance.
  assert.match(globals, /\.tabular-nums \{[\s\S]*?font-feature-settings:\s*"palt" 0/u);
  assert.doesNotMatch(globals, /font-family:[^;]*monospace/u);
  // Six-step scale, so component sizes are chosen from a system.
  for (const step of ["--t-micro", "--t-mini", "--t-body", "--t-data", "--t-lead", "--t-figure"]) {
    assert.match(globals, new RegExp(`${step}:`, "u"));
  }
});

test("the reservation wizard keeps one dominant column and a persistent record", () => {
  // Two zones, never three: three co-equal columns left the active step on ~47%
  // of the dialog, so the thing to act on was not the dominant object.
  assert.match(workspaceStyles, /\.wizardBody \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) minmax\(264px, 0\.4fr\)/u);
  assert.doesNotMatch(workspaceStyles, /\.wizardContext|\.wizardChecks/u);
  // The running record is never deleted on a small screen.
  assert.doesNotMatch(workspaceStyles, /\.wizard[A-Za-z]* \{ display: none/u);
  assert.match(workspaceStyles, /\.wizardSummaryBar \{/u);
  // All eight steps stay present, in order, individually announced.
  assert.match(reservationWizard, /STEPS = \["日付", "時刻", "人数", "卓", "顧客", "追加", "担当", "確認"\]/u);
  assert.match(reservationWizard, /\$\{step \+ 1\}\/8/u);
  assert.match(reservationWizard, /aria-current=\{index === step \? "step" : undefined\}/u);
  // Step state is carried by more than colour.
  assert.match(reservationWizard, /index < step \? "入力済み" : index === step \? "現在の段階" : "未入力"/u);
  // The plan is a real instrument on the table step: true colour, real geometry.
  assert.match(workspaceStyles, /\.wizardMapImage \{[\s\S]*?filter: none;/u);
  assert.doesNotMatch(workspaceStyles, /invert\(1\)/u);
  assert.match(reservationWizard, /table\.geometry\.xPercent/u);
  assert.match(reservationWizard, /unoptimized/u);
  // Confirmation shows everything that gets saved, not four of the fields.
  for (const field of ["担当", "通知", "現場メモ", "入口表示名"]) {
    assert.match(reservationWizard, new RegExp(`<dt>${field}</dt>`, "u"));
  }
});

test("the wizard never spends alert colour on a state the operator cannot act on", () => {
  // The old standing rail showed 席選択「未選択」in warn colour from step 1, and
  // データ境界 permanently in warn colour although it is a neutral fact.
  assert.doesNotMatch(reservationWizard, /PRE-SAVE CHECK|保存前チェック/u);
  assert.doesNotMatch(reservationWizard, /data-ok=/u);
});

test("desktop keeps summary, work views, queue and inspector without stacking chrome", () => {
  // Two columns, not three: the focal view is never squeezed between two rails.
  assert.match(workspaceStyles, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*var\(--inspector-w\)/u);
  assert.match(workspaceStyles, /grid-template-rows:\s*var\(--h-masthead\)\s*minmax\(0,\s*1fr\)/u);
  assert.match(workspaceStyles, /\.primaryNav,\s*\.mobileSummary,\s*\.mobileSheet,\s*\.mobileQueue,\s*\.summaryRefresh\s*\{\s*display:\s*none;/u);
  assert.match(workspace, /本日のVIP予約サマリー/u);
  assert.match(workspace, /本日の稼働状況/u);
  for (const label of ["予約", "次の来店", "要対応", "未割当"]) {
    assert.match(workspace, new RegExp(`label: "${label}"`, "u"));
  }
  for (const view of ["List", "Floor", "Chart"]) {
    assert.match(workspace, new RegExp(`aria-label="${view}"`, "u"));
  }
  // The right column carries the queue only while nothing is selected.
  assert.match(workspace, /!selectedReservation && !state\.selectedTableId/u);
});

test("the idle live region costs no vertical space", () => {
  assert.match(workspaceStyles, /\.liveMessage \{[\s\S]*?clip-path:\s*inset\(50%\)/u);
  assert.match(workspaceStyles, /\.liveMessage\[data-visible\]/u);
  assert.match(workspace, /data-visible=\{busy \|\| undefined\}/u);
});

test("the real floor plan stays full-colour and its controls cannot collapse", () => {
  assert.match(floorView, /unoptimized/u);
  assert.match(floorView, /カラー座席図/u);
  assert.match(workspaceStyles, /\.floorImage\s*\{[\s\S]*?filter:\s*none;/u);
  assert.match(workspaceStyles, /\.tableNode\s*\{[\s\S]*?min-width:\s*52px;/u);
  assert.match(workspaceStyles, /\.tableNode\s*\{[\s\S]*?min-height:\s*var\(--h-control\);/u);
});

test("the eight table rows consume the available chart height", () => {
  assert.match(workspaceStyles, /\.timelineGrid\s*\{[\s\S]*?min-height:\s*100%;[\s\S]*?flex-direction:\s*column;/u);
  assert.match(workspaceStyles, /\.timelineRow\s*\{[\s\S]*?flex:\s*1 0 56px;/u);
});

test("status emphasis uses horizontal rules instead of AI-like colored side tabs", () => {
  assert.doesNotMatch(workspaceStyles, /border-left(?:-width)?:\s*[2-9](?:px|rem)/u);
  assert.doesNotMatch(workspaceStyles, /box-shadow:\s*inset\s+[2-9]px\s+0/u);
});

test("banned AI-slop surfaces never reach the operator screen", () => {
  assert.doesNotMatch(workspaceStyles, /backdrop-filter/u);
  assert.doesNotMatch(workspaceStyles, /border-radius:\s*(?:1[2-9]|[2-9]\d)px/u);
  assert.doesNotMatch(globals, /backdrop-filter/u);
});
