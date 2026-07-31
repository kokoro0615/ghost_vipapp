# Apple iPhone product pages — measured surface study

Date: 2026-07-31 JST

Scope: research only
Targets:

- `https://www.apple.com/jp/iphone/`
- `https://www.apple.com/jp/iphone-17-pro/`

This document records live browser measurements for the two Apple product
pages. It is not a clone specification. Apple copy, media, fonts, icons, and
screenshots in this study must not be copied into GHOST production. The useful
output is the measured hierarchy, restraint, state clarity, and responsive
behavior that can be translated into GHOST-owned solid surfaces.

## 1. Method and capture status

- Browser engine: `HeadlessChrome/146.0.0.0`, Linux x86_64,
  `AppleWebKit/537.36`, DPR 1.
- Automation: Playwright drove Chrome and returned the exact Chrome user agent
  above. The separate Chrome DevTools connector could not attach because it
  could not see its expected `DevToolsActivePort`; no values were inferred from
  that failed connector.
- Viewports:
  - large: `1440 × 900`
  - medium: `768 × 1024`
  - small: `390 × 844`
- At each width the page was navigated fresh, `document.fonts.ready` was
  awaited, the page was returned to scroll position 0, and full-page plus
  section captures were taken.
- All values below come from `getComputedStyle()`, DOM geometry, CSSOM media
  conditions, ARIA state, or a real browser interaction. Visual guesses were
  not used.
- The overview page was scroll-swept every 450 px at 1440. The Pro page was
  scroll-swept every 700 px at 1440.
- Interaction sweep covered a primary CTA normal/hover/focus/pressed state,
  enabled/disabled gallery controls, a card hover, Pro highlight tab change,
  and the mobile partner accordion change.
- Browser console across the run: 0 errors. Warnings were Apple script
  deprecation messages and headless WebGL capability/readback warnings; see
  `raw-iphone-pages/iphone-pages-console-warnings.log`.

### Artifact inventory

- 36 PNGs, 13,060,129 bytes, under
  `docs/design-references/apple-surface-study-2026-07-31/iphone-pages/`.
- 28 raw JSON/Markdown/log captures, 5,108,926 bytes, under
  `docs/research/apple-surface-study-2026-07-31/raw-iphone-pages/`.
- Six full-page captures exist: both targets at all three widths.
- Major-section captures exist for overview hero, lineup, buying reasons, and
  partners, and for Pro welcome, highlights, design, battery, upgrade, and
  comparison. Alternate clicked states were also captured for the A19 Pro
  highlight and the Apple Watch accordion item.

The computed captures report larger final scroll heights than some initial
page-load probes because lazy sections hydrate while the page is traversed.
Final measured heights were:

| Page | 1440 | 768 | 390 |
|---|---:|---:|---:|
| iPhone overview | 9,429 px | 10,240 px | 10,394 px |
| iPhone 17 Pro | 31,965 px | 30,286 px | 29,601 px |

## 2. Resolved font system

The Japanese pages resolve to a two-role SF system with Japanese coverage
first in the stack:

- text/UI: `"SF Pro JP", "SF Pro Text", "SF Pro Icons", ...`
- display/headings: `"SF Pro JP", "SF Pro Display", "SF Pro Icons", ...`
- Japanese fallbacks include Hiragino Kaku Gothic Pro, Meiryo, and platform
  sans-serif fallbacks.
- Loaded faces observed during the run included SF Pro JP 400/500/600/700,
  SF Pro Text 400/500/600, SF Pro Display 500/600/700, and SF Pro Icons
  400/500/600. Exact loaded subsets varied with viewport and visited state.

This is important: the premium feeling does not come from many font families.
It comes from one coherent sans system, optical text/display roles, a narrow
weight vocabulary, careful line height, and disciplined contrast.

### Weight and tracking findings

- Normal body and navigation use 400.
- Labels, headings, card titles, metadata that must scan, and most Pro body copy
  use 600.
- 700 appeared selectively on the Pro price, not as the default heading weight.
- Large 40–80 px statements use weight 600 and mostly `letter-spacing: normal`.
- Small and medium display roles use tiny positive tracking rather than broad
  all-caps tracking:
  - 28 px overview card title: `0.196px`
  - 24 px display: `0.216px`
  - 21 px display: `0.231px`
  - 19 px Pro price: `0.228px`
- Body and ordinary labels generally resolve to `letter-spacing: normal`.
- A dark comparison select was the exception: 17 px at `-0.374px`; this is a
  control-specific optical adjustment, not a system-wide tracking rule.

### Measured type roles — iPhone overview

| Role | 1440 | 768 | 390 | Weight / color |
|---|---|---|---|---|
| page title | 80/87 | 64/71 | 48/52 | 600 / `rgb(29,29,31)` |
| section title | 56/63 | 48/55.0077 | 28/33.0011 | 600 / `rgb(29,29,31)` |
| product/card title | 28/33.0011 | 24/30 | 21/26 | 600 / primary |
| body/product positioning | 17/23.0003 | 17/23.0003 | 14/19.6 | 400 / primary |
| card label | 17/21.0012 | 14/19.0006 | 14/19.0006 | 600 / primary |
| card body | 17/21.0012 | 14/19.0006 | 14/19.0006 | 400 / primary |
| local chapter label | 14/19.6 | 14/19.6 | 12/16.0008 | 600 / primary |
| index heading | 17/21.0012 | 14/19.0006 | 14/19.0006 | 400 / `rgb(110,110,115)` |
| elevated index item | 28/33.0011 | 24/30 | 21/26 | 600 / primary |

Values are `font-size/line-height` in CSS pixels. The overview reduces both
type and section spacing at the exact small breakpoint; it does not merely
scale the whole desktop composition.

### Measured type roles — iPhone 17 Pro

| Role | 1440 | 768 | 390 | Weight / color |
|---|---|---|---|---|
| section title | 56/63 | 48/55.0077 | 28/33.0011 | 600 / light or dark primary |
| major product statement | 80/87 | 56/63 | 40/47 | 600 / `rgb(245,245,247)` |
| section eyebrow | 24/30 | 21/26 | 17/21.0476 | 600 / `rgb(255,121,27)` |
| battery headline | 56/63 | 40/47 | 32/39 | 600 / dark-theme primary |
| Pro body | 21/28.0015 or 17/23.2635 | 19/26.0004 or 17/23.2635 | 17/23.2635 | 600 / secondary |
| dark card caption | 17/23.0003 | 14/19.0006 | 14/19.0006 | 600 / secondary |
| compact figure/spec | 17/23.0003 | 14/19.0006 | 12/17 | 400–600 / secondary |
| price | 19/24 | 19/24 | 19/24 | 700 / white |

The marketing scale is intentionally much larger than an operator interface
should use. The transferable lesson is the role separation and weight economy,
not the 80 px headline.

## 3. Surface, rule, radius, and shadow measurements

### Light hierarchy

- main text: `rgb(29, 29, 31)`
- secondary text: `rgb(110, 110, 115)`
- alternate dark copy on white: `rgba(0, 0, 0, 0.88)`
- common section canvas: `rgb(245, 245, 247)`
- quieter index/footer canvas: `rgb(250, 250, 252)`
- elevated content pane/card: `rgb(255, 255, 255)`
- light link: `rgb(0, 102, 204)`

### Dark hierarchy

- true black story surface: `rgb(0, 0, 0)`
- charcoal dark surface/card: `rgb(29, 29, 31)`
- one small-screen upgrade surface: `rgb(18, 18, 20)`
- primary dark-theme text: `rgb(245, 245, 247)` or
  `rgba(255,255,255,0.92)`
- secondary dark-theme text: `rgb(134, 134, 139)`
- dark-theme link: `rgb(41, 151, 255)`
- Pro accent eyebrow: `rgb(255, 121, 27)`

### Structural treatment

- Standard large cards use `border-radius: 28px` at all three measured widths.
- Card and section shadows resolve to `none` throughout the sampled surfaces.
- Most card boundaries are created only by adjacent surface values, not by a
  border plus shadow plus blur stack.
- One measured dark outlined tile used `border: 2px solid rgb(51,51,54)` on
  `rgb(29,29,31)`.
- The Pro comparison pane was white with 28 px radius; at 1440 it measured
  1260 px wide and had 120 px vertical inset.
- Overview light cards are white on `rgb(245,245,247)`; dark cards are black on
  the surrounding section. They still use no shadow.
- No glass blur was needed to establish the product-page hierarchy. Layering
  comes from opaque solids, media, scale, and spacing.

These measurements support a GHOST translation of warm-white canvas, white
panes, graphite text, and champagne rules without shadow-heavy SaaS cards.
They do not support copying Apple’s 28 px marketing-card radius into every
operator control.

## 4. Geometry and spacing

### Content width

| Regime | viewport content | side inset |
|---|---:|---:|
| 1440 large | 1,260 px | 90 px |
| 768 medium | 672 px | 48 px |
| 390 small | 341.25 px | 24.375 px |

### Section rhythm

Overview section padding contracts systematically:

- 1440: common vertical tier 112 px
- 768: common vertical tier 96 px
- 390: common vertical tier 56 px

Pro story sections use a larger marketing cadence:

- top padding: 160 / 128 / 96 px at 1440 / 768 / 390
- common bottom padding: 216 / 206 / 196 px
- Pro upgrade large/medium top padding: 80 / 64 px; the small variant becomes a
  distinct full surface without the same inset.

The cadence is tiered, not random. Repeated sections reuse a small number of
spacing values. This is transferable; the marketing-sized values are not.

### Cards and galleries

- Overview lineup item width: 372 / 344 / 260 px.
- Overview buying-reason card width: 372 / 344 / 260 px.
- Pro dark highlight card: 1260 × 680, 672 × 628, 321.25 × 480 px.
- Gallery gaps and exposed neighboring cards intentionally advertise horizontal
  continuation at medium/small widths.
- Plus/paddle glyph circles are 36 × 36 px but key instances sit in a 44 × 44
  wrapper. The visual object and interaction target are treated as separate
  geometry.

## 5. Controls and interaction states

### Primary pill CTA

Measured overview product CTA at 1440:

| State | Background | Other computed values |
|---|---|---|
| normal | `rgb(0,113,227)` | white text; 17/20.0002; 400; padding 11×21; 1 px transparent border; 44 px outer height; radius 980 px |
| hover | `rgb(0,118,223)` | geometry unchanged; `:hover=true` |
| focus-visible | hover color | `outline: 2px solid rgb(0,113,227)`; offset 3 px |
| pressed | `rgb(0,110,219)` | geometry unchanged; `:active=true` |

This control declares `transition: all 0s ease`; the state is immediate. The
polish comes from exact color/state treatment and stable geometry, not from a
decorative animation.

At 390 the same product CTA is 36 px high with 14/19 text and 8×15 padding.
That marketing choice must not override the VIP Manager’s 44 px important
touch-target requirement.

### Gallery paddle

- enabled: 36 × 36, centered flex, background
  `rgba(210,210,215,0.64)`, color `rgba(0,0,0,0.56)`, circular radius 36 px.
- disabled: same geometry and colors, opacity `0.42`, `cursor: default`,
  `pointer-events: none`.
- transition: background, color, and opacity, each 100 ms linear.
- visual 36 px control is paired with a 44 px wrapper where the implementation
  provides one.

### Tile disclosure control

- 36 px black circle on light cards or 36 px light circle on dark cards.
- 44 × 44 wrapper.
- No shadow.
- State remains legible through foreground/background inversion rather than a
  floating elevation effect.

### Card hover

- normal transform: identity.
- real hover transform: `matrix(1.01613,0,0,1.01613,0,0)`.
- transition: transform 300 ms `cubic-bezier(0,0,0.5,1)`.
- shadow remains none; radius remains 28 px; geometry does not reflow.
- CSS includes a `(hover: hover)` regime, so this treatment is not required on
  touch-only layouts.

### Pro highlight tabs

- Interaction model: click/time driven gallery, not scroll-driven content
  replacement.
- A real click changed ARIA selected state and moved the active panel into the
  1260 px center slot.
- inactive dot: 8 × 8; selected progress item: 48 × 8 at 1440.
- dot radius: 10 px; background `rgba(245,245,247,0.8)`.
- background-color transition: 250 ms linear.
- play/pause control: 56 × 56; state transitions use 100 ms color/opacity and
  200 ms transform.

### Mobile partner accordion

- Interaction model: click-driven single-open accordion.
- At 390, title button is 292.47 px wide, 21/26, 600, tracking 0.228 px.
- collapsed item height: 68 px; expanded title band: 47 px.
- collapsed padding: 21 px top/bottom; expanded padding: 21 px top, 0 bottom.
- content height transitions over 400 ms ease-in-out with overflow hidden when
  collapsed.
- A real click moved `aria-expanded=true` from Mac to Apple Watch; the old panel
  resolved to 0 px and `aria-hidden=true`, while the new panel resolved to
  479.281 px.

## 6. Scroll, sticky, and motion model

### iPhone overview

- Global navigation is `position:absolute`, 44 px high.
- The 240.6 px chapter navigation is static, not sticky.
- During the full 1440 sweep both leave the viewport naturally.
- Galleries are horizontal, button/click driven; the page itself remains native
  vertical scroll.

### iPhone 17 Pro

- Global navigation is absolute, 44 px high.
- Product local navigation is sticky, 72 px high. At scroll 0 its top was 44 px;
  by the 700 px sample it was pinned at viewport top 0.
- Product-story controls use multiple sticky “all access pass” rails, typically
  56 px high. They pin near the lower viewport region while their story is
  active and release outside it.
- The camera story contains a 900 px sticky viewport container through a long
  scroll-driven sequence.
- Captions use opacity transition 300 ms
  `cubic-bezier(0.33,1,0.68,1)`.
- Gallery paddle visibility uses opacity 200 ms ease-out.
- Scroll sweep found native document scrolling plus sticky choreography; it did
  not find a requirement to replace scrolling with click tabs.

The Pro scroll choreography is marketing storytelling. It should not be
transplanted into a dense reservation operator workspace. The transferable
part is contextual persistence: keep the local action rail stable while the
work region changes.

## 7. Exact responsive breakpoints

CSSOM extraction found the primary Apple regimes on both pages:

- small: `max-width: 734px`
- medium: `min-width: 735px` and `max-width: 1068px`
- large: `min-width: 1069px`

The Pro page also contains component-specific conditions at 480, 468, and
376 px, a 1441 px large-screen expansion, and `(hover: hover)` rules. Those are
local exceptions, not a reason to invent arbitrary breakpoints per component.

Observed responsive behavior:

- page/section titles step 80→64→48 or 56→48→28 rather than scaling fluidly;
- section padding steps 112→96→56 on overview;
- cards become horizontal carousels with exposed continuation;
- gallery and comparison content preserves scan order while reducing type and
  padding;
- navigation replaces desktop link density with 48 px search/bag/menu controls
  on small screens;
- the partner layout becomes a single vertical accordion.

## 8. Optical alignment and baseline findings

- The 44 px desktop pill is made from a 20.0002 px text line, 11 px vertical
  padding, and 1 px transparent border. Its bounds do not change across
  normal/hover/focus/pressed states.
- The gallery paddle uses `display:flex; align-items:center;
  justify-content:center`, so the icon is optically centered in a 36 px circle
  rather than aligned by an arbitrary top offset.
- The accordion title uses flex alignment and `space-between`; text and
  disclosure glyph share one baseline band while the expanded content begins
  after a deliberate 21–28 px inset.
- Display tracking is subpixel and role-specific. No evidence supports broad
  letter spacing on ordinary Japanese body copy.
- Figures and prices use stable weight, line height, and compact measures; they
  are not made prominent with a separate decorative font.
- Dark-theme metadata is muted with `rgb(134,134,139)` while primary labels stay
  `rgb(245,245,247)`, yielding hierarchy without adding borders around every
  row.

## 9. Translation constraints for GHOST VIP Manager

Evidence from these pages supports the following translation, not emulation:

1. Use one coherent Japanese sans family with text/display optical behavior,
   primarily weights 400 and 600. Test 700 only for a genuinely dominant
   numeric role.
2. Let warm-white canvas, white pane, graphite type, and restrained champagne
   hairlines establish depth. Default shadow should remain none.
3. Keep control geometry stable across states. Use color, outline, and opacity
   instead of scale or layout movement for command controls.
4. Preserve the existing VIP Manager layout geometry. Apple’s giant display
   sizes, 28 px marketing cards, and 160–216 px story spacing are not operator
   UI values.
5. Separate visual glyph size from the hit target, as the 36 px/44 px control
   pattern demonstrates.
6. Prefer a small, repeatable spacing and type vocabulary. The measured pages
   achieve consistency through repeated tiers, not component-by-component
   decoration.
7. Keep hover enhancements gated to hover-capable devices and keep reduced
   motion behavior available. The operator surface must remain immediately
   readable without motion.

`ui-ux-pro-max` was used as a review lens for accessibility, stable interaction
states, touch targets, contrast, responsive regimes, and reduced-motion risk.
Its generic style/font suggestions were not adopted; the live Apple
measurements and the GHOST canonical design contract take precedence.

## 10. Not run / limitations

- Safari/WebKit rendering was not run in this subtask; all values are Chrome
  146 values on Linux. Font rasterization and some subpixel glyph metrics can
  differ on macOS/Safari.
- DPR 2/3 screenshots were not run. Responsive CSS was measured at DPR 1;
  resolution-specific media rules were catalogued but not visually compared.
- `prefers-reduced-motion: reduce` was not re-captured as a separate full-page
  image in this subtask. Default captures report the preference as false.
- Every marketing gallery slide was not clicked. The Pro highlight gallery and
  overview mobile accordion received explicit alternate-state checks; other
  gallery states are represented by topology, ARIA, computed controls, and
  scroll measurements.
- The transparent duplicate local-nav purchase nodes used by the Pro reveal
  animation were not used as canonical control-color evidence. The overview
  product CTA supplied the valid normal/hover/focus/pressed measurements.
- Some element screenshots of media-heavy sections are visually sparse because
  Apple’s lazy media/canvas state is tied to viewport intersection. Full-page
  screenshots, computed DOM geometry, and targeted active-state screenshots are
  the authoritative combination.
- At the 390 px Pro viewport, the live document reported a 390 px client width
  but a 395 px scroll width. The nearest measured contributor was a comparison
  tile ending at x=394.703 px, so the full-page PNG is 395 px wide while the
  targeted section captures remain 390 px. This is recorded as source-page
  overflow, not a behavior to transfer to GHOST.

## 11. Raw evidence map

Key files:

- `iphone-overview-{1440,768,390}-computed.json`
- `iphone-17-pro-{1440,768,390}-computed.json`
- `iphone-17-pro-390-horizontal-overflow.json`
- `iphone-overview-1440-scroll-sweep.json`
- `iphone-17-pro-1440-scroll-sweep.json`
- `iphone-overview-1440-control-{normal,hover,focus}.json`
- `iphone-overview-1440-card-hover.json`
- `iphone-17-pro-1440-disabled-control.json`
- `iphone-17-pro-1440-highlight-tab-state.json`
- `iphone-overview-390-accordion-{before,after}.json`
- `iphone-overview-media-queries.json`
- `iphone-17-pro-media-queries.json`
- `iphone-overview-1440-separators-optical.json`
- `iphone-overview-1440-topology.json`
- `iphone-17-pro-1440-topology.json`
- `iphone-overview-1440-a11y.md`
- `iphone-overview-390-a11y.md`
- `iphone-17-pro-1440-a11y.md`

All screenshot names are self-describing and live only in the research
`iphone-pages/` directory.
