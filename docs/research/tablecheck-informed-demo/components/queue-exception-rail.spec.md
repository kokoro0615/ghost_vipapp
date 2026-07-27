# Component Spec: Queue / Exception Rail

## Role

High-speed triage surface for arrivals, late/unassigned/conflicted reservations,
and other operational exceptions. It selects records; it does not duplicate the
Inspector.

## Structure

```text
rail header
├─ title
├─ total / severity counts
└─ collapse control
search/filter row
grouped queue
├─ group heading + count
└─ 40–48px selectable rows
```

Rows show time, synthetic reservation code/label, table or unassigned cue, and a
short exception/status cue. They must not display real-person data.

## Geometry and style

- Expanded desktop width: 260–320px.
- Collapsed width: 44–52px.
- White pane, graphite text, champagne separators.
- Rows: 40–48px visual density with a 44px hit target.
- Square/compact corners, radius 0–4px.
- No nested cards or shadows.

## Behavior

- Selecting a row updates List, Floor, Chart, and Inspector.
- Search is local, debounced, and keeps grouped counts understandable.
- Collapse preserves total and highest-severity non-color cue.
- Expanding restores query, group expansion, scroll position, and selection.
- Empty groups remain compact; a fully empty rail states that no attention item
  exists.

## Responsive behavior

- 1440: may remain expanded with Inspector open.
- 1194: collapsible; protect the primary workspace before shrinking row content.
- 768: task drawer or inline collapsible region.
- 390/320: inline queue drawer; it must not compete with the Inspector bottom
  sheet. Only one overlay task surface is active.

## Accessibility

- `aside` has an operational label.
- Collapse control exposes expanded state and target region.
- Group counts and severity include text/icon cues.
- Search has a visible or programmatic label and a 44px input height on touch
  layouts.
- Row focus order matches visual order; Enter/Space selects.

## Acceptance

- Same reservation is highlighted across all visible representations.
- Collapse/expand never resets selection.
- No color-only severity.
- No real customer, venue-account, or source-system identifier appears.

