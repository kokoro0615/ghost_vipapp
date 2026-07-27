# D2 Tests-First Demo Contract

Date: 2026-07-27 JST  
Gate: PASS

## Security contract frozen before implementation

Two executable contract suites were added before demo source implementation:

- `tests/contract/demo-auth-boundary.test.mjs`
- `tests/contract/demo-local-data-plane.test.mjs`

They cover:

- Basic-derived trusted lane overwrite and spoof rejection;
- constant-time credential checks and cross-cookie isolation;
- scrypt PIN, HMAC session, exact window, 60-second lease, and expiry;
- zero demo-to-Production session/business/provider fallback;
- exact GHOST `VIP-1` through `VIP-8` deterministic synthetic fixtures;
- date, PII-like, secret-like, and delivery rejection;
- local envelope version/revision/idempotency/conflict/audit behavior;
- reset, expiry purge, and multi-tab revision refresh;
- all required reservation, command, Waitlist, block, staff, and customer
  operation families.

## RED result

- New D2 tests: 15/15 failed for the intended reason.
- Primary failure: planned demo auth/data-plane source did not yet exist.
- Syntax/runtime harness failures: 0.
- Existing Production contract baseline, excluding the new RED tests: 33/33
  passed.
- New test syntax: PASS.
- New test ESLint: PASS.
- `git diff --check`: PASS.

No Production source behavior, database, provider, environment, deployment, or
alias changed while capturing the RED state.

