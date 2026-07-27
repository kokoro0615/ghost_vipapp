# Component Spec: Chart

## Role

Time-by-table operations canvas for turnover, overlap, reservation duration,
blocks, unassigned work, and rapid Inspector selection.

## Structure

```text
chart toolbar
├─ focused date/service
└─ time zoom/density controls
labeled inner scroller
├─ sticky time header
├─ fixed VIP-1…VIP-8 labels
├─ reservation bars
├─ block intervals
└─ current-time / conflict cues
bottom exception buckets
└─ unassigned / conflict / attention
```

## Geometry

- The chart is a single bidirectional inner-scroll canvas.
- Time header remains sticky vertically.
- Table labels remain fixed horizontally.
- Tracks are 40–48px high.
- Reservation bars expose at least a 44px interactive hit area or expanded hit
  zone.
- Fine gridlines are neutral/champagne hairlines; they do not overpower data.

## Behavior

- Selecting a bar updates List, Floor, queue, and Inspector.
- Zoom changes time density while preserving selected reservation and approximate
  viewport center.
- Keyboard controls support tabbing to bars and arrow/Page/Home/End movement in
  the focused scroller.
- Blocks are readable but not selectable as reservations.
- Bottom exception buckets select the matching reservation and scroll its
  table/time into view.
- Current-time, conflict, stale, and selected cues use label/icon/line as well as
  color.

## Responsive behavior

- 1440: full inner canvas with bottom buckets.
- 1194: retain fixed labels and inner scroll; never squeeze the whole service
  period into illegible columns.
- 768: stack toolbar controls and retain one bounded inner scroller.
- 390/320: GHOST contract overrides direct desktop emulation. Provide an explicit
  table selector and focused time window as the primary mobile alternative.
  Bounded horizontal panning may reveal adjacent time, but page overflow remains
  zero and a visible control offers the same navigation.

## Empty/loading/error

- Empty day retains table labels, service time, and create action.
- Loading reserves the grid geometry.
- Error/read-only states retain the last safe canvas when available and place the
  recovery/status message above it.

## Accessibility

- Scroller has a clear label and keyboard instructions available on demand.
- Reservation buttons announce synthetic code/label, time range, table, and
  state without private data.
- Provide a structured List alternative through primary navigation.
- Focus remains visible through both axes.

## Acceptance

- Sticky header and fixed table labels survive inner scrolling.
- All overflow belongs to the labeled Chart scroller, never the page.
- Exception buckets remain attached to the Chart workflow.
- Selection is synchronized and not color-only.

