# Reservation cancellation for every source channel — 2026-09-19 JST

## Reported symptom

Owner report: on `https://ghost-vipapp.vercel.app/`, a reservation whose
Inspector 概要 tab shows 経路 = 電話 / 管理者 / オンライン cannot be cancelled.
店頭 (walk-in) bookings can.

## Cause

Not a defect in the cancellation path: the control was never rendered for
those channels.

- `src/components/admin/vip-floor-v2/inspector/Inspector.tsx` rendered the
  danger action only inside `reservation.sourceChannel === "walk_in" ? (…)`.
- `src/app/api/admin/vip-floor/commands/route.ts` rejected any command whose
  `payload.sourceChannel` was not `"walk_in"` with `walk_in_cancel_only`.
- `src/lib/demo/repository.ts` applied the same restriction to the
  browser-local demo plane.

That restriction came from the 2026-07-30 Walk-in cancellation work, which
`docs/GHOST_VIP_MANAGER_SPEC.md` §16 listed as an exception to an otherwise
out-of-scope capability (`通常予約のキャンセル処理`). See
`docs/research/walk-in-cancellation-2026-07-30.md`.

The canonical backend never had that restriction. `POST
/api/admin/v2/reservations/{id}/cancel` → `cancel_admin_reservation_v8`
accepts any source channel; it requires an Owner session with
`reservation_cancel.write`, `expectedVersion`, an idempotency key, a
structured reason, a refund decision and a notification decision. It rejects
terminal reservations, releases active seat assignments, writes the
cancellation row and the VIP floor audit entry, and advances the board
revision.

## Owner decisions (2026-09-19)

1. **Channels** — the control applies to 店頭 / 電話 / 管理者 / オンライン.
2. **Money** — VIP Manager never charges or refunds a card. The adapter keeps
   `refundDecision="none"`, `refundAmountYen=null`. A late-cancellation fee for
   an online booking (the published policy charges 100% inside one hour) is
   raised in the Stripe Dashboard instead.
3. **Notification** — no LINE notification. `notifyCustomer=false` stays fixed
   in the adapter, so no `notification_jobs` row is queued. Note that this flag
   addresses the venue's own LINE group, not the guest; neither is contacted
   automatically by either setting.
4. **Reasons** — `no_contact`（連絡なし）is added to the existing four. The
   backend has accepted that reason code since v8.

## Implementation notes

- The wire-level command kind stays `walk_in_cancel`. It is part of the
  cross-repo contract (`contracts/vip-manager/v2/routes.json`,
  `ghost.vip-manager.v2.1`) held in the Website repository, and renaming it
  would force a coupled Website release for no operator-visible gain. The UI
  label, the adapter's reason table and the demo plane are named for what the
  command now does.
- The reason select no longer defaults to 誤登録 and the memo is no longer
  prefilled with `Walk-in誤登録`: both defaults were written for a walk-in
  mis-registration and would have produced false audit rows for a guest-side
  cancellation.
- Production state when this was written: upcoming active bookings were 10 ×
  電話 (`admin_hold`/`phone`) and 1 × オンライン. Online VIP bookings hold a
  `card_setup` payment row only — no deposit has ever been charged — so no
  cancellation performed here can leave money stranded.

## Verification

`tests/contract/reservation-cancellation.test.mjs` replaces
`walk-in-cancellation.test.mjs` and fails against the previous source: it
asserts the Inspector no longer gates the control on `sourceChannel`, that the
adapter has no `walk_in_cancel_only` branch, that the UI reason list and the
adapter's reason table agree, and that `refundDecision`, `refundAmountYen` and
`notifyCustomer` stay fixed.

`scripts/a11y-visual.mjs` cancels the seeded 管理者 demo booking in addition to
the demo walk-in, and captures `command-reservation-cancel`.
