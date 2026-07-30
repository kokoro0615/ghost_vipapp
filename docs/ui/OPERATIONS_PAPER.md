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

### Operating-time contract

The floor timeline and every explicit operator clock choice use the business
date's fixed `22:00–翌05:00` service window in 15-minute increments. Post-midnight
values are labelled `翌` so the rollover is never implicit. `event_days.sales_open_at`
is a broader sales/admin-day boundary and must not be used as the floor opening
time. VIP Manager normalizes that distinction without mutating the canonical
event-day row. See
`docs/research/vip-manager-operating-hours-2026-07-30.md`.

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
5. **Every figure is tabular** so a column never reflows — carried by the text
   family's tabular numerals, never by a monospace face.
6. **One dominant focal object per viewport**: the ledger, the venue map, or
   the timeline.
7. **The idle state costs no pixels.** The live region is visually hidden until
   there is something to say.

### Owner access — Basic credentials, no PIN screen

The Production Owner lane uses the outer username/password challenge as its
only visible sign-in task. After those credentials pass, the server exchanges
them for the existing short-lived Owner admin session; the browser never shows
or submits an Owner PIN.

- While that exchange runs, the warm-white threshold shows only GHOST identity,
  the real 1F floor geometry and a compact authentication status.
- Failure stays fail-closed and offers one **再接続** action. It does not fall
  back to a PIN field or disclose authentication detail.
- Tablet and phone remove the floor-plan pane and keep brand, state and recovery
  within a single scroll-free reading path.
- The isolated synthetic-data demo lane retains its own demo PIN and cannot
  enter the Production Owner lane.
- Graphite carries actions; champagne is limited to rules and orientation
  labels. There are no glass, gradient, floating-card or generic SaaS surfaces.

---

## 4. Tokens

### Surface stack (value separation)

```
--paper           oklch(0.958 0.0035 85)   application ground
--surface         oklch(1 0 0)             working pane
--surface-quiet   oklch(0.981 0.0025 85)   zebra rows, inset blocks
--surface-sunken  oklch(0.944 0.004 85)    pane headers, rails
--surface-hover / --surface-active         interaction states
```

The ground sits a clear step below pure white so a working pane reads as paper
laid on a desk. The first light ramp put `--paper` at `0.968` against a `1.0`
pane — a 1.6% step that read as one flat field, which is why no pane looked like
the focal object. Every step stays warm white; none of them is grey.

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

One Japanese-first family: **M PLUS 2** (400/500/700) for Japanese, Latin and
every figure. Hierarchy comes from weight, not from size inflation.
`display: swap`, `preload: false`, with next/font's metrics-matched fallback in
front of a Hiragino-first system stack.

The previous pairing was IBM Plex Sans JP + **IBM Plex Mono for every figure**.
That mono was the single largest reason the board read as a generated developer
dashboard: `22:30`, `GHO-0726-01`, `VIP-1`, `v4` in an IDE face turn a
reservation ledger into a log viewer. Mono is retired. The figure role stays a
distinct register through weight, `tabular-nums` and tracking — how printed
timetables do it — and one family also removes the seam in mixed runs like `4名`
or `¥120,000`, where the digit and the counter used to come from two fonts.

The replacement was chosen by measurement, not taste: M PLUS 2 was the only
humane Japanese candidate with **uniform digit advances and an effective `tnum`**.
Zen Kaku Gothic New/Antique, Murecho and BIZ UDPGothic have no tabular figures at
all (15–19.5px drift across a ten-digit string), so a ledger column would jitter;
BIZ UDPGothic also ships only 400/700. Full matrix and method:
`docs/ui/VIP_MANAGER_LIGHT_RESERVATION_RESEARCH.md` §4.

`palt` is enabled on `body` for Japanese prose but switched **off** inside
`.tabular-nums`, because proportional spacing would undo the tabular advance the
ledger depends on. Verified in the built app: `1111111111` and `0000000000`
render at identical width.

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

### 新規予約 dialog — two zones, never three

The 事前予約 wizard keeps all eight steps (日付 / 時刻 / 人数 / 卓 / 顧客 / 追加 /
担当 / 確認), their order, and their save behaviour. Only the presentation is
authored here.

```
┌──────────────────────────────────────────────────────────┐
│ 新規予約                                              [×] │
│ Walk-in │ 受付ブロック │ 事前予約                          │
├──────────────────────────────────────────────────────────┤
│ 日時・席 4/8 ／ 卓        ← phase, position, step name    │
│ ▁▁1 ▁▁2 ▁▁3 ▁▁4   ▁▁5 ▁▁6 ▁▁7   ▁▁8   ← one ruler       │
├──────────────────────────────────────────────────────────┤
│ 日付 2026-07-31 │ 時刻 22:00–00:00 │ 人数 2名 │ 卓 VIP-1  │
├───────────────────────────────────────┬──────────────────┤
│ THE ACTIVE STEP (dominant)            │ この予約の控え    │
│ + the venue plan on the 卓 step       │ 顧客/担当/通知/版 │
├───────────────────────────────────────┴──────────────────┤
│ ← 戻る            次は 顧客                      次へ →   │
└──────────────────────────────────────────────────────────┘
```

- **Two zones.** Three co-equal columns left the active step on ~47% of the
  dialog, so the thing to act on was not the dominant object. 確認 (step 8) drops
  the rail entirely and the review takes the full width.
- **The summary bar is permanent** at every width, phones included. It is what
  replaced the old left context column, and it is why nothing needs
  `display: none` below 1024px any more — the aside becomes a block in the scroll
  flow instead of being deleted.
- **No standing pre-save checklist.** The old rail showed 席選択「未選択」in warn
  colour from step 1, before a table could be chosen, and データ境界 permanently in
  warn colour although it is a neutral fact. Warn colour that never resolves
  teaches operators to ignore warn colour. Validation now sits with the field it
  concerns.
- **Progress ruler.** Eight segments, phase-grouped by whitespace into 日時・席
  (1–4) / 顧客・詳細 (5–7) / 確認 (8). Completed / current / upcoming differ by
  glyph, weight and fill — never colour alone — and each carries `aria-current`
  plus a spoken state, so all eight steps stay individually recognisable. On
  phones the ruler keeps its eight marks and the step's name is carried by the
  phase line.
- **The plan is an instrument on the 卓 step only**, inline in the active pane, in
  its true colour (`filter: none`, `unoptimized`), with an open champagne bracket
  at the selected table's real `geometry.xPercent/yPercent`. It is a bracket and
  not a label because the plan artwork already prints every table number — an
  overlay of codes double-labelled all eight tables. The old wizard map was
  `invert(1) grayscale(1)`, i.e. the colour venue drawing reduced to an
  illegible grey line at ~293px, and it never marked the selection.
- **確認 reviews everything that gets saved**: 営業日, 時刻, 人数, 卓 (+定員), 顧客,
  入口表示名, 経路 / 状態, 担当, 通知, 現場メモ, 版. It previously showed four of them.
- The footer keeps 戻る / position / 次へ・保存 in the same place on every step and
  at every width, so the primary action never moves.

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
