# GHOST VIP Manager Interaction Behaviors

## Evidence boundary

The behaviors below are GHOST-owned abstractions derived from authenticated,
read-only observation and the official-source set named in execution prompt
section 6. The newest user-provided dashboard URL was the authenticated entry;
Timetable, List, and Floor were reached through permitted view navigation.
No source-system mutation was performed.

## Navigation

- List, Floor, and Chart are peers and each is reachable in one explicit action.
- Navigation is click/tap driven. Hover may add preview emphasis but never exposes
  the only route or action.
- The active destination has text, icon, weight, and position cues in addition to
  color.
- View changes retain business date, service period, filters, and selection.
- At 768px and below, the global rail becomes fixed bottom navigation. The
  content inset includes the rail height and device safe area.

## Selection linkage

1. Selecting a List row, Floor node/rail item, Chart bar, or queue item writes one
   shared reservation selection.
2. Every visible representation updates in the same event turn.
3. The Inspector opens or refreshes without discarding the current workspace.
4. Selecting an empty table writes the table selection and clears reservation
   selection only after the user’s intent is explicit.
5. Closing the mobile Inspector restores focus to the initiating control.
6. If realtime refresh removes the selected item, show a brief non-destructive
   message and move focus to the view heading.

Selected, focused, hovered, stale, and conflicted states must be visually
distinct. Focus is a dark-champagne/bronze ring of at least 3px.

## Scrolling

- The application page has no horizontal overflow at any acceptance width.
- List may vertically scroll inside its work area; its header remains visible.
- Floor canvas and its reservation task rail have bounded scroll ownership. On
  phone widths, they become a vertical task stack instead of a side-by-side split.
- Chart has a single explicit bidirectional inner scroller with sticky time
  header and fixed table labels.
- Mouse wheel, trackpad, keyboard arrows, Page Up/Down, Home/End, and touch panning
  operate the focused inner scroller without trapping the user.
- No navigation or state change depends on a horizontal swipe.

## Queue and Inspector disclosure

- Queue rail and Inspector collapse independently.
- Collapse preserves a 44px minimum target, count/selection context, and an
  accessible expanded state.
- Expanding does not reset filters, scroll position, or selection.
- On constrained desktop/tablet widths, only one secondary rail may be expanded
  when needed to protect the primary work area.
- On phones, the queue is an inline task drawer and Inspector is a bottom sheet;
  neither creates a second horizontal page.

## Reservation and operational actions

- The primary action is reservation creation; it remains visible in the first
  viewport.
- Reservation edit and the six commands open from the Inspector and keep the
  current selection visible behind the task surface when space permits.
- Walk-in, Waitlist, block, staff, and customer tasks use the same compact
  action hierarchy: title, current context, required fields, validation,
  secondary cancel, and one primary commit action.
- Destructive or reset actions require confirmation and are spatially separated
  from routine commands.
- Mutation controls disable while pending and expose success/error through text
  and live regions, not color alone.

## Data and synchronization

- Optimistic changes are visibly pending until the local revision confirms.
- A stale version or table/block conflict stops commit, preserves the user’s
  input, identifies the affected time/table, and offers reload/retry.
- A revision gap triggers a full local workspace reload; it never falls through
  to a production data source.
- Offline or lost lease changes the entire demo workspace to clearly labeled
  read-only mode. Browsing, filtering, selection, and inspection remain available.
- Empty results preserve the current date, service ribbon, filters, and create
  action. “No matches” and “no reservations” are distinct.

## Loading and failure grammar

- Under 300ms: retain current content and show pressed/pending control feedback.
- Over 300ms: use geometry-preserving row/pane placeholders.
- Error messages state the failed task and a recovery action.
- Disabled controls remain legible and announce why they are unavailable.
- Near-expiry and expired states are operational banners within the ribbon, not
  decorative notices or transient toasts.

## Keyboard and touch

- Important targets are at least 44×44px, including collapsed rails and Chart
  zoom controls.
- Tab order follows: service ribbon → global navigation → queue → active workspace
  → Inspector.
- Arrow keys move within tablists and Chart/table grids; Enter/Space selects.
- Escape closes the topmost drawer/sheet/dialog and restores trigger focus.
- Icon-only controls have useful accessible names and visible tooltips where
  appropriate.
- Reduced motion removes nonessential transitions. Required state changes remain
  immediate and readable.

## Motion

- No page scroll choreography.
- Micro-transitions are limited to pressed, selection, rail disclosure, sheet,
  and confirmation feedback.
- Use 150–220ms transform/opacity transitions; do not animate layout dimensions
  or delay input.

