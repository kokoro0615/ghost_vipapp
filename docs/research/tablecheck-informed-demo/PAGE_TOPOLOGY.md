# GHOST VIP Manager Page Topology

## Purpose and provenance

This document converts an authenticated, read-only reference observation into a
GHOST-owned operations topology. The newest user-provided dashboard URL was the
authenticated entry point. Timetable, List, and Floor were reached only through
permitted view navigation. No source-system mutation was performed.

The authoritative public-source set is fixed by section 6 of the execution
prompt. Public material is corroborative only; the current authenticated
observation governs pane relationships and interaction density. No external
visual identity, copied wording, source structure, or private data is part of
this specification.

## Product frame

Every authenticated route renders one persistent operational frame:

```text
service ribbon
└─ operational body
   ├─ global rail
   ├─ queue / exception rail
   ├─ primary workspace
   │  ├─ List
   │  ├─ Floor
   │  └─ Chart
   └─ reservation inspector
```

The frame must communicate `GHOST OSAKA`, `VIP Manager`, the business date,
the active view, the synthetic-demo condition, and the reservation-create
action without relying on a menu being open.

## Persistent regions

### Service ribbon

- Owns venue identity, business-date controls, service-period context, global
  connectivity/lease state, demo cue, and the one primary create action.
- Persists across List, Floor, and Chart, including empty states.
- Uses a 50–58px target height on large screens.
- Stacks into two compact control rows at 768px and below without changing
  navigation hierarchy.

### Global rail

- Owns direct navigation among List, Floor, and Chart plus secondary operational
  destinations.
- Uses a 52–60px desktop width; icons and visible labels/accessible names must
  make the active destination unambiguous.
- Remains present at 1194px.
- Becomes a fixed bottom rail at 768px and below, with safe-area padding and no
  content hidden behind it.

### Queue / exception rail

- Owns arrival and exception triage, grouped counts, local search, and rapid
  reservation selection.
- Uses 260–320px when expanded on desktop.
- Collapses to a narrow status strip without losing total/severity cues.
- Selection is shared with List, Floor, Chart, and Inspector.

### Primary workspace

- Owns the active operational representation, not global navigation or record
  editing.
- Uses its own bounded scroll region only where the data model requires it.
- Never introduces horizontal page overflow.
- Empty and loading variants retain the service ribbon and the view’s operational
  frame so the user does not lose date or destination context.

### Inspector

- Owns selected-reservation summary, tabbed detail, history, edit entry, and the
  six GHOST reservation commands.
- Uses 340–400px on desktop.
- Collapses independently of the queue rail.
- Becomes a modal bottom sheet on narrow layouts and restores focus to the
  originating selection when closed.

## View topology

### List

```text
view toolbar
├─ result count / density / sort context
└─ bounded reservation table
   ├─ sticky column header
   ├─ 40–48px rows
   └─ explicit empty/loading/error row
```

List is the default mobile workspace and the fastest text-scanning surface.
Row selection opens or updates the shared Inspector without navigating away.

### Floor

```text
view controls
├─ reservation-state tabs
├─ search
└─ assignment/block actions
floor work area
├─ GHOST VIP-1…VIP-8 canvas
└─ reservation rail
```

Desktop Floor is a horizontal split between the real GHOST floor geometry and a
reservation rail. The rail supports reservation, waitlist, finished, and block
task modes. At phone widths, Floor becomes a vertical task stack: mode controls,
focused reservation/task list, floor canvas, then contextual action area.

### Chart

```text
view controls
└─ time zoom / density
inner-scroll chart
├─ sticky time header
├─ fixed VIP-1…VIP-8 labels
└─ reservation/block tracks
exception buckets
└─ unassigned / conflict / attention
```

Chart owns bidirectional inner scrolling. The page shell does not horizontally
scroll. Exception buckets remain adjacent to the chart task, not detached into a
dashboard card collection.

## Cross-view state contract

- Business date, service period, query, filters, selected reservation, selected
  table, queue collapse, Inspector collapse, and Chart zoom survive view changes.
- A reservation selected in any view becomes the sole shared active selection.
- Selection uses champagne fill/hairline plus a non-color cue; it is never
  communicated by color alone.
- Changing view is click/tap driven, preserves date and filters, and moves focus
  to the new view heading.
- No route uses scroll choreography, parallax, page-scale animation, or gesture-only
  navigation.

## Visual boundary

- Canvas: warm white.
- Operational panes: white.
- Primary text/actions: graphite.
- Separation and selection: restrained champagne hairlines.
- Radius: 0–6px.
- Primary separation: rules, alignment, and surface contrast; not shadows.
- Disallowed: blue/purple/dark major chrome, gradients, glass effects, nested
  cards, decorative blobs, and generic SaaS dashboard tiles.
