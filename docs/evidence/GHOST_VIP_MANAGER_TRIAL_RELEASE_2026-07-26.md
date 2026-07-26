# GHOST VIP Manager Customer Trial Release — 2026-07-26

Status: GO / promoted  
Trial run: `trial-20260726-adaa919e0001`  
Customer URL: `https://ghost-vipapp.vercel.app/`  
Trial window: 2026-07-26 18:09 JST — 2026-07-29 18:09 JST  
Synthetic business date: 2026-07-27 JST

This release points the VIP App production alias at a production-target build
whose server proxy is pinned to the isolated Website staging deployment and
Supabase staging project. It does not change the Website production alias or
the production Supabase schema/data plane.

## Frozen lineage

| Surface | Canonical branch / source | Tree | Deployment |
|---|---|---|---|
| VIP App trial code | `codex/vip-manager-g0-5-20260726` / `2e41ebde4926b7faac96c8de2a5c09dcc66e0f1d` | `90ba4fd0dbd96722108e8c7b37b94db9f8f35a74` | `dpl_H7TmjM5VUnxaWrakZcq1cQRHtZfV` |
| Website trial backend | `codex/vip-manager-contract-v2-20260726` / `41dd0f9956127256239d9f364978dc9fd56db331` | `a52c0970afc1cfc3bae5c1b298c831ad9689e637` | `dpl_CowRobEHY49Aye2xyc9geWGNh5J9` |
| VIP rollback | old source `8dfecb401c235ca9fd97ca8d20b096de72518055` | — | `dpl_EaWM11t7saE1CLYgpvgBkQt7jPEi` |
| Website production, unchanged | — | — | `dpl_5RaU3Mpz8KanMeEnfcZK5b9NGFSP` |

VIP project: `prj_mchunQTOAeQMkn86A1zCtMapdVqp`  
Website project: `prj_ve4VBLGc7Ao5xqvepbEa06X7n8wM`  
Website staging custom environment: `env_vUQcWDESB7kRoq66c68KOPU4IIbG`  
Supabase staging: `rsvrtaavofflkvtfzsfh`  
Supabase production, unchanged: `cpfsrwctjymhmwvsbwdi`

The final CLI link was restored to production. Production exact counts after
promotion were 11 reservations, 11 customers, and 5 notification jobs;
`vip_floor_day_revisions` remained absent. No production migration or business
mutation was performed.

## Gate results

| Gate | Result | Evidence |
|---|---|---|
| TR-0 | PASS | Original alias `dpl_9Vh3knq1cBgnR48UNMxx7gM7j2NX` recorded; authenticated rollback anchor returned unauthenticated 401 and trial Basic 200; dirty main worktrees were not used for builds. |
| TR-1 | PASS | Trial cue/PII restrictions, server-only bypass, provider hard stops, deterministic seed/verify/cleanup, production-ref refusal, and v16/v17 trial lineage are implemented. |
| TR-2 | PASS | Staging migrations matched through `20260726181000`; seed and Owner PIN passed; repeated cleanup restored the 28-table pre-seed count/hash baseline with orphan 0; CLI link restored to production. |
| TR-3 | PASS | Website staging is READY with exact trial flags. Full candidate baseline plus the current real-host regression covered create/edit, five immediately writable commands, Walk-in, block cancellation, staff, Waitlist call/seat, customer relink, 409/idempotency, realtime/SLO, audit/revision, and provider delivery 0. Arrival-time write remains covered by the frozen candidate contract until the 2026-07-27 business date. |
| TR-4 | PASS | Aliasless production-target VIP build was READY; Basic/PIN/session/logout and canonical note/audit/revision/cleanup E2E passed against the final Website staging deployment. No VIP custom environment or trial API/UI fork exists. |
| TR-5 | PASS | `npm run ci` passed: lint, typecheck, 8 unit tests, 23 contract tests, PII scan, production build, and 40 views × 4 widths with axe 0, overflow 0, and undersized important controls 0. Chromium reduced-motion and the existing keyboard/focus/non-color contract passed. Real Safari/iPad was unavailable and is the first customer device witness. |
| TR-6 | PASS | `vercel promote` moved `ghost-vipapp.vercel.app` to `dpl_H7TmjM5VUnxaWrakZcq1cQRHtZfV`. Fixed-URL read-only smoke and the full synthetic mutation regression passed. VIP and Website 5xx/error log queries returned no entries. |
| TR-7 | PASS | Separate Basic/PIN handoff paths, trial window, rollback ID, customer scenario, and stop procedure are recorded below without secret values. |

Final staging state is the clean customer fixture: 8 trial tables, 12
reservations, 4 synthetic customers, 2 Waitlist entries, 2 blocks, 3 staff,
one pending recipient-safe outbox row, phone values 0, sent delivery 0, dead
outbox 0, realtime-gap metrics 0, and command-error metrics 0. The intentional
SLO attention metric was cleared after its Gate was witnessed.

## Credential handoff

Do not paste file contents into chat, tickets, logs, or browser storage.

- Basic authentication: `/tmp/ghost-vip-trial-20260726-adaa919e0001-basic.env`
- Owner PIN: `/tmp/ghost-vip-trial-20260726-adaa919e0001-pin.env`
- Operator lifecycle file: `/tmp/ghost-vip-trial-20260726-adaa919e0001-lifecycle.env`
- E2E operator file: `/tmp/ghost-vip-trial-20260726-adaa919e0001-e2e.env`
- Trial metadata: `/tmp/ghost-vip-trial-20260726-adaa919e0001-meta.json`

All credential-bearing files are outside the repositories and mode 600.
Basic authentication and Owner PIN must be shared through separate channels.

## 60–90 minute customer scenario

1. Open the fixed URL, confirm the persistent `TRIAL / 仮データ専用` cue, then authenticate with Basic and Owner PIN.
2. Select 2026-07-27 and spend 10 minutes switching List, Floor, and Chart views.
3. Spend 15 minutes creating an eight-step synthetic reservation, then edit its time, guests, and multi-table assignment.
4. Spend 10 minutes on arrival time, check-in, extension, service status, assignment, and staff note.
5. Spend 10 minutes creating a Walk-in and exercising Waitlist create/call/seat; inspect the pre-seeded expire/cancel examples.
6. Spend 10 minutes reviewing/cancelling a block, staff master/table assignment, and customer attributes/unlink/relink.
7. Spend 10 minutes on a two-tab 409 conflict, offline read-only state, reconnect/gap recovery, and the Owner SLO panel.
8. Confirm no real PII was entered, log out, and verify PIN is required again.

Use only generated `TRIAL` labels, `@example.com` email addresses, empty phone
fields, and the fixed non-PII notes. Safari/iPad is the first customer device
witness; record browser/OS, viewport, result, and any visual issue without
capturing credentials or customer fields.

## Trial stop / rollback

At 2026-07-29 18:09 JST, or immediately on a safety failure:

1. Disable Website staging admin/v2/customer mutation flags while keeping all provider/public/webhook/dual-write flags off.
2. Roll the VIP alias back to authenticated anchor `dpl_EaWM11t7saE1CLYgpvgBkQt7jPEi` and verify the fixed URL plus Basic 200.
3. Rotate/revoke VIP Basic, Owner PIN, and both Vercel protection bypass secrets.
4. Run the Website trial cleanup with the mode-600 lifecycle file and exact `trialRunId`; require orphan 0 and 28-table baseline restoration.
5. Recheck production exact counts (11/11/5), Website production alias `dpl_5RaU3Mpz8KanMeEnfcZK5b9NGFSP`, dead outbox 0, realtime gap 0, and 5xx 0.
6. Remove temporary credential/request files only after the Owner confirms the trial is closed.

Formal production data-plane cutover is a separate Gate. It requires a new
production-target build with trial mode false, production migrations/secrets,
provider preflight, backup/restore evidence, and fresh Owner approval; this
trial deployment must not be reused by changing environment values in place.
