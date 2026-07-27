# D7 Aliasless Staged Production Gate

Date: 2026-07-27 JST
Status: `PASS`

## Candidate and source

| Item | Exact result |
|---|---|
| Aliasless candidate | `dpl_GBhCXNAVnqwJW7N4GAGgnfKhVveo` |
| Candidate URL | `https://ghost-vipapp-osy4js25v-ghost-b6224582.vercel.app` |
| State | `READY`, target `production` |
| Application source commit | `7c6481005b87a330245a8861ae76da56665fbee0` |
| Application source tree | `1e6f97a5bf5df392d2455db1eff6022d6a31f4de` |
| Fixed deployment during D7 | `dpl_CvFzDDArUGR8j7QyAUtXG9cQ6gxf` |

The candidate was built with `--prod --skip-domain`. Vercel-created team
aliases were removed before D7 smoke, and the customer-facing fixed aliases
continued to resolve to the pre-run deployment until D8.

## Credential and environment gate

- Owner Basic and eight-digit PIN were rotated without printing values.
- The active session belonging to the rotated Owner was retired.
- Demo Basic, PIN verifier, session HMAC, workspace ID, exact start/expiry,
  and data version were installed only in VIP Production environment scope.
- `GHOST_VIP_TRIAL_MODE=false` remained unchanged.
- `GHOST_ADMIN_API_ORIGIN` remained unchanged.
- Website and Supabase environment mutation count was zero.
- The repository-external handoff directory/file modes were `0700`/`0600`.
- Secret output and repository credential files: zero.

## Candidate journeys

The candidate passed both lanes:

- unauthenticated application request: 401;
- demo PIN in Owner lane: 401;
- Owner PIN in demo lane: 401;
- Owner login, current board, staff transport, and logout: PASS;
- demo List, Floor, Chart: PASS;
- reservation create/edit: PASS;
- assignment, note, arrival time, service status, check-in, extension: 6/6;
- block create and reset: PASS;
- Walk-in: PASS;
- Waitlist create and local-only call: PASS;
- staff master create and table assignment: PASS;
- customer synthetic attribute update: PASS;
- demo logout: PASS.

The demo request ledger recorded Production business API requests 0, external
hosts 0, console errors 0, and server 5xx 0. Filtered Vercel candidate 5xx logs
also returned zero entries.

## Data and provider comparison

Mode-`0600` aggregate snapshots remained outside the repository.

| Snapshot | SHA-256 |
|---|---|
| Before D7 | `35acfd99e8df8d46b06c58b6325fadc4c2b890183ab2d348e13adb84e3feb6ad` |
| After D7 | `b313eb533cbefc4fafa961c13486bbaaaf2090be35179e5553929c9908a38ac4` |

The 16 business-table counts, official seat summary, and provider summary were
equal. Official active seats remained exact `VIP-1` through `VIP-8`, inactive
historical seats remained 2, provider sent remained 5, and pending remained 0.

## Rollback rehearsal

A security-compatible rollback anchor was rebuilt from known-good application
commit `ce99985b26b539fbfd01fe042fe6250a46d00191` and tree
`1b5ff4e91da830ddf9663d4d1a5675f2fefc5945` using the newly rotated Owner
credentials:

- deployment: `dpl_HzWdJ6QLDaft6kN2TBeJCxR1GwMs`;
- aliasless URL: `https://ghost-vipapp-4tl88bcoh-ghost-b6224582.vercel.app`;
- Owner login/board/logout: PASS;
- demo Basic revoked at outer boundary: 401;
- console errors and 5xx: zero.

This anchor supersedes the old immutable artifact as the executable rollback
target because rotating Owner credentials intentionally made the old artifact's
embedded Basic values stale. Rollback remains code-only; no Production DB
rollback or compensation is permitted.
