# GHOST VIP Manager — Apple surface/font refinement before baseline

Captured: 2026-07-31 JST
Baseline source: `9d2957c240b5fece1197767b37dea1ae6c746bdc`
Scope: Phase 2 / Phase 5 **before-state research only**. No UI implementation,
package, API, backend, state, contract, commit, push or deployment change is part
of this artifact.

## 1. Source and method

- Canonical worktree was verified at exact HEAD `9d2957c` before capture.
- The already-built `.next` for that baseline was served with the repository's
  approved synthetic QA fixture (`scripts/a11y-visual.mjs`). Source edits made
  after capture started were not rebuilt into this server.
- Browser: system Chromium (`/usr/bin/google-chrome`), headless, reduced-motion
  context. The fixture owns all API mocks and uses synthetic data only.
- Required manifest: 45 states. The harness also captures
  `reservation-date-unavailable`, so the observed run is **46 states**.
- Viewports: `1440x900`, `1194x834`, `768x1024`, `390x844`, `320x800`.
- Total: **5 viewports x 46 states = 230 before screenshots** and 230 geometry /
  computed-style records.
- Each state also ran the existing axe, horizontal-overflow, 44px target,
  legacy-purple, console-error and unexpected-5xx checks.

Artifacts:

- Geometry, style catalog, screenshot SHA-256 manifest:
  [`vip-before-geometry.json`](./vip-before-geometry.json)
- Images:
  [`vip-before/`](../../design-references/apple-surface-study-2026-07-31/vip-before/)

The geometry JSON is schema `ghost-vip-apple-surface-before-geometry.v2`. It
contains 230 results, 407 deduplicated computed-style signatures and the
following non-empty selector coverage. Absence is state-appropriate (for
example, `chartStage` exists only in Chart and chart-phases).

| Key | Results with element | Total elements |
|---|---:|---:|
| masthead | 215 | 215 |
| toolbar | 215 | 215 |
| mainWorkspace | 215 | 215 |
| primaryPane | 215 | 215 |
| inspector / mobile sheet | 76 | 76 |
| listHeader | 205 | 205 |
| listRows | 115 | 115 |
| floorStage | 80 | 240 |
| chartStage | 10 | 30 |
| queue | 22 | 22 |
| wizardActive | 50 | 50 |
| wizardAside | 45 | 45 |
| mobileNav | 129 | 129 |
| dialogs | 142 | 142 |

## 2. Capture gate result

| Gate | Result across 230 captures |
|---|---:|
| axe actionable violations | 0 |
| document horizontal overflow | 0 |
| important controls below 44x44 | 0 |
| legacy purple chrome | 0 |
| unexpected console errors | 0 |
| unexpected server 5xx | 0 |

This is a visual refinement baseline, not evidence that all UX is ideal. It
does establish that refinements must preserve the six zeroes above.

## 3. Frozen shell geometry

The first two desktop widths use the two-column shell. The remaining widths use
the single-column shell and fixed bottom navigation.

| Viewport | Masthead | Toolbar | Primary pane | Inspector | Bottom nav |
|---|---|---|---|---|---|
| 1440x900 | `0,0 1440x60` | `0,60 1094.406x56` | `0,60 1094.406x840` | `1095.406,60 344.594x840` | N/A |
| 1194x834 | `0,0 1194x60` | `0,60 894x56` | `0,60 894x774` | `895,60 299x774` | N/A |
| 768x1024 | `0,0 768x60` | `0,112 768x48` | `0,60 768x905` | full sheet when open | `0,965 768x59` |
| 390x844 | `0,0 390x60` | `0,112 390x48` | `0,60 390x725` | `0,52 390x792` when open | `0,785 390x59` |
| 320x800 | `0,0 320x60` | `0,112 320x48` | `0,60 320x681` | `0,52 320x748` when open | `0,741 320x59` |

Notes:

- Desktop work chrome ends at `y=116`; mobile work chrome ends at `y=160`
  because the 52px summary strip sits between masthead and toolbar.
- At 1440px the inspector occupies 344.594px; at the laptop breakpoint it is
  exactly 299px because the baseline's `max-width:1439px` override changes the
  inspector clamp.
- List view strip is 45px (`y=116..161` desktop, `y=160..205` mobile).
- The fixture row is 57px tall at every measured width. On desktop it begins at
  `y=195`; on mobile at `y=239`.

### Floor and Chart instruments

| Surface | 1440x900 | 1194x834 | 390x844 | 320x800 |
|---|---|---|---|---|
| Floor view | `0,116 1094.406x784` | `0,116 894x718` | `0,160 390x625` | `0,160 320x581` |
| Floor canvas | `0,161 1094.406x699` | `0,161 894x633` | `0,205 390x483` | `0,205 320x432.313` |
| Real floor plan | `12,209.172 1070.406x602.656` | `12,232.5 870x489.984` | `-213,248.734 702x395.531` | `-248,223.391 702x395.531` |
| Chart view | `0,116 1094.406x784` | `0,116 894x718` | `0,160 390x625` | `0,160 320x581` |
| Chart scroller | `0,195 1094.406x643.156` | `0,195 894x577.156` | `0,259 390x398` | `0,259 320x354` |
| Chart grid | `1094.406px` wide | `1020px` wide | `1020px` wide | `1020px` wide |

The negative mobile floor-plan `x` is intentional pan geometry inside the
clipped canvas, not document overflow. The 1020px chart grid is likewise an
owned horizontal scroller. Refinement must not turn either into page-level
overflow or change these instrument geometries.

### Reservation wizard geometry

| State | 1440x900 active / aside | 1194x834 active / aside | 390x844 active / aside | 320x800 active / aside |
|---|---|---|---|---|
| Step 1 | `798.563x273` / `319.438x273` | same widths, `x=38/836.563` | `390x244.984` / `390x266` stacked | `320x244.984` / `320x266` stacked |
| Step 4 | `798.563x563.75` / `319.438x563.75` | `798.563x497.75` / `319.438x497.75` | `390x554.469` / `390x266` stacked | `320x515.109` / `320x266` stacked |
| Step 8 | `1118x563.75`, no aside | `1118x497.75`, no aside | `390x676.328`, no aside | `320x691.172`, no aside |

Desktop dialog width is 1120px. Step 1 shrink-wraps to 561.25px high at 1440,
while map-heavy and review steps use the 24px top/bottom cap (`852px` high at
1440, `786px` at 1194). On 768 and below dialogs are full viewport. Mobile
wizard content can extend below the viewport inside its owned scroll area; this
is why step 4 aside bottoms at 1084.719px on 390 and 1045.359px on 320 while the
document-overflow gate remains zero.

## 4. Computed typography inventory

All 7,805 sampled heading/label/metadata/figure nodes resolved to:

```text
"M PLUS 2", "M PLUS 2 Fallback", "Hiragino Sans",
"Hiragino Kaku Gothic ProN", "Yu Gothic UI", Meiryo, sans-serif
```

No Chromium fallback was observed in the sampled runs. That does not prove the
resolved font on iPad/Safari, Windows or Linux without the webfont.

### Distribution

| Role sample | Key result |
|---|---|
| Headings (490) | 430 / 490 (**87.8%**) request weight 700; 265 / 490 are 12px |
| Labels (3,066) | 1,599 at 11px, 663 at 12px: **73.8% are <=12px** |
| Metadata (688) | 433 at 11px, 240 at **9.16667px**, 15 at 12px: all <=12px |
| Figures (3,561) | 1,376 at 11px, 1,095 at 12px: **69.4% are <=12px** |
| Figure weights | 400: 2,472; 500: 575; **600: 284**; 700: 230 |

Representative exact values:

| Role / element | Size / line-height | Weight | Tracking | Ink |
|---|---|---:|---:|---|
| List/Floor/Chart `h2` | 12 / 16.2px | 700 | **1.08px** (`0.09em`) | ink-2 |
| Table `th` | 11 / 14.85px | 500 | 0.55px | ink-3 |
| Inspector `dt` | 12 / 16.2px | 400 | normal | ink-3 |
| Primary time/party/table | 15 / 20.25px | **600** | 0.075px | ink |
| Dialog title / step legend | 18 / 24.3px | 700 | -0.09px | ink |
| Wizard rail `<small>` | **9.16667 / 12.375px** | inherited | inherited | ink-3 |

The 9.16667px wizard labels are not a token. They are the browser's native
`small { font-size: smaller }` applied inside an 11px rail item because the
baseline only sets overflow on `.wizardRail small`, not its font size. This is
a concrete browser-default leak and one of the clearest template-like details.

### Font-weight and feature mismatches to test in the bake-off

- `layout.tsx` requests M PLUS 2 weights 400/500/700, but important figures
  request computed weight **600** in 284 samples (`pulseCluster`, queue time,
  Inspector primary figures, SLO values). The browser must synthesize or map
  that requested weight because no 600 face is declared by the loader.
- Body enables `font-feature-settings: "palt" 1`; `.tabular-nums` intends to turn
  `palt` off. Yet sampled `.tabular-nums` nodes serialize feature settings as
  either `"palt"` or `"tnum"` depending on the node, while mixed runs such as
  `VIP-1 7名` are not always in the tabular class. Do not infer stability from
  the class name; the bake-off must measure widths and baselines directly.
- The same family removes the old mono seam, but current roles still shift
  between normal, tabular and lining-tabular runs. Examples captured include
  `4名`, `VIP-1`, `GHO-0726-01`, `22:00–翌 00:00` and `集客担当`.

## 5. Computed material and controls

### Surfaces (1,889 samples)

| Property | Distribution |
|---|---|
| Background | white 925; paper 445; quiet 194; sunken 96; transparent 177 |
| Radius | 0px 1,806; 4px 53; remaining structural 2–3px variants 30 |
| Shadow | none 1,754 (**92.9%**); dialog/lift 135 |
| Border top | 0px 1,574; 1px 295; 2–3px 20 |

The warm-white/white/quiet/sunken ramp is already coherent, solid and no-glass.
The issue is not a missing palette. It is that dense chrome often applies the
same hairline and typographic register repeatedly, so the planes can read as a
form generator despite having good tokens.

### Controls (5,233 samples)

| Property | Distribution / evidence |
|---|---|
| Height | 44px 3,122; 58px 641; 51px 387; 46px 384; important-target failures 0 |
| Radius | 0px 2,840; 3px 1,418; 2px 326; 6px 640 (primarily real floor controls) |
| Border top | 0px 2,687; 1px 1,870; 2px 641; 3px 35 |
| Shadow | none 4,442 (**84.9%**); inset floor material 600; remaining 191 |
| Weight | 400: 4,271; 500: 377; 700: 580; 600: 5 |

Good baseline state contracts to preserve:

- Focus is authored as a 2px solid focus outline with 2px offset.
- Disabled controls keep legible ink and use a sunken surface rather than
  opacity.
- Selected controls pair surface/rule changes with text, glyph or
  `aria-selected` / `aria-pressed`; no color-only status was found.
- Control background is intentionally not animated. Motion tokens are
  110/160/220ms, but this capture used reduced motion, so computed transitions
  resolve to 1ms. The normal-motion durations were not claimed from this run.

## 6. AI-feel cause matrix

The matrix separates confirmed computed evidence from hypotheses that require
the font bake-off. “Apple difference” means the quality axis to compare against
the separate official Apple/HIG study; it is not a claim that this screen should
copy an Apple layout or material.

| Symptom | Observed location | Computed evidence | Cause hypothesis | Apple-quality difference | Refinement direction | Layout impact |
|---|---|---|---|---|---|---|
| Tiny labels read as generated metadata | table headers, Inspector trailer, floor/chart meta | 73.8% of labels and 69.4% of figures <=12px | too much information is forced into “micro” register | fewer, more legible role steps | raise or consolidate micro/mini roles; preserve bounds | token-only; must prove <=1px geometry |
| Wizard progress looks like a browser form | all 8 reservation steps | `<small>` resolves to **9.16667px / 12.375px** | native `small` scaling leaked through | explicit optical type roles | explicitly size rail label; retain eight steps and DOM | none intended |
| Every heading feels equally emphatic | view strips, dialog titles, legends | 87.8% of heading samples request 700 | weight substitutes for hierarchy everywhere | hierarchy varies by role, not blanket bold | reserve 700 for focal/action roles; test 500/600 alternatives | none intended |
| Main view title looks like an eyebrow | `来店台帳`, `VIPフロア`, `席の時間軸` | 12px/700 with **1.08px** tracking | caps-style tracking is applied to Japanese | Japanese headings need quieter native spacing | reduce Japanese tracking; do not change strip height | none intended |
| English brand/meta can look templated | masthead `GHOST OSAKA / VIP MANAGER`, `Alert`, `REV` | global caps token is 0.09em; several labels add 0.04–0.06em | repeated uppercase + wide tracking creates machine cadence | restrained tracking tied to actual caps only | separate Latin caps from Japanese role tracking | none intended |
| Important figures have inconsistent density | counters, queue, Inspector, SLO | 284 figure samples request weight 600; loader declares 400/500/700 | undeclared 600 is synthesized/mapped differently by platform | weights should be real and predictable | either load/use a real role or map explicitly to an available weight | font metrics risk; compare geometry |
| Mixed Japanese/data runs can show a seam | `4名`, `VIP-1 7名`, `22:00–翌 00:00` | normal, tabular and lining-tabular settings coexist; feature serialization differs | `palt`/`tnum` scope is broader/narrower than the semantic run | figures and counters should align without changing prose rhythm | make feature roles explicit; width-probe every mixed string | possible text-width delta only |
| Dense chrome reads as a form generator | masthead counters, toolbar, table head, Inspector command rows | 1px/2px borders on 2,511 / 5,233 control samples; four horizontal bands before first row on mobile | identical rules repeat at every hierarchy | separators are inset/structural and skip redundant boundaries | remove only redundant optical rules via tokens/pseudo-elements | geometry unchanged |
| Controls have equal visual authority | toolbar search/select/menu, dialog secondary actions | many controls share 44px, 3px radius, white fill and same rule-control | structural consistency is not paired with priority contrast | primary/secondary/content controls separate more clearly | tune fill/border/ink state ramp, not dimensions or order | none |
| Buttons/icons can look mechanically centered | masthead, toolbar, menu, wizard footer | same line-height family spans 11/12/13px; icon sizes sit beside differing weights | mathematical centering does not guarantee optical baseline | glyph stroke and label weight should match | optical translate/baseline only after screenshot proof | <=1px visual transform; rect unchanged |
| Long uniform vertical rhythm feels assembled | Inspector command rows, SLO readout, staff/waitlist | repeated 44–58px rows and full-width hairlines | every fact/action receives equal cadence | rhythm groups related facts before separating groups | vary internal ink/rule emphasis without moving groups | none |
| List first viewport still feels visually vacant | 1440 List after the single fixture row | one 57px row at y=195, then paper to footer | synthetic one-row fixture exposes a very large quiet field | empty space should read as owned desk, not unfinished card | improve paper/sheet finish only; do not invent content | none |
| M PLUS 2 may be too round/soft for this operator surface | global, especially 11–13px kana | every sampled node resolves M PLUS 2; glyph shape is not a CSS numeric | a global face personality affects every register | operator face should stay quiet at small Japanese sizes | decide only through five-font raster/metric bake-off | potentially broad; requires full before/after geometry |
| Material itself is not the root problem | all panes/dialogs | 92.9% of surfaces and 84.9% of controls have no shadow; radii are 0–4px; solid warm ramp | no evidence of glass/card-stack slop | solid, restrained material is already aligned | preserve no-glass/no-gradient/small-radius contract | zero |

## 7. Screenshots to use for before/after review

Representative desktop:

- [List](../../design-references/apple-surface-study-2026-07-31/vip-before/chromium-1440x900/list.jpg)
- [Inspector](../../design-references/apple-surface-study-2026-07-31/vip-before/chromium-1440x900/inspector.jpg)
- [Floor](../../design-references/apple-surface-study-2026-07-31/vip-before/chromium-1440x900/floor.jpg)
- [Chart](../../design-references/apple-surface-study-2026-07-31/vip-before/chromium-1440x900/chart.jpg)
- [Menu](../../design-references/apple-surface-study-2026-07-31/vip-before/chromium-1440x900/menu.jpg)
- [Wizard step 1](../../design-references/apple-surface-study-2026-07-31/vip-before/chromium-1440x900/reservation-create-1.jpg)
- [Wizard step 4](../../design-references/apple-surface-study-2026-07-31/vip-before/chromium-1440x900/reservation-create-4.jpg)
- [Wizard step 8](../../design-references/apple-surface-study-2026-07-31/vip-before/chromium-1440x900/reservation-create-8.jpg)
- [Walk-in](../../design-references/apple-surface-study-2026-07-31/vip-before/chromium-1440x900/walk-in.jpg)
- [SLO](../../design-references/apple-surface-study-2026-07-31/vip-before/chromium-1440x900/slo.jpg)

Representative mobile:

- [390 List](../../design-references/apple-surface-study-2026-07-31/vip-before/chromium-390x844/list.jpg)
- [390 Menu](../../design-references/apple-surface-study-2026-07-31/vip-before/chromium-390x844/menu.jpg)
- [390 Walk-in](../../design-references/apple-surface-study-2026-07-31/vip-before/chromium-390x844/walk-in.jpg)
- [390 Wizard step 4](../../design-references/apple-surface-study-2026-07-31/vip-before/chromium-390x844/reservation-create-4.jpg)
- [320 List](../../design-references/apple-surface-study-2026-07-31/vip-before/chromium-320x800/list.jpg)
- [320 Wizard step 8](../../design-references/apple-surface-study-2026-07-31/vip-before/chromium-320x800/reservation-create-8.jpg)

Every other state/viewport is listed with SHA-256 in the JSON manifest.

## 8. Baseline interpretation and constraints

The before state already has the correct information architecture, solid
surface direction, touch floor, status redundancy and responsive ownership.
The likely “AI” residue is concentrated in type-role distribution, undeclared
weight usage, caps-style tracking, default `small` scaling, repeated rules and
equal control authority. These can be addressed at the surface/token layer.

The after implementation must compare the same state and viewport keys against
the rects in `vip-before-geometry.json`:

- x/y/width/height delta <=1px by default;
- shell order, 1023px breakpoint, scroll ownership and sticky regions unchanged;
- no new row wrapping or label clipping;
- no page horizontal overflow;
- floor and chart instrument geometry unchanged;
- wizard active/aside ordering and the step-8 single zone unchanged.

## 9. Limitations / not run

- WebKit/Safari was not part of this delegated capture. It must not be reported
  as passed; the environment has a known system-library blocker.
- Apple-native resolved font, real iPad/Safari rendering, Windows fallback and
  Linux fallback were not run here.
- The 230-state sweep did not mutate controls just to force hover/pressed/focus,
  because doing so can close fixture backdrops and invalidate subsequent states.
  Static selected/disabled/invalid states are in the style catalog; focus/hover/
  press declarations were inspected from baseline CSS. A dedicated isolated
  interactive-state probe belongs in the after/bake-off pass.
- Screenshot capture uses reduced motion, so it proves reduced-motion safety,
  not the normal 110/160/220ms feel.
