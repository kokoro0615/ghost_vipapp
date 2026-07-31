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
| L5 | **Planes separate by value + one hairline.** No glass, no backdrop-filter, no shadow stacks, no radius ≥12px, no coloured side tabs. | `OPERATIONS_PAPER.md` §3 |
| L6 | **Status = swatch glyph + word.** Colour is never the sole carrier and never a pill that reads as a button. | WCAG 1.4.1 + operator scanability |
| L7 | **Two columns ≥1024px, one below.** Chrome above the work area stays ≤108px desktop / ≤156px phone. | Measured regression fix; `OPERATIONS_PAPER.md` §2 |
| L8 | **No Tailwind, no CSS-in-JS, no component library, no animation library.** | §2.2 |
| L9 | **Operating window is 22:00–翌05:00 in 15-minute steps**, `翌` labelled explicitly. `event_days.sales_open_at` is a sales boundary and must not be used as the floor opening time. | `docs/research/vip-manager-operating-hours-2026-07-30.md` |
| L10 | **44px touch floor** for anything a hand touches, enforced at every audited viewport. | WCAG 2.2 2.5.8 + venue reality (iPad, dark room) |

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
- **`scripts/provision-basic-owner.mjs` runs pre-build** and
  **`scripts/fix-middleware-trace.mjs` runs post-build.** Both are part of
  `npm run build`. Removing either breaks Owner access or the middleware trace
  on Vercel.
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
  horizontal overflow.

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
| Type | `--t-micro` 11 · `--t-mini` 12 · `--t-body` 13 · `--t-data` 15 · `--t-lead` 18 · `--t-figure` 22 · `--t-display`; `--weight-body` 400 · `--weight-ui` 500 · `--weight-strong` 600 · `--weight-display` 700 | Six steps + one fluid; four explicit weight roles. **No size or raw weight outside the scale** |
| Space | `--s-1` 2 … `--s-10` 40 | 4px rhythm |
| Radius | `--r-chip` 2 · `--r-control` 3 · `--r-pane` 4 | Structural. Nothing larger exists |
| Elevation | `--lift-raised` `--lift-dialog` `--scrim` | Only for things that actually float |
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
10 states · 11 mobile shell(declared) · 12 responsive(enabled) · 13 disabled overrides
```

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

- **Breakpoint of record: 1023px.** It is shared by `VipFloorWorkspace.tsx`
  (`window.matchMedia("(max-width: 1023px)")`, three call sites) and the QA
  harness. **Change both together or the audit lies.**
- **≥1024px:** two columns — focal object + inspector
  (`--inspector-w: clamp(324px, 24vw, 388px)`, `48px` collapsed). Never three.
- **≤1023px:** one column; the inspector becomes a full sheet; counters become a
  52px filter strip; a five-item bottom nav carries 受付 / 一覧 / フロア / 時間軸 /
  メニュー.
- **Chrome budget:** masthead 60px + control bar 56px = 108px desktop, 156px
  phone. Adding a third full-width band is the exact regression this rebuild
  removed — do not reintroduce one.
- **One dominant focal object per viewport:** the ledger, the venue map, or the
  timeline. The queue occupies the right column only while nothing is selected,
  and is never a second copy of the ledger.
- Audited viewports: `1440×900 · 1366×768 · 1194×834 · 1024×768 · 768×1024 ·
  390×844 · 375×812 · 320×800` (Chromium) and `1194×834` (WebKit).

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

---

## 8. Enforcement gates

```bash
npm run ci   # lint · typecheck · unit+contract+PII · build · maintenance · a11y
```

| Gate | Pins |
|---|---|
| `tests/contract/operator-light-ui.test.mjs` | The design itself: OKLCH light tokens, no revived dark aliases, no hex, M PLUS 2 400/500/600/700 + explicit weight roles + tabular figures, six-step scale, two-zone wizard with all eight steps, Owner lane with no PIN field, two-column shell, hidden idle live region, full-colour floor plan with ≥52×44 nodes, chart rows filling height, no coloured side tabs, no `backdrop-filter`, no radius ≥12px |
| `npm run test:a11y` | Required-state and viewport counts come from `scripts/light-ui-qa-manifest.mjs`; the harness currently captures the 45 required states plus one date-unavailable fixture state per viewport. Gate: axe 0 · horizontal overflow 0 · controls <44px 0 · legacy purple 0 · console errors 0 · 5xx 0. Read counts from artifacts, never this prose. |
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
| **Build invariants** | The build loses `provision-basic-owner` → `next build --webpack` → `fix-middleware-trace` (or their order), the font loses `preload: false`, the middleware matcher stops excluding `_next/static` / `_next/image` / `media/` / `icon.svg`, or `body { overflow: hidden }` disappears |
| **1023px sync** | The workspace and the stylesheet disagree on the threshold, a second `matchMedia` width is introduced, or the audit stops bracketing it with 1024 and 768 |

### 8.2 Still unguarded (review discipline required)

| Rule | Status |
|---|---|
| Icon size set (§5.5) | **No test.** Converged 2026-07-31; two documented micro-glyph exceptions remain |
| Icons only on controls (§5.5) | **No test.** Review the diff for an icon on a `dt`, a list row or a heading |
| Drawn controls (§5.7b) | **No test.** A new `appearance`-less select or a `background:` shorthand on one regresses it silently |
| No explanatory subtitle / decorative eyebrow (§5.7c) | **No test.** This is the rule the surface drifts back toward first |
| Chrome budget ≤108px / ≤156px (§6) | Measured during the rebuild; **not asserted** |
| Stylesheet split guardrail (§5.2) | **No test.** A split that leaves the contract test reading the old path disarms the whole gate silently |
| Type scale adherence (§4.2) | Only hex is machine-checked; an off-scale `px` font-size still passes |

§9.2 is the control for these.

WebKit `1194×834` is part of the gate and needs system libraries
(`libwoff2dec`, `libenchant-2`, `libhyphen`, `libsecret-1`) that a bare Linux
container lacks. Report it as **not run**, never as passed.

---

## 9. Checklists

### 9.1 Pre-flight — before writing any UI code

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
- [ ] Every interactive target ≥44×44 at all nine audited viewports.
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
