# VIP Manager — light surface + 新規予約 research

Scope: frontend only. Palette tokens, operator typeface, and the internal layout
of the 新規予約 dialog. No backend, contract, payload, notification, auth, env or
deploy change is part of this work.

Baseline audited: Production commit `e2ba841f71e0b8ef56104a1713098211cf9aaa20`,
worktree `.worktrees/vip-manager-production-light-ui` (HEAD verified equal, tree
clean before edits).

Method: the Production URL is Basic-auth protected and was not bypassed. The
render evidence is the repository's own approved read-only QA harness
(`npm run test:a11y`, `scripts/a11y-visual.mjs`), which boots `next start` on
127.0.0.1 with synthetic/demo data and captures all 45 states. Baseline capture:
45 states at `chromium-1440x900` and 45 at `chromium-390x844`, all gates green
(axe 0 / overflow 0 / <44px 0 / purple 0 / console 0 / 5xx 0). Type research used
a headless specimen probe against Google Fonts at design time only.

---

## 1. Current problems, most severe first

| # | Severity | Problem | Evidence |
|---|---|---|---|
| 1 | High | **Three co-equal columns** in the wizard. `grid-template-columns: minmax(230px,0.85fr) minmax(340px,1.35fr) minmax(210px,0.7fr)` gives the active form only ~47% of the body, so the thing the operator must act on is not dominant. | `VipFloorWorkspace.module.css` `.wizardBody` |
| 2 | High | **The same facts appear three times.** Left context lists 営業日/時間/人数/卓; the right rail re-states 日時/人数/席選択; step 8 lists them again. Triple bookkeeping with no added meaning. | steps 1–8 captures |
| 3 | High | **Mobile deletes the context outright** — `.wizardContext, .wizardChecks { display: none; }` below 1024px. On the 卓 step a phone operator cannot see the date, time or party size they are seating. | `.module.css` ≤1023px block |
| 4 | High | **The floor map is decorative, and mis-rendered.** `.wizardMap img { filter: invert(1) grayscale(1) contrast(1.6) brightness(0.94) }` turns the colour venue WebP into an illegible grey line drawing at ~293px, and it never marks the selected table — not even on the 卓 step, where the map is the whole point. This is the same defect class already fixed for `FloorView` (`.floorImage { filter: none }`). | step 4 capture |
| 5 | High | **Permanent false alarm.** 保存前チェック shows 席選択「未選択」in warn colour from step 1, before table choice is even reachable, and データ境界「Owner」sits permanently in warn colour although it is a neutral fact, not a problem. Warn colour that never resolves trains operators to ignore warn colour. | steps 1–3 captures |
| 6 | High | **Confirmation is incomplete.** Step 8 reviews only 営業日 / 時刻 / 人数・卓 / 顧客. 担当, 通知, 現場共有メモ, 入口表示名, 経路・状態 are all saved but never shown before commit. | step 8 capture + `save()` payload |
| 7 | Med | **Step 1 and 2 are mostly emptiness.** `.wizardStatement { min-height: 240px; place-content: center }` centres a giant mono date over ~250–350px of blank pane, at odds with a dense operations tool. | steps 1–2 captures |
| 8 | Med | **Eight equal step cells with circled numbers.** At 1440px they are decoration; at 390px each cell is ~44px wide holding a circle plus a 2-character 11px label, so the current position is hard to read. | `.wizardRail`, mobile step 4 capture |
| 9 | Med | **Figure/text locale split.** `datetime-local` renders `07/31/2026, 10:00 PM` while the same value shows as `22:00–00:00` two columns away. A 22:00–05:00 venue should never display 10:00 PM. Native control rendering follows browser locale, so this is mitigated, not fully controllable, without changing the input type (forbidden — it would touch the value contract). | step 2 capture |
| 10 | Low | Nested boxes: 版情報 and 監査プレビュー are bordered cards inside an already bordered rail — cards inside cards. | step 1 capture |

## 2. Where the "AI-generated admin" read actually comes from

Decomposed as requested, each with the concrete carrier:

- **Font (largest single cause).** Every figure is IBM Plex Mono — `22:30`,
  `GHO-0726-01`, `VIP-1`, `v4`, `2026-07-31`. IBM Plex Mono is an IDE/terminal
  face; using it for *all* data turns a reservation ledger into a log viewer.
  IBM Plex Sans JP then carries the Japanese in IBM's corporate-technical voice.
  The pair reads as "developer tool", which is exactly the generated-dashboard
  signature.
- **English eyebrows.** Five in one dialog: `GHOST ARRIVAL CONTROL`,
  `DATE / TABLE`, `BUSINESS DATE`, `PRE-SAVE CHECK`, `FINAL VALIDATION` — plus
  `ACTIVE BLOCKS`. A tiny letterspaced English kicker over a Japanese title is
  the single most recognisable AI-admin tell, and none of them add information
  the Japanese title lacks.
- **Repetition.** Eight identical step cells, four identical check rows, three
  identical `dl` blocks. Equal-weight repetition where the real task is not
  equal-weight.
- **Card-ification.** Rail → bordered `ul` → bordered `section` → bordered
  `section`. Boxes inside boxes instead of value and spacing.
- **Whitespace without hierarchy.** 240px centred hero blocks in an operations
  dialog: marketing-page rhythm applied to a data task.
- **Colour.** Warn/live colour used for permanent non-actionable state (see
  problem 5), so colour stops meaning "act".
- **Explaining the UI in prose.** 「ここで予約日を変更できます。外側の営業日も自動で
  切り替わります。」 and 「正式卓はVIP-1〜VIP-8のみ…」 are the UI narrating itself
  instead of showing state.

## 3. Operating principles taken from official competitor material

Official sources read (marketing/product pages; they describe capability, not UI
mechanics — recorded honestly, no UI internals were inferred beyond what is
stated):

- TableCheck — [Reservation & table management](https://www.tablecheck.com/en/join/features/reservation-and-table-management/),
  [Features](https://www.tablecheck.com/en/join/), [Floor plan article](https://www.tablecheck.com/en/blog/success-means-an-excellent-restaurant-floor-plan/)
- SevenRooms — [Table management](https://sevenrooms.com/platform/table-management/),
  [Reservations & waitlist](https://sevenrooms.com/platform/reservations-waitlist/)
- Resy — [ResyOS](https://resy.com/resyos), [Service features](https://resy.com/resyos/features/service/),
  [Restaurants](https://resy.com/join/restaurants/)

Principles extracted (information design only):

1. **One place at the host stand.** SevenRooms states staff "manage reservations,
   waitlist management and table availability right from one place: your host
   stand." → The active task should own the screen; do not split the operator's
   attention across three co-equal panes.
2. **Surface state where focus is needed.** SevenRooms describes tracking table
   status "so managers and servers know where to focus", with real-time alerts on
   check-ins, cancellations and no-shows. → Warnings belong next to the field or
   step they concern, not parked in a permanent side checklist.
3. **Guest context is attached, not always-on.** Both SevenRooms and Resy
   describe guest profiles with notes/tags/history as something pulled up for the
   booking in hand. → Context on demand; a permanent third column is not the way.
4. **The booking spine is short and linear.** Resy: book by "selecting the date,
   time and party size, adding the guest information and sending a confirmation."
   → Our eight steps are the same spine; the UI must make that sequence feel
   short, not ceremonial. (The eight steps themselves stay exactly as they are.)
5. **The floor plan is a working instrument.** TableCheck's floor layout renders
   the real room to optimise seating; Resy describes pacing controls and table
   combinations. → The map earns its place at the moment of table assignment, and
   must show what is selected.

**Explicitly not adopted:** any TableCheck/SevenRooms/Resy brand colour, logo,
icon set, wording, screenshot or signature layout; coloured status pills as the
primary status carrier; AI seating automation; multi-panel KPI dashboards;
marketing gradients. Nothing is copied — only the principles above.

## 4. Typeface comparison — measured, not asserted

All candidates are already reachable through `next/font/google` (no new package,
no runtime remote CSS, OFL/licence-clear). Digit metrics and Japanese coverage
were measured in headless Chromium at 15px: `defaultSpread` is the rendered width
difference between `1111111111` and `0000000000`; `tnum` is whether
`font-variant-numeric: tabular-nums` changes that.

| Candidate | Weights | JP glyphs from own webfont | Digit spread (default) | `tabular-nums` effective | Verdict |
|---|---|---|---|---|---|
| **M PLUS 2** | 100–900 + variable | yes | **0.00px** | **yes** | **Adopted** |
| IBM Plex Sans JP (current) | 100–700 | yes | 0.00px | yes | Rejected — voice |
| IBM Plex Mono (current figures) | 100–700 | n/a (Latin) | 0.00px | yes | Rejected — terminal read |
| Noto Sans JP | 100–900 + variable | yes | 0.00px | yes | Rejected — generic |
| Zen Kaku Gothic New | 300–900 | yes | **18.16px** | **no** | Rejected — no tabular figures |
| Zen Kaku Gothic Antique | 300–900 | yes | 18.16px | no | Rejected — same |
| Murecho | 100–900 + variable | yes | 15.00px | no | Rejected — same |
| BIZ UDPGothic | **400/700 only** | yes | 19.48px | no | Rejected — two failures |
| Hiragino system stack | OS-dependent | n/a (local) | n/a | n/a | Runner-up, zero bytes |

Reasoning:

- **Zen Kaku Gothic New / Antique, Murecho, BIZ UDPGothic have no tabular
  figures.** This was the decisive measurement and it overturned the initial
  preference for Zen Kaku Gothic New. A 10-digit string drifts 15–19.5px, and
  `tabular-nums` has no effect because the Google build carries no `tnum`
  feature. In a ledger where 時刻 / 人数 / 卓 / 予約番号 sit in columns, every
  column would jitter as digits change. Disqualifying for the figure role, and
  since the design rule is "every figure tabular", disqualifying overall.
- **BIZ UDPGothic fails twice**: only 400/700, so the 400/500/700 hierarchy
  collapses, and "P" is literally proportional. UD legibility is real, but the
  voice is a Japanese office document, not a luxury venue.
- **Noto Sans JP** is technically fine (uniform digits, working `tnum`) and was
  verified rather than dismissed — but it is the default Japanese webfont of the
  entire internet, the JP analogue of Inter. Rejected on design grounds only.
- **Hiragino system stack** costs zero bytes and is excellent on the venue's
  iPads, but degrades to Yu Gothic UI on Windows laptops (thin and weak at
  11–13px) with no guaranteed 500 weight. Recorded as the fallback strategy
  rather than the primary, and it is exactly what the fallback list now names.
- **M PLUS 2 is adopted.** Measured uniform digit advances and effective
  `tabular-nums`, so column stability — the one real job IBM Plex Mono was
  doing — survives. Verified real Japanese coverage from its own webfont (not a
  silent system fallback). 400/500/700 available for a true weight hierarchy. It
  is a Japanese-designed face (M+ FONTS, OFL 1.1) with warmer, more open kana
  than IBM Plex Sans JP, and it removes both the corporate-IBM voice and the
  terminal read in one move.

**Mono is retired.** The figure role stays a distinct register, but it is now
carried by weight (500/600) + `tabular-nums` + slight negative tracking inside
the same family — how printed timetables and ledgers actually do it. Keeping one
family also removes a real seam: mixed runs like `4名`, `1卓`, `¥120,000` no
longer take the digit from one font and the counter from another. The
`--font-figure` token name is kept so no CSS call site churns.

## 5. Palette direction

Keep the Owner's warm white and the existing AA-verified ink/accent/status ramp;
fix the fact that the planes are too close in value to read as separate. Measured
before: `--paper 0.968` vs `--surface 1.0` vs `--surface-quiet 0.984` — the
wizard's three panes differ by 1.6% lightness and read as one flat field, which
is why nothing looks like the focal object.

- Warm-white canvas moves down slightly, so pure-white working panes read as
  paper laid on a desk rather than as the same sheet.
- `--surface: oklch(1 0 0)` stays exactly pure white for working panes.
- The sunken step (headers, rails) deepens slightly for a legible third plane.
- Ink, action (graphite), accent (champagne), and status stay as they are — they
  are already verified against WCAG 2.2 AA and there is no reason to disturb them.
- Champagne stays restricted to selection / current position / structural
  hairlines, well under 8% of screen area.
- Hierarchy stays value + hairline + spacing. No new shadow, blur, glass,
  gradient, or radius growth.
- Status colour keeps a glyph or word beside it, and — new — warn/alert colour is
  no longer spent on permanent non-actionable facts (problem 5).

## 6. 新規予約 layout direction

Verified against the captures, then decided:

- **Two zones, never three.** The active step owns the dominant column; a single
  right rail carries the running summary. The left context column is deleted.
- **A compact always-visible summary bar** directly under the progress ruler
  carries 日付 / 時刻 / 人数 / 卓 in tabular figures — on every step, at every
  width, including phones. This is what replaces the deleted column, and it is
  why nothing needs `display: none` any more.
- **The pre-save checklist is deleted.** Validation moves next to the field it
  concerns. Nothing shows a warning for a step the operator has not reached.
- **The map becomes a working instrument on the 卓 step**, inline in the active
  pane, full colour (`filter: none`, `unoptimized`, matching `FloorView`), with
  the selected tables actually marked at their real
  `geometry.xPercent/yPercent`. On the other seven steps it is not rendered.
- **Progress**: one ruler, eight segments, phase-grouped 日時・席 (1–4) /
  顧客・詳細 (5–7) / 確認 (8). Completed / current / upcoming are distinguished by
  glyph, weight and fill — not by colour alone — with `aria-current="step"` and
  a per-step accessible name. All eight steps remain individually present.
- **Confirmation** gains 担当, 通知, 現場共有メモ, 入口表示名, 経路・状態.
- **Footer** keeps 戻る / position / 次へ・保存 in the same place on every step and
  at every width, so the primary action never moves.
- **Phones** keep the current step, the summary bar, the active fields and 次へ in
  the first viewport; the rail becomes a block in the scroll flow instead of
  being hidden. 44px touch floor, no horizontal overflow, 200% zoom usable,
  reduced motion respected.
- Step 1 and 2 lose the centred 240px hero and become top-aligned forms.

## 7. Backend non-involvement

Confirmed frozen and untouched by this work: the eight steps and their order
(日付/時刻/人数/卓/顧客/追加/担当/確認), `save()` payload and field set,
create/update branching, `expectedVersion` / `expectedTableVersions`,
`eventDayId` / `offeringId`, `sourceChannel` / `serviceStatus`,
`notificationPreference`, demo/trial PII rules, `onRun`, `onBusinessDateChange`,
`stepValid`, reservation edit, Walk-in, 受付ブロック, the business-date refetch of
board/offerings/table versions/staff, the unregistered-date inline error and
navigation stop, outer business-date and URL sync, notification, audit and
conflict validation. No file under `src/app/api/**`, `src/lib/**`, no contract
type, no migration, no `package.json`/lockfile, no env, no deploy.

Nothing in this work requires a backend change, so there is no Codex handoff
item arising from it.

## 8. Acceptance criteria

1. `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`,
   `npm run test:maintenance`, `npm run test:a11y` pass, plus the three named
   contract tests and `git diff --check`.
2. The a11y harness still finds all 45 states at all reachable viewports with
   axe 0 / overflow 0 / undersized 0 / purple 0 / console 0 / 5xx 0.
3. The harness's existing hooks still resolve unchanged: dialog 新規予約, tabs
   Walk-in / 受付ブロック / 事前予約, `予約作成 N/8` for N = 1…8, label 予約日,
   `aria-describedby^="reservation-date-hint"`, group 予約卓 with VIP-1 checkbox,
   button 次へ, label プラン.
4. `git diff --name-only` shows only allowlisted frontend files; `src/app/api/**`,
   `src/lib/**`, `package.json` and the lockfile are empty in the diff.
5. `ReservationWizard` still submits a byte-identical payload shape, still
   branches create vs update the same way, and still runs the same
   business-date change path.
6. Figures are still tabular: `1111111111` and `0000000000` render at equal
   width in the shipped font.
7. No warn/alert colour is spent on a state the operator cannot act on.
8. On a 390px phone, step 4 shows the current step, the date/time/party summary,
   the table controls and 次へ without hiding any of them.
9. The design-intent contract test pins the *new* typeface at the same strength
   it previously pinned IBM Plex, and still bans Inter/Roboto/Noto/BIZ UDPGothic.
   No existing assertion is deleted or weakened.
