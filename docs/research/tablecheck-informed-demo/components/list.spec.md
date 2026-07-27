# Component Spec: List

## Role

Primary scanning surface for the active business day and the default phone view.
Optimized for rapid reservation selection, exception recognition, and Inspector
entry.

## Structure

- compact view heading and result count
- density/sort/filter context
- sticky column header
- bounded body with 40–48px rows
- empty, no-match, loading, error, and read-only variants

Desktop columns prioritize time, state, synthetic reservation code, synthetic
guest label, party size, assigned table, exception, and detail affordance.

## Visual contract

- White pane on warm-white canvas.
- 1px champagne/neutral-metal row rules.
- Graphite primary data; warm-neutral secondary metadata.
- Tabular numerals for time, count, code, version, and revision.
- Selected row uses pale champagne fill plus an inset marker and selected
  semantics.
- No zebra-blue rows, card wrappers, large radius, or row shadows.

## Behavior

- Default sort is business-time ascending; current sort is announced.
- Row click/tap selects the reservation and opens/updates the shared Inspector.
- Sorting/filtering never changes the shared selection silently.
- Empty date preserves ribbon, filters, date controls, and create action.
- No-match state offers clear-filter; it is distinct from an empty business day.
- Loading preserves header and row geometry.
- Lists above the implementation threshold should virtualize without breaking
  keyboard order or sticky header behavior.

## Responsive behavior

- 1440/1194: full dense table in a bounded vertical scroller.
- 768: lower-priority fields may condense into a secondary line, not horizontal
  page scroll.
- 390/320: each reservation becomes a 44px-or-taller two-line record. First line
  is time/state/code; second is synthetic guest/table/exception. Full detail is
  available in Inspector.

## Accessibility

- Semantic table at widths where columns remain tabular; structured list on
  phone layouts.
- Sort controls announce direction.
- Selected state and exception state are not color-only.
- Row action has a record-specific accessible name without exposing private data.
- Focus remains visible when the body scrolls.

## Acceptance

- Header remains visible during body scroll.
- Selection synchronizes with queue, Floor, Chart, and Inspector.
- 320px has no page overflow or overlapping labels.
- Empty state keeps the operator oriented to date and service context.

