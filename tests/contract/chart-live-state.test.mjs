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
  assert.match(source, /document\.addEventListener\("visibilitychange", syncMotion\)/u);
  assert.match(source, /otherIndex !== index/u);
  assert.doesNotMatch(source, /otherIndex > index/u);
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

test("the band blinks on its frame, never on the surface its label sits on", async () => {
  const styles = await readFile(
    new URL("../../src/components/admin/vip-floor-v2/VipFloorWorkspace.module.css", import.meta.url),
    "utf8",
  );
  const chartStart = styles.indexOf("── 7. chart");
  const chartEnd = styles.indexOf("── 8. inspector");
  assert.ok(
    chartStart > 0 && chartEnd > chartStart,
    "the numbered section banners are the anchor for these checks — keep them intact",
  );
  const chartSection = styles.slice(chartStart, chartEnd);

  /* DESIGN.md §7.1: an animated backdrop makes a label's contrast a function of
   * the animation phase. Only the ring overlay may animate, and only opacity. */
  for (const [tier, duration] of [["low", "2.4s"], ["medium", "1.8s"], ["high", "900ms"]]) {
    assert.match(
      chartSection,
      new RegExp(
        `\\.timelineBar\\[data-signal="${tier}"\\]:not\\(\\[data-acknowledged\\]\\)[\\s\\S]{0,120}?`
        + `animation: timelineSignal[A-Za-z]+ ${duration}`,
        "u",
      ),
      `the ${tier} tier must animate the signal ring at ${duration}`,
    );
  }
  for (const frame of chartSection.matchAll(/@keyframes timelineSignal[A-Za-z]+ \{([\s\S]*?)\n\}/gu)) {
    const declarations = frame[1].match(/[a-z-]+(?=:)/gu) ?? [];
    assert.deepEqual(
      [...new Set(declarations)],
      ["opacity"],
      "signal keyframes may animate opacity and nothing else",
    );
  }

  /* Handled bands keep their state and lose their motion. */
  assert.match(
    chartSection,
    /\.timelineBar\[data-acknowledged\] \.timelineBarSignal \{ animation: none;/u,
  );
  /* §6.1: the browser's tap flash was removed on purpose, so every control has
   * to acknowledge its own press. The band cannot use the shared background
   * press — that surface is the service status. */
  assert.match(styles, /\.timelineBar:active \{ scale: 0\.9\d+; \}/u);
  assert.doesNotMatch(styles, /\.timelineBar:active \{[^}]*background/u);
  /* Backgrounded all night on the venue iPad. */
  assert.match(
    chartSection,
    /\.timelineView\[data-motion="paused"\] \.timelineBarSignal \{ animation-play-state: paused; \}/u,
  );
  /* Reduced motion keeps all three tiers legible as an authored still state. */
  const reduced = chartSection.slice(chartSection.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
  for (const tier of ["low", "medium", "high"]) {
    assert.match(reduced, new RegExp(`\\[data-signal="${tier}"\\] \\.timelineBarSignal \\{ opacity:`, "u"));
  }
});
