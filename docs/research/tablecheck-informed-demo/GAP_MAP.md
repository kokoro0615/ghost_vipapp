# GHOST VIP Manager D5 Gap Map

## Scope

This is a read-only comparison between the reviewed D1 specifications and the
current GHOST VIP Manager implementation. It does not authorize or perform a
source, test, package, evidence, release, or data-plane change.

Reviewed implementation:

- `src/components/admin/vip-floor-v2/VipFloorWorkspace.tsx`
- `src/components/admin/vip-floor-v2/VipFloorWorkspace.module.css`
- `src/components/admin/vip-floor-v2/state/reducer.ts`
- `src/components/admin/vip-floor-v2/shell/ExceptionRail.tsx`
- `src/components/admin/vip-floor-v2/list/ReservationListView.tsx`
- `src/components/admin/vip-floor-v2/floor/FloorView.tsx`
- `src/components/admin/vip-floor-v2/chart/ChartView.tsx`
- `src/components/admin/vip-floor-v2/inspector/Inspector.tsx`
- current command, operation, waitlist, staff, and customer task components
- `src/app/globals.css`

## Executive decision

Keep the existing component tree, shared reducer, white operational surfaces,
real GHOST floor geometry, and task dialogs. D5 should be a targeted shell,
state-cue, Floor/Chart, responsive, and token delta—not a rewrite.

The implementation already has most low-level controls and data relationships.
The largest gaps are:

1. no demo cue, lease/expiry boundary, or synthetic reset in the rendered shell;
2. no rendered desktop global rail—the single `bottomNav` is used at every width;
3. Floor has only a canvas/legend, not the required canvas + task rail topology;
4. 1194/768/390/320 task models do not match the D1 responsive contract;
5. the root focus token is blue and several cool-neutral/soft-shadow/radius values
   do not pass the strict light-surface contract.

## Existing strengths to preserve

| Area | Concrete current evidence | Preserve in D5 |
|---|---|---|
| Light foundation | `src/app/globals.css` sets `color-scheme: light`, semantic OKLCH tokens, a canvas, white surface, graphite action, and champagne selection roles. `VipFloorWorkspace.module.css` maps them through `.workspace`. | Keep semantic token ownership and light-only behavior; change only noncompliant token values. |
| First-viewport identity | `VipFloorWorkspace.tsx` renders `.serviceRibbon`, `.venueIdentity`, business date, service period, sync state, `.currentViewMark`, and direct create/List/Floor/Chart navigation. | Keep GHOST identity, date, active-view mark, and one-action view navigation. |
| Geometry/density | `.serviceRibbon` is 54px; `.exceptionRail` is 280px/48px collapsed; `.desktopInspector` is 360px/44px collapsed; List rows are 43px; most task controls are 44px or larger. | Retain these values because they sit inside D1 ranges. |
| Shared selection state | `state/reducer.ts` stores `selectedReservationId` and `selectedTableId`. `selectReservation` links the matching table and opens the mobile Inspector; `selectTable` links an optional reservation. | Keep one shared selection source and extend its semantics/focus behavior rather than duplicating view state. |
| Queue selection | `ExceptionRail.tsx` groups rows, searches locally, collapses, and invokes the same reservation selection callback. `.queueItem[data-selected]` provides a non-layout-shifting leading rule. | Preserve grouping, query linkage, counts, and selected-row treatment. |
| List structure | `ReservationListView.tsx` uses a semantic table, sticky header CSS, announced ascending time sort, dense/comfortable modes, status icon/text cues, and explicit 44px selection controls. Mobile CSS converts the table rows to a two-line grid. | Preserve the semantic desktop table and existing mobile row transformation. |
| Floor ownership | `FloorView.tsx` uses the existing GHOST floor image and `board.tables` geometry. Nodes are buttons with text/icon/line state cues, `aria-pressed`, staff context, and linked selection. | Preserve the real GHOST geometry and semantic node model. Do not replace it with generic shapes. |
| Chart ownership | `ChartView.tsx` provides a labeled `.timelineScroller`, sticky `.timelineTicks`, sticky `.timelineTableLabel`, 44px bars, time zoom, block intervals, current-time cue, and an `.unassignedTray`. | Preserve the inner-scroller architecture and fixed header/label behavior. |
| Inspector/action depth | `Inspector.tsx` is tabbed, keyboard-arrow operable, 360px wide, collapsible, and exposes reservation edit plus the exact six command families. `.commandGrid button` is 44px. | Preserve tabs, command set, width, and shared selection context. |
| Modal task mechanics | Command, operation, waitlist, staff, and customer components already use labeled dialogs, explicit close controls, pending-disabled fields, focus containment/restoration, and sticky command footers. | Reuse these task shells and align their visual/state language; do not invent a parallel modal system. |
| Overflow/reduced motion | `src/app/globals.css` keeps the body bounded. `.workspace`, `.primaryArea`, and `.viewFrame` own overflow explicitly; List and Chart use labeled inner scrollers. The reduced-motion query suppresses animation. | Preserve bounded scroll ownership and reduced-motion behavior. |
| Non-color status | Status model consumers render icons, labels, border styles, dash/double/stripe cues, and text alongside semantic colors. | Keep these cues during palette cleanup. Semantic hatch/grid patterns are functional, not decorative gradients. |

## Required D5 deltas

### D5-01 — First viewport and adaptive primary navigation

**Current**

- `VipFloorWorkspace.tsx` renders only `<nav className={styles.bottomNav}>`; no
  markup uses the existing `.navRail` or `.viewSwitcher` selectors.
- `.bottomNav` is `display: grid` by default, so it remains a bottom rail on
  desktop as well as mobile.
- `.workspace` has three columns. There is no separate rendered track for a
  52–60px global rail.
- Create is present in `bottomNav`, while the D1 service-ribbon contract assigns
  the desktop primary create action to the ribbon.
- `EmptyState` offers only reload, so create is lost in the empty work area.

**Targeted delta**

1. Reuse one primary-nav component, but style/place it as a 52–60px left rail at
   desktop and iPad landscape, and as fixed bottom navigation only at tablet
   portrait/phone widths.
2. Give the shell separate tracks for global rail, queue, primary workspace, and
   Inspector at wide widths. Do not place navigation and queue in one track.
3. Keep List, Floor, and Chart visible in that rail; do not move them into
   `.shellMenu`.
4. Add the desktop create action to `.serviceRibbon`; keep the bottom-nav create
   action for narrow layouts.
5. Add create to the empty-date work area while retaining date and view context.
6. On view change, move focus to `#list-view-title`,
   `#floor-view-title`, or `#chart-view-title`.

**Acceptance**

- At 1440 and 1194, primary navigation is a left rail and no bottom rail consumes
  the workspace.
- At 768/390/320, bottom navigation remains fixed with safe-area clearance.
- GHOST identity, VIP Manager, date, active view, demo cue, and create are present
  in the first viewport.

### D5-02 — Service ribbon, demo cue, expiry, and reset

**Current**

- `VipFloorWorkspace.tsx` login copy and permission calculation are Owner-only.
- `.serviceRibbon` has date/service/sync state but no signed mode, synthetic-only
  cue, exact expiry, lease state, or reset entry.
- `TrialMode.tsx` is a legacy context/cue and is not mounted by
  `src/app/page.tsx`; it does not implement the D1 demo/expiry/reset contract.
- No demo reset dialog or expired boundary exists in this component tree.

**Targeted delta**

1. Render a mode-aware login: demo mode shows GHOST identity, VIP Manager,
   non-color `DEMO`, synthetic-only scope, and exact expiry; Owner mode keeps its
   current identity and behavior.
2. Extend `.serviceRibbon` with a persistent demo cue, synthetic scope, exact JST
   expiry, and lease/read-only/expired state sourced from the validated session,
   not presentation-only client state.
3. Add near-expiry and expired ribbon/boundary variants. Expired removes
   mutation entry points and never swaps to Owner/Production content.
4. Add a clearly separated “reset synthetic demo data” action to the demo
   session/menu area, followed by a confirmation dialog and revision result.
5. Do not rename or visually recycle `TrialModeCue`; use the demo contract so
   completed Trial behavior cannot leak into the new lane.
6. Repeat the demo/expiry cue in mutation dialogs or their sticky action area
   when near expiry.

**Acceptance**

- Login, List, Floor, Chart, Inspector, and mutation tasks all retain a text/icon
  demo cue.
- Near-expiry, expired, reset-pending, and reset-complete match
  `STATE_MATRIX.md`.
- Owner rendering is unchanged when the signed mode is Owner.

### D5-03 — Linked selection and per-view completeness

#### List

**Current strengths**

- `ReservationListView.tsx` receives shared selection and marks
  `tr[data-selected]`.
- Time and detail buttons meet 44px and invoke the same callback.
- `.reservationTable th` is sticky and the phone row transformation already
  avoids the desktop table minimum width.

**Needed delta**

- Make the whole logical row selectable without nesting invalid interactive
  controls, and expose selected semantics programmatically.
- Add explicit no-match and no-reservation variants inside List. The current
  empty filtered array produces an empty `<tbody>`, while global `EmptyState`
  replaces the entire view for an empty board.
- Keep the table header/view frame visible in loading and empty states.
- Either implement the displayed sort affordance or render it as a truthful
  static order label; do not imply an unavailable sort action.

#### Floor

**Current strengths**

- `FloorView.tsx` renders GHOST geometry, stateful semantic nodes, staff
  assignment context, and selected linkage.

**Needed delta**

1. Add the D1 reservation task rail beside `.floorCanvas` with reservation,
   waitlist, finished, and block tabs, local search, 40–48px rows, and shared
   selection.
2. Preserve independent tab/query/scroll state and connect row selection back to
   the matching node and Inspector.
3. Make simple node selection non-mutating; keep assignment/block as explicit
   actions.
4. On phone, selecting an occupied or empty node must open the relevant mobile
   Inspector/task context. `selectTable` currently does not set
   `mobileInspectorOpen`.
5. Guarantee the interactive node hit area independently of inline percentage
   geometry. `FloorView.tsx` currently sets inline `minHeight`, which can outrank
   `.tableNode`’s 48px minimum.

#### Chart

**Current strengths**

- `.timelineScroller` owns overflow, `.timelineTicks` and
  `.timelineTableLabel` are sticky, and `.timelineBar` selection uses the shared
  callback.

**Needed delta**

1. Add bottom exception buckets for conflict and attention in addition to the
   current `.unassignedTray`.
2. Expose selected semantics on bars and exception items, not only
   `data-selected`.
3. Preserve the approximate scroll center when zoom changes.
4. Provide the explicit mobile table selector and focused time window from D1;
   current mobile CSS only reduces `.timelineGrid` to 940px/1340px and requires
   panning the desktop canvas.
5. Keep bounded inner panning as a secondary option and keep page overflow zero.

#### Cross-view focus/state

- Filters, date, selection, collapse state, and zoom are already reducer-owned.
- Add per-view scroll restoration; the current conditional rendering unmounts
  inactive views.
- Restore focus to the invoking row/node/bar/queue item when the mobile Inspector
  closes.
- If hydration removes the current selection, announce the change and focus the
  active view heading rather than silently selecting the first available row.

### D5-04 — Queue, Inspector, and action hierarchy

**Current strengths**

- `.exceptionRail` is 280px and independently collapses to 48px.
- `.desktopInspector` is 360px and independently collapses to 44px.
- `Inspector.tsx` has tablist keyboard behavior and exactly six command buttons
  plus edit.
- Command/task dialogs already have confirmation, conflict, pending, and sticky
  footer structures.

**Targeted delta**

1. Add `aria-expanded`/`aria-controls` to the queue collapse control and selected
   semantics to `.queueItem`.
2. Keep the collapsed total and add a text/accessible highest-severity cue; the
   current collapsed view is warning icon + count only.
3. Preserve queue query and scroll position through collapse and view changes.
4. At 768/390/320, provide the specified queue task drawer/inline drawer. Current
   mobile CSS sets `.exceptionRail { display: none; }` with no equivalent
   exception-queue entry.
5. Add adjacent or described reasons for disabled Inspector commands. Current
   `unavailableForState` disables buttons without a reason.
6. Make mobile Inspector background inert and restore trigger focus. The current
   `.mobileSheet` traps focus while open but does not retain the invoker.
7. Keep one clear primary commit per command/operation task. Move reset and
   logout away from routine reservation commands.
8. Keep synthetic customer, staff, waitlist, and block actions in their existing
   focused task components; align their headers, state summary, cancel, and
   primary action rather than adding dashboard cards.

**Acceptance**

- Queue and Inspector can operate simultaneously at 1440 and collapse
  independently at 1194.
- Only one overlay task surface is active at 390/320.
- All disabled mutation actions have a discoverable reason.

### D5-05 — Desktop, iPad, tablet, and mobile task model

| Viewport | Current evidence | Required targeted delta |
|---|---|---|
| 1440×900 | Queue, primary area, and Inspector exist; `bottomNav` remains at the bottom and there is no rendered global rail. | Four-track shell: 52–60px global rail, 260–320px queue, primary workspace, 340–400px Inspector. Hide bottom navigation. Floor gains horizontal task rail. |
| 1194×834 | The `max-width:1279px` rule hides `.navRail`; queue and Inspector become fixed overlays with `var(--shadow)`; bottom navigation remains. | Keep a left global rail. Keep Chart/Floor workspace visible. Let queue/Inspector collapse in-plane or use one bounded disclosure without soft-shadow overlay as the default. |
| 768×1024 | Bottom navigation is present, but the ribbon remains one 54px row and both secondary rails use the broad tablet overlay rule. | Two-row ribbon/control stack, fixed bottom nav, queue task drawer, modal Inspector sheet, stacked Floor controls, bounded Chart scroller. |
| 390×844 | Mobile List rows and bottom nav are strong. Floor is only the same scrollable canvas; Chart is the wide desktop grid; queue is absent. | Keep List-first. Floor becomes tabs → focused task list → canvas → contextual action. Chart gains explicit table/time-window controls. Add queue drawer. |
| 320×800 | Narrow tweaks shorten widths but preserve the same task structures. `.mobileSheet` uses 8px radius and soft shadow. | Same 390 hierarchy with safe short labels, one overlay at a time, radius ≤6px, hairline/scrim separation, and fixed actions above safe area. |

Breakpoint correction:

- Replace the broad `@media (max-width: 1279px) and (min-width: 768px)` behavior
  with width classes that distinguish iPad landscape/compact desktop from tablet
  portrait.
- The D1 contract is left rail at 1194, bottom rail at 768.

### D5-06 — 44px, overflow, focus, and interaction verification

**Keep**

- `.workspace :focus-visible` already uses a 3px outline.
- Navigation, pane toggles, search/select controls, Chart zoom, Chart bars, List
  actions, Inspector tabs/commands, and most dialog controls meet 44px.
- `body`, `.workspace`, `.primaryArea`, and `.viewFrame` bound page overflow;
  `.listScroller` and `.timelineScroller` own data overflow.
- `prefers-reduced-motion` is implemented.

**Change**

1. Replace `--focus: oklch(0.38 0.12 255)` in `src/app/globals.css`; it is a
   saturated blue focus token. Use the dark champagne/bronze semantic focus
   required by D1, retaining the 3px outline.
2. Raise `.checkRow` from 40px to 44px where it is an interactive label.
3. Enforce 44px node hit areas despite Floor inline geometry.
4. Add visible keyboard instructions/behavior for the Chart scroller and restore
   view/sheet trigger focus as described above.
5. Verify that fixed bottom navigation and sticky dialog footers reserve their
   full safe-area inset.
6. Treat Chart horizontal overflow as legal only inside `.timelineScroller`;
   Floor mobile must use the vertical task stack rather than a horizontally
   clipped page.
7. Add `aria-expanded`, selected state, and disabled reason relationships where
   identified; visual size alone is not sufficient.

### D5-07 — Strict warm-white/white/graphite/champagne finish

**Current strengths**

- Major surfaces are already light; the legacy `--lacquer-*` aliases resolve to
  canvas/surface tokens rather than dark panes.
- Primary actions are graphite with white labels.
- Champagne selection and hairline rules already exist.
- No raw hex palette is used in the reviewed CSS.

**Token delta**

- Rebase `--canvas`, `--surface-sunken`, `--surface-hover`, `--border`, and
  `--border-strong` away from cool hue 260 to warm-white/warm-neutral roles.
- Keep `--surface` white and the graphite action/text hierarchy.
- Replace the blue `--focus` token with bronze/dark champagne.
- Preserve muted green, ochre, and restrained red only for semantic state, always
  with text/icon/border cues.

**Soft-shadow removal**

Replace external soft shadows with opaque white panes, 1px champagne/neutral
hairlines, and modal scrims where necessary:

- `.loginPanel`
- `.maintenancePanel`
- `.mapIdentity`
- `.tableNode` and `.tableNode[data-selected]`
- `.commandDialog`
- `.customerDialog`
- `.observabilityDialog`
- `.shellMenu`
- tablet `.exceptionRail` and `.desktopInspector`
- `.mobileSheet`
- the reusable `--shadow` token

Inset active/selection rules such as `.queueItem[data-selected]`,
`.reservationTable tr[data-selected]`, `.viewSwitcher button[data-active]`, and
`.bottomNav button[data-active]` are hairline markers, not soft elevation. Keep
them or convert them to borders/outlines without changing meaning.

**Radius correction**

- Change `.statusBadge`, `.mobileSheet`, and the custom scrollbar thumb from 8px
  to at most 6px.
- Semantic circles such as a current-time dot or numbered wizard step are glyphs,
  not pane/card radius, and do not require flattening.

**Transparency/gradient boundary**

- Make `.mapIdentity` and `.tableNode` opaque white/light panes instead of
  translucent-looking overlays.
- Preserve semantic stripe/hatch/grid patterns used for conflict, block, and time
  reading. Remove only decorative gradients; none are needed for this D5 delta.

## Suggested implementation order

1. Mode/lease/demo cue/expiry/reset render contract.
2. Adaptive shell tracks and 1194/768 breakpoint correction.
3. Floor task rail plus mobile vertical task stack.
4. Chart exception buckets plus mobile selector/focused window.
5. Queue mobile disclosure and Inspector focus/disabled-reason semantics.
6. List empty/no-match/selection semantics and cross-view focus/scroll restore.
7. Warm token, shadow, opacity, and radius cleanup.
8. Exact-viewport visual/a11y/overflow audit.

This order keeps the application compileable and avoids styling a topology that
will be replaced later in the same D5 wave.

## D5 acceptance checklist

- [ ] First viewport communicates GHOST Osaka, VIP Manager, date, active view,
      demo scope/expiry, operational context, and create.
- [ ] List, Floor, and Chart are one action away at every acceptance width.
- [ ] 1440/1194 use a left global rail; 768/390/320 use fixed bottom navigation.
- [ ] Queue, List/Floor/Chart, and Inspector share one selected reservation.
- [ ] Floor has reservation/waitlist/finished/block task modes and phone vertical
      task stack.
- [ ] Chart has sticky time header, fixed table labels, bounded inner scroll,
      exception buckets, and a mobile table/time-window alternative.
- [ ] Queue and Inspector disclosure preserve selection, query, and focus.
- [ ] Important targets are at least 44px and disabled reasons are available.
- [ ] Page-level horizontal overflow is zero at 1440×900, 1194×834, 768×1024,
      390×844, and 320×800.
- [ ] Focus is 3px bronze/dark champagne and visible in every state.
- [ ] Major surfaces are warm-white/white with graphite actions and champagne
      hairlines.
- [ ] Blue focus, cool-blue major neutral, dark major pane, external soft-shadow
      separation, pane radius over 6px, and decorative gradients are absent.
- [ ] Existing GHOST geometry, semantic status cues, command set, and Owner
      behavior remain intact.
