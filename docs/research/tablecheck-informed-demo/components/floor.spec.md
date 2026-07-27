# Component Spec: Floor

## Role

Spatial workspace for official GHOST `VIP-1` through `VIP-8`, reservation/table
selection, assignment awareness, blocks, waitlist, finished items, and staff
context.

## Desktop structure

```text
view controls
├─ task tabs: reservations / waitlist / finished / blocks
├─ local search
└─ contextual assignment/block action
split work area
├─ real GHOST floor canvas
│  └─ VIP-1…VIP-8 nodes
└─ reservation task rail
```

No external venue geometry or visual identity may be reproduced.

## Canvas and nodes

- Reuse the existing GHOST floor-plan bitmap/geometry.
- Only official `VIP-1`…`VIP-8` appear as active table nodes.
- Node hit area is at least 44×44px even when its visual footprint is smaller.
- Node content prioritizes table code, status/block/lock cue, time/party summary,
  and optional staff assignment.
- Selected table/reservation is shown with champagne outline plus non-color cue.
- Block, lock, conflict, occupied, and empty remain distinguishable through
  label/icon/line treatment.

## Reservation task rail

- Uses dense 40–48px rows.
- Tabs preserve independent scroll/query state.
- Selecting a task row synchronizes the matching node and Inspector.
- Selecting a node synchronizes the matching task row.
- Search does not mutate data or clear selection unexpectedly.

## Behavior

- Click/tap is the primary selection model.
- Table assignment/reassignment/unassignment opens an explicit confirmation/task
  surface; a simple selection does not mutate.
- Drag/drop, if retained as an enhancement, must have keyboard/touch alternatives
  and never commit without conflict validation.
- Empty table selection exposes table context; occupied table selection exposes
  the active reservation.
- Canvas pan/zoom must not trap page scroll or require precision gestures.

## Responsive behavior

- 1440/1194: horizontal split canvas + reservation rail.
- 768: controls stack; rail may move below the canvas or become a task drawer.
- Exact 390/320: replace the horizontal split with a vertical task stack:
  task tabs → search/focused list → floor canvas → contextual actions.
- The fixed bottom nav remains available, and the page has zero horizontal
  overflow.

## Accessibility

- Canvas has a concise GHOST floor description.
- Every node is a semantic button with table code, capacity/status, assignment,
  and selected state.
- Legend is textual and does not rely on color.
- Focus order follows visible geometry or a documented stable table-code order.

## Acceptance

- All eight official tables are visible/reachable.
- No trial/canary/control table is shown.
- Table and reservation selections synchronize with List, Chart, queue, and
  Inspector.
- Phone Floor uses the vertical task stack at both 390 and 320 widths.

