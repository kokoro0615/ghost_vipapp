# VIP Manager operating-hours root-cause study

Date: 2026-07-30 JST
Surface: `https://ghost-vipapp.vercel.app/`
Production baseline: commit `99c9f54c8ee66f338235c8392b54f86e7cc736e0`

## Owner requirement

GHOST Osaka VIP floor operations run from **22:00 through 05:00 the next day**.
The timeline and every explicit time picker must not present daytime hours as
normal choices.

## Root cause

The issue had three independent carriers.

1. `event_days.sales_open_at` is noon (`12:00`) in the canonical seed even
   though the same migration documents guest seating from 22:00 to 05:00.
   This is not safe to rewrite as a UI-only fix: the field is also used as the
   broader sales/admin-day boundary, including admin-session event-day
   resolution.
2. The canonical VIP floor board and options responses rename that field to
   `operatingStartAt`. VIP Manager then trusted it for the Chart start and for
   Walk-in/block/reservation defaults. A sales/admin boundary was therefore
   interpreted as the guest-service opening time.
3. The creation and arrival forms used native `datetime-local` controls. Those
   controls always expose the browser's full calendar/time picker, and the
   client only checked `start < end`. The BFF adapters also accepted any valid
   ISO interval, so the interface could submit a daytime interval and wait for
   a downstream conflict or generic 400.

The synthetic/demo fixture separately started the board at 21:00, and the
legacy adapter fell back to 21:00, creating two more sources of drift.

## Resolution

`src/lib/ghostOperatingHours.ts` is now the VIP Manager operating-time
contract:

- business date opening: `22:00` JST
- next-day close: `05:00` JST
- explicit time-choice step: 15 minutes
- one formatter that marks post-midnight choices with `翌`
- one interval validator shared by client, BFF and browser-local demo data;
  off-step timestamps such as `22:07` are rejected as well as daytime values

The board and options BFF responses normalize only the VIP Manager
`operatingStartAt/operatingEndAt` view. They do not change
`event_days.sales_open_at`, public booking, auth, database rows, or provider
state.

The Chart also derives its seven-hour axis directly from the business date, so
stale cache or a legacy response cannot reintroduce noon. Bars and the now-line
are clipped to the axis; the now-line is omitted when the viewed business date
is not the current operating window.

Native `datetime-local` controls were replaced in:

- 事前予約 / 予約編集
- Walk-in
- 受付ブロック作成・編集
- 到着時刻の手動記録

The new selects show only 22:00–翌05:00. Start excludes the closing boundary;
end only shows values after the chosen start. Existing out-of-window data is
not silently rewritten: it appears as an invalid recovery state and cannot be
saved until corrected.

The operations BFF rejects out-of-window reservation, Walk-in and block
intervals with `outside_operating_hours`. The command BFF applies the same rule
to manually selected arrival times. The client maps that code to a specific
Japanese recovery instruction.

## Deliberate non-changes

- No database migration and no `event_days` mutation.
- No change to public booking slots, pricing, notifications, payments,
  credentials, or authentication.
- Automatic operational event timestamps (for example check-in at the actual
  current instant) remain factual timestamps; the restriction applies to
  explicit operator clock choices and reservation/block intervals.
- Seat-extension duration remains a duration command governed by its existing
  15–120 minute server contract; it is not a clock picker.

## Regression contract

- `tests/unit/ghost-operating-hours.test.mjs` pins the overnight window, the 29
  quarter-hour boundaries, rollover labels, normalization and rejection cases.
- `tests/contract/operating-hours-boundary.test.mjs` pins the shared use across
  Chart, forms, BFF responses, mutation adapters and recovery copy.
- The existing full unit/contract/PII, lint, typecheck, build, maintenance and
  multi-viewport accessibility/visual gates remain required before release.
