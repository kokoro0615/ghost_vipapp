# GHOST VIP Manager Release Candidate Evidence

Date: 2026-07-26 JST  
Scope: T-001〜T-028 / G0.5〜G7  
Data policy: production実顧客mutationなし、証拠はPII-free

## Exact source

| Surface | Branch | Candidate commit |
|---|---|---|
| GHOST website / canonical API | `codex/vip-manager-contract-v2-20260726` | `665fcf4d1eefca6bc790d5967f221a4d9fb48a06` |
| GHOST VIP App | `codex/vip-manager-g0-5-20260726` | `fc5c24f20867d80a45564249afcc1a8f13e1ac7b` |

The commits were created from temporary Git indexes rooted at the previous
canonical commits. The unrelated dirty worktrees were not committed or reset.

## Database and contract evidence

- Production Supabase ref remained `cpfsrwctjymhmwvsbwdi`.
- Isolated staging ref was `rsvrtaavofflkvtfzsfh`.
- Local canonical history contains 44 forward-only migrations through
  `20260726175000_ghost_vip_manager_observability_v15.sql`.
- Staging transaction fixtures passed for reservation create/edit, customer
  attributes/relink, observability and logical restore. Every business fixture
  ended in an outer `ROLLBACK`.
- Restore rehearsal covered synthetic reservation/assignment/outbox snapshot,
  injected partial corruption, logical restore, interrupted DDL rollback and
  v8/v14 dual-read.
- Supabase cloud preview-branch creation returned HTTP 402 because the project
  plan does not include that entitlement. No branch and no production mutation
  were created; the transaction-scoped logical restore rehearsal is the fallback
  evidence.

## Automated validation

### Website / canonical API

- Static route/contract verifiers: PASS.
- Reservation create v13, reservation edit v14, customer detail v14,
  observability v15 and restore rehearsal v15 verifiers: PASS.
- `tsc --noEmit`: PASS.
- ESLint: PASS with 2 pre-existing unused-variable warnings and 0 errors.
- Next.js production build: PASS, 58 routes.

### VIP App

- ESLint and TypeScript: PASS.
- Unit: 8/8 PASS.
- Contract: 17/17 PASS.
- PII artifact scan: PASS across 4 roots.
- Production build: PASS, 14 generated routes/pages.
- Chromium/reduced-motion quality matrix: 40 views across
  320×720, 1024×768, 1194×834 and 1366×1024.
- axe violations: 0; horizontal overflow: 0; important controls below 44px: 0.
- `npm audit --omit=dev`: 0 production vulnerabilities.
- Full audit reports 9 high advisories confined to ESLint/minimatch development
  tooling; they are not shipped in the production dependency set. A major ESLint
  override was not forced into the release candidate.

The quality run found and fixed two real defects: tablet reservation selection
did not reopen its Inspector, and the customer unlink danger button failed color
contrast.

Playwright WebKit was downloaded, but this Linux/WSL host lacks the required GTK,
GStreamer and WebKit runtime libraries and has no passwordless system package
installation. Actual Safari hardware validation therefore remains an explicit
pre-promotion human/device witness; it is not represented as completed here.

## Vercel candidate deployments

| Surface | Candidate deployment | State | Target |
|---|---|---|---|
| Website / API | `dpl_9GVhjbKqhSZshdMr5nTmjraxMVtj` | READY | preview |
| VIP App | `dpl_5d5NBKRCQVg9hC1XW92x7mvf6eNU` | READY | preview |

Candidate URLs:

- `https://ghost-3z3h14je1-kokoro06152002-7861s-projects.vercel.app`
- `https://ghost-vipapp-78k3h88oz-kokoro06152002-7861s-projects.vercel.app`

The website candidate was deployed with:

- `FEATURE_PUBLIC_BOOKING_ENABLED=false`
- `FEATURE_ADMIN_MUTATION_ENABLED=false`
- `FEATURE_VIP_FLOOR_V2_MUTATION_ENABLED=false`
- `FEATURE_VIP_FLOOR_DUAL_WRITE_ENABLED=false`
- `FEATURE_VIP_FLOOR_V2_READ_ENABLED=true`

The VIP App candidate points at the website candidate through
`GHOST_ADMIN_API_ORIGIN`. Both previews remain protected by Vercel deployment
protection. Protection-bypassed unauthenticated smoke returned 401 for the VIP
App root/API paths and website admin API paths.

## Rollback anchor

No production alias was changed. The known-good production deployments remain:

| Surface | Production alias | Rollback deployment |
|---|---|---|
| Website | `ghost-ruby-one.vercel.app` | `dpl_5RaU3Mpz8KanMeEnfcZK5b9NGFSP` |
| VIP App | `ghost-vipapp.vercel.app` | `dpl_9Vh3knq1cBgnR48UNMxx7gM7j2NX` |

Read-only smoke confirmed those aliases still resolve to the deployments above.
The VIP App outer Basic boundary returned 401 for unauthenticated root/session/
board reads. The existing website root remained public, while unpublished v2
candidate routes returned 404; no mutation request was issued.

## Controlled promotion sequence

Promotion is deliberately not part of this session.

1. Record actual Safari/iPad witness and Owner sign-off.
2. Build the website production deployment from the exact website commit with
   all mutation/public-booking flags OFF.
3. Verify auth, read model and SLO read-only paths.
4. Build the VIP App production deployment from the exact VIP App commit, with
   `GHOST_ADMIN_API_ORIGIN` set to the production website origin.
5. Verify Basic/PIN and synthetic/read-only flows.
6. Enable mutation flags only through a separately authorized, observed rollout.

If any check fails, keep or restore the two rollback deployments above and leave
all mutation flags OFF. Database rollback is forward-only: disable flags and
deploy a compatibility migration; do not reverse or delete applied migrations.
