# D8 Production Promotion Gate

Date: 2026-07-27 JST
Status: `PASS`

## Promotion

The already-smoked candidate was promoted exactly once:

- fixed URL: `https://ghost-vipapp.vercel.app`;
- exact deployment: `dpl_GBhCXNAVnqwJW7N4GAGgnfKhVveo`;
- state: `READY`, target `production`;
- application source commit:
  `7c6481005b87a330245a8861ae76da56665fbee0`;
- application source tree:
  `1e6f97a5bf5df392d2455db1eff6022d6a31f4de`.

The canonical fixed URL resolves to the exact candidate. Two historical
customer-facing aliases that were outside Vercel's automatic promotion set
were explicitly repointed to the same candidate after the one promotion.

## Fixed-URL acceptance

The canonical fixed URL was tested without a Vercel automation bypass:

- direct unauthenticated response: HTTP 401 with the GHOST Basic realm;
- Owner/demo Basic boundary: PASS;
- cross-lane PIN rejection: 2/2;
- Owner login, board, and logout: PASS;
- demo List/Floor/Chart: PASS;
- reservation create/edit and all six commands: PASS;
- Walk-in, Waitlist, block, staff, customer, reset, and logout: PASS;
- demo Production business requests: 0;
- external hosts: 0;
- browser console errors: 0;
- browser 5xx: 0;
- filtered deployment 5xx logs: 0.

The temporary Vercel automation bypasses created only for aliasless D7 testing
were revoked from both VIP and Website projects after canonical fixed-URL
acceptance. Final bypass count is zero for both projects. Existing Deployment
Protection scope was not changed.

## Unchanged system boundaries

- Website fixed URL `https://ghost-ruby-one.vercel.app` continued to resolve to
  `dpl_Gj89YEqt6KSnxaL1fcatCpQ2Y75e`.
- A side-effect-free public hold probe returned HTTP 403
  `public_booking_disabled`.
- Production migration head and schema were unchanged.
- TableCheck mutation count was zero.
- Website, Supabase, public booking, and provider configuration mutations were
  zero.

## Final aggregate comparison

The final canonical-URL aggregate snapshot SHA-256 is
`4e11807e6b771b33991782055c49271978085ed8a94035b4ec0b6d0f552ab319`.
Compared with the before-D7 snapshot:

- all 16 Production business-table counts: equal;
- official seat summary: equal (`VIP-1` through `VIP-8`, inactive 2);
- provider sent/pending: equal (5/0);
- final non-expired active smoke sessions: 0.
