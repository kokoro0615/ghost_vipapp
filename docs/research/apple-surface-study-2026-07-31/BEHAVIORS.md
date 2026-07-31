# Behaviors — measured Apple evidence and GHOST decisions

Date: 2026-07-31 JST

## Sources and method

- Apple official iPhone overview and iPhone 17 Pro pages, Chrome 146 at
  1440×900, 768×1024, and 390×844.
- Apple official HIG design-principles, typography, materials, layout, and
  accessibility pages, Chrome 146 at the same three widths.
- Normal, hover, focus, pressed, disabled, carousel/tab, accordion, scroll,
  sticky, reduced-motion-query, and responsive states were extracted where the
  live page exposed them.

Exact JSON and repeatable capture scripts live under `raw-iphone-pages/` and
`raw-hig/`.

## Stable state behavior

| Reference behavior | Measured evidence | GHOST decision |
|---|---|---|
| Primary CTA | background changes `#0071e3` → hover `#0076df` → pressed `#006edb`; geometry unchanged | Adopt stable geometry and immediate state clarity; retain graphite GHOST action colors |
| CTA focus | 2px blue outline, 3px offset | Keep GHOST's existing visible 2px champagne/graphite-compatible focus ring; reject Apple blue |
| Gallery paddle | 36px visual inside a 44px wrapper; disabled keeps geometry | Adopt visual/target separation principle; GHOST already enforces 44px |
| Disabled | same geometry, opacity `.42`, pointer disabled | Reject opacity because GHOST contrast contract requires authored sunken fill and legible ink |
| Card hover | scale `1.01613`, 300ms, hover-capable devices only | Reject marketing scale/motion; dense table/floor geometry must not move |
| HIG navigation sample | ink-only hover/pressed change, no scale or shadow | Adopt restrained feedback without layout motion |
| Pro highlight tabs | state changes in place; content association stays explicit | Retain current tabs and ARIA state; no Apple content or chrome copied |
| Mobile partner disclosure | accordion state exposes more content at the same breakpoint | Evidence for progressive disclosure only; GHOST keeps existing mobile menu/queue topology |

## Responsive behavior

Apple product content uses three deliberate regimes rather than a uniformly
scaled desktop page: 1260px content at 1440, 672px at 768, and 341.25px at 390.
Type and section spacing step down at each regime. HIG guidance additionally
requires testing text-size, locale, orientation, and input extremes.

GHOST does not adopt these widths or breakpoints. Its layout is frozen. The
transferable behavior is consistency: the same action keeps its meaning and
state vocabulary when presentation changes. Required checks remain 320px fit,
200% zoom, reduced motion, keyboard focus, and non-color status cues.

## Motion decision

Apple evidence ranged from immediate CTA feedback, through 100ms linear paddle
states, to a 300ms marketing-card scale. GHOST's existing 110/160/220ms CSS-only
tokens already cover control/panel transitions without a motion dependency.
No new transform, scroll choreography, decorative animation, or Apple easing
was introduced.

## Not run

- macOS Safari and iOS/iPadOS Safari runtime behavior
- native UIKit/AppKit controls, Dynamic Type, VoiceOver, Switch Control
- native Liquid Glass rendering
- real touch hardware and haptics
- dark-mode GHOST UI (intentionally unsupported)

These conditions are not reported as passed.
