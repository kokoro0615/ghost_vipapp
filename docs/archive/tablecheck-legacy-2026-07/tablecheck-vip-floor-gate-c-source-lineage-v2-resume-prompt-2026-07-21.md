# TableCheck VIP Floor Gate C source-lineage v2 — new-session resume prompt

Date: 2026-07-21 JST

Status: handoff prompt only. Creating or reading this document does not deploy, update a webhook, write a
database, change Production/Preview/LINE/UI, start a business cycle, or make Gate C PASS.

## How to use

Start a new primary-agent session in:

```text
/home/kokoro/projects/clients/ghost
```

Give the agent everything between **Prompt starts** and **Prompt ends**.

---

## Prompt starts

Resume TableCheck VIP Floor Gate C source-lineage v2 in
`/home/kokoro/projects/clients/ghost` as the sole state-transition operator. Work persistently until either:

1. the exact replacement tooling receives 3/3 independent read-only ACCEPT and the newly authorized all-off
   staging source-lineage execution finishes with complete readback; or
2. a truthful fail-closed HOLD is reached.

Never report an unmet condition as PASS. Do not start Phase D before Gate C PASS. This authorization does not
authorize business cycles or final Gate C signatures, so a successful source-lineage execution is expected to
leave Gate C HOLD unless all separately governed requirements already exist and validate.

### 1. Read completely before acting

Read these files in full before planning or editing:

- `AGENTS.md`
- `docs/AI_CURRENT_STATUS.md`
- latest rows of `docs/AI_WORK_LOG.md`
- `docs/AI_AGENT_SYNC.md`
- `website/AGENTS.md`
- `.agents/skills/stripe-best-practices/SKILL.md`
- the Stripe security reference selected by that skill
- `website/docs/evidence/vip-floor-v2/gate-c-source-lineage-tooling-review-v4-reject-20260721T045200+0900.json`
- `website/docs/evidence/vip-floor-v2/gate-c-source-lineage-tooling-manifest-v5r4-20260721T060017+0900.json`
- `website/docs/evidence/vip-floor-v2/gate-c-source-lineage-tooling-review-v5r4-accept-20260721T060240+0900.json`
- `website/docs/evidence/vip-floor-v2/gate-c-source-lineage-execution-v5r4-hold-runtime-auth-20260721T064642+0900.json`
- `website/docs/evidence/vip-floor-v2/gate-c-runtime-source-readback-instrumentation-result-v1-20260721T070150+0900.json`
- `website/docs/evidence/vip-floor-v2/gate-c-runtime-source-artifact-freeze-v3-20260721T070150+0900.json`
- `website/docs/evidence/vip-floor-v2/gate-c-source-lineage-staging-deploy-authorization-proposal-v2-20260721.json`
- `website/docs/evidence/vip-floor-v2/gate-c-source-lineage-staging-deploy-owner-authorization-v2-20260721T070827+0900.json`
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

Inspect both the outer workspace and `website/` repository status. Preserve every unrelated dirty change. Do not
commit, push, reset, clean, checkout over, or deploy unrelated work.

### 2. Exact current authority and frozen lineage

The Owner directly approved:

```text
OWNER_GATE_C_SOURCE_LINEAGE_STAGING_DEPLOY_AUTHORIZATION_V2
proposal SHA: 073c2afd097976c67dc92565a35cd3072471183c5290baee477d89bdbedcd9dc
```

Exact authorization evidence:

```text
path: docs/evidence/vip-floor-v2/gate-c-source-lineage-staging-deploy-owner-authorization-v2-20260721T070827+0900.json
SHA-256: 2be5093bdfa42d1b4208e8514f0201893942929f945806c198b78ab6af5d0426
```

Exact newly frozen lineage:

```text
source SHA-256:   a3a08ae24afadee047a3afb58c27c5f08678e3b49705dfa65563a34b12fc8906
migration SHA-256:c2e751f183b8fb35e5bcf468366622b9f19298d6c5c8e086702f9b1a5f193272
artifact SHA-256: 7a48a512ef45889604b0cee6473a65a0a4685c78f21026ee11b73205fd428daf
provider SHA-256: 30192011179653e488180d837fdd856a6d0469a01362f23e8cddd79313a79841
```

The prebuilt artifact is already built and frozen. Locate its existing private local root without printing or
publishing the path. Prove its source, migration, output artifact, and provider-comparable hashes equal the values
above. Do not rebuild it after this authorization. If the exact bytes no longer exist, stop with mutation 0 and
request a new proposal/authorization; do not reconstruct or approximate them.

The authorization permits only:

- exact frozen prebuilt artifact deployment to Vercel target `staging`, maximum 1;
- Production alias creation/promotion count 0;
- all nine application flags explicitly `false`;
- `VIP_FLOOR_RUNTIME_SOURCE_SHA256` equal to the exact frozen source SHA;
- DB write count 0 and DB dual-write remaining false;
- forward URL update of the one existing Stripe test webhook, maximum 1;
- webhook create/delete/signing-secret rotation count 0;
- authenticated compensating rebind to the previous target when required;
- authenticated readback, fresh preflight, privacy scan, and both audits.

It forbids customer-data mutation, Production/Preview/LINE/UI mutation, business-cycle execution, live Stripe,
secret disclosure, artifact rebuild, and Phase D.

### 3. Starting state

- The dedicated Stripe profile is a future-dated `rk_test_` credential inside a 0700/0600 private boundary.
- Authenticated Account read matches the frozen test-account identity.
- Exactly one test webhook exists and its enabled event set is the exact 13-event contract.
- v5r4 historically received 3/3 ACCEPT, but real execution discovered that Sensitive `WORKER_RUN_SECRET` was
  provider-non-readable and its READY deployment environment API assumption was invalid.
- v5r4 stopped before provider mutation. All deploy/webhook/DB/Production/Preview/LINE/UI counts remain 0.
- The replacement source uses staging-only Vercel OIDC RS256/JWKS authentication and exposes only target,
  runtime-source SHA, flag configured/raw state, and DB dual-write posture. It returns no customer or secret data.
- `jose` is exact-pinned at `6.2.3`.
- TypeScript, target ESLint, VIP/API static verification, OIDC positive/negative fixtures, actual operator OIDC
  signature/identity verification, isolated staging build, and source/artifact equality passed before handoff.
- No replacement tooling manifest or replacement 3-role review exists yet.

Treat every historical result as untrusted until reverified from exact bytes.

### 4. Complete the additive replacement tooling before any mutation

Do not rewrite or delete historical v4/v5 evidence. Create new versioned manifest/review/execution evidence.

Update the active tooling candidate so every execution-time exact constant and path binds to:

- proposal SHA `073c2afd097976c67dc92565a35cd3072471183c5290baee477d89bdbedcd9dc`;
- authorization SHA `2be5093bdfa42d1b4208e8514f0201893942929f945806c198b78ab6af5d0426`;
- source SHA `a3a08ae24afadee047a3afb58c27c5f08678e3b49705dfa65563a34b12fc8906`;
- migration SHA `c2e751f183b8fb35e5bcf468366622b9f19298d6c5c8e086702f9b1a5f193272`;
- artifact SHA `7a48a512ef45889604b0cee6473a65a0a4685c78f21026ee11b73205fd428daf`;
- provider-comparable SHA `30192011179653e488180d837fdd856a6d0469a01362f23e8cddd79313a79841`;
- role code `OWNER_GATE_C_SOURCE_LINEAGE_STAGING_DEPLOY_AUTHORIZATION_V2`;
- the v2 proposal and v2 authorization paths.

Use `rg` to find every old proposal/authorization/source/artifact/provider hash and historical path in the active
driver, verifier, provider, audit binding, and freeze generator. Change only active executable candidate files;
historical evidence remains immutable.

Freeze the complete executable closure into one additive replacement manifest. It must include:

- execution driver, provider adapter, executor, private writer/journal, Stripe profile adapter;
- OIDC source module, runtime route/auth/flag source files and `jose` lockfile binding;
- verifier and every fixture/negative test;
- preflight and audit code;
- v2 proposal, v2 authorization, source-instrumentation result and source/artifact freeze evidence;
- exact Node/Vercel/Stripe/Supabase/Git binaries;
- complete frozen Vercel/Supabase dependency trees;
- exact project/team/account/webhook/bypass identity hashes, never raw identities;
- the exact frozen source/artifact/provider hashes and mutation limits.

The manifest generator must not silently omit newly added source or fixture files. The manifest must supersede
v5r4 because of its execution finding, not claim v5r4 was fully executable.

### 5. Mandatory fail-closed verification before freeze

Run and preserve real exit codes for:

- syntax and target ESLint;
- `npx tsc --noEmit`;
- VIP static and API static contracts;
- OIDC fixture suite;
- the complete source-lineage fixture/negative suite;
- exact workspace/artifact source equality;
- exact artifact and provider-comparable manifests;
- authorization exact-byte and role-code verification;
- public privacy scan.

The tests must fail closed for at least:

- wrong proposal or authorization bytes;
- wrong source/artifact/provider SHA;
- manifest dependency or binary drift;
- review count other than exactly 3;
- duplicate/missing roles or any non-read-only/non-independent/non-ACCEPT row;
- non-0700 directory, non-0600 file, wrong owner, symlink or hardlink credential;
- ambient Stripe credential or non-`rk_test_`/expired profile;
- wrong Stripe account, live mode, zero/multiple webhook endpoints, wrong event set;
- noncanonical deployment host, webhook userinfo, wrong path/query or bypass hash;
- lock contention, journal tamper, crash resume and unknown outcome;
- deploy or webhook partial success;
- failed authenticated compensation;
- Production/Preview/LINE change;
- missing/invalid OIDC, non-Vercel issuer, wrong algorithm, project/team mismatch, wrong subject/audience,
  production claim, tampered/expired token;
- runtime target other than staging;
- runtime source SHA mismatch, any flag enabled/missing/invalid, DB dual-write true;
- stale preflight, audit, provider result, review, action or deployment binding;
- credential, provider ID, URL, private path or customer data in public evidence.

Do not weaken a contract merely to make a fixture pass.

### 6. Independent 3-role review

After the replacement manifest is frozen, provide the exact same immutable manifest bytes to exactly three
independent read-only reviewers:

1. `provenance`
2. `runtime`
3. `security`

Each reviewer must independently recompute the manifest SHA and dependency hashes. Reviewers must not receive
secrets, raw URLs, provider IDs, private paths, raw provider responses or customer data. They may not edit files or
perform provider mutations.

Require all three rows to contain:

```text
independent: true
readOnly: true
decision: ACCEPT
blockingFindingCount: 0
```

If any reviewer returns REJECT, perform no external mutation. Record a versioned rejection, repair additively,
rerun fixtures, refreeze, and send the newly frozen same bytes to all three roles again. Never reuse an ACCEPT from
an older manifest.

### 7. Execute only after 3/3 ACCEPT

Immediately before execution, reverify:

- exact v2 proposal and authorization bytes;
- exact manifest and 3-role review bytes;
- exact prebuilt source/artifact/provider hashes without rebuilding;
- Stripe private profile boundary and no ambient Stripe credential;
- authenticated exact test account;
- exactly one test webhook and exact 13-event set;
- private lock/journal boundary;
- all authorized counts still available.

Run the exact driver against the frozen artifact. Root is the only mutation operator.

Execution order must be journaled durably:

1. authenticated Production/Preview/LINE baseline;
2. authenticated read-only staging DB baseline with dual-write false and migrations exact;
3. authenticated staging project configuration baseline with all nine flags false;
4. exact-one Stripe webhook baseline and previous target;
5. exhaustive action-id deployment reconciliation;
6. at most one prebuilt staging deploy, with no alias and exact metadata/env binding;
7. authenticated provider file-tree equality;
8. staging-only OIDC runtime readback proving exact source SHA, nine configured/raw disabled flags, and DB false;
9. at most one existing webhook forward update to the canonical deployment host and fixed path/query;
10. authenticated exact-one webhook readback;
11. authenticated Production/Preview/LINE invariance and DB false readback;
12. fresh standard preflight, privacy scan, normal audit, require-pass audit, each bound to exact manifest, review,
    proposal, authorization, deployment, action, source, artifact and provider evidence.

For deploy/webhook response loss or crash, reconcile through authenticated provider inventory before any retry.
An unprovable outcome counts conservatively as the authorized maximum and requires new Owner authorization. Never
issue a second deployment under this authorization.

If a post-deploy failure occurs after webhook movement, perform the journaled authenticated compensating rebind to
the previous target and read it back. Webhook create/delete/secret rotation remain forbidden.

### 8. Private and public evidence boundaries

- Private operational directory: current owner, mode 0700.
- Every raw response, token-bearing env file, URL, provider identity and journal file: mode 0600, one link, no
  symlink.
- Never print or put in public evidence a credential, auth header, cookie, OIDC token, Stripe key/signature,
  webhook URL/query, deployment URL/ID, account/endpoint ID, Vercel/Supabase ID, private path, customer data,
  ciphertext, note or raw response.
- Public evidence may contain only allowlisted counts, booleans, decisions, timestamps and one-way hashes.
- Run the executable privacy scanner before publishing every checkpoint.

### 9. Status, audits and Gate decision

Update `docs/AI_CURRENT_STATUS.md`, append `docs/AI_WORK_LOG.md`, and create versioned sanitized evidence at these
checkpoints:

- authorization exact-byte verification;
- tooling fixture completion;
- manifest freeze;
- each 3-role review round;
- execution start/stop;
- deploy receipt/readback;
- webhook forward or compensation readback;
- fresh preflight/privacy/audits;
- final Gate C decision.

Do not overwrite historical evidence. Preserve actual exit codes.

The source-lineage driver contract currently expects:

- normal audit exit `0` with `auditValid=true`;
- require-pass audit exit `2` with `auditValid=true` while separately governed business-cycle/signature blockers
  remain.

Do not force require-pass to 0, fabricate runtime evidence, or begin Phase D. Gate C remains HOLD unless the audit
truthfully proves every requirement and exits according to its contract.

### 10. Required final report

Report concisely:

- replacement tooling manifest path and full SHA-256;
- exact frozen source/artifact/provider SHAs;
- authorization SHA;
- provenance/runtime/security decisions and review evidence SHA;
- deploy count and outcome;
- webhook forward, compensation, create, delete and secret-rotation counts;
- DB write count and final dual-write posture;
- Production alias, Production, Preview, LINE and UI mutation counts;
- runtime exact source, nine flags, DB and exact-one webhook readback results;
- fresh preflight exit/decision/SHA;
- privacy scan result;
- normal and require-pass audit exit codes plus `auditValid`;
- uncertain outcomes, if any;
- current Gate C decision and whether Phase D started.

If blocked, state the exact blocker and confirmed mutation counts. Never call HOLD a PASS.

## Prompt ends

