import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("chart advances its now line, exposes live phases and includes both sides of a conflict", async () => {
  const source = await readFile(
    new URL("../../src/components/admin/vip-floor-v2/chart/ChartView.tsx", import.meta.url),
    "utf8",
  );

  /* The band guards two fifteen-minute thresholds, so the clock has to be finer
   * than the window it guards. The tick is local arithmetic and issues no
   * request — see tests/contract/realtime-revision-budget.test.mjs for the
   * boundary that does cost something. */
  assert.match(source, /setInterval\(\(\) => setRenderedAt\(Date\.now\(\)\), 10_000\)/u);
  assert.match(source, /data-phase=\{phase\.key\}/u);
  assert.match(source, /data-signal=\{phase\.signal\}/u);
  assert.match(source, /data-acknowledged=\{phase\.acknowledged \|\| undefined\}/u);
  assert.match(source, /timelineClosingWindow/u);
  assert.match(source, /TIMELINE_PHASE_ORDER/u);
  assert.match(source, /setRenderedAt\(Date\.now\(\)\)/u);
  assert.match(source, /document\.addEventListener\("visibilitychange", syncMotion\)/u);
  assert.match(source, /previous\.get\(reservation\.id\) === band\.phase\.key/u);
  assert.match(source, /role="status" aria-atomic="true"/u);
  assert.match(source, /otherIndex !== index/u);
  assert.doesNotMatch(source, /otherIndex > index/u);
});

test("arrival misses and release pressure stay distinct and actionable", async () => {
  const state = await readFile(
    new URL("../../src/components/admin/vip-floor-v2/chart/timelineState.ts", import.meta.url),
    "utf8",
  );
  const styles = await readFile(
    new URL("../../src/components/admin/vip-floor-v2/VipFloorWorkspace.module.css", import.meta.url),
    "utf8",
  );

  assert.match(state, /arrival_overdue: \{ shortLabel: "未着"/u);
  assert.match(state, /closing_soon: \{ shortLabel: "延長確認"/u);
  assert.match(state, /overdue: \{ shortLabel: "解放超過"/u);
  assert.match(state, /`延長確認 \$\{remaining\}分`/u);
  assert.match(state, /延長の要否を確認してください/u);
  assert.ok(
    state.indexOf("if (!status || NOT_SEATED_STATUSES.has(status))") < state.indexOf("if (nowMs >= endMs)"),
    "a never-arrived party must not turn into a table-release alert after its booked end",
  );
  assert.match(styles, /data-phase="arrival_overdue"[^\n]*--band-frame: var\(--alert\)/u);
});

test("the band is drawn from the release time the floor is actually working to", async () => {
  const source = await readFile(
    new URL("../../src/components/admin/vip-floor-v2/chart/ChartView.tsx", import.meta.url),
    "utf8",
  );

  /* A seat extension moves `expectedReleaseAt` and leaves the booked
   * `scheduledEndAt` alone. Reading the view model's `endAt` would count down
   * to a release time that no longer exists. */
  assert.match(source, /raw\?\.expectedReleaseAt \?\? reservation\.endAt/u);
  /* Geometry, phase and conflict detection must all agree on that same end. */
  assert.match(source, /positionStyle\(reservation\.startAt, endAt,/u);
  assert.match(source, /new Date\(bandEnd\(other\)\)/u);
  assert.match(source, /new Date\(bandEnd\(item\)\)/u);
  assert.doesNotMatch(source, /new Date\(other\.endAt\)/u);

  /* The view model coerces a null service status to `expected`; the fill has
   * thirteen states and must not silently gain a fourteenth wrong one. */
  assert.match(source, /const serviceStatus = band \? band\.serviceStatus : reservation\.serviceStatus/u);
  assert.match(source, /data-service-status=\{serviceStatus \?\? "not_set"\}/u);
});

test("the ruler and the grid land on the times they name", async () => {
  const source = await readFile(
    new URL("../../src/components/admin/vip-floor-v2/chart/ChartView.tsx", import.meta.url),
    "utf8",
  );
  const styles = await readFile(
    new URL("../../src/components/admin/vip-floor-v2/VipFloorWorkspace.module.css", import.meta.url),
    "utf8",
  );

  /* Half-hour intervals labelled by their start. `floor(total / 30) + 1` laid N
   * labels out as N equal columns, which put every label half a column — ten
   * minutes at this window — to the right of the time it named. */
  assert.match(source, /Math\.max\(1, Math\.round\(totalMinutes \/ 30\)\)/u);
  assert.doesNotMatch(source, /Math\.floor\(totalMinutes \/ 30\) \+ 1/u);
  assert.match(source, /"--tick-count": tickCount/u);

  /* The track's rules are derived from that same count, so a line always falls
   * on a label. A fixed percentage cannot: 6.25% was a line every 26.3 minutes. */
  const chartSection = styles.slice(styles.indexOf("── 7. chart"), styles.indexOf("── 8. inspector"));
  /* Declarations only — the prose below explains the old value and must not
   * be what satisfies or trips these checks. */
  const declarations = chartSection.replace(/\/\*[\s\S]*?\*\//gu, "");
  assert.match(declarations, /calc\(200% \/ var\(--tick-count\)\)/u);
  assert.match(declarations, /calc\(100% \/ var\(--tick-count\)\)/u);
  assert.doesNotMatch(declarations, /6\.25%/u);

  /* One "you are here", not one per row, and its clock reads in the ruler
   * where nothing clips it. */
  assert.match(declarations, /\.timelineRow:first-of-type \.nowLine::before/u);
  assert.doesNotMatch(declarations, /^\.nowLine::before/mu);
  assert.match(source, /className=\{styles\.nowMarker\}/u);
  assert.match(declarations, /\.nowMarker \{/u);
});

test("the alarm is a light on the track, never a second frame around the label", async () => {
  const styles = await readFile(
    new URL("../../src/components/admin/vip-floor-v2/VipFloorWorkspace.module.css", import.meta.url),
    "utf8",
  );
  const source = await readFile(
    new URL("../../src/components/admin/vip-floor-v2/chart/ChartView.tsx", import.meta.url),
    "utf8",
  );
  const chartStart = styles.indexOf("── 7. chart");
  const chartEnd = styles.indexOf("── 8. inspector");
  assert.ok(
    chartStart > 0 && chartEnd > chartStart,
    "the numbered section banners are the anchor for these checks — keep them intact",
  );
  const chartSection = styles.slice(chartStart, chartEnd);

  /* The defect this replaced: an overlay pinned to the band's inside edge, so
   * fading it in and out read as the band's own border thickening and thinning
   * — a picture frame with a gap in it. Nothing may reintroduce a second
   * full-perimeter contour inside a band. */
  assert.doesNotMatch(styles, /timelineBarSignal/u);
  assert.doesNotMatch(source, /timelineBarSignal/u);
  /* Selection takes the same champagne spine every other ledger entry on this
   * surface takes. A ring around a band that already has a coloured frame is
   * the same picture-frame artefact by another name. */
  assert.match(chartSection, /\.timelineBar\[data-selected\] \{\s*z-index: 3;\s*box-shadow: inset 0 -3px var\(--accent\);\s*\}/u);
  assert.doesNotMatch(chartSection, /\.timelineBar\[data-selected\] \{[^}]*outline/u);

  /* The light is a sibling of the band inside the track, so no amount of it can
   * reach the label and make a contrast ratio a function of the animation phase
   * (DESIGN.md §7.1). A descendant of the button could. */
  assert.match(source, /className=\{styles\.timelineDeadline\}/u);
  /* Anchor on the band itself. The first `<button>` in this file is the zoom
   * control, so slicing from it audited a region the light was never in. */
  const bandStart = source.indexOf("className={styles.timelineBar}");
  const bandEnd = source.indexOf("</button>", bandStart);
  assert.ok(bandStart > 0 && bandEnd > bandStart, "the band button is the anchor for this check");
  assert.doesNotMatch(
    source.slice(bandStart, bandEnd),
    /timelineDeadline/u,
    "the light must not be drawn inside the band",
  );
  assert.match(source, /data-edge=\{edge\}/u);
  /* And its spill is aimed away from the band at both ends. */
  assert.match(chartSection, /\.timelineDeadline\[data-edge="head"\]::before \{\s*right: 2px;/u);
  assert.match(chartSection, /\.timelineDeadline\[data-edge="tail"\]::before \{\s*left: 2px;/u);

  for (const [tier, duration] of [["low", "2.4s"], ["medium", "1.8s"], ["high", "900ms"]]) {
    assert.match(
      chartSection,
      new RegExp(
        `\\.timelineDeadline\\[data-signal="${tier}"\\]:not\\(\\[data-acknowledged\\]\\)[\\s\\S]{0,120}?`
        + `animation: timelineSignal[A-Za-z]+ ${duration}`,
        "u",
      ),
      `the ${tier} tier must animate the deadline light at ${duration}`,
    );
  }
  /* A lamp switching fully off is a smoke detector, not instrumentation: the
   * state has to be readable in every frame, which is also what makes the
   * reduced-motion still the same object with the motion removed. */
  const tiers = [...chartSection.matchAll(/@keyframes timelineSignal[A-Za-z]+ \{([\s\S]*?)\n\}/gu)];
  assert.equal(tiers.length, 3, "one keyframe per tier");
  for (const frame of tiers) {
    const declarations = frame[1].match(/[a-z-]+(?=:)/gu) ?? [];
    assert.deepEqual(
      [...new Set(declarations)],
      ["opacity"],
      "signal keyframes may animate opacity and nothing else",
    );
    const stops = [...frame[1].matchAll(/opacity: (0?\.\d+|1)/gu)].map((match) => Number(match[1]));
    assert.ok(Math.min(...stops) >= 0.2, `a tier may dim to ${Math.min(...stops)} but never extinguish`);
    assert.ok(Math.max(...stops) === 1, "every tier reaches full strength");
  }
  assert.doesNotMatch(chartSection, /animation: timelineSignal[A-Za-z]+ [^;]*steps\(/u,
    "a square wave is a switch, not a beacon");

  /* Handled signals keep their state and lose their motion. */
  assert.match(chartSection, /\.timelineDeadline\[data-acknowledged\] \{ animation: none; opacity: 0\.\d+; \}/u);
  /* §6.1: the browser's tap flash was removed on purpose, so every control has
   * to acknowledge its own press. The band cannot use the shared background
   * press — that surface is the service status. */
  assert.match(styles, /\.timelineBar:active \{ scale: 0\.9\d+; \}/u);
  assert.doesNotMatch(styles, /\.timelineBar:active \{[^}]*background/u);
  /* Backgrounded all night on the venue iPad. */
  assert.match(
    chartSection,
    /\.timelineView\[data-motion="paused"\] \.timelineDeadline \{ animation-play-state: paused; \}/u,
  );
  /* Reduced motion keeps all three tiers legible as an authored still state. */
  const reduced = chartSection.slice(chartSection.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
  for (const tier of ["low", "medium", "high"]) {
    assert.match(reduced, new RegExp(`\\.timelineDeadline\\[data-signal="${tier}"\\] \\{ opacity:`, "u"));
  }
});

test("the top of the alarm ladder owns the band's colour on its own", async () => {
  const styles = await readFile(
    new URL("../../src/components/admin/vip-floor-v2/VipFloorWorkspace.module.css", import.meta.url),
    "utf8",
  );

  /* A seated table past its release was painting a green status rule straight
   * onto a red alarm frame. The status keeps its rule weight, its pattern and
   * its printed word — the discriminator §7.0b actually relies on — and gives
   * up only the hue, so one band never argues with itself. */
  assert.match(styles, /\.timelineBar\[data-signal="high"\] \{ --band-rule: var\(--ink-2\); \}/u);
});
