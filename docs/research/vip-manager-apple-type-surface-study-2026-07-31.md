# VIP Manager Apple-quality type / surface study

Date: 2026-07-31 JST
Canonical baseline: `9d2957c240b5fece1197767b37dea1ae6c746bdc`
Production at start: `dpl_D6VxuGnJf6VRuWqoRVRSGweXoCzn` / READY
Scope: research, presentation-only implementation, local validation
Deploy: prohibited; Owner visual approval required separately

## Executive decision

Retain M PLUS 2 as the one Japanese-first webfont, load its real 600 face, and
formalize 400/500/600/700 roles with 700 limited to display copy. Refine the
solid material ramp toward a warm `#f5f4f2` canvas, white panes, quieter rules,
and lower-alpha elevation. Reduce caps tracking from `.09em` to `.04em` and
remove non-operative `palt` declarations. Keep every layout, workflow, DOM,
breakpoint, floor/chart geometry, and backend boundary unchanged.

This is an evidence-based retention/refinement of locked decision L3, not an
attempt to install SF Pro or reproduce Apple's current visual brand.

## Source-of-truth and skill verification

- canonical HEAD/upstream: `9d2957c240b5fece1197767b37dea1ae6c746bdc`
- Vercel read-only verification: Production READY and Git metadata matched the
  same commit; fixed deployment `dpl_D6VxuGnJf6VRuWqoRVRSGweXoCzn`
- clone-website lock source: `https://github.com/julianromli/ai-skills.git`
- distribution branch/commit at check: `main@cf41ea236dcad9665992d1ab02dc0db66691cd4a`
- local and remote `clone-website/SKILL.md` SHA-256:
  `65305b74fc5fa846d716a2edaf17f5f71416ab7bf1ccf23e7cdf40d3c04e3c06`
- byte comparison: identical; temporary clone moved to trash

The clone workflow was used for browser reconnaissance, topology, computed
style/state extraction, screenshots, and bounded specs. Its cloning/build phase
was intentionally constrained by the execution prompt: Apple is research-only,
and no Apple component, asset, or copy may enter production.

The UI/UX skill's generated design-system suggestions included Liquid Glass,
blue, gradients, large radii, Noto Serif, and marketing spacing. Those outputs
were recorded as rejected generic recommendations because they conflict with
the canonical GHOST light-operations contract. Its useful accessibility checks
(focus, 44px touch, keyboard, non-hover operation) remain in the gate.

## Apple evidence

Primary reports:

- `apple-surface-study-2026-07-31/APPLE_IPHONE_PAGES.md`
- `apple-surface-study-2026-07-31/APPLE_HIG.md`
- `apple-surface-study-2026-07-31/TYPOGRAPHY.md`
- `apple-surface-study-2026-07-31/MATERIALS.md`
- `apple-surface-study-2026-07-31/BEHAVIORS.md`

Measured product-page findings:

- one SF system with Japanese coverage; main weights 400/600, selective 700
- ordinary tracking normal; small display adjustments about 0.196–0.231px
- light ink `#1d1d1f` / `#6e6e73`
- canvas `#f5f5f7` / `#fafafc`, pane white
- solid cards generally have no shadow
- controls keep geometry stable across normal/hover/focus/pressed
- 36px visual controls can sit inside 44px interaction wrappers

HIG findings translated for GHOST:

- minimize type families; avoid light UI weights
- preserve hierarchy through role, weight, ink, alignment, and reading order
- separate controls/navigation from content semantically
- support 200% text enlargement, contrast, non-color cues, keyboard/assistive
  input, and 44px important targets
- a material principle does not require Liquid Glass

## Current-surface cause matrix

Pre-change source counts: 400 ×3, 500 ×26, 600 ×15, 700 ×59;
`--track-caps` use ×18; positive raw tracking ×15; negative tracking ×8.

| Hypothesis | Evidence | Result / action |
|---|---|---|
| M PLUS roundness causes the whole AI feel | Visible in large Latin display, but dense JP/data remains coherent and candidate swaps carry larger metric risk | Secondary factor; retain family |
| 11/12px is unreadable | These sizes are metadata only; ink contrast and 200% zoom are gated | Retain scale; avoid light weights |
| too much 700 | 59 direct 700 rules; 15 requested 600 rules had no loaded 600 face | Confirmed; load 600 and reserve 700 |
| heading/label/meta density is too similar | strong weight and wide tracking repeat across many roles | Confirmed; formalize four roles |
| uppercase tracking is too wide | `.09em` on 18 selectors versus Apple ordinary tracking near normal | Confirmed; reduce to `.04em` |
| global `palt` destabilizes Japanese alignment | built M PLUS labels measured zero default-vs-palt width delta | Not the cause; remove dead declarations |
| numeric seam/jitter remains | one family, uniform digits, effective `tnum`, digit spread 0 | Rejected; preserve tabular contract |
| icon/text baseline is mismatched | controlled inline-flex center delta 0; screenshots show weight mismatch more than position error | Geometry healthy; 600 better matches icon strokes |
| too many rules create generated grid noise | dense views repeat the same L `.912` hairline | Moderate; lighten rule to `.92`, keep structure |
| canvas/pane step is too gray/heavy | baseline canvas `#f2f1ee`; Apple solid reference `#f5f5f7` | Confirmed; translate to warm `#f5f4f2` |
| surfaces are too weak | white pane/ground distinction exists, but hierarchy relies on a dark desk step | Refine ramp; retain solid hairlines |
| controls all feel equal | action/state model is already authored; weight hierarchy remained too uniform | Typography fix, no control/layout rewrite |
| button optical centering is wrong | controlled icon/text center delta 0; 44px inline-flex geometry stable | Rejected; no padding shift |
| native/default state chrome remains | selects/checks/radios/focus/disabled already token-authored | Rejected; preserve gate |
| material treatment is inconsistent | shadows are limited to raised/dialog tokens but slightly strong | Minor; reduce shadow alpha |
| vertical rhythm is repetitive | current layout already removed prior card/subtitle repetition; layout is frozen | No layout change |

## Font bake-off

Detailed measurements and licenses are in `TYPOGRAPHY.md`. Summary:

| Candidate | Strength | Blocking concern | Decision |
|---|---|---|---|
| M PLUS 2 | consistent JP/Latin, zero digit spread, current geometry, OFL | rounder large Latin; old 600 face missing | Adopt with explicit 600/roles |
| Noto Sans JP | neutral, OFL, compact data runs | generic voice; materially narrower Latin/data metrics | Reject |
| IBM Plex Sans JP | strong family, OFL, data-capable | deep descent and corporate/technical voice | Reject |
| Apple system stack | authentic on Apple OS | true render not available cross-platform; no bundling | Reject as primary; runtime fallback only |
| Hiragino-first | good Apple-system Japanese fallback | true render not available on Linux/Windows | Keep fallback, not primary |

The current build packaged 119 unique M PLUS WOFF2 shards totaling 2,672,960
bytes potential. After adding 600, the unique file count and bytes remained
exactly unchanged: four weight declarations reuse the same variable shards. A
local built-CSS specimen spanning the audited Japanese/Latin/data strings at all
four weights requested two shards, 61,264 encoded bytes. This specimen is a
bounded transfer measurement, not a claim about every application state.

## Presentation-only implementation

- `src/app/layout.tsx`: load 600 and keep the OFL M PLUS family/fallbacks;
  update theme chrome to `#f5f4f2`
- `src/app/globals.css`: warm solid ramp, lighter rule, lower shadow alpha,
  explicit weight roles, `.04em` caps tracking, `font-synthesis: none`, no palt,
  root-level tabular numerals for mixed data runs
- `VipFloorWorkspace.module.css`: raw numeric weights replaced by semantic
  tokens; strong UI resolves to 600; display copy alone resolves to 700; the
  wizard's browser-default 9.16667px `<small>` now inherits the 11px token role
- `tests/contract/operator-light-ui.test.mjs`: replace the old font assertion
  with equal-or-stronger checks for exact weights, roles, tracking, synthesis,
  tabular figures, and absence of palt/raw weights
- DESIGN/OPERATIONS PAPER: Owner decision and visual contract updated together

## Geometry and validation status

Before implementation, Chromium captured 46 actual states at five required
comparison viewports (1440×900, 1194×834, 768×1024, 390×844, 320×800): 230
screenshots. The 45 manifest-required states plus
`reservation-date-unavailable` all had axe 0, overflow 0, undersized important
controls 0, legacy purple 0, console errors 0, and 5xx 0.

The stable after build repeated those same 230 geometry results. Across 1,966
tracked landmarks, every x/y/width/height delta was exactly 0. Across 5,233
sampled controls, the largest delta was 0.5px and no delta exceeded the frozen
1px threshold. Container order, row wrapping, breakpoint behavior, primary
action position, Floor/Chart geometry, and Inspector content remained intact.
Machine evidence and the rejected capture-race runs are documented in
`apple-surface-study-2026-07-31/VIP_GEOMETRY_COMPARISON.md`.

The formal after visual run captured 46 states at all eight Chromium manifest
viewports: 368 screenshots. Axe, horizontal overflow, controls below 44px,
legacy purple, console errors, and unexpected 5xx were all 0. WebKit 1194×834
was **not run** because this host lacks its required system libraries; it is not
reported as passed. A 1440-physical/720-CSS page-zoom-equivalent probe passed
four representative states, while true browser text-only zoom remains **not
established** and is retained as an Owner-device witness item.

Final local gate:

- lint and typecheck: pass
- unit: 32/32; contract: 93/93; PII artifact safety: pass
- production build: 15 routes; maintenance runtime: pass
- formal `test:a11y`: Chromium 8 viewports / 46 states / 368 screenshots pass;
  WebKit explicitly not run, so the JSON deliberately retains `ok: false`
- `npm run ci`: completed with the same Chromium pass / WebKit not-run record
- `git diff --check`: pass; protected API/lib/state/contract path diff: 0
- package/dependency diff: 0

End-of-session read-only verification still resolved the Production fixed URL
to `dpl_D6VxuGnJf6VRuWqoRVRSGweXoCzn` / READY. No commit, push, candidate,
promotion, Production alias, backend, environment, database, or business-data
change was made.

## Explicit Apple rejections

- SF Pro/NY files, SF Symbols, Apple icons/logo/assets/copy
- Apple blue, orange product accent, and Apple platform status palette
- Liquid Glass, blur, vibrancy, translucency, floating glass stacks
- 28px cards, 980px pills, Apple marketing navigation/topology
- marketing-scale type/spacing, product media choreography, hover scale
- disabled opacity that weakens GHOST contrast

## Not run at implementation decision time

- macOS/iOS/iPadOS Safari and Apple device resolved fonts
- true SF Pro JP and Hiragino candidate rendering
- Dynamic Type, VoiceOver, Switch Control, DPR 2/3
- native Liquid Glass/materials and haptics
- true browser text-only zoom at 200% (page-zoom-equivalent probe only)

These limitations remain visible in the final handoff; they are not called
passed.
