# VIP Manager — type and accent bake-off, 2026-08-16

Evidence for the two locked decisions this pass changed: **L3 (one type family:
M PLUS 2)** and **L2 (single champagne accent)**. Both were opened by the Owner
after the complaint that the surface "looks bad and reads as AI-generated", with
the additional instruction to make the ground white.

Everything below is measured, not asserted. Method and raw numbers are here so
the next person can disagree with the conclusion on the same evidence.

---

## 0. What was actually wrong

Captured the shipped surface first — the venue device contract, iPad 1080×810 at
2x, 52 states — and read it before changing anything. Six findings, ordered by
how much of the "generated" texture each one carried:

| # | Finding | Evidence |
|---|---|---|
| 1 | **No optical tracking anywhere.** Every size ran at the font's default spacing, which is drawn for text at reading size. | No negative `letter-spacing` existed in the token layer; the only tracking token was `--track-caps: 0.04em`, positive. |
| 2 | **Weight carried hierarchy.** 400/500/600/700 with 600 on controls and section titles meant most labels on screen were semibold or bolder. | `--weight-strong: 600` was consumed at 71 sites in the workspace stylesheet. |
| 3 | **The ground was warm beige, not white.** | `--paper: oklch(0.968 0.0035 85)` → `#f5f4f2`. |
| 4 | **The accent failed its own contrast floor.** | `--accent: oklch(0.605 0.078 76)` → `#9d7b4a`, **3.91:1** on white, under the 4.5:1 body-text floor. A separate `--accent-ink` existed only to work around this. |
| 5 | **Four separation systems competed** — value steps, hairlines, contact shadows and coloured washes. | `--lift-pane` was applied to two static bands that already carried hairlines. |
| 6 | **An unbounded duration counter.** | The chart printed `未着28952分` — twenty days, stated in minutes. |

Findings 1, 2 and 3 are the ones a viewer reads as "AI-generated": default
spacing, everything bold, and a surface colour nobody chose.

---

## 1. Reference systems

Read against three published light-surface product systems, via
`styles.refero.design` (Clean SaaS / premium SaaS) and their own material:

| System | Ground → pane | Type | Elevation |
|---|---|---|---|
| **Stripe** | `#ffffff` canvas, `#f8fafd` banding, `#e5edf5` borders | Sohne-var, **weight 300 even at 56px**; tracking −0.12px @12px → −1.4px @56px | *"Avoids shadows entirely — depth is created through background tint progression"* |
| **Anthropic** | `#f0eee6` canvas, `#faf9f5` cards | 400/600 vocabulary, tracking −0.05 to −0.24px | *"Don't use box-shadow for elevation — this system elevates through surface tone and 1px borders only"* |
| **Linear** | dark, but the discipline transfers | Inter var at **510/590**, not 400/700; tracking −0.011em body, −0.022em display | 0.5px hairlines "instead of shadows for surface separation" |

Three independent systems, one shared method: **hierarchy from size, tracking
and ink — not from weight; separation from tone and a hairline — not from
shadow.** That is the opposite of what this surface was doing on both counts.

---

## 2. Type bake-off

### 2.1 Digit advance uniformity — the hard constraint

L4 requires that a ledger column never reflows when a digit changes. Measured at
100px em in headless Chromium: width of `1111111111` minus width of
`0000000000`, first at the font default, then with `font-variant-numeric:
tabular-nums`.

| Family | Default spread | With `tnum` | Digit advance | Verdict |
|---|---|---|---|---|
| M PLUS 2 *(incumbent)* | 0.00px | 0.00px | 63.30 | uniform by default |
| M PLUS 1 | 0.00px | 0.00px | 63.30 | uniform by default |
| IBM Plex Sans JP | 0.00px | 0.00px | 63.00 | uniform by default |
| **Noto Sans JP** | 0.00px | 0.00px | 55.50 | uniform by default |
| Zen Kaku Gothic New | −121.00px | −121.00px | 50.40 | **no tabular figures** |
| BIZ UDPGothic | −129.87px | −129.87px | 75.98 | **no tabular figures** |
| Murecho | −100.00px | −100.00px | 58.30 | **no tabular figures** |
| Inter Tight | −222.66px | **0.00px** | 57.81 | `tnum` effective |
| Geist | −324.00px | **0.00px** | 67.20 | `tnum` effective |
| **Instrument Sans** | −299.30px | **0.00px** | 67.95 | `tnum` effective |
| Public Sans | −199.09px | **0.00px** | 60.61 | `tnum` effective |

**This corrects the 2026-07-31 bake-off's central claim.** That pass concluded
M PLUS 2 was "the only humane Japanese candidate with uniform digit advances and
an effective `tnum`". It measured the *default* spread only. Every Latin
candidate here is proportional by default and **fully tabular under `tnum`** —
which the surface already declares at `:root`. Noto Sans JP is also uniform by
default; its exclusion in L3 was a taste judgement ("too generic"), not a
metrics one, and the older document did not say so.

### 2.2 Glyph proportions — the pairing constraint

A Latin/Japanese pairing only works if the Latin does not visibly step down
next to kanji in a mixed run such as `4名` or `11名`. Line boxes cannot show
this, so glyph **ink boxes** were measured by rendering to canvas at 200px and
scanning the painted pixels.

Noto Sans JP reference: `名` ink height **185**, its own digit `4` height **141**.

| Family | x-height | cap | x/cap | digit height | digit ink width | Δ digit vs JP digit |
|---|---|---|---|---|---|---|
| **Instrument Sans** | 101 | 143 | 0.706 | 147 | 98 | **+4.3%** |
| Onest | 105 | 141 | 0.745 | 144 | 101 | +2.1% |
| Inter Tight | 108 | 145 | 0.745 | 149 | 98 | +5.7% |
| Wix Madefor Text | 98 | 142 | 0.690 | 149 | 97 | +5.7% |
| Host Grotesk | 90 | 130 | 0.692 | 134 | 83 | **−5.0%** |
| M PLUS 2 *(incumbent)* | 103 | 144 | 0.715 | 149 | **113** | +5.7% |
| Noto Sans JP *(the JP face)* | 108 | 146 | 0.740 | 146 | 92 | +3.5% |

Noto Sans JP measured against itself gives **+3.5%** (its `8` against its `4`),
so that is the zero point, not 0%. Distance from it:

- **Instrument Sans — 0.8pt** ← adopted
- Onest — 1.4pt
- Inter Tight — 2.2pt
- Wix Madefor Text — 2.2pt
- **Host Grotesk — 8.5pt** ← rejected

**Host Grotesk read best in isolation and lost on measurement.** It was the most
refined Latin of the set on its own specimen; beside Noto Sans JP its digits sit
8.5 points short and its x-height is 17% smaller, so `4名` steps down mid-word.
This is the single result that would not have been reached by looking.

**Inter Tight matches even more closely on x-height (108 vs 108) and was still
not chosen.** It is the most recognisable machine-generated typeface on the web,
and "reads as AI-generated" is the complaint this pass exists to answer.
Shipping it would have been technically defensible and tone-deaf.

**M PLUS 2's digits carry 113 units of ink width against Noto Sans JP's 92 —
23% more.** That is most of why the ledger read as loose and inflated: the
column that dominates the surface was set in the widest figures of the set.

### 2.3 Adopted

**Instrument Sans (Latin, figures) + Noto Sans JP (Japanese)**, both as variable
fonts so hierarchy can use in-between weights (460 / 560) instead of jumping
400 → 600 → 700.

Re-verified in the built app: `1111111111` and `0000000000` render at identical
width.

---

## 3. Accent bake-off

Contrast measured by painting each candidate to a canvas and reading the sRGB
pixel — Chromium reports `oklch()` back as `oklch()`, so computed style cannot
be parsed as rgb, and a naive probe silently produces nonsense.

| Candidate | sRGB | on white | on sunken band | Text 4.5:1 |
|---|---|---|---|---|
| **champagne — the shipped `--accent`** | `#9d7b4a` | **3.91** | 3.53 | **FAIL** |
| champagne, deepened | `#8a600a` | 5.59 | 5.04 | pass |
| brass, saturated | `#9c6a00` | 4.69 | 4.23 | pass |
| violet `oklch(0.50 0.18 300)` | `#7541b8` | 6.55 | 5.91 | pass |
| violet `oklch(0.44 0.19 305)` | `#6c25a4` | 8.61 | 7.77 | pass |
| violet `oklch(0.42 0.20 310)` | `#6e119b` | 9.47 | 8.55 | pass |
| indigo, Stripe-like | `#4339e0` | 7.24 | 6.53 | pass |
| graphite `--action` | `#23201d` | 16.21 | 14.62 | pass |

Champagne is a **material**, not a colour: it needs dark lacquer behind it to
read as metal. On paper it is a brown, and at the shipped value it did not clear
the body-text floor — which is why a second `--accent-ink` token existed at all.

Both surviving directions were then rendered into a real ledger and compared.
Brass reads as a highlighter band on the selected row; violet reads as a mark.
The violet is also the venue's other real signal — the LED — so it is brand-true
rather than a neutral substitution.

### 3.1 The risk, stated plainly

Violet on white is the single most recognisable machine-generated look. Adopting
it to fix "reads as AI-generated" is only defensible under discipline:

- deep and magenta-leaning (hue ~305), not the blue-violet ~275 of generated dashboards;
- **only** ink, a 2–3px edge, a hairline, or a ≤7% wash — never a fill, gradient, glow or surface;
- **every action stays graphite.** Nothing the operator presses is violet.

The third point is the one that actually separates the two looks, and it is
guarded: `tests/contract/operator-light-ui.test.mjs` fails if
`background: var(--accent)` appears on anything that is not a pseudo-element.

### 3.2 Shipped, re-measured at the exact values

`scripts/verify-palette-contrast.mjs` measures every token on all four grounds:

| Token | sRGB | white pane | desk | sunken band | quiet row | floor |
|---|---|---|---|---|---|---|
| `--ink` | `#18191c` | 17.58 | 16.43 | 15.86 | 17.00 | 4.5 |
| `--ink-2` | `#505155` | 7.93 | 7.41 | 7.15 | 7.66 | 4.5 |
| `--ink-3` | `#68696c` | 5.49 | 5.13 | 4.95 | 5.31 | 4.5 |
| `--accent` | `#7530ae` | 7.53 | 7.03 | 6.79 | 7.28 | 4.5 |
| `--accent-ink` | `#6b139e` | 9.49 | 8.87 | 8.57 | 9.18 | 4.5 |
| `--action` | `#1f2024` | 16.27 | 15.21 | 14.69 | 15.74 | 4.5 |
| `--alert` | `#b72121` | 6.46 | 6.03 | 5.83 | 6.24 | 4.5 |
| `--warn` | `#955609` | 5.81 | 5.43 | 5.24 | 5.62 | 4.5 |
| `--live` | `#186b45` | 6.51 | 6.08 | 5.87 | 6.29 | 4.5 |
| `--rule-control` | `#898b8e` | 3.42 | 3.19 | 3.08 | 3.30 | 3.0 |
| `--accent-line` | `#9751d7` | 4.69 | 4.39 | 4.24 | 4.54 | 3.0 |
| `--rule` | `#e1e2e4` | 1.30 | 1.21 | 1.17 | 1.25 | — |
| `--rule-strong` | `#c8c9cb` | 1.66 | 1.55 | 1.50 | 1.60 | — |

The accent moved from **3.91:1 (failing)** to **7.53:1**.

`--rule` and `--rule-strong` carry no floor on purpose. WCAG 1.4.11 governs
boundaries that *identify a control* and graphics required to understand
content; a row divider is a decorative separator, and forcing it to 3:1 draws a
grid rather than structure. The boundary that does identify controls,
`--rule-control`, clears 3:1 on every ground.

---

## 4. What changed, and what did not

**Changed:** `--paper` white and neutral; the accent; both type families; a full
optical tracking scale; weight roles down one step; elevation restricted to
sticky content; the business-date control; the elapsed-duration formatter.

**Not changed:** any API route, server module, database migration, contract,
Stripe or Resend path, authentication, cookie, feature flag, or Production
deployment. `--t-field` stays at 16px (L-device constraint). Tabular figures
stay the ledger invariant (L4). The 44px touch floor stays (L10). The venue iPad
stays the design target (L11). The floor plan keeps the venue's black-violet,
contained to section 6 of the stylesheet.

---

## 5. Method notes, including the mistakes

Recorded because each one produced a wrong answer first:

1. **A specimen that silently fell back to serif.** The stack was injected as an
   inline custom property containing double quotes, which broke the attribute,
   which invalidated `font-family`, which fell to the browser default. The first
   comparison rendered every candidate identically. The harness now asserts the
   resolved `font-family` before screenshotting.
2. **The same failure then shipped into the app.** next/font's variables were
   set on `<body>` while `--font-ui` is composed in `:root`, so the built app
   ran in serif for one build. There is now a contract guard for it.
3. **Contrast parsed from `getComputedStyle`.** Chromium returns `oklch()`
   unchanged, so the regex read the OKLCH components as RGB and reported
   champagne at 19:1. All figures here come from painted pixels.
4. **Line boxes mistaken for glyph metrics.** `getBoundingClientRect` on a
   `<span>` returns the line box, which is identical for every font at the same
   `font-size`. The pairing question is only answerable from ink boxes.
5. **A claim that outran its evidence.** The native date control rendered
   `07/26/2026`, and this was first written up as "the console prints US dates".
   That is the *headless browser's* en-US locale; a Japanese-locale iPad renders
   `2026/07/26`. The defensible version — the format follows the device rather
   than the document, on a console where a re-imaged device would silently
   change it — is what the code comment now says.

---

## 6. Reproducing

```
node scripts/verify-palette-contrast.mjs      # every token on every ground
npm run test:unit                             # duration formatter, timeline phases
npm run test:contract                         # token, type, accent, calendar, elevation guards
npm run test:a11y                             # 53 states across the QA viewport matrix
```

The font measurement harnesses were run from a scratch directory and are not
committed; §2.1 and §2.2 record the method precisely enough to rebuild them.
