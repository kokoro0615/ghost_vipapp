# PR-5 staging validation manifest

Status: `HOLD_STAGING_RELEASE_CANDIDATE_RUN`

Use a new synthetic release-candidate run on the isolated staging project,
referencing only `VIP-1` through `VIP-8`. Provider delivery, Stripe, LINE,
email and webhook execution must remain disabled.

Required authenticated flow:

1. login, session expiry and logout;
2. current/alternate business date, local search and every filter;
3. List, Floor and Chart direct navigation; queue/Inspector selection sync;
4. reservation create eight steps and reservation edit;
5. check-in, arrival time, service status, assignment, extension and note;
6. Walk-in, Waitlist create/call/seat, block create/update/cancel;
7. staff master/table assignment and customer search/write/relink;
8. realtime revision, gap recovery, offline read-only and conflict recovery;
9. SLO/alert, audit/revision delta, cleanup and restore.

Pass requires run-lineage cleanup row zero, orphan zero, baseline hash restored,
provider delivery zero in both database and logs, console/5xx zero, and
`npm run ci`. The existing `staging-mutation-e2e.mjs` is a narrow canonical
note/cleanup safety probe; it is not evidence for this complete manifest.
