# PR-5 staging validation manifest

Status: `PASS`

Observed: 2026-07-27 JST

The final synthetic run was `trial-rc-20260727-final01` on isolated staging
project `rsvrtaavofflkvtfzsfh`.

| Component | Exact candidate |
|---|---|
| VIP App | `dpl_Do32cFti93o7dYGmk6pgLK5TWaBn` |
| Website backend | `dpl_FXyvZS4fFDSNBs4vxiqX1rL21jrx` |

Before the final run, a targeted audit found one deterministic harness gap:
the verifier required `customer_profile.upserted`, but the runner only
exercised customer attributes. The runner was changed to execute the existing
base-profile upsert API, replay the same idempotency key, and verify the
expected stale-version `409`. Targeted verification passed before one final
full run; completed Gates were not replayed.

## Authenticated flow

The final runner and independent verifier passed:

- outer Basic guard, PIN login, forced exact-run session expiry, re-login and
  logout;
- current and alternate business dates, search and every status filter;
- direct List, Floor and Chart navigation, queue and Inspector selection;
- eight-step reservation create and edit with stale-version `409`;
- check-in, arrival time, service status, assignment, extension and note;
- Walk-in, Waitlist create/call/seat and block create/update/cancel;
- staff create/table assignment and customer profile/attributes/relink;
- realtime revision/gap recovery, offline read-only recovery and conflict
  recovery;
- SLO/attention, required audit actions, revision/version and metrics;
- browser console errors 0 and unexpected deployment `5xx` 0.

## Cleanup proof

The exact-run cleanup and independent verifier returned:

- all 28 run-lineage table counts: 0;
- control rows, sessions and orphans: 0;
- Trial `T`/`TRIAL` seats and sections: 0;
- official active tables: exact `VIP-1` through `VIP-8`;
- baseline hash restored:
  `08abb1b2b04bea013263fc367f34164183bcc12411d5c6b3150f535a3b61abcf`;
- provider sent jobs and provider delivery logs: 0;
- candidate `5xx`: 0.

The release-only PR-5 protection bypasses were revoked after Production
stability. `GHOST_VIP_TRIAL_RUN_ID` was removed from the staging environment.
Only redacted evidence is retained; runner credentials and raw manifests are
temporary assets scheduled for secure deletion at R7.
