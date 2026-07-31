# Apple reference topology — research-only map

Date: 2026-07-31 JST

This topology records what was measured on the two Apple product pages and the
five HIG pages. It is evidence for hierarchy and material behavior, not a plan
to copy Apple structure, content, assets, or brand language into GHOST.

## iPhone overview

1. global navigation
2. local product navigation
3. page identity and horizontal chapter index
4. hero/product introduction
5. lineup carousel
6. buying-reason modules
7. comparison and ecosystem modules
8. partner/support disclosures
9. legal/footer navigation

Repeated families measured in the browser:

- product/lineup item
- buying-reason card
- 44px-wrapper gallery/disclosure control
- local navigation CTA
- responsive disclosure/accordion

## iPhone 17 Pro

1. global and local navigation
2. product welcome/price/CTA
3. highlights gallery and tab state
4. design/material story sections
5. camera/performance/battery story sections
6. upgrade/compare pane
7. buying/support/legal/footer sections

Repeated families measured in the browser:

- dark story section
- media-led highlight card
- tabbed highlight control
- comparison/upgrade pane
- gallery paddle

## Apple HIG publication shell

1. global developer navigation
2. secondary design navigation
3. topic navigator/filter
4. article header
5. prose, tables, notes, media, and related links
6. changelog/footer

The app guidance in the article text is authoritative for the research. The
website shell's CSS is only a measured publication example; it is not an iOS
component specification.

## GHOST translation boundary

No Apple section topology is cloned. GHOST keeps its existing masthead,
toolbar, two-column workspace, List/Floor/Chart switch, inspector, queue,
two-zone wizard, mobile bottom navigation, DOM order, and breakpoints. Only
these extracted qualities cross the boundary:

- one coherent type system and a narrow weight vocabulary
- solid canvas/pane separation
- restrained separators and elevation
- stable control geometry across states
- visible hierarchy through weight, ink, and alignment
- 44px important interaction targets

See `components/ghost-type-surface-translation.spec.md` for the implementation
contract and `APPLE_IPHONE_PAGES.md` / `APPLE_HIG.md` for raw evidence.
