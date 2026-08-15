# GHOST VIP Manager — "OPERATIONS PAPER" design system

Owner-approved light operator surface for `ghost-vipapp.vercel.app`.
This document is the source of truth for the **visual language**. The locked
decisions, tech stack and authoring conventions live one level up in
[`docs/DESIGN.md`](../DESIGN.md) — read that first. Tokens live in
`src/app/globals.css`; the surface lives in
`src/components/admin/vip-floor-v2/VipFloorWorkspace.module.css`.

---

## 1. Design read

Reading this as: **a night-shift floor operations console** for GHOST Osaka VIP
staff working 22:00–05:00 under time pressure, on a laptop and an iPad, in a
dark venue.

The reference class is **not** SaaS admin. It is the trading desk / broadcast
control room: white ground, hairline rules, tabular figures, one strict accent,
status carried by position and word rather than decoration.

Committed direction: **OPERATIONS PAPER** — a precision instrument printed on
white.

*(The direction was "printed on warm paper" until 2026-08-16. The warmth was a
defensible idea that did not survive contact with the surface: at hue 85 it put
a yellow cast under every white pane, under the accent and under the attention
washes, and read as unwashed rather than warm. The instrument is the same; the
paper is now actually paper-white.)*

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

1. **Planes separate by value plus one hairline**, plus a single contact shadow
   (`--lift-pane`) where something genuinely floats over scrolled content — the
   masthead, the toolbar, a sticky table head, the timeline's tick row. No
   shadow clouds, no blur, no glass, and never a second layer. Elevation is a
   statement about z-order, not a decoration (`DESIGN.md` §4.7).
2. **Exactly one accent.** Violet means "you are here" — the selected row,
   the selected table, the current filter. Nothing else. **"Now" is not one of
   them**: the timeline's now-line, its cap and its clock are graphite, because
   now is structure rather than status, and because the accent is also the
   arrival frame — an accent now-line competed with the very bands standing
   closest to it (2026-08-02).
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
8. **Nothing on screen is a browser default.** Selects, tick boxes and radios
   are drawn from tokens (`DESIGN.md` §5.7b). The venue's floor artwork is the
   one thing the app deliberately does not draw.
9. **The interface does not narrate itself.** No subtitle under a label, no
   eyebrow that repeats the title, no `01` without an `02` (`DESIGN.md` §5.7c).

10. **This is an iPad, and it is held.** The board is designed at 1080×810 and
    810×1080 with a finger, not at 1440×900 with a mouse (`DESIGN.md` L11).
    Rotation reflows one panel; it never swaps the shell. Type is sized for a
    10.2" panel at arm's length in a dark room, where a CSS pixel is a point.

11. **Nothing depends on a pointer that is not there.** Hover is a cursor
    affordance and lives behind a capability guard; anything hover revealed has a
    touch equivalent; every control acknowledges its own press, because the
    browser's tap flash was removed on purpose (`DESIGN.md` §6.1).

12. **An alarm that cannot be answered is noise, and an alarm that surrounds the
    content is decoration.** The chart is the one place that may raise one, and
    it raises a *light standing on the minute that is running out* — head for
    arrivals, tail for releases — never a ring around the band. Three tiers
    say how soon rather than merely that something is wrong; no tier ever goes
    dark, so the state is readable in every frame; and the motion stops the
    moment the floor answers it, leaving the light, the state and the countdown
    exactly where they were (`DESIGN.md` §7.0b).

13. **An alarm must be legible in the shape it takes, not only in its colour,
    and it must be where the eye can reach it.** A signal drawn in the same
    geometry as the surface it sits on is camouflage — a vertical line on a
    chart of vertical rules read as a gridline. And a signal that can scroll off
    screen while its row stays on screen has not been raised at all. So the
    exception is *worded* in the sticky lane label, which never scrolls, and
    *pinned* on the track with a wedge, which no rule can imitate. The worded
    plate never animates; the text-free pin carries the pulse (`DESIGN.md`
    §7.0c).

14. **A roster is a list, not a layout.** Anything that can grow past about five
    entries — promoters, staff, plans — is one control with a native picker, not
    one rendered control per entry. Eleven promoters as radio rows were 584px
    inside an 810px screen and pushed the save receipt off the bottom of the
    dialog (`DESIGN.md` §5.7d).

15. **The floor's words, not the schema's.** `席割当`, `卓割当` and `未割当` are
    column names wearing a label's clothes. The surface says `卓を決める`,
    `使う卓`, `卓未定`, and the time view is `チャート`. When a label comes
    straight from the data model, assume it is wrong until someone on the floor
    has said it out loud.

### The 2026-08-02 timeline pass — what the band was not saying

The original six phases and their signals had shipped, but the venue read the chart from
across the room and could not act on it. Four causes, each fixed by moving
information rather than adding effects:

| Symptom | Cause | Now |
|---|---|---|
| Nothing appeared to blink | The motion was an inner 4px sliver at 0.18→0.9 opacity, and the overdue signal peaked at 0.22 | A ring on the band's own frame: 2px, 3px at the top tier, hard on/off |
| Every urgency looked alike | One rhythm per phase, all soft pulses of similar amplitude | A three-tier ladder — slow swell, double pulse, square blink — so the rhythm names the priority |
| Thirteen statuses read as five | The phase owned the fill; status got a 3px top border and one stripe | Status owns the fill wash and the top rule; the phase owns the other three sides and the blink |
| Handled tables kept shouting | The band was a pure function of the clock | Answering the band — arriving, recording the delay, starting settlement — stops the motion and keeps the state |
| The axis under the bands was not true | The ruler laid N labels out as N equal columns, and the track drew a fixed 6.25% gradient | Half-hour intervals labelled by their start, and a grid derived from the same count — a line now lands on a label instead of every 26.3 minutes |
| "Now" read as a beaded chain | The cap was drawn on all eight rows, and its clock sat at `top: -26px` inside the track's `overflow: hidden` | One line, one cap, and the clock reads in the ruler where nothing clips it |
| Bands floated in white on the venue iPad | A fixed 44px band in a lane the row contract makes grow — 79% of the lane in landscape but 49% in portrait | The band grows with its lane, `clamp(44px, 64%, 88px)`, never below the touch floor and never a slab |
| A tapped band answered with nothing | `.timelineBar` was absent from the §12c press states, and the browser's tap flash is removed on purpose | It presses the way a floor node does, with `scale` — the shared background press is unavailable because that surface is the status |
| The idle exception rail cost 140–200px | Three panels each saying 対象なし, under the one view whose rows must share the leftover height | The counts stay on one line; the empty bodies collapse (rule 7) |
| The band never said how many people | Status and code shared one string; covers were nowhere | Status, covers and code are separate elements, shed in that reverse order as the band narrows |
| Every band advertised its last fifteen minutes | The release window was drawn on all original phases | Drawn only while the table is live; on a booking four hours out it was noise |

The band also counted down to the wrong time. A seat extension moves
`expectedReleaseAt` and leaves the booked `scheduledEndAt` alone, and the chart
was reading the booked one — so an extended table raised its last-fifteen alarm
while it was still legitimately occupied. The band, its geometry and its
conflict detection now all read the release time the floor is working to.

### The 2026-08-02 timer hardening — what the phase meant operationally

The clock updated, but its vocabulary still merged different jobs. `overdue`
meant both a guest who had not arrived and a table that had not been released;
after the booked end, a never-arrived reservation even switched to a release
alert. The final-fifteen label said only `残りN分`, so it measured time without
naming the extension decision the floor needed to make.

The seven-phase contract now keeps `未着` separate from `解放超過`, retains
`未着` until a no-show/terminal record is made, and calls the final window
`延長確認 N分`. Exact boundaries say `到着確認` / `終了時刻` instead of rounding
zero elapsed seconds up to one minute. Extending `expectedReleaseAt` returns the
band to `接客中`; starting the two-hour clock uses check-in only, because the
generic `seated` status path does not move the release boundary. Phase changes
are announced once through a polite status region, while per-minute countdowns
stay silent to avoid alarm chatter.

### The 2026-07-31 refinement — what made it read as generated

The structure was already right; the surface still read as machine-assembled.
Six habits caused it, and the fix in each case was to remove something:

| Symptom | Cause | Now |
|---|---|---|
| The inspector read as nine equal facts | An icon and a hairline on every `dt` row | Three bands — 時間/人数/席, then identity, then the record trailer — separated by one rule, no icons |
| Six commands read as six tiles | Centred `icon + label` in a 2×3 grid | Left-aligned on a shared icon column: a menu an operator scans |
| Every list row carried helper copy | `title + subtitle` on menu items, form sections, staff rows | Label only, except where a qualifier bounds a destructive action |
| SLO was a KPI dashboard | Seven metrics on an auto-fit tile grid, with a dead eighth cell | A ruled readout: one aligned figure column, comparable at a glance |
| The form looked generated | `01 / 02 / 03` chips, stock select arrows, stock tick boxes | Ruled section marks; every control drawn from tokens |
| A short board looked broken | The pane's white ran to the bottom of the viewport | The sheet ends after the last row and the desk shows below it |

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
- Graphite carries actions; the accent is limited to rules and orientation
  labels. There are no glass, gradient, floating-card or generic SaaS surfaces.

---

## 4. Tokens

### Surface stack (value separation)

```
--paper           oklch(0.977 0.0018 268)  application ground (#f7f7f8)
--surface         oklch(1 0 0)             working pane
--surface-quiet   oklch(0.988 0.0012 268)  zebra rows, inset blocks
--surface-sunken  oklch(0.9655 0.0022 268) pane headers, rails, toolbar
--surface-hover / --surface-active         interaction states
```

The ground is white with a single 2.3% value step below the panes, so a pane
still reads as something laid on a desk rather than as a hole cut in it. That
step is comparable to Stripe's `#f8fafd` against `#ffffff`; like Stripe, the
edge is carried by the hairline rather than by the value alone.

Hue 268 at chroma ≤0.0025 is neutral to the eye with the faintest cool cast,
which keeps the graphite ink from reading brown. This is not a blue-grey SaaS
surface — the chroma is an order of magnitude below what would read as blue —
but it is deliberately no longer warm.

`--rule` sits at `oklch(0.912 0.0025 268)`, one step darker than the beige era
needed: with the elevation budget cut to almost nothing (`DESIGN.md` §4.9),
hairlines now carry most of the plane separation on their own.

### Ink (all verified against WCAG 2.2 AA)

| Token | Value | vs white | vs sunken |
|---|---|---|---|
| `--ink` | `oklch(0.215 0.006 268)` | 17.6:1 | 15.9:1 |
| `--ink-2` | `oklch(0.435 0.006 268)` | 7.9:1 | 7.2:1 |
| `--ink-3` | `oklch(0.52 0.005 268)` | 5.5:1 | 5.0:1 |

Lightness is carried over unchanged from the audited warm ramp — those values
were contrast-verified — and only the hue moved to neutral. Every ratio improved
slightly because the ground beneath them got lighter. Re-measured by
`scripts/verify-palette-contrast.mjs`, which paints each token and reads the
sRGB pixel; parsing `getComputedStyle` does not work here, because Chromium
returns `oklch()` unchanged and a naive probe reports nonsense.

### Accent and action — graphite acts, violet marks

| Token | Value | vs white |
|---|---|---|
| `--accent` (marks, edges) | `oklch(0.47 0.19 305)` | 7.5:1 |
| `--accent-ink` (text, icons) | `oklch(0.42 0.20 308)` | 9.5:1 |
| `--accent-line` (rules, focus ring) | `oklch(0.58 0.20 305)` | 4.7:1 |
| `--action` (primary fill) | `oklch(0.245 0.007 268)` | 16.3:1 with `--action-text` |
| `--rule-control` (control borders, 1.4.11) | `oklch(0.635 0.005 268)` | 3.4:1 |

The accent was champagne until 2026-08-16 and it did not clear its own floor:
`oklch(0.605 0.078 76)` is `#9d7b4a` at **3.91:1** on white, under the 4.5:1
body-text minimum. `--accent-ink` existed as a workaround for exactly that.
Champagne is a *material* — it needs dark lacquer behind it to become metal —
and on paper it is a brown.

The violet is the venue's other real signal, the LED, so this is a translation
rather than a substitution. **It is only ever ink, a 2–3px edge, a hairline or a
≤7% wash. Every action stays graphite; nothing the operator presses is violet.**
That last rule is what separates this from the generic purple-on-white
dashboard, and it is machine-enforced (`DESIGN.md` §4.8).

### Status — meaning only, each paired with a word

| Token | Value | vs white |
|---|---|---|
| `--alert` | `oklch(0.505 0.185 27)` | 6.5:1 |
| `--warn` | `oklch(0.515 0.115 62)` | 5.8:1 |
| `--live` | `oklch(0.47 0.10 158)` | 6.5:1 |

### Type

**Two faces, one voice.** **Instrument Sans** carries Latin and every figure;
**Noto Sans JP** carries Japanese. Both load as variable fonts through
`next/font`, `display: swap`, `preload: false`, in front of a Hiragino-first
system stack.

The ledger is dominated by Latin and figures — `VIP-1`, `22:30`, `GHO-0726-01`,
`¥120,000` — so the Latin face carries most of the surface's texture and the
Japanese labels support it. The pairing was chosen by measuring glyph **ink
boxes**, not line boxes: line boxes are identical for every font at the same
`font-size` and cannot answer the only question that matters here, which is
whether the Latin steps down next to kanji in a run like `4名`.

Against Noto Sans JP's own digit height: **Instrument Sans +0.8pt** (adopted),
Onest 1.4pt, Inter Tight 2.2pt, **Host Grotesk 8.5pt** (rejected). Host Grotesk
read best in isolation and lost on measurement — its x-height is 17% smaller
than the Japanese face's. Inter Tight matched most closely on x-height and was
rejected as the most recognisable machine-generated typeface on the web, which
is the complaint the pass existed to answer.

**M PLUS 2 is retired.** It was adopted on 2026-07-31 as "the only humane
Japanese candidate with uniform digit advances and an effective `tnum`". That
conclusion measured the *default* digit spread only; re-measured, every Latin
candidate is proportional by default and **fully tabular under `tnum`**, which
this surface already declares at `:root`. M PLUS 2's own digits also carry 23%
more ink width than Noto Sans JP's, which is most of why the ledger read as
loose and inflated at every density.

Mono was retired earlier and stays retired: `22:30`, `GHO-0726-01`, `VIP-1` in
an IDE face turn a reservation ledger into a log viewer. The figure role stays a
distinct register through weight, `tabular-nums` and tracking — how printed
timetables do it.

**Hierarchy comes from size, tracking and ink, not from weight.** Four roles on
a variable axis: `--weight-body` 400 · `--weight-ui` 460 · `--weight-strong` 560
· `--weight-display` 620. The previous 400/500/600/700 ladder put most labels on
screen at semibold or bolder; every measured reference goes the other way
(Stripe sets even 56px display copy at weight 300; Linear uses 510/590).

**Every step above body is optically tracked.** Until 2026-08-16 there was no
negative tracking anywhere on this surface — every size ran at the font's
default spacing, which is drawn for text at reading size, so headings, counters
and the date lockup sat visibly loose. That single fact carried more of the
"nobody authored this" texture than any other:

```
--track-micro    +0.005em   11–13px labels — the one step that does not tighten
--track-body     -0.006em   13–15px reading text, and the :root default
--track-data     -0.012em   15–17px values and codes
--track-lead     -0.018em   18–20px pane titles
--track-figure   -0.024em   22–26px counters
--track-display  -0.03em    display copy
--track-caps     +0.04em    functional uppercase
--track-brand    +0.13em    the GHOST OSAKA lockup only
```

Stripe runs −0.010em at 12px through −0.025em at 56px; Linear −0.011em body and
−0.022em display. This curve is the same shape. Tightening 11px labels costs
legibility and is itself a recognisable slop tell, which is why the micro step
is positive.

**The scale is not the same size on the device.** Between 768px and 1279px the
six reading steps move up roughly one Apple register (13→15 body, 15→17 data).
On a 10.2" iPad a CSS pixel is a point, so the desk scale's `--t-body: 13px` is
Apple's *Footnote* — three registers under the 17pt iPadOS uses for body text,
and most of why the surface read as a shrunken desktop app. It costs no density:
`--h-row` was already 52px for the touch floor and the taller stack still fits.
Text controls are pinned separately at 16px and never move (`DESIGN.md`
§4.5–4.6).

Six-step scale: `--t-micro 11 · --t-mini 12 · --t-body 13 · --t-data 15 ·
--t-lead 18 · --t-figure 22` plus a fluid `--t-display`.

Verified in the built app: `1111111111` and `0000000000` render at identical
width. Full matrix and method:
`docs/research/vip-manager-type-accent-bakeoff-2026-08-16.md`.

### Geometry, spacing, motion

Spacing on a 4px rhythm (`--s-1`…`--s-10`). Radius stays structural but is no
longer brittle: `--r-chip 3 · --r-control 6 · --r-pane 8`, the register SmartHR
uses for dense business UI. Nothing reaches 12px, so the surface never becomes a
pile of soft cards (`DESIGN.md` §4.7). Motion is `--dur-fast 110ms /
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
│ [新規受付] [一覧|フロア|チャート] search filter │ or QUEUE      │
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

### 768–1023px — iPad portrait

Single column at full width. The inspector and the queue **overlay from the
trailing edge** at `min(420px, 54vw)` — the behaviour of a supplementary column
on iPadOS when a split view collapses — so the operator keeps the board in view
while reading a reservation. Dialogs stay dialogs. **The operator toolbar is
kept**: view switcher, create, menu and the masthead counters all remain.

This tier exists because the venue iPad is 810pt wide in portrait and used to
land in the phone shell. Rotating the device then swapped the whole interaction
model — bottom nav appearing, toolbar emptying — instead of moving one panel.

### ≤767px — phone

Single column. The inspector becomes a full sheet, the counters become a 52px
filter strip, and a five-item bottom nav carries 受付 / 一覧 / フロア / チャート /
メニュー.

The `1023px` threshold is shared by the workspace (`matchMedia`) and the QA
harness — change both together. In the workspace it means only *"the inspector is
not persistent"*, which is true for iPad portrait as well; the phone shell is a
separate, lower tier.

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
- **Optional detail does not become a toll gate.** After 卓, a new reservation
  can move directly to 確認 with 顧客 / 追加 / 担当 explicitly marked as 既定値.
  All three steps remain in the ruler and are reachable in one tap from the
  confirmation footer; the 8/8 review and save contract do not change.
- The footer keeps 戻る / position / 次へ・保存 in the same place on every step and
  at every width, so the primary action never moves.

On a date without an `event_day`, the intake remains read-only and calls the
state **予約受付対象外** because the current schema cannot distinguish a regular
closure from an omitted setup row. The date field is the dialog's immediate
source of truth, stale warnings remain attached only to the date that failed,
and the next three registered business days come from an owner-only read
endpoint. Following that phone-reservation recovery opens 事前予約; opening the
same dialog on a valid day still keeps Walk-in as the fast default.

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

**The lane label carries the alarm** (2026-08-06). The track is 1020–1560px
wide and the venue iPad shows about 960 of it, so anything drawn at a booking's
own minute can scroll off screen while its row is still in front of the
operator. The lane label cannot: it is sticky. It states the worst live
exception on that lane in words — `未着100分`, `延長確認 15分`, `解放超過30分` —
and capacity stands down while it does. The plate never animates. The pulse
belongs to the pin on the track, which is text-free.

Why the previous alarm failed: it was a 2px vertical line, and the track's
background *is* vertical rules. One pixel of width and a hue is not a
difference the floor can read at a glance. The replacement is a wedge, a shape
`repeating-linear-gradient` cannot produce.

### Ledger rows

`--h-row` is 52px and the row must actually be 52px. Two things had quietly
overridden it: `.rowOpen` re-declared the 44px touch floor as its own
`min-height` on top of 6px cell padding (57px rows), and the selected row shared
a declaration block with the empty-state cell, inheriting `height: 140px`,
`--ink-3` and centred text — so the one row under inspection was 2.6× the
others, the palest in the ledger, and the only one out of column. Compact is
53px, comfortable 64px, and selection is the accent spine.

---

## 6. Gates this surface must keep passing

```
npm run ci     # lint · typecheck · unit+contract+PII · build · maintenance · a11y
```

`npm run test:a11y` defines **52 required states plus one date-unavailable
fixture across 13 viewports**. On the current host, 11 Chromium viewports
produce 583 audited screenshots and the two WebKit viewports are recorded as
`notRun` when the pinned browser binary is unavailable; they are never counted
as passes. The authoritative counts are `QA_REQUIRED_STATES` and `QA_VIEWPORTS`
in `scripts/light-ui-qa-manifest.mjs`. The gate asserts zero axe
violations, zero horizontal overflow, zero controls under 44×44, zero legacy
purple chrome, zero console errors and zero 5xx.

Design intent is pinned by `tests/contract/operator-light-ui.test.mjs`, which
fails if the surface regresses to a renamed dark theme, loses the OKLCH
authoring, loses tabular figures, restacks the chrome, or reintroduces
glassmorphism or coloured side tabs.

WebKit 1194×834 is part of the gate but needs system libraries
(`libwoff2dec`, `libenchant-2`, …) that a bare Linux container lacks.
