# Final QA acceptance

Outcome: `COMPLETE_EXCEPT_PHYSICAL_WITNESS`

Observed: 2026-07-27 JST

All release requirements other than a physical iPad Safari witness are
complete.

## Production acceptance

- fixed VIP URL resolves to final deployment
  `dpl_CvFzDDArUGR8j7QyAUtXG9cQ6gxf`;
- fixed Website URL resolves to final deployment
  `dpl_Gj89YEqt6KSnxaL1fcatCpQ2Y75e`;
- exact Production Supabase ref and exact 25 migration head verified;
- encrypted Production logical backup and isolated PostgreSQL 17.6 restore:
  PASS;
- active/UI tables exact official eight; inactive history 2 and both 2+2
  reference sets preserved;
- Trial lineage/controls/T/TRIAL, canary fixture/control rows, action requests,
  orphans and temporary sessions: 0;
- provider sent baseline unchanged, pending jobs 0 and canary/log delivery
  delta 0;
- public read endpoints 200 and public booking write fail-closed 403;
- permanent Basic/PIN, fail-closed outer auth, session and logout: PASS;
- unexpected final console errors and deployment `5xx`: 0;
- authenticated rollback candidates and recovery procedure: PASS.

## Business mutation acceptance

Provider delivery remained OFF while Production canaries passed:

- reservation create/edit, stale-version `409` and Inspector;
- note, assignment, check-in, service status and seat extension;
- isolated successful arrival-time correction with DB persistence;
- Walk-in, Waitlist create/call/seat and block create/update/cancel;
- staff create/table assignment;
- customer base profile upsert, idempotent replay, stale-version `409`,
  attributes and unlink/relink;
- realtime gap/unavailable recovery, revision recovery, SLO and Inspector.

Every wave ran on synthetic `example.invalid` data, recorded exact cleanup IDs
before mutation and finished with fixture/orphan/provider delta 0. The
successful arrival control used one isolated `2099-12-31` event-day/slot after
proving there was no active business window; reservation, customer, revision,
slot and event-day rows were all removed immediately.

## Automated UI matrix

| Engine / viewport | Result |
|---|---|
| Chromium 1440×900 | PASS |
| Chromium 375×812 | PASS |
| Chromium 320×568 | PASS |
| WebKit iPad landscape 1194×834 | PASS |

List/Floor/Chart, queue, Inspector, primary 44px targets, overflow, long labels,
reduced motion, console, `5xx` and logout were checked. The local Playwright
WebKit host dependency was unavailable without sudo, so the WebKit MiniBrowser
was run against locally extracted runtime libraries; it passed.

## Single physical witness handoff

Named witness: Owner or delegated venue operator with a physical iPad.

Ten-minute checklist, once only:

1. open `https://ghost-vipapp.vercel.app` in landscape Safari;
2. confirm unauthenticated Basic prompt, then permanent Basic and Owner PIN;
3. open List, Floor and Chart directly and confirm no horizontal overflow;
4. select a queue item and open/close Inspector;
5. create and edit one clearly synthetic future reservation, execute one note
   command, then clean it up;
6. logout and confirm the PIN screen returns.

Record only pass/fail, device/iPadOS/Safari versions and timestamp. Do not
record credentials, customer data or screenshots containing private data.
