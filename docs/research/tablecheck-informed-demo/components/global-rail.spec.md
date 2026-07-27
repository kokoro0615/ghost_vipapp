# Component Spec: Global Rail

## Role

Primary navigation for List, Floor, and Chart plus access to secondary GHOST
operations. It is the stable spatial anchor across all workspaces.

## Content hierarchy

1. GHOST identity mark with accessible product name
2. List
3. Floor
4. Chart
5. secondary operations disclosure
6. session/logout control, visually separated from navigation

List, Floor, and Chart must never be hidden inside the secondary disclosure.

## Geometry and style

- Desktop width: 52–60px.
- White surface on warm-white canvas.
- Champagne hairline on the workspace edge.
- Flat alignment and active indicator; no shadow/elevation as primary separation.
- Icon family and stroke weight are consistent.
- Every item exposes a 44px minimum target.

## Active and interaction states

- Active: graphite icon/text, champagne inset marker, and selected semantics.
- Hover: subtle warm-neutral fill; never the only cue.
- Focus: 3px dark-champagne/bronze ring.
- Disabled: remains named and explains unavailability.
- Pressed: immediate non-layout-shifting feedback.

## Responsive behavior

- 1440/1194: fixed left rail remains visible.
- 768/390/320: fixed bottom rail with icons plus short labels; maximum five
  top-level items.
- Bottom rail includes device safe-area padding and the page reserves its full
  height.
- List/Floor/Chart remain one explicit action away at every width.

## Navigation behavior

- Click/tap changes the active workspace while preserving date, filters, collapse
  states, and selection.
- Route change focuses the target view heading.
- Back/forward navigation restores the same view state.
- No gesture-only navigation and no scroll-linked animation.

## Acceptance

- Active destination is identifiable without color.
- Keyboard and touch navigation follow visual order.
- No item is clipped or overlapped at 320px.
- Logout is not adjacent to the primary create action.

