import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

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

const [businessDateField, businessDateStyles, timelineState, ticketOperationsStyles] = await Promise.all([
  readFile(new URL("../../src/components/admin/vip-floor-v2/shell/BusinessDateField.tsx", import.meta.url), "utf8"),
  readFile(new URL("../../src/components/admin/vip-floor-v2/shell/BusinessDateField.module.css", import.meta.url), "utf8"),
  readFile(new URL("../../src/components/admin/vip-floor-v2/chart/timelineState.ts", import.meta.url), "utf8"),
  readFile(new URL("../../src/components/admin/vip-floor-v2/ticket-operations/TicketOperations.module.css", import.meta.url), "utf8"),
]);

const operatorStyleSheets = [workspaceStyles, businessDateStyles, ticketOperationsStyles];

/* Every component on the operator surface, so a guard can assert across the
 * whole tree rather than against a list that silently goes stale. */
const componentRoot = fileURLToPath(new URL("../../src/components/admin/vip-floor-v2", import.meta.url));
const componentSources = Object.fromEntries(await Promise.all(
  (await readdir(componentRoot, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".tsx"))
    .map(async (entry) => {
      const full = path.join(entry.parentPath ?? entry.path, entry.name);
      return [path.relative(componentRoot, full), await readFile(full, "utf8")];
    }),
));
assert.ok(Object.keys(componentSources).length > 15,
  "the component sweep must actually find the operator components");

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
  /* The ground is white and neutral. It was `oklch(0.968 0.0035 85)` — a warm
   * beige — until 2026-08-16, which put a yellow cast under every white pane
   * and under the accent, and read as unwashed rather than as warm. Hue is
   * pinned away from the warm band so the ramp cannot drift back. */
  const paperHue = Number(/--paper:\s*oklch\([\d.]+ [\d.]+ ([\d.]+)\)/u.exec(globals)?.[1]);
  const paperLightness = Number(/--paper:\s*oklch\(([\d.]+)/u.exec(globals)?.[1]);
  assert.ok(paperLightness >= 0.97, `the ground must read as white, got L=${paperLightness}`);
  assert.ok(paperHue > 200, `the ground must not carry a warm cast, got hue=${paperHue}`);
  assert.match(globals, /--surface:\s*oklch\(1 0 0\)/u);
  assert.match(globals, /--canvas:\s*var\(--paper\)/u);

  /* Graphite carries every action; the accent is never a fill the operator
   * presses. One accent only — no SaaS blue, no second colour. */
  assert.match(globals, /--action:\s*oklch\(0\.2\d+ 0\.0\d+ 2\d\d\)/u);
  assert.match(globals, /--accent:\s*oklch\(0\.4\d+ 0\.19 30\d\)/u);
  assert.match(globals, /--accent-ink:\s*oklch\(0\.4\d+ 0\.\d+ 30\d\)/u);
  assert.match(globals, /--accent-line:\s*oklch\(0\.5\d+ 0\.\d+ 30\d\)/u);
});

test("the accent is a mark, never a surface the operator presses", () => {
  /* The measured reason champagne was retired: `oklch(0.605 0.078 76)` is
   * `#9d7b4a`, 3.91:1 on white, under the 4.5:1 body floor. The replacement is
   * only defensible while it stays ink, an edge, a hairline and a low wash —
   * the moment it becomes a button fill it is the generic SaaS purple this
   * pass exists to remove. */
  assert.doesNotMatch(globals, /--accent:\s*oklch\([\d.]+ 0\.0\d+ 7\d\)/u,
    "the retired champagne accent must not return as the primary accent");
  assert.match(globals, /--accent-wash:\s*color-mix\(in oklch, var\(--accent\) [1-9]%/u,
    "the accent wash must stay in single digits so it reads as tinted paper");
  assert.match(globals, /--action-text:\s*var\(--ink-inverse\)/u);

  /* The accent may paint a mark — a 2px rule, a swatch glyph, a dot — but never
   * a box the operator reads as a filled control. Mechanically: every
   * `background: var(--accent)` must belong to a pseudo-element, which is what
   * a mark is drawn with on this surface. */
  const accentFillSelectors = [];
  for (const sheet of operatorStyleSheets) {
    for (const block of sheet.matchAll(/([^{}]+)\{([^{}]*)\}/gu)) {
      const [, selector, body] = block;
      if (!/background:\s*var\(--accent\)\s*;/u.test(body)) continue;
      if (/::(before|after)/u.test(selector)) continue;
      accentFillSelectors.push(selector.trim());
    }
  }
  assert.deepEqual(accentFillSelectors, [],
    "the accent may mark, never fill: use --accent-wash for a surface");
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

test("planes separate by hairline and value, not by an elevation stack", () => {
  /* Both measured references for this class of light product UI are explicit:
   * Stripe "avoids shadows entirely", Anthropic "don't use box-shadow for
   * elevation". Running value steps, hairlines, contact shadows and coloured
   * washes at once is what made the plane stack unreadable. Only things that
   * genuinely float over scrolled content keep a shadow. */
  /* A shadow states a z-relationship, and the only z-relationship on this
   * surface is content passing *underneath* an element. So the contact step is
   * legal exactly on rules that are sticky or fixed. Before this guard it was
   * also being spent on two static bands that already carried hairlines. */
  const contactShadowSelectors = [];
  for (const sheet of operatorStyleSheets) {
    for (const block of sheet.matchAll(/([^{}]+)\{([^{}]*)\}/gu)) {
      const [, selector, body] = block;
      if (!/box-shadow:\s*var\(--lift-pane\)/u.test(body)) continue;
      if (/position:\s*(sticky|fixed)/u.test(body)) continue;
      contactShadowSelectors.push(selector.trim().split("\n").pop().trim());
    }
  }
  assert.deepEqual(contactShadowSelectors, [],
    "--lift-pane is the contact step for sticky content; a static band separates "
    + "by hairline and value");

  /* Only three elevation steps exist at all, and the two long ones belong to
   * things that float over the whole surface. */
  const shadowTokens = [...globals.matchAll(/--lift-[a-z]+:([^;]*);/gu)]
    .filter(([, value]) => value.trim() !== "none");
  assert.equal(shadowTokens.length, 3,
    `the elevation budget is contact + popover + dialog, found ${shadowTokens.length}`);
});

test("type is an authored pairing with optical tracking and tabular figures", () => {
  /* The 2026-08-16 bake-off measured glyph ink boxes, not line boxes. Against
   * Noto Sans JP's own digits: Instrument Sans +0.8pt, Onest -1.4pt, Inter
   * Tight +2.2pt, Host Grotesk -8.5pt. M PLUS 2 carried 23% more digit ink
   * width than Noto Sans JP, which is why the ledger read as inflated.
   * docs/research/vip-manager-type-accent-bakeoff-2026-08-16.md */
  assert.match(layout, /Instrument_Sans/u);
  assert.match(layout, /Noto_Sans_JP/u);
  assert.doesNotMatch(layout, /M_PLUS_2/u, "the retired single family must not return");
  assert.doesNotMatch(layout, /IBM_Plex_Mono/u, "a terminal face must never carry figures");
  /* Scoped to the import, so the bake-off note may name the faces it rejected. */
  const fontImport = /^import \{([^}]*)\} from "next\/font\/google";$/mu.exec(layout)?.[1] ?? "";
  assert.doesNotMatch(fontImport, /BIZ_UDPGothic|Zen_Kaku|Murecho|Inter|Roboto|M_PLUS/u,
    `a rejected face was imported: ${fontImport}`);

  /* The font variables must be declared on <html>. `--font-ui` is composed from
   * them in `:root`, and a custom property is only visible on the element that
   * declares it and its descendants — declared on <body> the whole font-family
   * declaration is invalid and the surface silently drops to the browser's
   * default serif, which is exactly what shipped for one build of this pass. */
  assert.match(layout, /<html lang="ja" className=\{`\$\{latinFont\.variable\} \$\{japaneseFont\.variable\}`\}>/u,
    "font variables must sit on <html> or :root cannot resolve --font-ui");
  assert.doesNotMatch(layout, /<body className=\{[^}]*Font\.variable/u);
  assert.match(globals, /--font-ui:\s*var\(--font-operator-latin\), var\(--font-operator-jp\)/u);

  // Figures stay a distinct register inside the pairing, never a re-import.
  assert.match(globals, /--font-figure:\s*var\(--font-ui\)/u);
  assert.match(globals, /:root \{[\s\S]*?font-variant-numeric:\s*tabular-nums lining-nums/u);
  assert.match(globals, /font-variant-numeric:\s*tabular-nums/u);
  assert.doesNotMatch(globals, /font-feature-settings:[^;]*palt/u);
  assert.match(globals, /font-synthesis:\s*none/u);
  assert.doesNotMatch(globals, /font-family:[^;]*monospace/u);

  /* Optical tracking. Until this pass there was no negative tracking anywhere
   * on the surface, so every size ran at the font's default reading spacing and
   * headings and counters sat visibly loose — the single largest reason the
   * board read as un-authored. The curve follows the measured references:
   * Stripe -0.010em at 12px through -0.025em at 56px, Linear -0.011em body and
   * -0.022em display. */
  assert.match(globals, /--track-caps:\s*0\.04em/u);
  assert.match(globals, /:root \{[\s\S]*?letter-spacing:\s*var\(--track-body\)/u,
    "the surface default must be the body tracking step, not the font default");
  const trackSteps = ["--track-body", "--track-data", "--track-lead", "--track-figure", "--track-display"];
  let previous = 0;
  for (const step of trackSteps) {
    const value = Number(new RegExp(`${step}:\\s*(-?[\\d.]+)em`, "u").exec(globals)?.[1]);
    assert.ok(Number.isFinite(value), `${step} must be declared in em`);
    assert.ok(value < 0, `${step} must tighten, got ${value}em`);
    assert.ok(value < previous, `${step} must tighten further than the step above it`);
    previous = value;
  }
  /* Small labels are the one place tightening costs legibility, so the micro
   * step stays at or above zero. */
  const micro = Number(/--track-micro:\s*(-?[\d.]+)em/u.exec(globals)?.[1]);
  assert.ok(micro >= 0, `--track-micro must not tighten small labels, got ${micro}em`);

  /* Four weight roles on a variable axis. The previous 400/500/600/700 ladder
   * made almost every label semibold or bolder; the measured references let
   * size, tracking and ink carry hierarchy instead (Stripe sets 56px display at
   * weight 300, Linear uses 510/590). */
  for (const role of ["--weight-body: 400", "--weight-ui: 460", "--weight-strong: 560", "--weight-display: 620"]) {
    assert.match(globals, new RegExp(role, "u"));
  }
  assert.match(workspaceStyles, /font-weight:\s*var\(--weight-display\)/u);
  assert.match(workspaceStyles, /font-weight:\s*var\(--weight-strong\)/u);
  assert.doesNotMatch(workspaceStyles, /font-weight:\s*(?:400|500|600|700)\b/u);
  assert.match(workspaceStyles, /\.wizardRail small \{[^}]*font-size:\s*inherit;[^}]*line-height:\s*var\(--lh-ui\)/u);
  // Narrower visible tracking must not move the frozen content-sized controls.
  assert.match(workspaceStyles, /予約ステータス[^}]*padding-inline-end:\s*0\.25em/u);
  assert.match(workspaceStyles, /担当スタッフでFloorを絞り込み[^}]*padding-inline-end:\s*0\.1em/u);
  // Six-step scale, so component sizes are chosen from a system.
  for (const step of ["--t-micro", "--t-mini", "--t-body", "--t-data", "--t-lead", "--t-figure"]) {
    assert.match(globals, new RegExp(`${step}:`, "u"));
  }
});

test("the business date is an authored control, never the browser's", () => {
  /* `<input type="date">` inherits the browser's locale, so a Japanese operator
   * console printed `07/26/2026`. It also showed no weekday, drew a second
   * calendar glyph beside the app's own, and could not honour the 44px floor. */
  /* Business dates only. Personal dates (生年月日, 記念日) keep the native
   * control on purpose: a month grid cannot reach 1985 in a usable number of
   * taps, and iPadOS gives a locale-correct wheel for exactly that job. */
  const businessDateScreens = Object.entries(componentSources)
    .filter(([name]) => !name.endsWith("BusinessDateField.tsx")
      && !name.endsWith("CustomerPanel.tsx"));
  for (const [name, source] of businessDateScreens) {
    assert.doesNotMatch(source, /type="date"/u,
      `${name} must use BusinessDateField, not a native date input`);
  }
  assert.match(componentSources["customers/CustomerPanel.tsx"], /name="birthDate" type="date"/u,
    "the personal-date exception must stay explicit, not drift into the sweep");
  assert.match(businessDateField, /2026|WEEKDAY_LABELS/u);
  assert.match(businessDateField, /\$\{p\.y\}\/\$\{String\(p\.m\)\.padStart\(2, "0"\)\}/u,
    "the date must render year-first in the venue's order");
  assert.match(businessDateField, /timeZone: "Asia\/Tokyo"/u,
    "today must be the venue's today, not the device's");
  assert.match(businessDateField, /Date\.UTC/u,
    "date arithmetic must run through UTC so a business date cannot drift a day");
  assert.match(businessDateStyles, /\.dateCell \{[\s\S]*?width: var\(--h-control\);[\s\S]*?height: var\(--h-control\);/u,
    "every day cell must meet the touch floor");
  assert.match(businessDateField, /aria-controls=\{popoverId\}/u,
    "the date toggle must identify the popover it controls");
  assert.match(businessDateField, /id=\{popoverId\}[\s\S]*?role="dialog"/u,
    "the controlled id must belong to the date dialog");
  assert.match(businessDateField, /onKeyDown=\{\(event\) => \{[\s\S]*?event\.key !== "Escape"[\s\S]*?close\(true\)/u,
    "Escape must close the whole popover and restore trigger focus");

  const dateHoverStart = businessDateStyles.indexOf("@media (hover: hover) and (pointer: fine)");
  const datePhoneStart = businessDateStyles.indexOf("@media (max-width: 767px)");
  assert.ok(dateHoverStart > 0 && datePhoneStart > dateHoverStart,
    "the date control must keep pointer hover in its own capability guard");
  assert.doesNotMatch(
    businessDateStyles.slice(0, dateHoverStart) + businessDateStyles.slice(datePhoneStart),
    /:hover/u,
    "an unguarded date hover latches after a tap on the venue iPad",
  );
  for (const selector of [
    ".dateFieldTrigger:active",
    ".datePopoverHead button:active",
    ".dateCell:active",
    ".datePopoverFoot button:active",
  ]) assert.ok(businessDateStyles.includes(selector), `${selector} must acknowledge touch`);
});

test("an elapsed duration is never printed as an unbounded minute count", () => {
  /* The board reported `未着28952分` — twenty days stated in minutes, which
   * reads as a broken counter rather than as a duration. */
  assert.match(timelineState, /export function formatElapsedMinutes/u);
  assert.doesNotMatch(timelineState, /`未着\$\{delay\}分`/u);
  assert.doesNotMatch(timelineState, /`解放超過\$\{overtime\}分`/u);
  assert.match(timelineState, /未着\$\{formatElapsedMinutes\(delay\)\}/u);
  assert.match(timelineState, /解放超過\$\{formatElapsedMinutes\(overtime\)\}/u);
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
  for (const spokenState of ["入力済み", "既定値を使用", "現在の段階", "未入力"]) {
    assert.ok(reservationWizard.includes(`"${spokenState}"`));
  }
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

test("Basic access stays browser-native until terminal logout requires explicit unlock", () => {
  assert.match(workspace, /className=\{styles\.loginFrame\}/u);
  assert.match(workspace, /GHOST Osaka 1階VIPフロア座席図/u);
  assert.match(workspace, /if \(!demo\.config\)/u);
  /* This frame answers two states only — the terminal lock and a failed
   * connection. The in-flight session probe belongs to the boot screen; when
   * it rendered here it produced a login page with no form in it. */
  assert.match(workspace, /接続を完了できませんでした/u);
  assert.match(workspace, /端末をロックしました/u);
  assert.match(workspace, /ブラウザのBasic認証から直接/u);
  assert.match(workspace, /window\.location\.reload\(\)/u);
  assert.match(workspace, /VIP予約デモへ再接続/u);
  assert.match(workspace, /onClick=\{\(\) => void reconnect\(\)\}/u);
  assert.doesNotMatch(workspace, /デモ専用PIN|owner-pin|submitPin|loginInputRef/u);
  assert.match(workspace, /lockedOwnerAccess[\s\S]*?<form[\s\S]*?autoComplete="username"[\s\S]*?type="password"[\s\S]*?ロックを解除/u);
  assert.match(workspace, /ブラウザに残るBasic認証だけでは解除できません/u);
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
  for (const label of ["予約", "次の来店", "要対応", "卓未定"]) {
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

test("every pre-ledger frame renders the one boot screen", async () => {
  /*
   * A cold load used to cross four unrelated full-page layouts: the route
   * Suspense fallback rendered an empty `<main>`, `app/loading.tsx` rendered
   * three static grey bars, and the owner session probe rendered the entire
   * OWNER ACCESS login frame — display wordmark, floor-plan figure, a right
   * column more than half empty, 64px taller than the venue iPad's viewport —
   * as a progress screen with no form in it. Each one was then discarded.
   * These assertions keep the three entry points on a single frame.
   * docs/DESIGN.md 7.2.
   */
  const [bootScreen, routeLoading, routePage] = await Promise.all([
    readFile(new URL("../../src/components/admin/vip-floor-v2/VipBootScreen.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../src/app/loading.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../src/app/page.tsx", import.meta.url), "utf8"),
  ]);
  for (const [name, source] of [["app/loading.tsx", routeLoading], ["app/page.tsx", routePage]]) {
    assert.match(source, /VipBootScreen/u, `${name} must render the shared boot screen`);
  }
  // The Suspense fallback is the very first paint; an empty element there is
  // what made the sequence start on a blank page.
  assert.doesNotMatch(routePage, /fallback=\{<main[^}]*\/>\}/u);
  // The session probe must not fall through to the OWNER ACCESS frame.
  assert.match(workspace, /auth\.status === "checking"[\s\S]{0,220}?<VipBootScreen/u);
  assert.doesNotMatch(workspace, /VIP Managerを開いています/u);

  // The boot screen is server-safe, so the first byte can carry it.
  assert.doesNotMatch(bootScreen, /"use client"/u);
  assert.doesNotMatch(bootScreen, /\buse(?:State|Effect|Ref|Memo)\b/u);
  // Four records, one ruled line.
  assert.equal((bootScreen.match(/styles\.bootDot/gu) ?? []).length, 4);

  // Content-box plus padding is what pushed the login frame past 810 points.
  assert.match(workspaceStyles, /\.bootShell \{[^}]*box-sizing: border-box/u);

  // The loop stays on the compositor: the dots may only translate and scale,
  // and the violet head is an opacity crossfade over a graphite dot rather
  // than an animated colour.
  const bootFrames = [...workspaceStyles.matchAll(/@keyframes bootQueue[A-Za-z]+ \{([\s\S]*?)\n\}/gu)];
  assert.equal(bootFrames.length, 2, "boot keyframes: advance and lead");
  for (const frame of bootFrames) {
    const properties = [...frame[1].matchAll(/([a-z-]+)\s*:/gu)]
      .map((match) => match[1])
      .filter((property) => property !== "animation-timing-function");
    assert.ok(properties.length > 0, "boot keyframes must declare something");
    for (const property of properties) {
      assert.ok(["transform", "opacity"].includes(property),
        `boot keyframes may only animate transform and opacity, found ${property}`);
    }
  }

  /* Every record carries its slot as a plain declaration too. Without it the
   * four dots collapse onto slot 0 and read as a single dot the moment the
   * animation is not running — which is exactly what the QA gate captures,
   * since it screenshots with animations disabled. */
  const bootBase = workspaceStyles.slice(
    workspaceStyles.indexOf("── 10b. boot"),
    workspaceStyles.indexOf("@media (prefers-reduced-motion: reduce) {\n  .bootQueue"),
  );
  assert.ok(bootBase.length > 0, "the boot section banner anchors this check");
  for (const [slot, offset] of [[2, "var(--boot-gap)"], [3, "calc(var(--boot-gap) * 2)"], [4, "calc(var(--boot-gap) * 3)"]]) {
    assert.match(
      bootBase,
      new RegExp(`\\.bootDot:nth-child\\(${slot}\\) \\{[^}]*transform: translate3d\\(${offset.replace(/[(){}*|\\^$+?.[\]]/gu, "\\$&")}, 0, 0\\)`, "u"),
      `boot record ${slot} must rest on its own slot without the animation`,
    );
  }

  /* Reduced motion is an authored still, not a slower loop: `globals.css`
   * clamps every animation to 1ms and a single iteration under `reduce`,
   * house-wide, so a fallback that keeps cycling silently renders as four grey
   * dots with no accent at all. The head record must be champagne without an
   * animation. */
  assert.match(globals, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation-iteration-count:\s*1\s*!important/u);
  assert.match(
    workspaceStyles,
    /@media \(prefers-reduced-motion: reduce\) \{\s*\.bootDot \{ animation: none;[^}]*\}\s*\.bootDot:nth-child\(4\)::before \{ opacity: 1; \}/u,
  );
  assert.doesNotMatch(workspaceStyles, /bootQueueLeadResting/u);

  // The boot screen is a required QA state, so it is audited at every viewport.
  const qaManifest = await readFile(
    new URL("../../scripts/light-ui-qa-manifest.mjs", import.meta.url), "utf8",
  );
  assert.match(qaManifest, /QA_REQUIRED_STATES = Object\.freeze\(\[\s*"boot"/u);
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
