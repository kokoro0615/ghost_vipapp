# TableCheck VIP Floor Gate C source-lineage v4 — reconciliation continuation prompt

Date: 2026-07-21 JST

Status: exact Owner-authorized new-session handoff. The v4 authority is already frozen. It permits only
readback-bound reconciliation of the one exact existing custom-staging deployment and at most one update of the
one existing Stripe test webhook forward URL. It permits no new deployment, deployment deletion, Production
promotion, database write, business cycle, or Phase D start.

## How to use

Start a new primary-agent session in:

```text
/home/kokoro/projects/clients/ghost
```

Give the agent everything between **Prompt starts** and **Prompt ends**. No additional Owner approval is needed
for the exact v4 scope if every proposal, authorization, deployed-lineage, and existing-deployment byte/identity
below remains exact. Any scope expansion or invalidating drift requires a new exact proposal and separate direct
Owner authorization.

---

## Prompt starts

Resume TableCheck VIP Floor Gate C source-lineage reconciliation in
`/home/kokoro/projects/clients/ghost` as the sole state-transition operator. Work persistently until either:

1. the one exact existing custom-staging deployment is reconciled without deploying or deleting anything, fresh
   replacement tooling receives exactly 3/3 independent read-only ACCEPT, the one existing Stripe test webhook
   is forward-bound at most once, all final readbacks and audits complete, and one truthful atomic continuation
   terminal is published; or
2. a truthful fail-closed HOLD is published without exceeding any v4 ceiling.

Never report an unmet condition as PASS. Do not retry or replace the existing deployment. Do not start Phase D.
Preserve all unrelated dirty work.

### 1. Read completely before acting

Read these files in full before planning or editing:

- `AGENTS.md`
- `docs/AI_CURRENT_STATUS.md`
- the latest rows of `docs/AI_WORK_LOG.md`
- `docs/AI_AGENT_SYNC.md`
- `website/AGENTS.md`
- `.agents/skills/stripe-best-practices/SKILL.md`
- the Stripe security reference selected by that skill
- `website/docs/research/tablecheck-vip-floor-gate-c-source-lineage-v3-remediation-authorization-execution-prompt-2026-07-21.md`
- `website/docs/evidence/vip-floor-v2/gate-c-source-lineage-reconciliation-continuation-authorization-proposal-v4-20260721.json`
- `website/docs/evidence/vip-floor-v2/gate-c-source-lineage-reconciliation-continuation-owner-authorization-v4-20260721T092458+0900.json`
- `website/docs/evidence/vip-floor-v2/gate-c-source-lineage-terminal-hold-v5r10-20260721T001825.json`
- `website/docs/evidence/vip-floor-v2/gate-c-source-lineage-tooling-manifest-v5r10-20260721T090538+0900.json`
- `website/docs/evidence/vip-floor-v2/gate-c-source-lineage-tooling-review-v5r10-accept-20260721T090857+0900.json`
- `website/docs/evidence/vip-floor-v2/gate-c-source-lineage-staging-deploy-authorization-proposal-v3-20260721.json`
- `website/docs/evidence/vip-floor-v2/gate-c-source-lineage-staging-deploy-owner-authorization-v3-20260721T082256+0900.json`
- `website/docs/evidence/vip-floor-v2/gate-c-runtime-source-artifact-freeze-v4-20260721T081722+0900.json`
- `website/scripts/run-vip-floor-v2-gate-c-source-lineage-v5.mjs`
- `website/scripts/freeze-vip-floor-v2-gate-c-source-lineage-v5.mjs`
- `website/scripts/verify-vip-floor-v2-gate-c-source-lineage-v5.mjs`
- `website/scripts/lib/vip-floor-gate-c-source-lineage-v5.mjs`
- `website/scripts/lib/vip-floor-gate-c-source-lineage-executor-v5.mjs`
- `website/scripts/lib/vip-floor-gate-c-source-lineage-provider-v5.mjs`
- `website/scripts/lib/vip-floor-gate-c-private-journal-v5.mjs`
- `website/scripts/lib/vip-floor-gate-c-stripe-profile-v5.mjs`
- every directly or recursively imported active fixture, verifier, publisher, preflight, audit, runtime-auth, and
  privacy-scanner file discovered from those entry points

Inspect the outer workspace and `website/` repository status. Use `rg` and `rg --files` for discovery. Do not
commit, push, reset, clean, delete historical evidence, overwrite unrelated edits, or perform an external
mutation while researching or repairing the continuation tooling.

### 2. Verify the exact authority and starting bytes

Recompute, do not merely trust, these SHA-256 values:

```text
v4 reconciliation proposal:
8db307c05fd331f4832160dd63abf9f4355098dee3f5e900fd76924ce8420fc6

v4 direct Owner authorization:
ff31f1cac6691a430aa50f160b778cd5dedbbfc880f79dcce4f7728fed705cfd

v5r10 terminal HOLD:
c985c0cedc9c1737cb36aa056e707f5a5f0ed863ee5303cdde0d7eee2efe5fc1

v5r10 deployed-tooling manifest:
adced7474461f21bf7b1a45ac779d01cbd9090aad04e78e0cdb1473303a304e3

v5r10 exact 3/3 ACCEPT review:
ca5a9780da348d99929d8087d93b0582778d0b91ec07add94c1b8dad6ece01aa
```

The direct Owner authorization role code is exactly:

```text
OWNER_GATE_C_SOURCE_LINEAGE_RECONCILIATION_CONTINUATION_AUTHORIZATION_V4
```

Verify the Owner same-principal reference in the authorization evidence without copying or publishing the real
name. If the proposal, authorization, terminal HOLD, or exact existing deployment identity does not match, stop
at HOLD without mutation. The v4 authorization is exact and already complete; do not ask the Owner to repeat it
when all bytes remain exact.

### 3. Preserve the exact deployed lineage

The only deployment that may be reconciled is bound by all of these public one-way identities:

```text
deployment identity SHA-256:
0ff543f3d83bda9dc3471162d2fa69871643cb82a66abe6f4d117f0de7ecee76

deployment host SHA-256:
1906925967f71b0ba763191de38a9feb003613322865218332053fde1c70536c

custom environment identity SHA-256:
a901c9cae16b3be6a1e8f9cfb4fcb31c7332b00d20831d5a0a06aeea0c49c38e

deploy action id:
5020866a9d93fe6885d0b0d6841967152129e28985726e47e1272d9dab389ddf

runtime source SHA-256:
6f821dd51261d1ab168467564ff216073a0640ed7eb3429d2e41a8c883a402bc

migration SHA-256:
c2e751f183b8fb35e5bcf468366622b9f19298d6c5c8e086702f9b1a5f193272

prebuilt artifact SHA-256:
3aea5d804f8cb60f6a84c554140f45f043ac7c5c1d7be7303e0da9a3e1c7e218

provider-comparable manifest SHA-256:
3141ccbc5759325294af9a02055f7e7957709bd23d5959e8c87e0539b00bfd7a

exact tenant issuer identity SHA-256:
795f00cdf7452ec9e132b836236aaf3927b1a227b2799a73adf1854274d34330

installed jose executable tree SHA-256:
c9c166bc8e3719bab85542a7af691993548a9e4309aff146d01af07e33c55e03
```

The deployment metadata must continue to bind the old deployed-tooling manifest SHA
`adced7474461f21bf7b1a45ac779d01cbd9090aad04e78e0cdb1473303a304e3`. A new reconciliation-tooling manifest
is a separate operator-side manifest and must not be mistaken for deployed metadata.

Do not rebuild the artifact, alter runtime source, migration, provider manifest, issuer identity, proposal, or
authorization. Before making a tooling-only edit, prove that the edited byte is outside all frozen runtime
source/artifact/provider closures. If it is not outside those closures, v4 is invalidated: make no mutation and
request a new exact proposal/authorization instead. Additive reconciliation-only tooling changes are allowed
only when they preserve every exact deployed-lineage byte above and are subsequently frozen and reviewed.

### 4. Enforce the v4 mutation ceilings in executable code

Treat these as hard executable limits, not explanatory policy:

```text
historical total staging deploy count: 1
new staging deploy maximum under v4: 0
deployment delete maximum: 0
Production alias/promotion maximum: 0
existing test webhook forward update maximum: 1
webhook create maximum: 0
webhook delete maximum: 0
webhook signing-secret rotation maximum: 0
authenticated webhook compensation maximum: 1
DB write maximum: 0
Production mutation maximum: 0
Preview mutation maximum: 0
LINE mutation maximum: 0
UI mutation maximum: 0
customer-data mutation maximum: 0
business-cycle maximum: 0
live Stripe mutation maximum: 0
Phase D start: false
```

Create an additive replacement version, such as v5r11 or v6. Do not edit historical evidence. The replacement
driver/executor/provider/verifier must structurally remove or disable every deploy and deployment-delete call
path. A configuration flag or comment is insufficient: any attempt, fixture, resume path, stale journal branch,
or adapter call that could invoke deploy/delete must fail before provider mutation. The count verifier must
require `newDeployCount === 0` and `deploymentDeleteCount === 0`; it must not inherit the old `deployCount <= 1`
contract as permission for a second call.

### 5. Reconcile the historical unknown deployment without mutation

The v3 deploy maximum was consumed. The prior private journal recorded an unknown deploy outcome, followed by
authenticated discovery of the exact READY deployment. Reconcile it as follows:

- Locate it through authenticated exhaustive read APIs using both the exact action id and deployment identity.
- Require exact READY state, exact custom environment `staging`, exact project/team boundary, exact metadata,
  exact source/migration/artifact/provider/issuer/deployed-tooling identities, and exact provider file count and
  tree equality.
- Record an authenticated recovered receipt in an additive continuation journal without calling deploy again.
- Keep the historical audit fact that the original call had an uncertain response; do not erase or rewrite old
  journal/evidence. Total historical deploy count remains 1 and v4 new deploy count remains 0.
- If lookup is absent, ambiguous, incomplete, paginated without proved exhaustion, or returns any different
  identity or metadata, publish HOLD with no mutation. Never create a replacement and never delete the existing
  deployment.

Use a new private continuation journal with durable exclusive locking, hash chaining, owner/mode/link/symlink
checks, intent-before-call, receipt/readback, crash-resume, and conservative unknown-outcome accounting. Do not
make the old journal fit by rewriting history.

### 6. Reconcile the custom-staging alias exactly

The provider assigned exactly one automatic alias to the exact custom-staging deployment. v4 accepts only this
specific provider behavior:

- exactly one alias must be present;
- it must be provider-assigned/declared by the exact deployment or exact custom `staging` environment;
- it must resolve only to the exact existing deployment;
- it must be a staging/custom-environment alias, not a Production, Preview-environment, branch, or unknown alias;
- Production alias matches and Production promotions must both be exactly 0;
- zero aliases, multiple aliases, a user-assigned alias, an undeclared alias, a wrong target, or an unknown
  classification requires HOLD without mutation.

The accepted alias is not permission to add, move, remove, or normalize an alias. All alias APIs in this
continuation are read-only.

The webhook target remains the canonical exact deployment host plus the fixed webhook path and one fixed bypass
query key. Do not silently substitute the provider-assigned alias. Validate HTTPS, no userinfo, no port, exact
host identity, exact path, exactly one query key/value identity, and no fragment before any Stripe update.

### 7. Reconcile Preview inventory by identity, not by count

Authenticated baseline evidence showed raw Preview deployment inventory count 3 before the v3 call and 4 after
it because the provider includes this custom-staging deployment in `target=preview` inventory. v4 accepts that
classification delta only for the exact existing deployment identity.

Implement two explicit views:

1. raw exhaustive provider inventory, retained and hash-bound exactly as returned after normalization; and
2. mutation-invariant Preview inventory, produced only by removing the one authorized exact staging deployment
   identity from the raw set.

The normalized invariant baseline/final sets must be identical. Do not permit a generic `+1`, count tolerance,
target-name wildcard, or any arbitrary exclusion. Fail closed if the raw inventory has an extra or missing
identity, if the authorized identity occurs zero or multiple times, if its environment/target/metadata changes,
if any other Preview deployment changes, or if pagination/cursor exhaustion is unproved. This accepted provider
classification is not a Preview mutation authorization; `previewMutationCount` remains exactly 0.

Production and Preview inventories must use authenticated exhaustive pagination with cursor-loop, repeated-page,
duplicate-identity, truncation, and hidden-later-page rejection. LINE and the exact Preview environment
configuration remain strictly invariant.

### 8. Preserve all source-lineage and runtime gates

Before any Stripe write, freshly prove:

- the exact existing deployment/action/custom environment and the one accepted alias classification;
- exact deployment metadata and provider artifact tree, including provider artifact file count 1953;
- staging-only OIDC RS256/JWKS verification, mandatory valid `exp`, exact audience/subject/target/project/team,
  and the one exact tenant issuer identity;
- runtime HTTP 200 and exact deployment/source/issuer identities;
- all nine application flags are configured false and raw-disabled;
- staging database migrations are exact, dual-write is false, and DB writes remain 0;
- exhaustive Production/Preview/LINE baselines and the exact Preview identity classification exception;
- the dedicated least-privilege, test-only, future-valid restricted Stripe profile without exposing the key;
- exact Stripe test account/profile identity;
- exactly one existing test webhook with the exact 13-event set, and no current forward binding to a different
  unauthorized target;
- exact proposal, authorization, historical terminal, deployed-tooling manifest, and new reconciliation manifest
  bytes.

Any unknown or drifted value requires HOLD without mutation.

### 9. Build comprehensive positive and negative fixtures

Retain every applicable v5r10 fixture and add at least:

- positive exact existing READY deployment/action/custom-staging environment reconciliation with no deploy call;
- positive exactly-one provider-assigned declared staging alias;
- positive raw Preview 3-to-4 classification where the sole delta is the exact authorized deployment identity;
- wrong/missing/duplicate deployment identity, action id, project/team, metadata, source, artifact, provider,
  issuer, deployed-tooling manifest, READY state, custom environment, and provider file-tree negatives;
- zero/multiple/user-assigned/undeclared/wrong-target/Production/Preview/unknown alias negatives;
- extra Preview identity, removed baseline identity, duplicate authorized identity, wrong target/environment,
  later-page hidden change, cursor loop, repeated page, and truncation negatives;
- deploy and deployment-delete adapter booby traps proving failure before any provider call;
- stale old executor, resume, compensation, or journal paths attempting deploy/delete;
- webhook zero/multiple endpoint, event-set drift, account/profile drift, live/ambient/non-restricted/expired key,
  canonical host/path/query/userinfo/port/fragment errors;
- webhook response loss before/after provider write, authenticated reconciliation, compensation response loss,
  compensation failure, and crash at every mutation/finalization boundary;
- source/migration/artifact/provider/issuer/proposal/authorization/new-manifest drift;
- OIDC signature/algorithm/JWKS/audience/subject/target/project/team/issuer/expiration/tamper failures;
- DB, flag, runtime, Production, Preview, LINE, privacy, preflight, normal-audit, and require-pass failures.

Fixtures must assert actual provider mutation call counts. A test that only checks the final public count is not
sufficient.

### 10. Validate and freeze a complete reconciliation manifest

Run and preserve real exit codes for syntax, target ESLint, `npx tsc --noEmit`, VIP/API static contracts, OIDC
fixtures, source-lineage and reconciliation fixtures, atomic-publication and exhaustive-inventory fixtures,
Stripe profile/webhook negatives, exact frozen-lineage verification, and public privacy scans.

Create an additive complete manifest that recursively includes every execution-relevant byte:

- new driver, executor, provider adapter, continuation journal/private writer, final publisher;
- authorization/count/alias/Preview-classification verifiers;
- active OIDC/runtime/auth/flag source and exact installed `jose` executable closure;
- preflight, normal/require-pass audits, public privacy scanner, all fixtures and fixture dependencies;
- exact v4 proposal and authorization;
- v5r10 terminal HOLD, deployed-tooling manifest/review, v3 proposal/authorization, and source-artifact freeze;
- this continuation prompt;
- exact binaries and complete required package/dependency trees;
- one-way project/team/account/webhook/deployment/custom-environment/bypass/issuer identities;
- all ceilings, exact existing-deployment bindings, and the separation between the deployed-tooling manifest and
  new reconciliation-tooling manifest.

The generator must recursively discover local imports/configs/fixtures and reject omissions. Recompute all file,
binary, package, and tree hashes after freeze. Run a negative fixture proving an omitted active dependency fails.
Run the executable privacy scanner over every public candidate; public findings must be 0.

### 11. Obtain exactly three independent read-only ACCEPT reviews

Give the exact same immutable manifest bytes to exactly these roles:

1. `provenance`
2. `runtime`
3. `security`

Each reviewer must independently recompute the manifest and all referenced hashes, receive no secret/raw private
value, edit no file, and perform no provider mutation. Require exactly:

```text
independent: true
readOnly: true
decision: ACCEPT
blockingFindingCount: 0
```

Any REJECT means external mutation 0 for that candidate: save a versioned rejection, repair additively, rerun all
validation, freeze a new manifest, and obtain fresh reviews from all three roles. Never carry an old ACCEPT to new
bytes. If a repair touches any frozen runtime source/artifact/provider/proposal/authorization byte, v4 no longer
authorizes execution; stop for a new exact Owner authorization.

### 12. Execute only after fresh 3/3 ACCEPT

Immediately before execution, reverify all exact hashes, private file boundaries, restricted Stripe profile,
complete external baseline, fresh preflight inputs, no deploy/delete callable path, ceilings, journal/lock, and
3/3 ACCEPT. Then use only the frozen continuation driver in this order:

1. Read exhaustive authenticated Production/Preview/LINE and exact Preview-environment baselines.
2. Read staging DB/migrations/dual-write and all-nine project-config/runtime flag baselines.
3. Read exactly one Stripe test webhook, exact account/profile and exact 13-event set; preserve its private prior
   target only inside the 0600 journal.
4. Reconcile the exact existing deployment/action through authenticated exhaustive readback; make no deploy or
   delete call.
5. Verify exact alias classification and both raw and invariant Preview inventory views.
6. Verify exact provider artifact tree, deployed metadata, OIDC runtime, source, issuer, flags, and DB posture.
7. Build and privately validate the canonical exact-deployment webhook target.
8. Update the one existing test webhook forward URL at most once. Never create/delete a webhook or rotate its
   signing secret.
9. Authenticated read back exact-one webhook, exact event set, and exact target.
10. Re-read exhaustive Production/Preview/LINE, Preview environment, DB, flags, runtime, alias, and deployment;
    enforce the exact identity-bound Preview classification exception and all zero-mutation ceilings.
11. Run fresh standard preflight bound to every exact identity, new manifest/review, and final readback.
12. Run the public privacy scan, normal audit, require-pass audit, then one final authenticated readback.
13. Atomically publish exactly one new truthful terminal continuation record by same-filesystem rename.

Journal webhook intent before the call and authenticated receipt/readback afterward. If the response is lost,
reconcile the exact existing endpoint before considering any retry. An unprovable outcome consumes the one update
maximum, enters `uncertainOutcomes`, forbids retry, and requires HOLD/new authorization.

If a failure occurs after the webhook changed, use the separately authorized authenticated compensation maximum
1 to restore the prior private target. Journal intent before compensation, reconcile on response loss, read back
the exact restored endpoint and all invariants, and atomically publish only the compensated HOLD. If compensation
cannot be proved, publish an unknown-outcome HOLD; never attempt a second compensation and never deploy/delete.

### 13. Atomic evidence, privacy, and secret boundaries

- Private operational directory: current owner, mode 0700.
- Credentials, raw responses/URLs/IDs, private paths, OIDC tokens, bypass values, prior webhook target, and
  journals: mode 0600, one hard link, never symlinks.
- Never print, publish, or place in command arguments credentials, auth headers, cookies, Stripe keys/signatures,
  raw issuer/webhook/deployment URLs, query values, account/endpoint/deployment/team/project IDs, private paths,
  customer data, ciphertext, notes, or raw provider responses.
- Reject ambient credentials. Use only the dedicated least-privilege test restricted profile required by the
  frozen contract.
- Public evidence may contain only allowlisted counts, booleans, decisions, timestamps, exit codes, and one-way
  hashes. Run negative scanner fixtures plus the real scanner before publication.
- Public terminal publication is one atomic current-state transition. Historical evidence remains immutable.
  A checkpoint is not terminal success.

Create versioned sanitized evidence for candidate verification, manifest, every review round, reconciliation,
alias/Preview classification, webhook/compensation, final readbacks, preflight, privacy, audits, and terminal
decision. Preserve actual exit codes and conservative counts.

### 14. Gate decision and final report

This v4 continuation can complete source-lineage reconciliation, but it does not authorize the governed runtime
business cycle or signatures still required for overall Gate C PASS. Unless those requirements were separately
and exactly satisfied, the truthful successful terminal is `LINEAGE_RECONCILED_GATE_C_HOLD`, Gate C remains
`HOLD`, and `phaseDStarted` remains false. Do not label it Gate C PASS.

Under the current audit contract, normal audit should exit 0 with `auditValid=true`; require-pass is expected to
exit 2 with `auditValid=true` because separately governed business-cycle/signature requirements remain. Do not
force either result. If the audit contract or real state says otherwise, report the actual exit and fail closed.

Update `docs/AI_CURRENT_STATUS.md` whenever active state/next action changes and append a compact row to
`docs/AI_WORK_LOG.md` at every durable checkpoint and before the final response.

Report concisely:

- v4 proposal and direct authorization paths/SHAs;
- exact existing deployment/action/custom-environment/deployed-lineage identity matches;
- new reconciliation manifest path/SHA and file/binary/tree counts;
- provenance/runtime/security decisions and review evidence SHA;
- historical deploy total, v4 new deploy, deployment delete, webhook forward, compensation, create, delete, and
  secret-rotation counts;
- exact alias count/classification and Production alias/promotion count;
- raw and invariant Preview inventory results plus Production/Preview/LINE/UI mutation counts;
- DB writes, migrations, dual-write posture, runtime HTTP/source/target/issuer/nine-flag readback;
- exact-one Stripe test webhook/event-set/target readback;
- fresh preflight exit/decision/SHA, privacy findings, normal/require-pass audit exits and `auditValid`;
- uncertain outcomes, atomic terminal path/SHA, current Gate C decision, and whether Phase D started.

If blocked, state the exact blocker and every confirmed mutation count. Never ask the Owner to disclose a secret,
URL, provider ID, token, or private path.

## Prompt ends
