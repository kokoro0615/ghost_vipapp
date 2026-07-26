# PR-5 staging validation manifest

Status: `HOLD_STAGING_RELEASE_CANDIDATE_RUN`

Use a new synthetic release-candidate run on the isolated staging project,
referencing only `VIP-1` through `VIP-8`. Provider delivery, Stripe, LINE,
email and webhook execution must remain disabled.

The execution prompt orders PR-5 after Gate A cleanup and requires staging to
contain only the eight official tables. The frozen 2026-07-27 inventory still
contains Trial `T1` through `T8`, so no new staging mutation run was started.
Running the release-candidate fixture before exact-run cleanup would test the
wrong 16-table state and would invalidate this manifest.

The 03:43 JST read-only re-freeze also found that the old Trial run's seeded
`trial_attention_fixture` metric was absent while live board/realtime telemetry
continued to accumulate. No repair was made to the ending Trial. PR-5 must
create and later clean a fresh release-candidate lineage after Gate A, including
new SLO/alert evidence, rather than reusing this drifted Trial state.

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

## Fresh release-candidate harness prepared

The complete runner is now available as:

```text
npm run e2e:staging:release
scripts/staging-release-regression.mjs
SHA-256 c000dd6734debb4d78b3ce4411581e647a6fbd54216abf753b6b1e329ede8f03
```

Its Website lifecycle scripts are pinned to pushed Website commit
`9ea5a6b4930ea143a46bd9522aa0e9304591e4e8`:

| Script | SHA-256 |
|---|---|
| `seed-vip-manager-release-candidate.mjs` | `f4685ff07805bac034cef962b67d6b693b28b5e7fc4dde8ef19e2edd403e3c8c` |
| `expire-vip-manager-release-candidate-sessions.mjs` | `969172fbe7fa2cd56c6328dfb37da3e6890a024bfc53b87e59b149da968ab472` |
| `cleanup-vip-manager-trial.mjs` | `1e642963f532caf334bf02dc61f7b1d489e97213567aa243bc1b1261c03c2712` |
| `verify-vip-manager-release-candidate.mjs` | `117b81199897dba1e975843e53935fe39332729f8e66b675ac1e9804f1821444` |

The runner performs these fail-closed checks before its first business
mutation:

- mode-600 credential, release manifest and Website lifecycle environment
  files;
- a `trial-rc-*` lineage and different current/alternate business dates;
- canonical HTTPS VIP and Backend origins with SHA-256 fingerprints;
- separate exact VIP and Backend host confirmations;
- rejection of both customer-facing Production fixed hosts;
- exact lifecycle script names, non-symlink paths, a Website package root and
  manifest-pinned script SHA-256 values;
- equality of the synthetic Owner PIN sources without emitting the value;
- exact Japanese mutation confirmation and a method/path network allowlist.

After seeding, it verifies outer Basic auth, PIN login, forced exact-run
session expiry, re-login, official-table count and codes, reservation API
create/edit, stale-version `409`, the six commands, Walk-in, Waitlist, block,
staff assignment, customer profile/attributes/relink, realtime gap recovery
and SLO attention. Browser coverage includes List/Floor/Chart, the live
eight-step create and edit wizard, search, every status filter, Floor staff
filters, queue-to-Inspector selection, alternate date, offline read-only
recovery, console/5xx capture and logout.

Cleanup runs from `finally` even after a primary flow failure. A successful
run additionally requires all 28 exact-lineage table counts and the three
control-table counts to return to zero, baseline restore, official eight
tables unchanged, expected audit/metric actions present before cleanup, and
sent provider jobs equal to zero. Provider delivery must still be confirmed
separately from deployment logs before PR-5 can be marked PASS.

Static fail-closed contract tests pass `4/4`, including Production fixed URL
refusal before network, fresh RC lineage enforcement, script hash pinning and
secret non-output. The live staging run remains intentionally unexecuted:
Gate A has not restored staging to official `VIP-1` through `VIP-8` only, and
no cleanup authorization has been granted.

## Live execution prerequisites

Do not prepare credentials or start the runner until Gate A cleanup is
separately approved and verified. At execution time:

1. deploy the pushed Website candidate to the exact staging Supabase ref with
   Trial lineage protection enabled, all required admin/VIP/customer mutation
   flags enabled only on this isolated candidate, and all provider workers and
   delivery paths disabled;
2. deploy the pushed VIP candidate aliaslessly with
   `GHOST_VIP_TRIAL_MODE=false` and the exact staging Website origin;
3. create a fresh unused `trial-rc-*` ID and repo-external mode-600 credential,
   lifecycle and manifest files;
4. place the four exact script hashes above in `lifecycleScriptSha256`, and
   separately confirm both exact deployment hosts;
5. run `npm run e2e:staging:release`, inspect redacted output, query database
   sent-job count, and inspect both deployments' logs for provider delivery,
   console errors and `5xx`;
6. preserve only redacted evidence, then securely remove the temporary
   credential files.

The mode-600 release manifest schema is:

```json
{
  "trialRunId": "trial-rc-<fresh-id>",
  "businessDate": "YYYY-MM-DD",
  "alternateBusinessDate": "YYYY-MM-DD",
  "vip": {
    "origin": "https://<exact-vip-deployment-host>",
    "host": "<exact-vip-deployment-host>",
    "fingerprint": "<sha256-of-canonical-origin>"
  },
  "backend": {
    "origin": "https://<exact-backend-deployment-host>",
    "host": "<exact-backend-deployment-host>",
    "fingerprint": "<sha256-of-canonical-origin>"
  },
  "seedScript": "<absolute-website-worktree>/scripts/seed-vip-manager-release-candidate.mjs",
  "expireSessionsScript": "<absolute-website-worktree>/scripts/expire-vip-manager-release-candidate-sessions.mjs",
  "cleanupScript": "<absolute-website-worktree>/scripts/cleanup-vip-manager-trial.mjs",
  "verifyScript": "<absolute-website-worktree>/scripts/verify-vip-manager-release-candidate.mjs",
  "lifecycleScriptSha256": {
    "seedScript": "<sha256>",
    "expireSessionsScript": "<sha256>",
    "cleanupScript": "<sha256>",
    "verifyScript": "<sha256>"
  },
  "websiteLifecycleEnvFile": "<absolute-mode-600-lifecycle-env>"
}
```

The separate mode-600 runner environment must include Basic user/password,
the synthetic Owner PIN, protection bypass, exact Japanese confirmation, and
`GHOST_VIPAPP_RELEASE_VIP_HOST` /
`GHOST_VIPAPP_RELEASE_BACKEND_HOST`. The lifecycle environment must include
the exact staging Supabase URL/service key, admin hash salt, and the same PIN
as `GHOST_VIP_RELEASE_CANDIDATE_PIN`. Required customer encryption/search
keys belong on the isolated Backend deployment, not in this runner file.
Values are never written to this evidence tree.
