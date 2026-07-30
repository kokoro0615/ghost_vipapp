# Walk-in cancellation research — 2026-07-30 JST

## Problem and source correction

The Production standalone app at `ghost-vipapp.vercel.app` resolves to commit
`593db04` at the start of this work. Its canonical UI is
`src/components/admin/vip-floor-v2`; its BFF is
`src/app/api/admin/vip-floor`. The similarly named
`../ghost/website/src/components/admin/VipFloorDashboard.tsx` is an older
website-admin surface and had a `Cancel` button that does not exist in the
standalone Production app. This mismatch caused an incorrect operator answer.

The durable correction is:

- repository-local `AGENTS.md`;
- root GHOST `AGENTS.md` canonical-source guard;
- README source map;
- `source-of-truth-guard.test.mjs`.

## Existing authoritative backend behavior

The canonical backend already exposes:

`POST /api/admin/v2/reservations/{reservationId}/cancel`

The command requires an Owner session, `reservation_cancel.write`,
`expectedVersion`, an idempotency key, a structured reason, refund decision,
and notification decision. `cancel_admin_reservation_v8` atomically:

- rejects terminal reservations and stale versions;
- releases active seat assignments;
- changes lifecycle status to `cancelled` and increments version;
- appends the cancellation record and VIP floor audit entry;
- advances the board revision;
- only creates a refund case for explicit `partial` or `full`;
- only queues a customer notification when explicitly requested.

The Owner board intentionally returns confirmed lifecycle reservations only,
so a successfully cancelled Walk-in disappears from active List/Floor/Chart
while the database cancellation and audit records remain.

## UX and safety decisions

1. The control is named `Walk-in取消`, not Delete or Undo.
2. It appears only when `sourceChannel === "walk_in"`.
3. Input and impact confirmation are separate steps.
4. The confirmation step initially focuses `戻る`, the least destructive
   action.
5. The operator selects a structured reason and enters a bounded reason memo.
6. The BFF fixes `refundDecision="none"` and `notifyCustomer=false`; the
   browser cannot opt into financial or delivery side effects.
7. The Owner path preserves expectedVersion, idempotency, canonical audit, and
   typed conflict recovery.
8. The Demo path is browser-local only, uses synthetic-note validation,
   releases the synthetic assignment, increments version/revision, retains the
   cancelled envelope record and audit event, and filters it from active views.
9. Physical deletion is deliberately not exposed.

## External references

- W3C WAI-ARIA Authoring Practices, modal dialog pattern:
  https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
  — destructive final steps should prefer least-destructive initial focus;
  focus stays trapped, Escape closes, and focus returns logically.
- W3C WAI-ARIA alert dialog pattern:
  https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/
  — confirmation prompts need a named modal message and explicit response.
- OWASP Logging Cheat Sheet:
  https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
  — additions, modifications, and deletions belong in protected audit trails.
- Stripe PaymentIntent lifecycle:
  https://docs.stripe.com/payments/paymentintents/lifecycle
  — cancelling a reservation is not equivalent to refunding a succeeded
  payment; refund is a separate financial operation.
- GHOST TableCheck behavior inventory:
  `../ghost/website/docs/evidence/vip-floor-tablecheck/behavior-inventory.md`
  — cancellation uses structured reason/refund decisions and never performs a
  synchronous Stripe call.

No TableCheck asset, copy, CSS, DOM, authenticated endpoint, or customer data
was used.
