# GHOST type / surface translation spec

Status: implementation contract, 2026-07-31

## Scope

Presentation-only refinement of the canonical VIP Manager. Do not change DOM,
workflow, breakpoints, scroll ownership, floor/chart geometry, API, state,
contract payloads, dependencies, or data.

## Typography

- Family: M PLUS 2 only.
- Loaded weights: 400, 500, 600, 700.
- Roles: body 400; quiet UI 500; strong UI 600; display 700.
- Size scale unchanged: 11/12/13/15/18/22 plus existing fluid display.
- Caps tracking: `.04em`; ordinary Japanese remains at font default.
- Figures: root-inherited `tabular-nums lining-nums`; `.005em` utility tracking.
- Native `<small>` scaling is forbidden; wizard rail labels inherit 11px.
- `font-synthesis: none`; no SF Pro/Hiragino file, mono, or second family.

## Solid material

- Canvas: warm `#f5f4f2` equivalent via OKLCH.
- Pane: white.
- Quiet/sunken/hover/active: token ramp only.
- Separator: 1px token rule; control border keeps 3:1 contrast.
- Elevation: lower-alpha existing raised/dialog shadows only.
- Radius: existing 2/3/4px only.

## Interaction

- State colors and geometry remain stable.
- Existing focus, disabled, selected, pressed, reduced-motion, and 44px rules
  remain stronger than the sampled marketing-page patterns.
- No transform-scale hover, blur, transparency, or decorative motion.

## Responsive

- Existing breakpoints and geometry are immutable.
- Verify 1440×900, 1194×834, 768×1024, 390×844, and 320×800 against the
  before geometry file with ≤1px x/y/width/height delta.
- Verify the full manifest-derived state set plus 200% zoom and reduced motion.

## Acceptance

- exact source contract assertions for surface, weights, no palt, no raw weight
- before/after screenshots under the dated design-reference directory
- axe/overflow/undersized/legacy-purple/console/5xx all zero
- protected path diff zero
- no commit, push, deployment, env, DB, API, dependency, or business-data change
