# TableCheck VIP Floor Gate C source-lineage v3 — remediation, authorization, and execution prompt

Date: 2026-07-21 JST

Status: Owner-authorized remediation handoff. This document authorizes repair, local rebuild/refreeze,
read-only discovery, proposal preparation, and independent review preparation. It does not itself authorize an
external mutation against future source/artifact/proposal bytes that did not exist when the Owner message was
sent. The exact v3 execution authorization checkpoint below remains mandatory.

## How to use

Start or resume a primary-agent session in:

```text
/home/kokoro/projects/clients/ghost
```

Give the agent everything between **Prompt starts** and **Prompt ends**. The same session may continue after the
Owner supplies the exact v3 authorization response requested at the checkpoint.

---

## Prompt starts

Resume TableCheck VIP Floor Gate C source-lineage remediation in
`/home/kokoro/projects/clients/ghost` as the sole state-transition operator. Work persistently until either:

1. all five v5r5 blockers are repaired, a new exact lineage and proposal are frozen, exact v3 Owner
   authorization is received, replacement tooling receives 3/3 independent read-only ACCEPT, and the authorized
   all-off staging source-lineage execution finishes with complete readback; or
2. a truthful fail-closed HOLD is reached.

Never report an unmet condition as PASS. Do not infer authorization for unknown future hashes. Do not start
Phase D before Gate C truthfully passes. Preserve every unrelated dirty change.

### 1. Read completely before acting

Read these files in full before planning or editing:

- `AGENTS.md`
- `docs/AI_CURRENT_STATUS.md`
- latest rows of `docs/AI_WORK_LOG.md`
- `docs/AI_AGENT_SYNC.md`
- `website/AGENTS.md`
- `.agents/skills/stripe-best-practices/SKILL.md`
- the Stripe security reference selected by that skill
- `website/docs/research/tablecheck-vip-floor-gate-c-source-lineage-v2-resume-prompt-2026-07-21.md`
- `website/docs/evidence/vip-floor-v2/gate-c-source-lineage-v5r6-remediation-owner-directive-v1-20260721T074601+0900.json`
- `website/docs/evidence/vip-floor-v2/gate-c-source-lineage-staging-deploy-authorization-proposal-v2-20260721.json`
- `website/docs/evidence/vip-floor-v2/gate-c-source-lineage-staging-deploy-owner-authorization-v2-20260721T070827+0900.json`
- `website/docs/evidence/vip-floor-v2/gate-c-source-lineage-tooling-manifest-v5r5-20260721T073021+0900.json`
- `website/docs/evidence/vip-floor-v2/gate-c-source-lineage-tooling-review-v5r5-reject-20260721T073823+0900.json`
- `website/docs/evidence/vip-floor-v2/gate-c-source-lineage-execution-v5r5-hold-review-reject-20260721T073823+0900.json`
- `website/docs/evidence/vip-floor-v2/gate-c-runtime-source-readback-instrumentation-result-v1-20260721T070150+0900.json`
- `website/docs/evidence/vip-floor-v2/gate-c-runtime-source-artifact-freeze-v3-20260721T070150+0900.json`
- `website/scripts/run-vip-floor-v2-gate-c-source-lineage-v5.mjs`
- `website/scripts/freeze-vip-floor-v2-gate-c-source-lineage-v5.mjs`
- `website/scripts/verify-vip-floor-v2-gate-c-source-lineage-v5.mjs`
- `website/scripts/verify-vip-floor-v2-runtime-oidc.mjs`
- `website/scripts/lib/vip-floor-gate-c-source-lineage-v5.mjs`
- `website/scripts/lib/vip-floor-gate-c-source-lineage-executor-v5.mjs`
- `website/scripts/lib/vip-floor-gate-c-source-lineage-provider-v5.mjs`
- `website/scripts/lib/vip-floor-gate-c-private-journal-v5.mjs`
- `website/scripts/lib/vip-floor-gate-c-stripe-profile-v5.mjs`
- `website/src/lib/server/vercelOperatorOidc.mjs`
- `website/src/lib/server/internalAuth.ts`
- `website/src/lib/server/featureFlags.ts`
- `website/src/app/api/admin/runtime/flags/route.ts`

Inspect both the outer workspace and `website/` repository status. Use `rg`/`rg --files` for discovery. Do not
commit, push, reset, clean, delete historical evidence, checkout over, or deploy unrelated work.

### 2. Exact starting evidence and authority

Verify these exact bytes before relying on them:

```text
v5r5 manifest SHA-256:
47f76a419f32d1cf619890ee16d79533756a06a49d91fd17debee14d808c0230

v5r5 rejection SHA-256:
ced5f9dff0e0b69f36e6c0688823cb3b71a0d07fc95f869f89fd648761279108

v5r5 HOLD SHA-256:
99b2f357ab1eaa21fa71fb305a95e3ba41af7d757b48441324d842304e9a678a

remediation Owner directive SHA-256:
4ec6e43d2708c527f0cec1d9b905b998bc37d87a2fb67638742b8931bf9d0167
```

The Owner's current direct message authorizes:

- repairing all five v5r5 blocking findings;
- modifying runtime source and active tooling;
- adding fixtures and fail-closed verification;
- rebuilding an isolated staging prebuilt artifact;
- freezing new source/migration/artifact/provider lineage;
- authenticated read-only provider discovery;
- creating a new exact execution proposal;
- preparing a complete manifest and exactly three independent reviews;
- sanitized evidence and shared status/log updates.

It does not authorize an external mutation before the future exact lineage and exact proposal SHA exist. A prior
message must not be converted into an exact approval for bytes that did not exist at that time. The old v2
authorization and old source/artifact/provider lineage are superseded for future execution and must not be reused.

Until the exact v3 authorization checkpoint completes, all counts must remain:

```text
staging deploy 0
Stripe webhook mutation 0
DB write 0
Production alias 0
Production 0
Preview 0
LINE 0
UI 0
customer-data mutation 0
business-cycle execution 0
```

### 3. Repair all five v5r5 blockers additively

Do not weaken existing contracts merely to make tests pass. Retain historical evidence unchanged. Begin with a
new additive candidate version such as v5r6; increment again after any rejected frozen review.

#### 3.1 Freeze installed OIDC executable bytes

- Resolve the actual executable `jose` package and every package file reachable by the runtime import path.
- Include their exact bytes, package metadata, package root identity, and dependency tree hash in the manifest.
- Bind runtime resolution to the frozen package root and reject missing, alternate, symlinked, wrong-owner, or
  drifted executable bytes.
- Keep `jose` exact-pinned. A lockfile by itself is not proof of installed executable bytes.
- Add a negative fixture that changes an imported executable byte while leaving the lockfile unchanged.

#### 3.2 Make final public success publication atomic

- Treat deploy/webhook/readback/audit states before terminal success as non-final checkpoints.
- Complete authenticated final deployment readback, webhook readback, invariance checks, privacy scan, normal
  audit, and require-pass audit before publishing a forward-state terminal success record.
- Publish terminal public evidence through an atomic same-filesystem write/rename or an equally durable
  single-commit mechanism.
- If a later step fails, journal and authenticate compensation first, read back the compensated state, then
  publish only the terminal compensated/HOLD state. No stale public file may claim a forward state is current.
- Crash-resume must converge to one truthful terminal state without duplicate mutation.
- Add failure-injection fixtures at every boundary between forward mutation, audits, final readback,
  compensation, and public publication.

#### 3.3 Make Production and Preview inventory exhaustive

- Page authenticated Vercel deployment inventory until the provider proves exhaustion for both Production and
  Preview scopes; a single default/max page is insufficient.
- Validate cursor progression, reject loops/repeated cursors/truncation, deduplicate exact deployment identities,
  and bind the complete baseline and final inventory hashes.
- Add multi-page positive fixtures and hidden-change-on-later-page, cursor-loop, duplicate, and response-loss
  negatives.

#### 3.4 Require OIDC expiration

- Require an `exp` NumericDate claim; missing, malformed, non-finite, already expired, or unacceptable lifetime
  must fail closed.
- Continue enforcing RS256 signature/JWKS, audience, subject, target, project/team, and all existing claim gates.
- Add signed missing-`exp`, malformed-`exp`, expired, and boundary fixtures.

#### 3.5 Pin the exact authorized Vercel tenant issuer

- Compare the verified token issuer against one exact authorized tenant issuer, not merely a trusted host plus
  one path segment and not a value learned from the same untrusted token.
- Bind the raw expected issuer inside the private execution/runtime boundary and expose only its one-way identity
  hash in public evidence.
- Bind that issuer identity hash to authenticated Vercel team/project discovery, the proposal, authorization,
  manifest, deployment, runtime readback, preflight, and audits.
- Reject a correctly signed token for any other tenant under the trusted Vercel issuer host.

### 4. Verify and freeze a new exact lineage

After repairing the source/tooling, run and record real exit codes for:

- syntax and target ESLint;
- `npx tsc --noEmit`;
- VIP static and API static contracts;
- OIDC positive and negative fixtures;
- complete source-lineage fixture/negative suite;
- atomic-finalization and exhaustive-inventory fixtures;
- exact workspace/build source and migration equality;
- installed `jose` executable closure verification;
- isolated staging-target prebuilt build;
- exact artifact and provider-comparable manifests;
- privacy scanner fixtures and the real public privacy scan.

The candidate must also retain fail-closed coverage for authorization drift, binary/dependency drift, review role
or count errors, private file boundaries, ambient/non-RAK/live/expired Stripe credentials, wrong account or
webhook count/event set, noncanonical host/path/query/userinfo, lock/journal/crash/unknown outcomes, failed
compensation, Production/Preview/LINE changes, OIDC algorithm/audience/subject/project/team/target/tamper errors,
runtime source/flag/DB errors, stale preflight/audit/provider/action/deployment bindings, and public evidence leaks.

Generate and freeze new exact values for:

```text
source SHA-256
migration SHA-256
artifact SHA-256
provider-comparable manifest SHA-256
exact tenant issuer identity SHA-256
```

Locate private artifact roots and raw provider identities without printing or publishing them. Run the executable
privacy scanner before every public checkpoint. If any required validation fails, stop or repair additively; do
not prepare an execution proposal for failing bytes.

### 5. Create the exact v3 proposal, then stop for exact Owner authorization

Once the new lineage exists, create a versioned v3 proposal whose exact bytes bind:

- all new lineage hashes and source/artifact freeze evidence;
- the exact issuer identity hash;
- the five remediation closures and required negative fixtures;
- complete-manifest and 3/3-review preconditions;
- exact Vercel team/project/staging and Stripe test-account/webhook identity hashes;
- one isolated prebuilt deployment to Vercel target `staging` maximum;
- Production alias/promotion maximum 0;
- all nine application flags exactly false;
- runtime source SHA equal to the new exact source;
- DB write maximum 0 and DB dual-write false;
- update of the one existing Stripe test webhook forward URL maximum 1;
- webhook create/delete/signing-secret rotation maximum 0;
- authenticated compensating rebind maximum 1 when required;
- customer-data, Production, Preview, LINE, UI, live Stripe, business-cycle, and Phase D mutation forbidden;
- authenticated final readback, privacy scan, fresh preflight, normal audit, and require-pass audit.

Hash the exact proposal bytes. Report the full proposal path and SHA and ask the Owner for one separate direct
message containing both exact lines:

```text
OWNER_GATE_C_SOURCE_LINEAGE_STAGING_DEPLOY_AUTHORIZATION_V3
proposal SHA: <full 64-character SHA-256>
```

Stop with external mutation 0 until that exact response is received. The Owner's earlier approval intent is
recorded, but it is not a substitute for exact-byte approval. Do not ask the Owner to disclose any credential,
URL, provider ID, token, or private path.

### 6. Freeze exact v3 authorization evidence

After receiving the exact direct response:

- verify the proposal bytes and SHA again;
- verify the same-principal Owner reference without copying the real name into public evidence;
- create additive v3 authorization evidence containing the exact proposal path/SHA, role code, new lineage,
  issuer identity hash, mutation ceilings, forbidden scopes, compensation, and readback/audit requirements;
- record that it is a direct human message and not an AI proxy;
- run the public privacy scanner and freeze the authorization SHA;
- update every active executable constant/path to the exact v3 proposal/authorization/new lineage values.

Any source, migration, artifact, provider, proposal, or authorization change after this point invalidates the
authorization. Do not rebuild or silently regenerate after exact authorization.

### 7. Freeze the complete executable manifest

Create an additive replacement manifest containing every execution-relevant byte, including:

- driver, executor, provider adapter, private writer/journal, Stripe profile adapter;
- OIDC source, runtime route/auth/flag source and exact installed OIDC executable closure;
- verifier plus every positive/negative/failure-injection fixture;
- finalization publisher, exhaustive inventory, preflight, privacy scanner, and audit code;
- exact proposal, exact authorization, remediation directive, new freeze evidence, and superseded v5r5 finding;
- exact Node/Vercel/Stripe/Supabase/Git binaries;
- complete required Vercel/Supabase dependency trees;
- exact hashed project/team/account/webhook/bypass/issuer identities;
- new source/migration/artifact/provider hashes and mutation ceilings.

The generator must recursively discover the active local import/fixture/config closure and fail on omissions. It
must not rely on a manually stale allowlist. Recompute every file, binary, package, and tree hash after writing the
manifest. Record file/binary/tree counts and privacy findings.

### 8. Exactly three independent read-only reviews

Provide the exact same immutable manifest bytes to exactly these three independent reviewers:

1. `provenance`
2. `runtime`
3. `security`

Each reviewer independently recomputes the manifest SHA and all file/binary/dependency hashes, reviews every one
of the five v5r5 closures, receives no secrets/private paths/raw provider data, edits no files, and performs no
provider mutation. Require every review row to contain:

```text
independent: true
readOnly: true
decision: ACCEPT
blockingFindingCount: 0
```

Any REJECT means external mutation 0: publish a versioned rejection, repair additively, rerun all verification,
create a new manifest, and obtain fresh reviews from all three roles. Never carry forward an older ACCEPT. If a
repair changes authorized source/artifact/provider/proposal bytes, obtain a new exact Owner authorization too.

### 9. Execute only after exact authorization and 3/3 ACCEPT

Immediately before execution, reverify exact proposal, authorization, manifest, review, source, migration,
artifact, provider, issuer identity, installed dependency closure, private boundaries, Stripe RAK/test account,
exactly-one webhook/13-event set, Vercel/Supabase identities, lock/journal, mutation budgets, and external baseline.

Execute through the exact frozen driver in this durable order:

1. exhaustive authenticated Production/Preview/LINE baseline;
2. authenticated staging DB baseline, migrations exact, dual-write false;
3. authenticated staging project config baseline, all nine flags false;
4. exact-one Stripe test webhook baseline and previous target;
5. exhaustive action-id deployment reconciliation;
6. at most one exact prebuilt staging deploy, no alias, exact metadata/env binding;
7. authenticated provider file-tree and deployment metadata equality;
8. staging-only OIDC runtime readback proving exact tenant/source/target, nine configured/raw false flags, DB false;
9. at most one update of the existing webhook forward URL to the canonical deployment host and fixed path/query;
10. authenticated exact-one webhook/event-set/target readback;
11. exhaustive authenticated Production/Preview/LINE invariance and DB false readback;
12. fresh standard preflight bound to every exact identity and artifact;
13. privacy scan, normal audit, require-pass audit, and final authenticated deployment/runtime readback;
14. atomic publication of exactly one truthful terminal public state.

Journal mutation intent before calls and receipt/reconciliation after calls. On response loss, reconcile through
authenticated exhaustive inventory before retry. An unprovable outcome counts as the authorized maximum, is added
to `uncertainOutcomes`, forbids retry, and requires new Owner authorization.

If a post-deploy failure occurs after webhook movement, perform the authorized journaled compensating rebind to
the prior target, authenticate its readback, finish invariance checks, and atomically publish only the compensated
HOLD terminal state. Never create/delete a webhook or rotate its signing secret.

### 10. Evidence and secret boundaries

- Private operational directory: current owner, mode 0700.
- Raw responses, credentials, env files, issuer/URL/provider identities, tokens and journal files: mode 0600,
  one link, never symlinks.
- Never print or publish credentials, auth headers, cookies, OIDC tokens, Stripe keys/signatures, raw issuer or
  webhook/deployment URLs, queries, account/endpoint/deployment/team/project IDs, private paths, customer data,
  ciphertext, notes, or raw provider responses.
- Public evidence is allowlisted counts, booleans, decisions, timestamps, exit codes, and one-way hashes only.
- Never place a Stripe key in source, command arguments, logs, or public environment output. Require the dedicated
  least-privilege, test-only, future-valid `rk_test_` profile and reject ambient credentials.

Create versioned sanitized evidence for remediation verification, new lineage freeze, proposal, exact
authorization, manifest, every review round, execution start/stop, deploy/readback, webhook/compensation,
preflight/privacy/audits, and final Gate C decision. Preserve actual exit codes.

### 11. Gate decision and final report

Update `docs/AI_CURRENT_STATUS.md` and append `docs/AI_WORK_LOG.md` at every durable checkpoint. Do not call HOLD
a PASS and do not force audit results. Unless the audit contract itself has truthfully changed and been separately
authorized, normal audit must exit `0` with `auditValid=true`; require-pass is expected to exit `2` with
`auditValid=true` while separately governed business-cycle/signature requirements remain.

Report concisely:

- remediation directive path/SHA;
- five finding closure results;
- new source/migration/artifact/provider/issuer identity SHAs;
- exact proposal and authorization paths/SHAs;
- manifest path/SHA and file/binary/tree counts;
- provenance/runtime/security decisions and review evidence SHA;
- deploy/webhook/compensation/create/delete/secret-rotation counts;
- DB writes/final dual-write posture;
- Production alias/Production/Preview/LINE/UI/customer-data/business-cycle counts;
- runtime source/target/issuer identity/nine flags/DB readback;
- exact-one webhook/event-set readback;
- fresh preflight exit/decision/SHA;
- privacy findings;
- normal and require-pass audit exits plus `auditValid`;
- uncertain outcomes;
- current Gate C decision and whether Phase D started.

If stopped at the exact v3 authorization checkpoint, report the exact proposal path/SHA and the two-line response
required from the Owner. If blocked elsewhere, state the exact blocker and confirmed mutation counts.

## Prompt ends

