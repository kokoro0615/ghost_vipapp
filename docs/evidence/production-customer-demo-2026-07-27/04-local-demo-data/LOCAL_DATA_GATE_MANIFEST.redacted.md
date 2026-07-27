# D4 Browser-Local Demo Data Gate

Date: 2026-07-27 JST  
Gate: PASS

## Implemented boundary

- The demo transport reads and writes only a versioned browser-local envelope.
- The fixed allowlist is `2026-07-27` through `2026-08-27`, inclusive.
- Every date uses deterministic synthetic reservations, customers, staff,
  waitlist, audit history, and exactly `VIP-1` through `VIP-8`.
- Reservation create/edit, six live commands, Walk-in, Waitlist, block,
  staff, customer attributes/linking, and reset implement version, revision,
  idempotency, conflict, rollback, and audit semantics.
- `BroadcastChannel` revision notifications refresh another tab without
  carrying customer data.
- The shared validator rejects phone values, non-`.invalid` email addresses,
  personal dates, secret-like values, and missing demo labels.
- A data-version mismatch resets safely. Expiry purges the workspace and fails
  closed.
- Demo notification behavior is audit-only; no delivery adapter is reachable.

## Validation

- Contract suite covering the local data plane: PASS.
- Runtime local journey: create, edit, six commands, Walk-in, Waitlist, block,
  staff, customer, conflict, persistence, and reset: PASS.
- Reset readback: deterministic current-day seed only, revision advanced,
  no phone, no real email, and audit reduced to seed plus reset.
- Demo browser network ledger contained only session, PIN, and lease requests.
- Production VIP business API requests from the demo journey: `0`.
- Production database and provider mutation: `0`.
- PII artifact scanner: PASS.

No localStorage payload, customer value, credential, or raw browser artifact is
stored in this evidence directory.
