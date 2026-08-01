import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { QA_VIEWPORTS } from "../../scripts/light-ui-qa-manifest.mjs";

const [
  globals,
  layout,
  workspace,
  workspaceStyles,
  floorView,
  reservationWizard,
  packageJsonSource,
  middlewareSource,
] = await Promise.all([
  readFile(new URL("../../src/app/globals.css", import.meta.url), "utf8"),
  readFile(new URL("../../src/app/layout.tsx", import.meta.url), "utf8"),
  readFile(new URL("../../src/components/admin/vip-floor-v2/VipFloorWorkspace.tsx", import.meta.url), "utf8"),
  readFile(new URL("../../src/components/admin/vip-floor-v2/VipFloorWorkspace.module.css", import.meta.url), "utf8"),
  readFile(new URL("../../src/components/admin/vip-floor-v2/floor/FloorView.tsx", import.meta.url), "utf8"),
  readFile(new URL("../../src/components/admin/vip-floor-v2/operations/ReservationWizard.tsx", import.meta.url), "utf8"),
  readFile(new URL("../../package.json", import.meta.url), "utf8"),
  readFile(new URL("../../middleware.ts", import.meta.url), "utf8"),
]);

const packageJson = JSON.parse(packageJsonSource);

/*
 * The floor plan is the one dark object on this white surface: it reproduces the
 * real GHOST venue drawing, so its nodes are authored in the venue's own
 * black-violet. That palette is legal INSIDE section 6 of the stylesheet and
 * nowhere else. Slicing the file here is what lets the tests below prove the
 * containment instead of assuming it. See docs/DESIGN.md section 4.1.
 */
const floorSectionStart = workspaceStyles.indexOf("── 6. floor map");
const floorSectionEnd = workspaceStyles.indexOf("── 7. chart");
assert.ok(
  floorSectionStart > 0 && floorSectionEnd > floorSectionStart,
  "the numbered section map in VipFloorWorkspace.module.css is the anchor for "
  + "the floor-palette containment checks — keep the banner comments intact",
);

function rawOklchOutsideFloorSection() {
  const found = [];
  for (const match of workspaceStyles.matchAll(/oklch\([^)]*\)/gu)) {
    const index = match.index ?? 0;
    if (index > floorSectionStart && index < floorSectionEnd) continue;
    found.push(match[0]);
  }
  return found;
}

function violetOklchOutsideFloorSection() {
  return rawOklchOutsideFloorSection().filter((value) => {
    const hue = Number(/^oklch\(\s*[\d.]+\s+[\d.]+\s+([\d.]+)/u.exec(value)?.[1] ?? Number.NaN);
    return Number.isFinite(hue) && hue >= 300 && hue <= 340;
  });
}

test("VIP Manager keeps a white operator surface authored in OKLCH", () => {
  assert.match(globals, /--paper:\s*oklch\(0\.968 0\.0035 85\)/u);
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

test("type is one Japanese-first family with explicit roles and tabular figures", () => {
  // M PLUS 2 is pinned because it was the only humane Japanese candidate that
  // measured uniform digit advances AND an effective `tnum`. Zen Kaku Gothic
  // New/Antique, Murecho and BIZ UDPGothic drift 15-19px across a ten-digit
  // string, so a ledger column would jitter. BIZ UDPGothic also ships only
  // 400/700. See docs/ui/VIP_MANAGER_LIGHT_RESERVATION_RESEARCH.md section 4.
  assert.match(layout, /M_PLUS_2/u);
  assert.match(layout, /weight:\s*\["400", "500", "600", "700"\]/u);
  // The retired monospace face is what made the board read as a terminal.
  assert.doesNotMatch(layout, /IBM_Plex_Mono/u);
  assert.doesNotMatch(layout, /BIZ_UDPGothic|Noto_Sans_JP|Zen_Kaku|Murecho|Inter|Roboto/u);
  // Figures stay a distinct register inside that one family, never a re-import.
  assert.match(globals, /--font-figure:\s*var\(--font-ui\)/u);
  assert.match(globals, /:root \{[\s\S]*?font-variant-numeric:\s*tabular-nums lining-nums/u);
  assert.match(globals, /font-variant-numeric:\s*tabular-nums/u);
  // The built M PLUS 2 face measured no palt width delta on the audited mixed
  // Japanese labels. Keep the font default instead of declaring a false role.
  assert.doesNotMatch(globals, /font-feature-settings:[^;]*palt/u);
  assert.match(globals, /font-synthesis:\s*none/u);
  assert.match(globals, /--track-caps:\s*0\.04em/u);
  for (const role of ["--weight-body: 400", "--weight-ui: 500", "--weight-strong: 600", "--weight-display: 700"]) {
    assert.match(globals, new RegExp(role, "u"));
  }
  assert.match(workspaceStyles, /font-weight:\s*var\(--weight-display\)/u);
  assert.match(workspaceStyles, /font-weight:\s*var\(--weight-strong\)/u);
  assert.doesNotMatch(workspaceStyles, /font-weight:\s*(?:400|500|600|700)\b/u);
  assert.match(workspaceStyles, /\.wizardRail small \{[^}]*font-size:\s*inherit;[^}]*line-height:\s*var\(--lh-ui\)/u);
  // Narrower visible tracking must not move the frozen content-sized controls.
  assert.match(workspaceStyles, /予約ステータス[^}]*padding-inline-end:\s*0\.25em/u);
  assert.match(workspaceStyles, /担当スタッフでFloorを絞り込み[^}]*padding-inline-end:\s*0\.1em/u);
  assert.match(workspaceStyles, /\.ribbonControl > span \{[^}]*padding-inline-end:\s*0\.15em/u);
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

test("Basic access renders no secondary credential field in either lane", () => {
  assert.match(workspace, /className=\{styles\.loginFrame\}/u);
  assert.match(workspace, /GHOST Osaka 1階VIPフロア座席図/u);
  assert.match(workspace, /if \(!demo\.config\)/u);
  assert.match(workspace, /ユーザー名とパスワードを確認しています/u);
  assert.match(workspace, /ブラウザのBasic認証から直接/u);
  assert.match(workspace, /window\.location\.reload\(\)/u);
  assert.match(workspace, /VIP予約デモへ再接続/u);
  assert.match(workspace, /onClick=\{\(\) => void reconnect\(\)\}/u);
  assert.doesNotMatch(workspace, /デモ専用PIN|owner-pin|type="password"|submitPin|loginInputRef/u);
  const ownerBoundary = workspace.slice(
    workspace.indexOf("if (!demo.config)"),
    workspace.indexOf("return (", workspace.indexOf("if (!demo.config)") + 1),
  );
  assert.doesNotMatch(ownerBoundary, /<input|type="password"/u);
  assert.match(workspaceStyles, /\.loginFrame \{[\s\S]*?grid-template-columns:/u);
  assert.match(workspaceStyles, /vipmapv3\.9239fd2174\.webp/u);
  assert.match(
    workspaceStyles,
    /@media \(max-width: 1023px\) \{[\s\S]*?\.loginFrame \{[\s\S]*?border: 0;[\s\S]*?\.loginIdentityBody, \.loginPlan \{ display: none;/u,
  );
  assert.doesNotMatch(
    workspaceStyles.match(/\.loginPanel \{[\s\S]*?\n\}/u)?.[0] ?? "",
    /box-shadow/u,
  );
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

test("the public website's black-violet never leaks onto the operator surface", () => {
  // The Owner decision is a light operator surface. The venue's black-violet is
  // the public website's palette and belongs in this app only as the floor-plan
  // artwork, which is a dark drawing laid on the white desk.
  assert.match(globals, /color-scheme:\s*light/u);
  assert.doesNotMatch(globals, /prefers-color-scheme/u);
  assert.doesNotMatch(workspaceStyles, /prefers-color-scheme/u);

  const strays = violetOklchOutsideFloorSection();
  assert.deepEqual(strays, [],
    `violet/purple authored outside the floor-plan section: ${strays.join(", ")}`);

  // Ratchet: exactly one raw colour survives outside section 6 (a graphite
  // shadow). Everything else must come from a token, so a new raw value fails
  // here instead of quietly starting a second palette. docs/DESIGN.md 4.1.
  const raw = rawOklchOutsideFloorSection();
  assert.ok(raw.length <= 1,
    `raw oklch() outside the floor section must stay <= 1, found ${raw.length}: ${raw.join(", ")}`);
});

test("banned styling and animation runtimes cannot enter the dependency tree", () => {
  // This surface is hand-authored CSS carrying an audited contrast and density
  // model. Every package below would ship a second, conflicting model whose
  // defaults the assertions above forbid. docs/DESIGN.md 2.2.
  const installed = new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
  ]);
  const banned = [
    "tailwindcss", "@tailwindcss/postcss", "postcss", "autoprefixer", "sass", "less",
    "styled-components", "@emotion/react", "@emotion/styled", "@vanilla-extract/css",
    "motion", "framer-motion", "gsap", "@gsap/react", "lenis", "@studio-freight/lenis",
    "three", "@react-three/fiber", "@react-three/drei",
    "@radix-ui/react-dialog", "@mui/material", "@chakra-ui/react", "antd", "bootstrap",
    "@heroicons/react", "react-icons", "@tabler/icons-react", "@phosphor-icons/react",
    "recharts", "chart.js", "d3",
  ];
  for (const name of banned) {
    assert.equal(installed.has(name), false, `banned dependency installed: ${name}`);
  }
  for (const name of installed) {
    assert.doesNotMatch(name, /^@radix-ui\//u, `banned dependency installed: ${name}`);
  }
  // lucide-react is the only icon source.
  assert.equal(installed.has("lucide-react"), true);
  // A config file is the other way these arrive.
  for (const config of [
    "tailwind.config.js", "tailwind.config.ts", "tailwind.config.mjs",
    "postcss.config.js", "postcss.config.mjs", "postcss.config.json",
  ]) {
    assert.equal(existsSync(new URL(`../../${config}`, import.meta.url)), false,
      `banned config present: ${config}`);
  }
});

test("build invariants that look like mistakes stay in place", () => {
  // Each of these has been "cleaned up" by a well-meaning change before.
  // docs/DESIGN.md 2.3 records why every one of them is deliberate.
  const build = packageJson.scripts?.build ?? "";
  assert.doesNotMatch(build, /provision-basic-owner|pin/iu, "build has no secondary credential provisioning");
  assert.match(build, /next build --webpack/u, "the production build is pinned to webpack");
  assert.match(build, /fix-middleware-trace\.mjs/u, "the middleware trace fix runs post-build");
  assert.ok(
    build.indexOf("next build") < build.indexOf("fix-middleware-trace"),
    "build steps must stay in build -> trace-fix order",
  );

  // Preloading the webfont would cost the first paint the Hiragino-first
  // fallback list exists to protect on the venue's iPads.
  assert.match(layout, /preload:\s*false/u);

  // Widening the matcher puts the Basic challenge in front of the floor plan.
  for (const excluded of ["_next/static", "_next/image", "media/", "icon.svg"]) {
    assert.ok(middlewareSource.includes(excluded),
      `middleware matcher must keep excluding ${excluded}`);
  }

  // The workspace owns its scroll regions; page-level scroll is a layout bug
  // and the QA harness fails on horizontal overflow.
  assert.match(globals, /body \{[\s\S]*?overflow:\s*hidden/u);
});

test("the 1023px shell breakpoint stays in sync on every side", () => {
  // The stylesheet switches to one column, the workspace switches its
  // interaction model, and the harness brackets the threshold. Changing one
  // side alone makes the audit report on a layout no operator ever sees.
  const scriptBreakpoints = [...workspace.matchAll(/matchMedia\("\(max-width:\s*(\d+)px\)"\)/gu)]
    .map((match) => match[1]);
  assert.ok(scriptBreakpoints.length >= 1, "the workspace must resolve the shell breakpoint");
  assert.deepEqual([...new Set(scriptBreakpoints)], ["1023"],
    "every matchMedia in the workspace must use the same 1023px threshold");
  assert.match(workspaceStyles, /@media \(max-width: 1023px\)/u);

  const widths = new Set(QA_VIEWPORTS.map(({ width }) => width));
  assert.ok(widths.has(1024), "the audit must cover the first two-column width");
  assert.ok(widths.has(768), "the audit must cover a single-column width");
});
