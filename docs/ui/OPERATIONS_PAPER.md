# GHOST VIP Manager — "OPERATIONS PAPER" design system

Owner-approved light operator surface for `ghost-vipapp.vercel.app`.
This document is the source of truth for the operator UI. Tokens live in
`src/app/globals.css`; the surface lives in
`src/components/admin/vip-floor-v2/VipFloorWorkspace.module.css`.

---

## 1. Design read

Reading this as: **a night-shift floor operations console** for GHOST Osaka VIP
staff working 22:00–05:00 under time pressure, on a laptop and an iPad, in a
dark venue.

The reference class is **not** SaaS admin. It is the trading desk / broadcast
control room: paper-white ground, hairline rules, tabular figures, one strict
accent, status carried by position and word rather than decoration.

Committed direction: **OPERATIONS PAPER** — a precision instrument printed on
warm paper.

---

## 2. Root cause of the previous surface

The previous stylesheet was a **renamed dark-lacquer theme**, not a light
design. It declared `--lacquer-0/1/2/3`, `--metal`, `--ivory`, `--muted`,
`--line` and remapped those dark-theme names onto light values. Every rule had
been authored for a black surface, where a 1px hairline is the only way to
separate planes. Re-pointed at white, that produced:

| Symptom | Cause |
|---|---|
| Nothing reads as foreground | No elevation model — every plane separated by an identical 1px rule |
| Arbitrary sizes (9–25px, 17 distinct steps) | No type scale; each component picked its own size |
| **259px of chrome above the work area** | Four stacked full-width bands: masthead 64 + KPI 96 + toolbar 66 + status 33 |
| The focal view was the smallest region | 320px queue rail + 320px inspector pinned to both edges |
| The same reservations listed three times | Exception rail + Floor task rail + the view itself |
| Status chips read as buttons | Outlined pills with icons in a cell |
| Inspector ended in ~400px of white | Actions stranded at the viewport bottom |

Measured before → after (dense 14-reservation board):

| Viewport | Chrome above content | Work area height |
|---|---|---|
| 1440×900 | 259 → **108** | 641 → **792** |
| 1366×768 | 259 → **108** | 509 → **660** |
| 1194×834 | 259 → **108** | 575 → **726** |
| 390×844 | 240 → **156** | 540 → **629** |

---

## 3. Rules of the direction

1. **Planes separate by value plus one hairline.** No shadow clouds, no blur,
   no glass. Elevation exists only for things that float (dialogs, the floor
   plan sheet, table nodes).
2. **Exactly one accent.** Champagne means "you are here" — the selected row,
   the selected table, the current filter, the now-line. Nothing else.
3. **Status is a swatch glyph plus a word**, never a pill that reads as a
   button. Colour is never the only carrier.
4. **Emphasis is horizontal.** Selection is a bottom rule; alert is a tinted
   row. No coloured side tabs (an Owner decision this rebuild preserves).
5. **Every figure is mono and tabular** so a column never reflows.
6. **One dominant focal object per viewport**: the ledger, the venue map, or
   the timeline.
7. **The idle state costs no pixels.** The live region is visually hidden until
   there is something to say.

---

## 4. Tokens

### Surface stack (value separation)

```
--paper           oklch(0.968 0.0025 85)   application ground
--surface         oklch(1 0 0)             working pane
--surface-quiet   oklch(0.984 0.002 85)    zebra rows, inset blocks
--surface-sunken  oklch(0.955 0.003 85)    pane headers, rails
--surface-hover / --surface-active         interaction states
```

### Ink (all verified against WCAG 2.2 AA)

| Token | Value | vs white | vs sunken |
|---|---|---|---|
| `--ink` | `oklch(0.215 0.006 70)` | 17.5:1 | 15.4:1 |
| `--ink-2` | `oklch(0.435 0.006 70)` | 7.9:1 | 7.0:1 |
| `--ink-3` | `oklch(0.52 0.005 70)` | 5.5:1 | 4.8:1 |

### Accent and action — graphite, never blue

| Token | Value | vs white |
|---|---|---|
| `--accent` (champagne, marks/lines) | `oklch(0.605 0.078 76)` | 3.9:1 |
| `--accent-ink` (champagne text) | `oklch(0.442 0.062 72)` | 7.8:1 |
| `--action` (primary fill) | `oklch(0.245 0.007 70)` | 16.2:1 with `--action-text` |
| `--rule-control` (control borders, 1.4.11) | `oklch(0.635 0.005 82)` | 3.4:1 |

### Status — meaning only, each paired with a word

| Token | Value | vs white |
|---|---|---|
| `--alert` | `oklch(0.487 0.176 27)` | 7.0:1 |
| `--warn` | `oklch(0.492 0.104 66)` | 6.4:1 |
| `--live` | `oklch(0.452 0.096 158)` | 7.0:1 |

### Type

Pairing: **IBM Plex Sans JP** (400/500/700) for Japanese and Latin, **IBM Plex
Mono** (500/600) for every figure. Hierarchy comes from weight, not from size
inflation. Both are `display: swap` with a metrics-compatible JP fallback.

Six-step scale: `--t-micro 11 · --t-mini 12 · --t-body 13 · --t-data 15 ·
--t-lead 18 · --t-figure 22` plus a fluid `--t-display`.

### Geometry, spacing, motion

Spacing on a 4px rhythm (`--s-1`…`--s-10`). Radius stays structural:
`--r-chip 2 · --r-control 3 · --r-pane 4`. Motion is `--dur-fast 110ms /
--dur-ui 160ms / --dur-panel 220ms` on `--ease-ui` and `--ease-enter`;
`prefers-reduced-motion` collapses every duration.

**Controls never fade their fill.** A background transition on a control that
can flip between disabled and enabled leaves a mid-transition frame that
reports the wrong contrast pair to auditing tools. Colour and border may
transition; background changes are instant.

**Disabled never uses opacity.** A faded colour drops below 4.5:1. Disabled
controls lose their emphasis (`--surface-sunken` fill, `--ink-3` label) and
keep a legible label.

---

## 5. Layout

### ≥1024px — two columns, never three

```
┌──────────────────────────────────────────────┬─────────────────┐
│ MASTHEAD 60px                                                  │
│ GHOST OSAKA · VIP MANAGER │ 営業日 │ 営業枠 │ counters │ sync │ operator │
├──────────────────────────────────────────────┼─────────────────┤
│ CONTROL BAR 56px                             │ INSPECTOR       │
│ [新規受付] [一覧|フロア|時間軸] search filter │ or QUEUE        │
├──────────────────────────────────────────────┤ 324–388px       │
│                                              │                 │
│         THE ONE FOCAL OBJECT                 │ identity        │
│         ledger · venue map · timeline        │ actions         │
│                                              │ tabs + detail   │
└──────────────────────────────────────────────┴─────────────────┘
```

The four elements the Owner requires are all present without stacking:

- **summary** → live counters inline in the masthead
- **work views** → the focal object
- **queue** → the right column while nothing is selected; the counters are
  filter buttons, so the ledger itself becomes the queue on demand
- **inspector** → the right column once something is selected

The queue is never a second copy of the ledger. That duplication was the
original collapse.

Walk-in取消はInspectorの店頭予約だけに現れる危険操作とし、理由入力と影響確認を
分離する。確認画面では「戻る」を初期focusにし、取消実行はgraphiteの通常action
ではなく`--alert`で区別する。取消は割当席を解放するが物理削除ではなく、元記録・
version・監査履歴を残す。返金ケースと顧客通知はこの導線から作らない。

卓回転はfocus identity直下の単一graphite actionで扱う。会計済みかつ配席中だけ
`退店・席を開放`を表示し、完了後は同卓の次予約へ選択を移して同じ位置を
`次のお客様をチェックイン`へ置き換える。これは2つの明確な業務段階であり、
各段階は1タップ、56px高、説明付きとする。汎用check-inを同時に重複表示せず、
予約がない空席では次客操作を推測表示しない。

### ≤1023px

Single column. The inspector becomes a full sheet, the counters become a 52px
filter strip, and a five-item bottom nav carries 受付 / 一覧 / フロア / 時間軸 /
メニュー. The `1023px` threshold is shared by the workspace (`matchMedia`) and
the QA harness — change both together.

### Floor plan

The plan shrink-wraps the asset (1672×940) so table geometry lands on the room,
and it sits on `--paper` as a drawing laid on the desk. Table nodes occupy
their real coordinate from `geometry.xPercent/yPercent`. The source WebP keeps
its authentic black-violet and champagne colour and bypasses a second image
encode. Because Production footprints are only 4.15–4.7% of the plan, the
interactive node expands to at least 52×44px around that coordinate instead of
clipping its label inside the raw footprint. Below 1024px the plan holds a
legible 700px width and the canvas pans rather than shrinking the room to
illegibility.

### Chart

The chart header stays 32px and each official `VIP-1` through `VIP-8` row keeps
a 56px floor. When the viewport is taller, the rows share the available height
equally; when it is shorter, they retain the floor and the chart scrolls. This
keeps `VIP-8` attached to the exception ledger instead of leaving a dead band
below the final table.

---

## 6. Gates this surface must keep passing

```
npm run ci     # lint · typecheck · unit+contract+PII · build · maintenance · a11y
```

`npm run test:a11y` audits **44 states × 9 viewports** and asserts zero axe
violations, zero horizontal overflow, zero controls under 44×44, zero legacy
purple chrome, zero console errors and zero 5xx.

Design intent is pinned by `tests/contract/operator-light-ui.test.mjs`, which
fails if the surface regresses to a renamed dark theme, loses the OKLCH
authoring, loses tabular figures, restacks the chrome, or reintroduces
glassmorphism or coloured side tabs.

WebKit 1194×834 is part of the gate but needs system libraries
(`libwoff2dec`, `libenchant-2`, …) that a bare Linux container lacks.
