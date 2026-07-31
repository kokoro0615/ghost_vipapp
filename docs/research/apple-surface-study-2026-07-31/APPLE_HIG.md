# Apple HIG study — GHOST VIP Manager surface / typography refinement

Research date: 2026-07-31 JST
Source class: Apple official Human Interface Guidelines only
Scope: design principles, typography, materials, layout, accessibility
Production use of Apple assets: none

## Purpose and boundary

This artifact extracts principles and measurable properties that can inform the
GHOST VIP Manager's presentation layer. It is not an Apple site clone, an iOS
app specification, or permission to use Apple branding.

Two boundaries are important:

1. The prose on the five HIG pages is **app-interface guidance**.
2. The computed CSS measured in this study belongs to the **Apple Developer
   Documentation website chrome**. It shows how Apple publishes the guidance on
   the web; it is not a normative size, radius, color, or material recipe for an
   iOS app.

Apple marketing surfaces were not part of this research lane. Large product-page
type, cinematic spacing, product imagery, scroll choreography, and marketing CTA
patterns must not be inferred from these HIG captures or imported into the dense
operator UI.

## Official sources

- [Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles)
- [Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- [Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)

All five endpoints returned the expected Apple Developer Documentation page and
were rendered in Chrome through the DevTools Protocol. The capture manifest
records each requested and final URL.

## Capture method

- Browser: `Chrome/146.0.7680.80`, CDP `1.3`, Linux headless Chrome.
- Viewports: `1440×900`, `768×1024`, `390×844`; device scale factor `1`.
- Capture time in the final manifest: `2026-07-31T12:20:31.547Z`.
- Per condition: page dimensions, heading/copy outline, font faces, unique type
  roles, text-color counts, surfaces, borders, radii, shadows, padding, visible
  controls, fixed/sticky elements, media queries, three scroll samples, one
  visible navigation control's focus/hover/pressed computed states.
- Full-page images are assembled from 4,096px Chrome screenshot tiles to avoid
  the empty-image failure seen when a single clip exceeds the browser's texture
  limit. Each condition also has top/middle/bottom viewport images.
- Raw text was limited to headings and short snippets; no Apple article or asset
  was copied into application source.

Artifacts:

- `raw-hig/manifest.json` — browser, URLs, viewport definitions, dimensions.
- `raw-hig/<topic>-<viewport>.json` — computed values and concise content outline.
- `raw-hig/capture-hig.mjs` — repeatable CDP capture procedure.
- `../../design-references/apple-surface-study-2026-07-31/hig/<topic>-<viewport>.png`
  — research-only full-page images.
- The same image stem with `-top`, `-middle`, or `-bottom` — viewport evidence.

## Observed Apple Developer Documentation web surface

These values are measured evidence about the HIG **website**, not values to copy
into GHOST.

### Type hierarchy

All five pages used the same primary publication hierarchy.

| Role | 1440px | 768px | 390px | Weight | Family | Ink |
|---|---:|---:|---:|---:|---|---|
| Body | `17 / 25px`, `-0.374px` tracking | same | same | 400 | `SF Pro Text`, then system fallbacks | `rgb(29,29,31)` |
| H1 | `48 / 52.0077px`, `-0.144px` | `40 / 44px`, `-0.12px` | `32 / 36px`, `0.128px` | 700 | `SF Pro Display`, then system fallbacks | `rgb(29,29,31)` |
| H2 | `32 / 36px`, `0.128px` | `28 / 32px`, `0.196px` | `24 / 28px`, `0.216px` | 700 | `SF Pro Display`, then system fallbacks | `rgb(29,29,31)` |
| H3 | `28 / 32px`, `0.196px` | `24 / 28px`, `0.216px` | `21 / 25px`, `0.231px` | 600 | `SF Pro Display`, then system fallbacks | `rgb(29,29,31)` |

The most frequent text colors were `rgb(29,29,31)`, `rgb(81,81,84)`, and
`rgb(110,110,115)`. This is a three-step ink hierarchy rather than many ad-hoc
gray values.

### Surface, rule, radius, and chrome samples

| Element | Measured value | Interpretation boundary |
|---|---|---|
| Document canvas | `rgb(255,255,255)` | Publication canvas only |
| Global navigation | `rgb(250,250,252)`, `44px` high, no shadow, no blur | Website chrome, not app material guidance |
| Secondary navigation | `52px` high, `position: sticky`, `top: 0`, `z-index: 9997` | Website navigation behavior |
| Desktop article | `740px` wide | Editorial measure, unsuitable for a fixed dense operator workspace |
| Desktop topic navigator | `200px` wide, sticky at `top: 52px` | Documentation navigation, not GHOST layout |
| Filter wrapper | `200×40px`, white, `1px rgb(210,210,215)`, `12px` radius | Large-radius web control; do not copy automatically |
| Table header | `1px rgb(29,29,31)` top/bottom rules, `10px` cell padding | Strong header rule supports scanability |
| Table row | `1px rgb(210,210,215)` rules, `10px` cell padding | Restrained separator supports dense data |
| Note | `rgb(245,245,247)`, `16px` inset, `15px` radius; some pages add `1px rgb(105,105,105)` and a `0 0 1px` inset/outer line | Website callout; radius/shadow are not app requirements |

The rendered documentation chrome had `backdrop-filter: none`. The Materials
article describes Liquid Glass and standard materials in prose and images; the
article shell itself is not proof that GHOST should use blur.

### Interaction sample

On the desktop global navigation, a visible `44px`-high Apple Developer link had
`8px` left/right padding and `color` transition `0.32s cubic-bezier(0.4,0,0.6,1)`.
The sampled ink changed from `rgba(0,0,0,0.8)` to `0.855` on hover and `0.97`
while pressed, without shadow, scale, or layout movement. This is useful only as
evidence for stable state feedback; the Apple navigation styling and timing are
not a GHOST token prescription.

The programmatic-focus sample did not expose a visible focus ring, so it is not
treated as evidence for GHOST focus styling. GHOST must retain its own visible
keyboard focus contract.

### Responsive evidence

- The editorial title scale steps down at the sampled widths while body text
  remains `17 / 25px`.
- Desktop has a sticky topic navigator and 740px article column; mobile removes
  that side-by-side topology and uses a single 341.25px content width inside the
  390px viewport.
- Measured media rules include thresholds at `1250`, `1023/1024`, `833/834`,
  `767/768`, `735/736`, `640/641`, and `320px`, plus hover and reduced-motion
  queries. They describe Apple documentation, not GHOST breakpoints.
- No capture had horizontal overflow: the recorded mobile document width was
  exactly `390px`; desktop content width was `1425px` because the 15px scrollbar
  occupies the remainder of the requested 1440px viewport.

## Official guidance, summarized

The following sections paraphrase the current Apple guidance. They do not copy
Apple's implementation or marketing language.

### 1. Design principles

The page currently organizes the foundation into eight themes:

- **Purpose:** optimize for the real task and the value people seek.
- **Agency:** let people act, keep state understandable, and make mistakes
  recoverable.
- **Responsibility:** earn trust through safety, privacy, and transparent intent.
- **Familiarity:** build on known patterns, apply visuals and behavior
  consistently, and provide clear feedback.
- **Flexibility:** support varied contexts, people, devices, and input methods
  while preserving context.
- **Simplicity:** retain what is necessary, use concise language, and make
  hierarchy and navigation evident. The page explicitly distinguishes simplicity
  from visual minimalism.
- **Craft:** refine details, prototype, test in real contexts, and maintain the
  quality after release.
- **Delight:** choose an appropriate emotional tone, but do not confuse delight
  with decoration that obstructs the task.

GHOST translation: preserve dense operational capability while removing
self-explanatory decoration, keep status/recovery visible, and make every chrome
element justify its space.

### 2. Typography

The official Typography page supports these decisions:

- Use sizes people can read across viewing conditions; validate in context.
- Avoid very light weights for interface text. Apple's examples favor Regular,
  Medium, Semibold, and Bold over Ultralight, Thin, and Light.
- Use weight, size, and color deliberately to preserve information hierarchy.
- Minimize the number of typefaces; excess families obscure hierarchy and make
  the interface feel inconsistent.
- A custom font has to remain legible and implement the accessibility behavior
  that system fonts receive automatically.
- Layout must adapt across text sizes. Important content stays primary; useful
  text should not disappear through avoidable truncation; meaningful glyphs grow
  with text; constrained inline layouts may need to reflow.
- Hierarchy must remain recognizable at enlarged text sizes.

Apple's current platform reference table lists these default/minimum sizes:

| Platform | Default | Minimum |
|---|---:|---:|
| iOS / iPadOS | 17pt | 11pt |
| macOS | 13pt | 10pt |
| tvOS | 29pt | 23pt |
| visionOS | 17pt | 12pt |
| watchOS | 16pt | 12pt |

These are native platform references, not a reason to force every dense web
metadata value to 17px. For GHOST, the actionable rule is role clarity,
legibility testing, adequate weight, Japanese glyph quality, and resilient text
scaling.

The page identifies San Francisco and New York as Apple system families and
directs app developers to use system APIs rather than embedding system fonts.
Therefore this study does **not** authorize bundling SF Pro/NY into the web app.

### 3. Materials

Apple's material guidance is semantically useful even though GHOST rejects the
visual material itself:

- A material separates foreground controls/text from background content and
  establishes functional hierarchy.
- Liquid Glass belongs to the control/navigation layer, not the content layer.
- It should be used sparingly; the clear variant is reserved for appropriate rich
  backgrounds.
- Materials and effects are chosen for semantic purpose and recommended usage,
  not because a sampled color happens to look attractive.
- Thicker/less transparent treatment can improve contrast; thinner treatment can
  preserve background context, but requires careful legibility testing.

GHOST translation: maintain the semantic separation with **solid** warm-white /
white / paper surfaces, champagne hairlines, precise inset rules, and restrained
opaque elevation. No blur or transparency is required to preserve the principle.

### 4. Layout

The official Layout page supports:

- Group related information through spacing, shapes, color, or separator lines.
- Give essential information enough space and de-emphasize secondary detail.
- Make controls visibly distinct from content.
- Use reading order, placement, and alignment to communicate relative priority
  and improve scanning.
- Use progressive disclosure when the full collection cannot fit, but preserve a
  clue that more content exists.
- Give controls sufficient surrounding space and group them logically.
- Adapt to viewport, orientation, input, text size, locale, and system context
  while keeping the experience recognizably consistent.
- Test extremes: devices, orientations, localizations, and text sizes.
- Respect safe areas and other platform display/interaction features.

Some guidance is platform-specific. For example, iOS advice about full-width
buttons and native window behavior cannot be copied into a desktop browser admin
surface without context. GHOST's frozen two-column geometry remains the product
constraint.

### 5. Accessibility

The Accessibility page frames an accessible interface as intuitive,
perceivable through more than one channel, and adaptable to the person's needs.
The current page also supports these measurable checks:

- Aim to support text/icon enlargement to at least 200% where applicable.
- Contrast reference: up to 17pt uses `4.5:1`; 18pt text or bold text uses `3:1`.
- Do not encode status by color alone; add a shape, glyph, label, or other cue.
- Describe interface and content for screen readers.
- Support alternate input including full keyboard access and assistive controls.
- Avoid unnecessarily timed UI and provide controls for media playback.
- Be cautious with fast motion and blinking; motion alternatives can tighten
  springs, track the person's gesture, or replace spatial movement with fades.
- Control size and spacing both matter. The page lists iOS/iPadOS default control
  size `44×44pt`, minimum `28×28pt`, and says roughly 12pt of surrounding padding
  often works well to reduce accidental activation.

For the web-based GHOST operator app, retain the stricter existing `44×44px`
primary target gate; do not reinterpret Apple's native minimum as permission to
shrink critical controls.

## GHOST adoption matrix

| HIG finding | GHOST translation | Decision |
|---|---|---|
| Purpose / simplicity | Keep core booking and floor operations immediately visible; remove decorative explanation | Adopt |
| Agency / recovery | Visible state, reversible paths, clear error recovery | Adopt |
| Familiarity / consistency | One control grammar, one icon family, stable placement | Adopt |
| Type hierarchy | Few explicit text roles, tested Japanese legibility, tabular figures, adequate weights | Adopt |
| Material hierarchy | Solid control/content/paper layers with hairline and opaque selected/pressed states | Adopt after no-glass translation |
| Alignment | Optical baseline and icon/text weight matching; table/figure columns remain scanable | Adopt |
| Responsive consistency | Preserve priority and workflow across frozen breakpoints | Adopt |
| Accessibility | Contrast, non-color cues, keyboard labels/focus, reduced motion, 44px targets | Adopt |
| Delight | Character through precision and responsiveness, never extra ornament | Adopt with restraint |

## Rejected elements

The following are explicitly unavailable to the GHOST implementation:

- Liquid Glass visual reproduction, including regular/clear variants.
- `backdrop-filter`, decorative blur, vibrancy, translucent floating layers,
  background luminosity tricks, or a glass content layer.
- Apple logos, developer brand marks, product images, screenshots, videos, SVGs,
  page copy, or signature Apple page compositions.
- Apple blue or Apple's web navigation/sign-in treatment as GHOST brand chrome.
- SF Symbols or copied Apple icons.
- Bundled or remotely hosted SF Pro, SF Compact, or New York based only on this
  research. Apple system font names may resolve on Apple devices only when the OS
  provides them; this study grants no font license.
- The HIG website's `12/15/18px` rounded shapes, 22px pill CTA, editorial cards,
  footer, or 740px article geometry as component recipes.
- Marketing-scale typography, cinematic whitespace, sticky storytelling, or
  scroll choreography in the dense operator workflow.
- Native-platform-specific guidance treated as universal web law without
  validating the operator context.

## What was not run

- Safari/WebKit and an actual iPhone/iPad/macOS runtime were not available in this
  lane; native SF font resolution, optical sizing, Dynamic Type, VoiceOver, Bold
  Text, Increase Contrast, and native Liquid Glass rendering are **not run**.
- No Apple native sample app or system control was instrumented. Computed values
  apply only to the Apple Developer Documentation website in Chrome.
- Dark-mode and forced high-contrast visual captures were not run. Media queries
  were recorded, but their alternate rendered states were not claimed as passed.
- The pages did not expose a representative disabled application control in the
  captured document state; disabled-state computed styling is not claimed.
- Programmatic focus did not reveal a focus-visible ring, and full keyboard
  traversal was not audited. GHOST's own keyboard/focus gate remains required.
- No Apple asset, font, or text was tested inside the GHOST application.

## Conclusion for implementation

The defensible Apple-quality translation is precision, not resemblance: a small
and explicit type system, restrained ink/surface ramps, exact separators, stable
pressed/selected/focus feedback, aligned figures and icons, concise labels,
recoverable actions, and accessible behavior. Liquid Glass, Apple type assets,
Apple icons, Apple blue, marketing scale, and rounded/pill web chrome do not cross
the boundary into GHOST.
