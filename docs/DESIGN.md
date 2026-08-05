# GHOST VIP Manager — DESIGN.md

Canonical design, convention and tech-stack contract for
`https://ghost-vipapp.vercel.app/`.

**Read this file first.** It is the entry point for any session that touches
this app's UI. It owns the *locked decisions*, the *stack*, and the *authoring
rules*. The visual language itself — direction, layout diagrams, token
rationale — lives in [`docs/ui/OPERATIONS_PAPER.md`](./ui/OPERATIONS_PAPER.md)
and is not repeated here.

| Layer | Document |
|---|---|
| Locked decisions, stack, conventions, gates (**this file**) | `docs/DESIGN.md` |
| Visual language, layout, token rationale | `docs/ui/OPERATIONS_PAPER.md` |
| Measurement behind the type/palette decisions | `docs/ui/VIP_MANAGER_LIGHT_RESERVATION_RESEARCH.md` |
| Source-of-truth boundary and operating rules | `AGENTS.md` |
| Business scope | `docs/GHOST_VIP_MANAGER_SPEC.md` |

---

## 0. Scope and precedence

This document governs `src/app/**` and `src/components/admin/vip-floor-v2/**`
in this repository only. It does not govern the public GHOST website.

### 0.1 Precedence over the workspace-wide UI rule

`/home/kokoro/projects/.claude/rules/ui-ux-excellence.md` is an always-on rule
written for the **public marketing site**. Several of its concrete instructions
are *actively wrong* in this app. Where they conflict, **DESIGN.md wins**.

| Workspace rule says | Here | Why |
|---|---|---|
| Tailwind v4.3 `@theme` tokens | **Overridden** — CSS custom properties in `src/app/globals.css` | Tailwind is not installed and will not be added (§2.2) |
| Motion v12 / GSAP / Lenis / R3F ladder | **Overridden** — CSS transitions and `@keyframes` only | No animation runtime ships to an operator console (§7) |
| Distinctive display face + body face | **Overridden** — one family, M PLUS 2 | Measured decision; hierarchy comes from weight (§4.3) |
| Editorial asymmetry, one signature move, hero composition | **Overridden** — density, scanability, one focal object | This is a console, not a landing page |
| Dark-mode value stack | **Overridden** — light only, no toggle | Owner decision (§1) |

Everything else in that rule **still applies and is not weakened**: OKLCH
authoring with derived states, WCAG 2.2 AA, the 44px control floor,
`prefers-reduced-motion` with an authored fallback, tabular figures, reserved
space for media, compositor-only animated properties, the anti-slop blocklist
(no glass, no gradient orbs, no nested cards, no stock SaaS defaults), and the
rule that placeholder copy never ships.

`AGENTS.md` at the GHOST workspace root already records this as the
"VIP Manager light-surface exception". That exception does **not** extend to
any public `website` route.

### 0.2 Precedence inside this repo

`AGENTS.md` (source-of-truth boundary, destructive-action rules) outranks this
file on *behaviour and safety*. This file outranks everything on *presentation*.

---

## 1. Locked decisions

These are settled. Changing one requires the process in §10 — not a judgement
call inside a feature task.

| # | Decision | Locked because |
|---|---|---|
| L1 | **Light surface only.** Warm-white ground, pure-white working panes. No dark mode, no theme toggle, no `prefers-color-scheme` branch. `color-scheme: light` is declared in `:root`. | Owner decision, reconfirmed 2026-07-31 |
| L2 | **Graphite actions, single champagne accent.** No blue, no purple, no second accent. Champagne ≤8% of any screen and only means "you are here". | `OPERATIONS_PAPER.md` §3 |
| L3 | **One type family: M PLUS 2** (400/500/600/700). No monospace. No Inter / Roboto / Noto Sans JP / BIZ UDPGothic / Zen Kaku / Murecho. 600 carries UI hierarchy; 700 is display-only. | Owner-requested 2026-07-31 bake-off retained the only humane JP candidate with uniform digit advances and effective `tnum`; `docs/research/vip-manager-apple-type-surface-study-2026-07-31.md` |
| L4 | **Every figure is tabular** via `.tabular-nums`; Japanese spacing stays at the font default. | A ledger column must never reflow; built M PLUS 2 showed no effective `palt` delta on audited mixed labels |
| L5 | **Planes separate by value + one hairline**, plus a single contact shadow (`--lift-pane`) on things that genuinely float above scrolled content. No glass, no backdrop-filter, no shadow *stacks*, no radius ≥12px, no coloured side tabs. | `OPERATIONS_PAPER.md` §3; contact layer added 2026-08-01 (§4.7) |
| L6 | **Status = swatch glyph + word.** Colour is never the sole carrier and never a pill that reads as a button. | WCAG 1.4.1 + operator scanability |
| L7 | **Two columns ≥1024px; one column with an overlaid inspector 768–1023px; the phone shell only ≤767px.** Chrome above the work area stays ≤108px desktop / ≤156px phone. | Measured regression fix; `OPERATIONS_PAPER.md` §2; tier boundary corrected 2026-08-01 (§6) |
| L8 | **No Tailwind, no CSS-in-JS, no component library, no animation library.** | §2.2 |
| L9 | **Operating window is 22:00–翌05:00 in 15-minute steps**, `翌` labelled explicitly. `event_days.sales_open_at` is a sales boundary and must not be used as the floor opening time. | `docs/research/vip-manager-operating-hours-2026-07-30.md` |
| L10 | **44px touch floor** for anything a hand touches, enforced at every audited viewport. | WCAG 2.2 2.5.8 + venue reality (iPad, dark room) |
| L11 | **The target device is an iPad (8th generation, 2020) running Safari on iPadOS 18** — 10.2", 2160×1620 at 2x, i.e. **1080×810pt landscape / 810×1080pt portrait**, touch only, no hover, home button (so `env(safe-area-inset-*)` is 0). Both orientations lead the QA matrix and are audited **with touch emulation at 2x**. Desktop and phone shells remain as regression cover, not as design targets. | Owner decision 2026-08-01: the app is used on venue iPads only |

### 1.1 What L11 changes about how you read this file

Before 2026-08-01 no iPad viewport was audited at all: the matrix held 1194×834
and 1024×768, which are other iPads, and the harness drove every context as a
**mouse** browser. The consequence was not that gates failed — they passed — but
that the two defects that actually reach the operator were unobservable:

- **Landscape 1080pt** cleared the 1024px breakpoint and got the *most degraded
  desktop tier* (`max-width: 1279px`), a layout authored as a fallback from 1440.
- **Portrait 810pt** fell under the 1023px breakpoint and got the **phone shell**
  — a five-item bottom nav and a counter strip — on a 10.2" tablet. Rotating the
  device swapped the entire interaction model instead of reflowing one panel.

Treat "the gate is green" as necessary and not sufficient whenever a change is
about the device rather than about the markup.

---

## 2. Tech stack

### 2.1 Locked runtime and toolchain

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16.2.11**, App Router | `src/app/**` |
| Runtime | **React 19.2.4** / react-dom 19.2.4 | Server Components by default |
| Node | **>= 24** | `engines.node` |
| Language | **TypeScript ^5**, `strict`; alias `@/*` → `./src/*` | |
| Styling | **CSS Modules + CSS custom properties.** No preprocessor, no plugin. | `globals.css` tokens + `*.module.css` |
| Type | **`next/font/google` → `M_PLUS_2`** with `variable: "--font-operator"`, `display: "swap"`, `preload: false` | see §2.3 |
| Icons | **lucide-react 1.7.0** — the only icon source | §5.5 |
| Lint | eslint 9.39.5 + `eslint-config-next` core-web-vitals + typescript | `eslint.config.mjs` |
| QA | `playwright-core` + `axe-core`, Chromium + WebKit | `scripts/a11y-visual.mjs` |
| Deploy | Vercel, `framework: nextjs`; `noindex, nofollow, noarchive` on every path | `next.config.ts`, `vercel.json` |

### 2.2 Ban list — do not introduce

Tailwind or any utility-CSS framework · PostCSS/Sass/Less · styled-components /
Emotion / vanilla-extract / any CSS-in-JS · shadcn/ui, Radix, MUI, Chakra, Ant
· Motion (framer-motion) / GSAP / Lenis / Three / R3F · any charting library
(the timeline is authored CSS grid) · any second icon set · any web font other
than the one in §2.1 · any remote CSS or font fetched at runtime.

Rationale: this surface is ~2,700 lines of deliberate CSS carrying an audited
contrast and density model. Every item above either duplicates that model with
defaults the contract test forbids, or ships a runtime the console does not
need. Adding one is a §10 change, not a convenience.

### 2.3 Build invariants — do not "fix" these

These look like mistakes and are not:

- **`next build --webpack`.** The build is pinned to webpack. Do not switch to
  Turbopack for the production build.
- **`scripts/fix-middleware-trace.mjs` runs post-build.** It is part of
  `npm run build`; removing it breaks the middleware trace on Vercel. Owner
  access exchanges a verified Basic lane through the dedicated server-to-server
  session endpoint and never provisions or derives a secondary credential.
- **`preload: false` on the font.** Deliberate: the Hiragino-first fallback list
  is the fast path on the venue's iPads; preloading the webfont would cost the
  first paint it is supposed to protect.
- **`unoptimized` on the floor-plan images** (`FloorView.tsx`,
  `ReservationWizard.tsx`, asset `/media/images/vipmapv3.9239fd2174.webp`).
  A second encode destroys the plan's authentic black-violet and champagne. The
  contract test asserts both `unoptimized` and `filter: none`.
- **`middleware.ts` matcher excludes `_next/static`, `_next/image`, `media/`,
  `icon.svg`.** Widening it puts the Basic challenge in front of the floor plan.
- **`body { overflow: hidden }`** in `globals.css`. The workspace owns its own
  scroll regions; page-level scroll is a layout bug, and the QA harness fails on
  horizontal overflow. It is also *why* `--t-field` exists: with no page scroll,
  an iOS focus-zoom has no way back (§4.5).
- **`appleWebApp: { capable: true }`** in `layout.tsx`. In Safari the tab and
  address bars take roughly 84pt off a viewport that is only 810pt tall in
  landscape — about 12% of the work area, spent on browser chrome a
  single-purpose console never uses. Added to the Home Screen the app launches
  standalone and gets it back. The installed app has its **own cookie store**, so
  the Basic challenge is answered once more inside it; that is expected, not a
  regression.

---

## 3. Direction

**OPERATIONS PAPER** — a precision instrument printed on warm paper. The
reference class is a trading desk or broadcast control room, **not** SaaS admin.

Full direction, the seven rules, the layout diagrams, the wizard contract and
the floor/chart specifications: [`docs/ui/OPERATIONS_PAPER.md`](./ui/OPERATIONS_PAPER.md).

Do not restate or reinterpret the direction in a task. Read it, then build to
it.

---

## 4. Token contract

### 4.1 The only rule that matters

**Every colour, size, radius, duration and control height comes from a token in
`src/app/globals.css`.** A component stylesheet may compose tokens
(`color-mix`, `clamp`, `calc`) but may not introduce a raw value for any of
those properties.

The contract test enforces the hard edge: `VipFloorWorkspace.module.css` must
contain **zero** `#rrggbb` literals (measured: 0).

**One bounded exception exists, and it is deliberate.** The floor plan is a dark
black-violet drawing laid on the white desk, so paper tokens are invisible on
it. §6 of the stylesheet therefore carries a second, venue-matched palette
authored as raw `oklch()`. Measured: **41 raw values, 40 of them inside §6**
(13 at hue `318` — the GHOST venue black-violet — plus champagne-on-dark at hue
`76–82`). The single value outside §6 is a graphite shadow at L692.

Rules that follow, all now machine-enforced (§8):

- **The website's black-violet may not appear outside §6.** Any raw `oklch()` at
  hue `300–340` elsewhere fails the contract test. This is the guard that keeps
  the public site's purple direction out of the operator app.
- **No new raw colour outside §6** either: the count is ratcheted at 1, so a new
  raw value fails instead of quietly starting a second palette.
- Inside §6, do not add raw values — when you next edit the floor map, converge
  the existing ones into named `--floor-*` tokens so the venue palette is
  governed rather than ad hoc. Do not open a standalone refactor for it.
- This exception covers the floor-plan artwork only. It is not a licence for a
  dark surface, a dark mode, or a violet accent anywhere else (L1).

### 4.2 Token families

Defined in `globals.css`, documented with contrast ratios in
`OPERATIONS_PAPER.md` §4.

| Family | Tokens | Rule |
|---|---|---|
| Surface | `--paper` `--surface` `--surface-raised` `--surface-quiet` `--surface-sunken` `--surface-hover` `--surface-active` | Value separation only. `--paper` is the ground; `--surface` is exactly `oklch(1 0 0)` |
| Ink | `--ink` `--ink-2` `--ink-3` `--ink-inverse` | Three steps. Graphite, never pure black |
| Rules | `--rule` `--rule-strong` `--rule-control` | `--rule-control` is the 3:1 floor for control borders (WCAG 1.4.11) |
| Accent | `--accent` `--accent-ink` `--accent-line` `--accent-wash` | Champagne. `--accent-ink` is the only champagne allowed on text |
| Action | `--action` `--action-hover` `--action-press` `--action-text` `--focus` | Graphite fill |
| Status | `--alert` `--warn` `--live` + `-line` / `-wash` | Meaning only, always paired with a word (L6) |
| Type | `--t-micro` 11 · `--t-mini` 12 · `--t-body` 13 · `--t-field` **16** · `--t-data` 15 · `--t-lead` 18 · `--t-figure` 22 · `--t-display`; `--weight-body` 400 · `--weight-ui` 500 · `--weight-strong` 600 · `--weight-display` 700 | Six steps + one field step + one fluid; four explicit weight roles. **No size or raw weight outside the scale.** The six reading steps shift up one register on tablets (§4.5); `--t-field` never moves |
| Space | `--s-1` 2 … `--s-10` 40 | 4px rhythm |
| Radius | `--r-chip` 3 · `--r-control` 6 · `--r-pane` 8 | Structural. Nothing reaches 12 (§4.7) |
| Elevation | `--lift-pane` `--lift-raised` `--lift-dialog` `--scrim` | Only for things that actually float. `--lift-pane` is the one-layer contact shadow (§4.7) |
| Motion | `--ease-ui` `--ease-enter` `--ease-exit` · `--dur-fast` 110 · `--dur-ui` 160 · `--dur-panel` 220 | §7 |
| Metrics | `--h-control` 44 · `--h-control-sm` 44 · `--h-masthead` 60 · `--h-toolbar` 56 · `--h-row` 52 | Both control heights are 44 by design (L10) |

Legacy aliases (`--canvas`, `--champagne`, `--border`, `--danger`, `--success`,
`--warning`) exist so route-level shells resolve. **Do not add new aliases**, and
prefer the primary name in new code.

### 4.3 Type

One family; hierarchy from explicit weight roles (400/500/600/700), not size
inflation. Regular carries reading text, Medium carries quiet controls,
Semibold carries section titles/actions/data, and Bold is reserved for the
largest display copy. Loading 600 explicitly removes the prior browser weight
substitution that made Semibold selectors render as Bold. Figures use
`.tabular-nums`, which re-declares the family, turns on
`tabular-nums lining-nums`, and adds `0.005em` tracking.
The same numeric feature is inherited from `:root` so mixed runs such as
`VIP-1 7名` do not fall between prose and figure scopes.

The Apple/HIG research measured a narrow 400/600 vocabulary and ordinary labels
at normal tracking. GHOST therefore reduced `--track-caps` from `0.09em` to
`0.04em`. A built-font specimen measured zero width change between default
spacing and `palt` for the audited Japanese/mixed labels, so the global `palt`
declarations were removed instead of preserving a non-operative contract.
Content-sized masthead/toolbar labels retain the removed terminal advance as
quiet end inset. This does not widen the visible glyph spacing; it preserves the
frozen x-position of adjacent controls while the type texture becomes quieter.

Verification that must keep holding: `1111111111` and `0000000000` render at
identical width in the built app.

### 4.4 Two rules that exist because auditors caught them

- **Disabled never uses opacity.** A faded colour drops below 4.5:1. Disabled
  controls lose emphasis (`--surface-sunken` fill, `--ink-3` label) and keep a
  legible label.
- **Controls never transition their background.** A control that flips between
  disabled and enabled would expose a mid-transition frame reporting the wrong
  contrast pair. Colour and border may transition; background changes are
  instant.

### 4.5 `--t-field` is a device constraint, not a taste choice

**16px, and it is the one step in the scale that must never be lowered.**

Safari on iOS/iPadOS zooms the *layout viewport* when focus enters a text control
whose computed font-size is under 16px. This app sets `body { overflow: hidden }`
(§2.3), so that zoom leaves the operator in a panned board with no scroll
affordance to get back out of — from one tap into a search field, mid-service.

Measured before the fix, every text-entry control on the surface except the
login field was under the threshold: search 13, toolbar select 13, wizard fields
13, wizard date 15, ribbon 12 (11 on phones). All of them now resolve to
`--t-field`, and the a11y harness fails on any visible `input` / `select` /
`textarea` whose computed size is below 16 (§8).

`--t-field` is deliberately excluded from the tablet register shift in §4.5 —
it is already at the floor and has nowhere to go but wrong.

### 4.6 The reading scale steps up on tablets

`@media (min-width: 768px) and (max-width: 1439px)` in `globals.css` moves the
six reading steps up roughly one Apple register: 11→12, 12→13, 13→15, 15→17,
18→20, 22→26.

The desktop scale was tuned for a cursor at a desk. On the venue iPad a CSS pixel
*is* a point, which makes `--t-body: 13px` Apple's **Footnote** — three registers
under the 17pt iPadOS uses for body text. That single fact is most of why the
surface read as a shrunken desktop app rather than an iPad one.

**It costs no density.** `--h-row` is already 52px for the touch floor, and the
row's tallest stack (17px value over 13px caption at `--lh-ui`) still lands under
it. The ledger shows the same number of rows it did before the change.

Scoped by **width**, not by `pointer: coarse`: width is deterministic in the
audit, and this app ships to one device class. A laptop that happens to sit in
the range gets larger type, which is not a defect.

### 4.7 The 2026-08-01 texture pass — why the surface read as unfinished

Owner feedback: *「UIUXの質感が気に食わない」*, with SmartHR Design System named as
a reference and light surface to be kept.

The structure was not the problem. The problem was that a surface which
deliberately has **no shadows to fall back on** was also drawing its hairlines
too light and its corners too tight, so nothing held an edge. Measured against
SmartHR — the closest well-documented Japanese business-UI system, and one that
shares GHOST's warm off-white ground (`#f8f7f6` against `--paper` ≈ `#f5f4f2`):

| | GHOST before | SmartHR | GHOST now |
|---|---|---|---|
| Structural hairline | `oklch(0.92)` ≈ `#ebeae7` | `BORDER #d6d3d0` ≈ `oklch(0.868)` | `oklch(0.893)` |
| Header band | `oklch(0.952)` | `HEAD #edebe8` | `oklch(0.943)` |
| Control radius | 3px | `m` 6px | 6px |
| Pane radius | 4px | `l` 8px | 8px |
| Base elevation | none | `LAYER1 0 1px 2px` | `--lift-pane` |

Three decisions inside that table are GHOST's, not SmartHR's:

- **The hairline stops short of SmartHR's value.** This board carries far more
  rules per screen than a SmartHR form does — a ledger, a seat grid and a
  timeline all at once — and the full step reads as graph paper rather than as
  structure.
- **The contact shadow is information, not decoration.** It is applied only
  where something is genuinely sticky over scrolled content: the masthead, the
  toolbar, the ledger's sticky `th`, the timeline's tick row. A pane that does
  not move does not get one, and there is still no second layer anywhere.
- **No blue.** SmartHR's `MAIN #0077c7` is its brand, not ours. Graphite and one
  champagne accent are unchanged (L2).

What was explicitly *not* imported: SmartHR's component structure, its blue, its
`full` pill radius, and its shadow ladder. The direction is still OPERATIONS
PAPER; this pass raised its craft, it did not replace it.

---

## 5. Authoring conventions

### 5.1 Where code goes

```
src/app/                        route shell, globals.css, layout, error, loading
src/app/api/admin/vip-floor/    BFF adapters to the canonical website v2 API
src/components/admin/vip-floor-v2/
  VipFloorWorkspace.tsx         the shell: composes every view
  VipFloorWorkspace.module.css  the stylesheet (see §5.2)
  contract/                     statusModel · uiTypes · viewModel  (no JSX)
  state/                        reducer · useVipFloorWorkspace     (no JSX)
  shell/ list/ floor/ chart/ inspector/ operations/ commands/
  waitlist/ staff/ customers/ observability/ demo/
src/lib/                        server-only helpers, demo data plane
```

A new surface is a **directory with one component**, matching the existing
one-file-per-view shape. View state belongs in `state/reducer.ts`; derived
display shapes belong in `contract/viewModel.ts`. Components read, they do not
re-derive.

### 5.2 The stylesheet

There is **one** stylesheet for the workspace, organised into numbered sections:

```
1 primitives · 2 auth+maintenance · 3 workspace shell · 4 attention queue
5 ledger(List) · 6 floor map · 7 chart · 8 inspector · 9 dialog system
10 states · 11 mobile shell(declared) · 12 responsive(enabled)
12b pointer hover · 12c touch · 13 disabled overrides
```

§12b and §12c are **capability** tiers rather than width tiers: §12b holds every
`:hover` rule behind `hover: hover`, §12c holds the press states and hit areas
that exist because the device has no pointer (§6.1). They sit after §12 and
before §13 so that a width tier cannot silently outrank a capability one.

Rules:

- New styles join the **section they belong to**, keeping the numbered banner
  comments intact. Do not append to the bottom.
- §12 is where responsive behaviour is *enabled*; §11 only declares the mobile
  shell. §13 exists so disabled states outrank later component rules — leave it
  last.
- The reset in §1 uses `:where()` to stay at zero specificity so component
  colours always win. Do not raise its specificity.
- A co-located `Component.module.css` is allowed **only** for a surface that is
  self-contained and not part of the shell grid.
- **Split guardrail:** if this file passes ~3,000 lines, split it by section into
  `vip-floor-v2/styles/*.module.css` **in the same change** that updates the
  read list in `tests/contract/operator-light-ui.test.mjs`. A split that leaves
  the contract test reading a file that no longer holds the pinned rules
  silently disarms the whole gate.

### 5.3 Client boundary

Server Components are the default. `"use client"` is currently on the workspace
and every interactive view — it is required there and it is not a licence to
add more. `contract/` and `state/reducer.ts` stay framework-free and testable by
`node --test`.

### 5.4 Copy

- Operator-facing copy is **Japanese**. Identifiers, comments, file names,
  commit messages, test names are **English** (`.claude/rules/language.md`).
- Post-midnight times carry `翌` (L9).
- No placeholder copy, no lorem, no invented metrics — ever.
- Several Japanese strings are **accessible-name hooks the QA harness queries**
  (dialog `新規予約`; tabs `Walk-in` / `受付ブロック` / `事前予約`;
  `予約作成 N/8`; label `予約日`; group `予約卓`; button `次へ`; label
  `プラン`). Renaming one of these is a test change, not a copy change — update
  `scripts/a11y-visual.mjs` in the same commit.

### 5.5 Icons

lucide-react only, always `aria-hidden` when the control already has a text
label or `aria-label`. Icons never carry meaning alone (L6).

Sizes come from a fixed set tied to the type scale: **14 · 16 · 18 · 20**, plus
**24** for empty/error states. The set was converged on 2026-07-31; the only
remaining exceptions are two deliberate micro-glyphs inside fixed boxes too
small for 14 (the wizard step ruler's completed tick, the floor node's status
icon). Do not reintroduce an off-scale size elsewhere.

An icon appears **on a control or nowhere**. It does not decorate a list row, a
definition term, a section heading or a dialog title. The rule exists because
the opposite is what an interface looks like when nobody decided: nine rows of
`icon + label + value` read as nine equally important facts, which is exactly
what the inspector is not. Where an icon does appear, its metaphor must be the
control's actual job — a sort glyph on a density toggle is a defect, not a
detail.

### 5.6 Numbers, time and identifiers

Any element containing a figure — time, party size, table code, reservation
number, currency, version, counter — carries `.tabular-nums` (L4). Times render
in the operating-window vocabulary of §L9 and never in a native
`datetime-local`/24h-ambiguous picker: use the shared 15-minute selects in
`operations/BusinessTimeFields.tsx`.

### 5.7 Accessibility (non-negotiable)

WCAG 2.2 AA. Beyond the token contrasts: visible focus that sticky chrome never
covers; `aria-expanded` / `aria-controls` on every toggle; dialogs take focus,
`Escape` closes, focus returns; destructive confirmations open with the
**least-destructive** control focused; status announced through the live region,
which stays visually hidden while idle and costs zero pixels.

### 5.7b Controls are drawn, not defaulted

A stock `select` arrow, a stock tick box, a stock radio and a stock date button
are the only marks the browser puts on screen that the design does not own, and
they are the loudest remaining signal that a surface was assembled rather than
authored. Every one of them is redrawn from tokens in §1 of the stylesheet:
`appearance: none`, a token caret, a graphite tick, a graphite dot.

Two constraints that are easy to get wrong:

- **Fixed pixel marks inside the box, never percentages.** The box is a centred
  grid whose track is sized by its own child, so a percentage height has nothing
  to resolve against and silently collapses the tick to zero.
- **A later `background:` shorthand erases the caret.** Component rules that
  fill a select use `background-color`, not the shorthand.

The floor plan is the one thing on screen the app deliberately does not draw
(§2.3) — that is the venue's own artwork, and it is not a default.

### 5.7c The interface does not narrate itself

Operators read this board under time pressure in a dark room. Copy that
explains the interface competes with copy that reports the floor.

- **No explanatory subtitle under a label.** A menu row is `待機リスト`, not
  `待機リスト / 呼出と期限`. A form section is `配席`, not `配席 / 人数に合う
  受付可能卓だけを選択` — the fields already say what they collect, and the
  validation hint already says what is filtered. A qualifier survives only when
  it bounds a destructive or irreversible action (`デモ初期化 / 合成台帳のみ`) or
  discloses a capability nothing else on that surface states — the phone
  bottom-nav `受付 / 予約・Walk-in`, which `operations-adapter.test.mjs` pins.
- **No decorative eyebrow and no decorative sequence number.** `GHOST 実行
  コマンド` above a dialog already titled with its command, or an `01` where
  there is no `02`, is branding spent on chrome. An eyebrow survives only when
  it carries a fact the title does not — the SLO window (`直近60分`) or a data
  boundary (`OWNER · ENCRYPTED CUSTOMER`).
- **Section structure is a ruled label**, the way a printed intake sheet divides
  a form: small caps plus a hairline to the edge. Numbered `01 / 02 / 03` chips
  are a form generator's idea of structure.
- **A title is printed once.** Where a `fieldset` inside an already-titled
  dialog needs a group name, the `legend` is `sr-only`.

### 5.8 Destructive and financially adjacent actions

Explicit confirmation step · least-destructive initial focus ·
`expectedVersion` / idempotency · durable audit trail · typed recovery copy in
Japanese. Destructive actions use `--alert`, never the graphite primary. Demo
lane actions stay browser-local and never reach Production business or provider
endpoints (`AGENTS.md`).

---

## 6. Layout contract

**Three tiers, two breakpoints.** The 1023px line was previously doing two
unrelated jobs — "the inspector cannot be a persistent second column" and "this
is a phone, so replace the toolbar with a bottom nav" — and the venue iPad in
portrait (810pt) took both. They are now separate.

| Tier | Range | Shell |
|---|---|---|
| Desk / **iPad landscape (1080pt)** | ≥1024px | Two columns — focal object + persistent inspector (`--inspector-w: clamp(324px, 24vw, 388px)`, `48px` collapsed). Never three. |
| **iPad portrait (810pt)** | 768–1023px | One column at full width. The inspector and the queue **overlay from the trailing edge** (`min(420px, 54vw)`), the way a supplementary column behaves on iPadOS when a split view collapses. Dialogs stay dialogs. **The operator toolbar is kept**: view switcher, create, menu, masthead counters. |
| Phone | ≤767px | The phone shell: five-item bottom nav (受付 / 一覧 / フロア / 時間軸 / メニュー), 52px counter strip, full-bleed sheets and dialogs, toolbar stripped of its view switcher. |

- **Breakpoint of record: 1023px**, shared by `VipFloorWorkspace.tsx`
  (`window.matchMedia("(max-width: 1023px)")`, three call sites) and the QA
  harness. **Change both together or the audit lies.** In the TSX it means only
  *"the inspector is not persistent, so open it as an overlay"* — which is
  correct for iPad portrait as well as for phones, so the tier split above needed
  no TSX change.
- **The phone shell begins at 767px, not 1023px.** Reintroducing a bottom nav or
  a counter strip above 767px is the exact regression the 2026-08-01 pass
  removed: it puts phone idiom on a 10.2" tablet and makes rotation swap the
  interaction model rather than reflow one panel.
- **Chrome budget:** masthead 60px + control bar 56px = 108px desktop, 156px
  phone. Adding a third full-width band is the exact regression this rebuild
  removed — do not reintroduce one.
- **One dominant focal object per viewport:** the ledger, the venue map, or the
  timeline. The queue occupies the right column only while nothing is selected,
  and is never a second copy of the ledger.
- Audited viewports, device first: **`1080×810` and `810×1080` (Chromium, touch,
  2x)**, then `1440×900 · 1366×768 · 1194×834 · 1024×768 · 768×1024 · 390×844 ·
  375×812 · 320×800` (Chromium, pointer), and `1080×810` + `1194×834` (WebKit).
- **`1080×810` is the standalone height.** In Safari the tab and address bars
  take roughly 84pt off it, so the browser case is nearer `1080×726`. That case
  is not audited directly; the audited `1024×768` sits below it in height and
  narrower in width, which is the stricter test. Anything that depends on
  viewport height must use `dvh`, never `vh`.

---

## 6.1 Touch is the primary input

The board is pressed by a finger, not pointed at. Three consequences are now
contractual, and each replaced a browser default rather than inheriting it.

- **Hover belongs to cursors.** Every `:hover` rule lives in §12b of the
  stylesheet behind `@media (hover: hover) and (pointer: fine)`. Unguarded, a
  hover rule *latches on tap* on iPadOS and stays applied until the operator taps
  elsewhere — the board grows a second, false "current row". 31 rules were
  guarded on 2026-08-01; the count is not a target, the guard is.
- **Where hover carried information, touch gets an explicit equivalent.** The
  floor plan's node detail card was revealed only by `:hover`, i.e. it was
  unreachable on the venue device. Under `@media (hover: none)` it is revealed by
  **selection** instead — the thing the operator was going to do anyway.
- **Feedback is authored, because the default was removed.** `globals.css` clears
  `-webkit-tap-highlight-color` (iOS's grey flash reads as a rendering fault on
  2–3px controls) and sets `touch-action: manipulation` (removing the double-tap
  wait while keeping pinch-zoom). Having removed the browser's acknowledgement,
  §12c supplies a `:active` press state for every control whose only
  acknowledgement had been hover. Entering the press is instant
  (`transition-duration: 0s`); the release keeps the base transition.

**A pinned bar belongs to the dialog, not to the scrollport.** The operation
dialog's action bar was `position: sticky` *inside* the scrolling form, so form
controls passed underneath it — axe reports that as a partially obscured target
and an operator experiences it as a checkbox they cannot press. The body now
scrolls inside its own region and the footer is pinned by the flex column
instead. Anything that floats over a scroll region must either sit outside it or
be guaranteed never to cover an interactive element.

**A hit area is only real if a finger can land on it.** The ledger row is one
object and highlighted as one, but only the time cell was ever pressable — so on
touch the operator aimed at the middle of a 52px row and nothing happened. The
accessible control stays one button with one name; under `@media (hover: none)`
its hit area is stretched to the row it already stands for.

---

## 7. Motion contract

CSS only. Transitions and `@keyframes` in the stylesheet; no animation runtime
(§2.2), no JS-driven scroll effects, no layout animation library.

- Durations and easings come from tokens (§4.2). Nothing waits on a decorative
  animation.
- Animate `transform` and `opacity`. Do not animate `background` on controls
  (§4.4), and do not animate `filter`/blur at all.
- Motion means state change: entering a dialog or sheet, a table node acquiring
  a lock, a timeline beacon signalling an overdue seat. Idle decoration does not
  ship.
- `prefers-reduced-motion: reduce` collapses every duration to 1ms globally in
  `globals.css`. If a keyframe carries information (an alert pulse), give it a
  **static authored** reduced-motion state — never leave the information only in
  the movement.
- **Continuous animation pauses when the board is not on screen.** `ChartView`
  listens to `visibilitychange` and sets `data-motion="paused"`, which halts the
  timeline's phase signals via `animation-play-state`. The venue iPad runs all
  night; an infinite animation on a backgrounded tab is battery spent on nothing.
  The 10-second phase clock stops with it and resynchronises on return.

### 7.0b The timeline band, as of 2026-08-02

The band is the one place on this surface where an alarm is legitimate, so it is
also the place where the rules have to be written down rather than inferred.

**Two layers, two questions, no overlap.**

| Layer | Answers | Carried by |
|---|---|---|
| Service status (13) | *what kind of table is this* | the fill wash, the top rule's colour/weight/pattern, and the status word on the band |
| Time phase (7) | *how soon must someone move, and why* | the other three border sides, the action label, and whether they blink |

The fill is the layer that never moves. Text sits on it, so animating it would
make the label's contrast a function of the animation phase — the defect §7.1
records. Status keeps the **horizontal rule** it has always had; a coloured side
tab is banned here and `operator-light-ui.test.mjs` enforces it, so the top
border is the only edge status may claim.

Five tone washes and four rule patterns cannot separate thirteen statuses on
their own, and are not asked to: `arrived`/`seated` and `no_contact`/`no_show`
share a pair. **The status word on the band is the discriminator**, exactly as
L6 requires — colour is a grouping, never the identification.

**A narrowing band sheds content in a fixed order.** The band is a container,
and it gives things up in reverse order of what the floor can afford to lose:
the booking code at 240px (a tap opens the inspector for it), the status word at
200px, the cover count at 160px, the start time at 118px. Covers outrank the
status word because covers are never redundant, while the status often is: the
band drops the word entirely when the countdown already contains it, so 来店予定
never prints beside 予定 and 完了 never beside 完了 (§5.7c). The countdown is the
last thing standing, because it is why the band exists — do not "fix" a cramped
band by dropping the phase label instead. Below 200px the visible status signal
falls back to the tone wash and the top rule, a grouping rather than an
identification; the exact status is still in the accessible name, the inspector
and the ledger.

**The band grows with its lane.** §6 requires the eight rows to share the
chart's height, so on a tall viewport the lane grows underneath a fixed band: a
44px band measured 79% of the lane in landscape but only 49% in portrait, which
reads as pills scattered on white rather than as occupancy. `clamp(44px, 64%,
88px)` keeps the touch floor, fills the lane, and never becomes a slab.

**The alarm ladder.** Four time-critical phases use three signal tiers. Priority is
carried by waveform and amplitude, in the ladder clinical alarm systems use
(IEC 60601-1-8), because rhythm is the last thing to survive peripheral vision:

| Tier | Phase | Rhythm | Ring |
|---|---|---|---|
| `low` | 来店15分前 | one slow swell, 2.4s | 2px, champagne |
| `medium` | 延長確認（利用終了15分前） | double pulse, 1.8s | 2px, warn |
| `high` | 未着 / 解放超過 | hard square blink, 900ms | 3px + inner hairline, alert |

Every tier stays at or under ~1.1 flashes per second — roughly a third of the
WCAG 2.3.1 three-per-second threshold. What blinks is a ring drawn just inside
the band's own frame, and `opacity` is the only property it animates.

**Arrival and release are different exceptions.** A booking that passes its
start without an arrival is `arrival_overdue` (`未着N分`) and remains so even
after its booked end; it cannot become a table-release alert when nobody came.
`overdue` is reserved for a party that arrived but still occupies the table at
the release boundary (`解放超過N分`). At the exact start/end instant the label
says `到着確認` / `終了時刻` rather than claiming one minute has elapsed.

**Closing is an action, not a measurement.** The medium phase says
`延長確認 N分` and its accessible description asks the operator to confirm
extension. The release time is `expectedReleaseAt`, so a successful extension
returns the band to `接客中` until the new final fifteen minutes. Starting a
two-hour stay must use the check-in command: the generic service-status adapter
rejects `seated`, because only check-in records the actual time and advances the
release boundary to at least actual time + 120 minutes.

Phase transitions are exposed through one polite `role=status` region. It
announces only a phase-key change, never the 10-second clock tick or minute-by-
minute label, following WCAG 4.1.3 without turning the board into a chatty live
region. References: [W3C status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages),
[W3C three flashes](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes),
[Apple alerts](https://developer.apple.com/design/human-interface-guidelines/alerts).

The band presses with `scale`, not with a background: §6.1 removed the browser's
tap flash on purpose, and selecting a reservation was the one control on the
venue iPad that answered a finger with nothing at all. The shared
`--surface-active` press is unavailable here because that surface is the
service status.

Selection is drawn *around* the band — outline and an inset underline — and
never repaints the borders, or the two layers would lie for as long as a band
is selected.

**`resolved` is terminal for the table, not for the bill.** The backend releases
a seat assignment on `completed` and `no_show` only; a paid party is still
sitting there and can still advance to `resetting`. Muting a paid band to 完了
would hide an occupied table from the one view whose job is turnover, so `paid`
keeps its countdown and is treated as settlement — which is acknowledgement.

**A handled band goes quiet.** `TimelinePhase.acknowledged` is true once the
floor has answered the thing the band is shouting about: someone from the party
is in the room for the arrival window, settlement has started for the closing
and overtime windows, the delay has been recorded for a table sitting past its
start. The alarm stops; the phase, the tier and the countdown all stay. A band
that keeps blinking after it has been dealt with is how operators learn to
ignore blinking.

**The axis has to be true before the bands on it can be.** The ruler is built
from half-hour *intervals* labelled by their start, not from labelled points laid
out as equal columns — the latter put every label half a column out, up to
fourteen minutes at either end of this window, from the time it named. The track's rules are
derived from that same interval count (`--tick-count`), so a line always lands on
a label; the fixed 6.25% gradient it replaced drew one every 26.3 minutes and
corresponded to nothing. Hour rules outrank half-hour rules, the elapsed part of
the night carries a 4% wash because it cannot be acted on, and "now" is one line
with one cap whose clock reads in the ruler — inside the track it was clipped by
`overflow: hidden` and had never rendered at all.

**The release window is drawn only while the table is live** (`active`,
`closing_soon`, `overdue`). On a booking four hours out, or one already finished,
the last-fifteen marker is noise.

**The band counts down to the release time the floor is working to, not the one
that was booked.** A seat extension moves `expectedReleaseAt` and deliberately
leaves `scheduledEndAt` alone, so `ChartView` reads the raw board row. It also
reads the raw service status there, because the view model coerces null to
`expected` and the fill has thirteen states, not a silent fourteenth.

### 7.1 Motion is audited, as of 2026-08-01

Until this date **the harness set `reducedMotion: "reduce"` on every context**, so
the eight infinite animations on this surface — four timeline phase signals, the
floor plan's booth alert and seat breath, the owner-access pulse, the loading
pulse — had never once been rendered, screenshotted or checked for console
errors. The design turned out to be sound (every keyframe animates only
`opacity`/`transform`/`scale`, so it is compositor-work even on the venue's A12
Bionic), but "sound by inspection" is not the same as "checked".

The venue device now audits with motion **running**; every other viewport keeps
`reduce`. The first run of that gate immediately found a real defect: the loading
skeleton's label sat over bars whose opacity pulses, so its contrast was a
function of the animation phase — passing at the bright end and failing at 4.0:1
at the dim end. **If a label's backdrop animates, give the label its own opaque
ground.**

### 7.2 The boot screen, as of 2026-08-05

A cold load used to cross **four unrelated full-page layouts in about two
seconds**, and the operator reported the result as collapsed. They were right:

| Frame | What rendered | Why it read as broken |
|---|---|---|
| Route Suspense fallback | an empty `<main>` | the first paint was a blank page |
| `app/loading.tsx` | three static grey bars, centred | a skeleton of nothing that exists in this app; no motion, no identity |
| Owner session probe | the **entire OWNER ACCESS login frame** | 1180×706 two-column shell — display wordmark, floor-plan photograph, `align-content: center` right column holding four short lines and ~450px of white; `VIP Manager` / `を開いています` broke a Latin word from its Japanese particle; content-box padding ran it **64px past the venue iPad's 810 points** |
| Workspace | the ledger | — |

The defect was not the styling of any one frame. It was that a **sign-in page was
being built and thrown away as a progress indicator**.

**The rule: everything before the ledger renders one frame.**
`VipBootScreen` is that frame, and the route Suspense fallback, `app/loading.tsx`
and `auth.status === "checking"` all render it. It is server-safe, so the first
byte carries it, and it is deliberately small — mark, queue, one line — so
nothing has to collapse when the workspace replaces it. The OWNER ACCESS frame
now answers only the two states that need a form or a retry: the terminal lock
and a failed connection.

**The loader is the product's own loop, not a borrowed spinner.** Four records
sit on a ledger rule. The queue advances one slot at a time on `--ease-enter`,
and the record that reaches the head is lifted off the rule, carried back over
the queue in champagne, and filed at the tail. One cycle is 1760ms, so the
champagne moment occurs at ≈0.57 Hz — under a fifth of the WCAG 2.3.1 threshold
— and the accent window is narrower than the 25% that separates two slots, so
exactly one record is ever the accent.

Colour is never keyframed: an accent copy sits over each graphite dot and only
its opacity moves, which keeps the whole loop on `transform` and `opacity`.

Two things about this loader were only found by measuring it, and both are
worth keeping in mind for anything else on this surface:

- **Every record also carries its slot as a plain declaration.** Keyframes
  override it while the loop runs; it is what shows when the loop does not.
  Without it all four records sat on slot 0 and read as **one dot** — which is
  exactly what the QA gate captures, because it screenshots with animations
  disabled.
- **Reduced motion here is an authored still, not a slower loop.**
  `globals.css` clamps `animation-duration` to 1ms and `animation-iteration-count`
  to 1 under `reduce`, house-wide and with `!important`. An earlier revision
  tried to walk the accent at half speed; measured, it rendered as four grey
  dots with no accent at all. The still state is the loop's phase 0 — records on
  their slots, the head record champagne — and the status line carries the
  progress. **On this surface, no reduced-motion fallback may rely on an
  animation still running.**

---

---

## 8. Enforcement gates

```bash
npm run ci   # lint · typecheck · unit+contract+PII · build · maintenance · a11y
```

| Gate | Pins |
|---|---|
| `tests/contract/operator-light-ui.test.mjs` | The design itself: OKLCH light tokens, no revived dark aliases, no hex, M PLUS 2 400/500/600/700 + explicit weight roles + tabular figures, six-step scale, two-zone wizard with all eight steps, Basic-only access with no secondary credential field, two-column shell, hidden idle live region, full-colour floor plan with ≥52×44 nodes, chart rows filling height, no coloured side tabs, no `backdrop-filter`, no radius ≥12px |
| `npm run test:a11y` | Required-state and viewport counts come from `scripts/light-ui-qa-manifest.mjs`; the harness currently captures the 45 required states plus one date-unavailable fixture state per viewport. Gate: axe 0 · horizontal overflow 0 · controls <44px 0 · **text controls <16px 0** · legacy purple 0 · console errors 0 · 5xx 0. Viewports carrying `touch: true` are driven with `hasTouch`/`isMobile` at `deviceScaleFactor: 2`, so `hover`/`pointer` media resolve the way they do on the device. Read counts from artifacts, never this prose. |
| `tests/contract/source-of-truth-guard.test.mjs` | The legacy website admin surface is never treated as this app's UI |
| `tests/unit/inspector-accessibility.test.mjs`, `timeline-state`, `ghost-operating-hours`, `workspace-route-sync` | Focus order, timeline state model, the 22:00–翌05:00 window, URL/state sync |
| `npm run test:maintenance` | The maintenance anchor still renders |

If a change requires weakening an assertion in `operator-light-ui.test.mjs`,
that is a §10 change. Deleting an assertion to make a build green is a defect.

### 8.1 Guards added 2026-07-31

Four rules that used to rely on review discipline are now machine-enforced in
`operator-light-ui.test.mjs`, each verified to actually fail when violated:

| Guard | Fails when |
|---|---|
| **Website violet containment** | Raw `oklch()` at hue `300–340` appears outside §6; `prefers-color-scheme` appears at all; `color-scheme: light` is dropped. Also ratchets raw colour outside §6 at ≤1 |
| **Dependency ban** | Tailwind, PostCSS, Sass, CSS-in-JS, Motion/GSAP/Lenis, Three/R3F, Radix/MUI/Chakra/antd, a second icon set or a charting library enters `dependencies`/`devDependencies`, a `tailwind.config.*`/`postcss.config.*` appears, or `lucide-react` is removed |
| **Build invariants** | The build loses `next build --webpack` → `fix-middleware-trace` (or their order), the font loses `preload: false`, the middleware matcher stops excluding `_next/static` / `_next/image` / `media/` / `icon.svg`, or `body { overflow: hidden }` disappears |
| **1023px sync** | The workspace and the stylesheet disagree on the threshold, a second `matchMedia` width is introduced, or the audit stops bracketing it with 1024 and 768 |

### 8.1b Guards added 2026-08-01

| Guard | Fails when |
|---|---|
| **iOS zoom threshold** (`a11y-visual.mjs`) | Any visible `input`/`select`/`textarea` that is not a checkbox, radio or hidden computes a font-size below 16px, at any audited viewport (§4.5) |
| **Device matrix** (`tests/unit/light-ui-qa-manifest.test.mjs`) | `1080×810` or `810×1080` leaves the viewport list, or either loses `touch: true` / `scale: 2` / `motion: true` — i.e. the audit stops driving the venue device as a touch device, or stops running its animations |
| **Reduced-motion coverage** (same test) | Every viewport gains `motion: true`, leaving the authored static fallbacks unobserved |

### 8.1d Guards added 2026-08-05

Each verified to fail when violated before being kept.

| Guard | Fails when |
|---|---|
| **One pre-ledger frame** (`tests/contract/operator-light-ui.test.mjs`) | `app/loading.tsx` or `app/page.tsx` stops rendering `VipBootScreen`, the Suspense fallback goes back to an empty element, or `auth.status === "checking"` falls through to the OWNER ACCESS frame |
| **Boot screen stays server-safe** (same test) | `VipBootScreen` takes `"use client"` or a hook, or stops declaring four records |
| **Boot screen fits the device** (same test) | `.bootShell` loses `box-sizing: border-box`, which is what pushed the old login frame past 810 points |
| **Boot loop stays on the compositor** (same test) | A `bootQueue*` keyframe animates anything other than `transform` or `opacity` |
| **Records rest on their own slots** (same test) | A record loses its base `transform`, so the four dots collapse onto slot 0 whenever the animation is not running |
| **Reduced motion is a still** (same test) | The `reduce` block stops marking the head record statically, or reintroduces a looping fallback that the global 1ms clamp would silently kill |
| **Boot is audited** (`scripts/light-ui-qa-manifest.mjs`) | `boot` leaves the required QA states, so the screen would stop being rendered at every viewport |

### 8.1c Guards added 2026-08-02

Each verified to fail when violated before being kept.

| Guard | Fails when |
|---|---|
| **Band frame, not band fill** (`tests/contract/chart-live-state.test.mjs`) | A `timelineSignal*` keyframe animates anything other than `opacity`, a tier loses its rhythm, the acknowledged rule stops halting the animation, `data-motion="paused"` stops pausing it, or reduced motion loses a tier's authored still state |
| **Effective release time** (same test) | The band, its geometry or its conflict detection falls back to the booked `scheduledEndAt`, or the fill reads the view model's coerced service status instead of the raw board row |
| **Phase clock** (same test) | The 10-second local tick is loosened, so a 15-minute threshold could fire late |
| **Handled bands render** (`scripts/a11y-visual.mjs`) | The `chart-phases` fixture stops rendering an acknowledged band beside a blinking one in the same tier, or a band's `data-signal` disagrees with its phase |

### 8.2 Still unguarded (review discipline required)

| Rule | Status |
|---|---|
| Icon size set (§5.5) | **No test.** Converged 2026-07-31; two documented micro-glyph exceptions remain |
| Icons only on controls (§5.5) | **No test.** Review the diff for an icon on a `dt`, a list row or a heading |
| Drawn controls (§5.7b) | **No test.** A new `appearance`-less select or a `background:` shorthand on one regresses it silently |
| No explanatory subtitle / decorative eyebrow (§5.7c) | **No test.** This is the rule the surface drifts back toward first |
| Chrome budget ≤108px / ≤156px (§6) | Measured during the rebuild; **not asserted** |
| Stylesheet split guardrail (§5.2) | **No test.** A split that leaves the contract test reading the old path disarms the whole gate silently. **The file is now ~3,090 lines — past the ~3,000 line trigger.** The 2026-08-01 pass deliberately did not split it: doing so mid-change would have moved every pinned rule in the same commit that rewrote the responsive tiers, which is exactly the condition under which a disarmed gate goes unnoticed. This is owed work, and it is the next structural task on this file |
| Touch: hover stays in §12b (§6.1) | **No test.** A new unguarded `:hover` outside §12b latches on tap on the venue iPad and the audit will not fail — hover state is not something the harness asserts on |
| Touch: press feedback exists (§6.1) | **No test.** `-webkit-tap-highlight-color` is cleared globally, so a control added without an `:active` state has *no* acknowledgement on the device |
| Type scale adherence (§4.2) | Only hex is machine-checked; an off-scale `px` font-size still passes |

§9.2 is the control for these.

WebKit `1194×834` is part of the gate and needs system libraries
(`libwoff2dec`, `libenchant-2`, `libhyphen`, `libsecret-1`) that a bare Linux
container lacks. Report it as **not run**, never as passed.

---

## 9. Checklists

### 9.1 Pre-flight — before writing any UI code

0. **Know the device.** Everything below is judged at 1080×810 and 810×1080 with
   touch, not at 1440×900 with a mouse (L11).
1. Read this file, then `docs/ui/OPERATIONS_PAPER.md`.
2. Confirm the checkout matches the Production commit recorded in
   `../../docs/AI_CURRENT_STATUS.md` (`AGENTS.md` §Production source of truth).
3. Name the **one focal object** the change serves, and which existing view owns
   it. If the answer is "a new panel", stop — the chrome budget (§6) is the
   binding constraint, not screen area.
4. Locate the tokens you will use. If none fits, decide whether you genuinely
   need a new token (§10) or are about to invent an off-scale value.
5. Identify which of the QA states in `scripts/light-ui-qa-manifest.mjs` the
   change touches, and whether it adds one.

### 9.2 Self-check — before reporting done

- [ ] Zero raw colour / size / duration literals; everything resolves to a token.
- [ ] Every figure carries `.tabular-nums`.
- [ ] Status carries a glyph **and** a word; colour is never the only signal.
- [ ] Every interactive target ≥44×44 at every audited viewport.
- [ ] **Checked on the device first:** `1080×810` and `810×1080` before any
      desktop viewport. Rotation reflows one panel; it does not change the shell.
- [ ] **Every text control ≥16px** (`--t-field`); no new `input`/`select`/
      `textarea` font-size outside it (§4.5).
- [ ] **No `:hover` outside §12b**, and anything hover revealed has a touch
      equivalent; every new control has an `:active` state (§6.1).
- [ ] Focus visible, never covered by sticky chrome; dialog focus enters, `Escape`
      closes, focus returns; destructive confirmations focus the safe control.
- [ ] No horizontal overflow at 320px; no page-level scroll.
- [ ] `prefers-reduced-motion` has an authored static state wherever motion
      carried meaning.
- [ ] Chrome above the work area still ≤108px desktop / ≤156px phone; still two
      columns ≥1024px.
- [ ] No glass, gradient, nested card, coloured side tab, pill-as-status, or
      radius ≥12px entered the diff.
- [ ] Japanese operator copy, English identifiers; no placeholder content; any
      renamed accessible-name hook updated in the harness too (§5.4).
- [ ] `npm run ci` run, with WebKit reported honestly if it could not launch.
- [ ] Report to the user: 結論 → 変更点 → ゲート結果(合否) → 残課題.

---

## 10. Changing a locked decision

A locked decision (§1), a banned dependency (§2.2), a build invariant (§2.3), or
an assertion in `operator-light-ui.test.mjs` changes only like this:

1. **Owner decision on the record** — in `docs/AI_CURRENT_STATUS.md`, naming the
   decision. Silence is not approval, and a feature ticket is not a mandate.
2. **Evidence, not preference.** The palette and typeface were decided by
   measurement (research §4–5). Replacements are held to the same bar.
3. **Update in one change:** this file, `OPERATIONS_PAPER.md` if the visual
   language moved, the contract test, and the QA harness.
4. **Re-run the full gate** and record the result in `docs/AI_WORK_LOG.md`.

Anything short of that is drift, and drift is what produced the surface this
design replaced.
