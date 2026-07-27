# GHOST VIP Manager Responsive Matrix

## Global acceptance rules

- Acceptance viewports: 1440×900, 1194×834, 768×1024, 390×844, and 320×800.
- Page-level horizontal overflow is always zero.
- Important targets remain at least 44×44px.
- List, Floor, and Chart remain reachable in one explicit action.
- Bottom-fixed controls reserve content and safe-area space.
- Long Japanese/English labels wrap or use an accessible short label; they never
  overlap or become icon-only without an accessible name.
- Warm-white canvas, white panes, graphite actions, and champagne hairlines remain
  unchanged across breakpoints.

| Viewport | Navigation and ribbon | Queue / Inspector | List | Floor | Chart |
|---|---|---|---|---|---|
| 1440×900 | 52–60px left rail; 50–58px single-row ribbon | Queue 260–320px and Inspector 340–400px may be visible together | Sticky header; 40–48px rows; bounded vertical scroll | Horizontal canvas + reservation rail; four task tabs; synchronized selection | Sticky time header; fixed table labels; bidirectional inner scroll; bottom exception buckets |
| 1194×834 | Left rail remains; ribbon may compress low-priority labels | Both rails collapsible; primary workspace keeps operational minimum width | Same table model; less optional copy | Split canvas + rail retained; rail width reduced before canvas geometry | Inner scroll is mandatory; time axis is not compressed into unreadable columns |
| 768×1024 | Fixed bottom primary nav; ribbon/control groups stack into two rows | Queue becomes collapsible task drawer; Inspector becomes modal sheet | Default/first view; columns prioritize time, status, code, guest, table | Task controls above canvas; reservation rail may move below canvas | Inner-scroll canvas retained; controls stack; fixed labels remain inside scroller |
| 390×844 | Fixed bottom nav with safe-area inset; compact two-row ribbon | Queue is inline drawer; Inspector bottom sheet with close and focus return | List-first; row becomes two-line dense record; no horizontal table page | Vertical task stack: mode tabs → focused task list → floor canvas → contextual actions | GHOST mobile alternative: compact table selector + focused time window; optional inner horizontal pan is confined to Chart, never the page |
| 320×800 | Same hierarchy; short visible labels with full accessible names | One overlay task surface at a time | 44px rows/targets; optional fields move to detail | Same vertical task stack; canvas remains usable without precision tapping | Explicit table/time-window controls are primary; inner pan remains a secondary bounded option |

## Width-class contracts

### Wide operations (`>= 1280px`)

- Four-column shell: global rail, queue, primary workspace, Inspector.
- Queue and Inspector remain independently collapsible.
- Primary workspace must not shrink below the minimum required for legible Floor
  nodes or Chart tracks; collapse secondary rails first.

### Compact operations (`1024–1279px`)

- Global rail remains.
- Queue and Inspector default according to available width and current selection.
- Chart preserves its inner canvas width instead of compressing time labels.
- Floor preserves real GHOST geometry and uses a narrower task rail.

### Tablet portrait (`768–1023px`)

- Primary navigation moves to the fixed bottom rail.
- Ribbon groups wrap into venue/date row and action/state row.
- No hover-only affordance.
- Secondary rails become dismissible task surfaces.
- Page scroll is vertical; Chart retains one bounded bidirectional inner scroller.

### Phone (`<= 767px`)

- List-first entry.
- Floor and Chart stay one action away in bottom navigation.
- Inspector is a bottom sheet, not a full-page dead end.
- Create/edit/check-in/block tasks use stepwise sheets/wizards.
- Floor must not preserve the desktop horizontal split. At exact 390 and 320
  widths it becomes the defined vertical task stack.
- Chart must not force desktop geometry across the page. GHOST overrides the
  reference behavior with an explicit table selector and focused time window,
  while allowing bounded inner panning for context.

## Height constraints

- At 768px height or less, reserve the first viewport for ribbon, primary action,
  navigation, and at least one actionable data row/node.
- Sheets use dynamic viewport height and keep their primary action above the
  safe-area inset.
- Sticky headers may not consume more than the combined ribbon plus one compact
  control row.

## Verification

For each acceptance viewport verify:

1. `GHOST OSAKA`, `VIP Manager`, date, active view, demo cue, and create action
   are visible without opening a menu.
2. Primary navigation is operable by keyboard and touch.
3. Opening/closing queue and Inspector does not reset selection.
4. Floor nodes and Chart bars can be selected without precision taps.
5. No content is hidden under fixed navigation or sheet actions.
6. Page overflow is zero; any Chart overflow belongs only to its labeled scroller.

