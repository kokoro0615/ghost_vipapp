# GHOST Osaka VIP Floor C7 staging / runtime evidence execution prompt

Date: 2026-07-14 JST

Status: execution prompt only; staging resources, deployments, flags, database writes, provider calls, and UI changes have not been performed by creating this document

Scope: provision an isolated staging environment, collect authentic C7 runtime evidence, and reach the strongest valid Gate C decision available

## How to use this document

Give everything from **Prompt starts** through **Prompt ends** to the primary implementation agent. Run it from:

```text
/home/kokoro/projects/clients/ghost
```

This prompt authorizes staging-only external changes within the limits below. It does not authorize production
changes, live-mode Stripe activity, UI work, a paid plan upgrade, destructive teardown, or fabricated human
approval.

---

## Prompt starts

You are the primary agent responsible for unblocking GHOST Osaka VIP Floor Phase C at C7. Continue until one of
these truthful terminal outcomes is reached:

1. Gate C `PASS`: isolated staging exists, C7 runtime evidence is authentic and valid, the sole human operator has
   signed three role-specific attestations for the exact evidence manifest, and the final require-pass audit exits
   `0`.
2. Runtime-ready `HOLD`: staging and authentic C7 runtime evidence pass, but one or more required human signatures
   are not yet available.
3. Fail-closed `HOLD`: a cost, access, production-isolation, safety, runtime, or evidence blocker prevents further
   safe progress. Record the exact blocker and leave staging in the rollback posture.

Do not declare success merely because infrastructure was created or a deployment is `READY`.

### 1. Authority granted for this task

You may perform all of the following, but only against newly identified staging or Stripe test-mode resources:

- create exactly one Vercel Custom Environment named `staging` in the currently linked GHOST Vercel project;
- create exactly one independent Supabase staging project whose name unambiguously contains `staging`;
- configure staging-only environment variables and independently generated secrets;
- deploy the exact current VIP Floor Phase C source to Vercel target `staging`;
- apply the current migration bundle from zero to the independent staging database;
- seed synthetic-only staging fixtures and a staging-only admin/operator identity;
- create a Stripe test-mode/sandbox webhook endpoint and use a staging-specific restricted API key;
- perform the C7 staging flag transitions, synthetic business cycle, rollback rehearsal, test-mode provider calls,
  authenticated readbacks, and bounded sampling required by the existing runbook;
- add or harden staging-only evidence collectors and tests when the existing tooling cannot prove provenance;
- write sanitized evidence, update the Gate C summary, and update shared coordination documents;
- use a dedicated temporary operational directory outside the repository for secret-bearing or provider-ID-bearing
  transient state.

This authority is valid only when the work fits within the account's existing plan and quota. If Vercel Custom
Environments, a new Supabase project, compute, domains, log drains, or another required feature introduces a new
charge, plan upgrade, or non-trivial recurring cost, stop and obtain explicit cost approval before accepting it.

### 2. Absolute prohibitions

Never do any of the following:

- run `vercel --prod`, `vercel deploy --prod`, or any command with target `production`;
- promote or alias a staging deployment to a production domain;
- modify, redeploy, pause, delete, or relink the production Vercel environment;
- connect to, migrate, seed, branch, clone, reset, or write the production Supabase project;
- use a Supabase branch of production as the C7 database;
- copy production rows, PII, notes, ciphertext, provider IDs, or backups into staging;
- use a Stripe live key, live object, live webhook endpoint, or real payment method;
- copy production Stripe, Supabase, Turnstile, admin, worker, cron, encryption, hash, or comparison secrets;
- enable LINE delivery or call LINE from this task;
- add `payment_method_types` to Stripe calls;
- call Stripe, LINE, notification, or refund providers from SQL, triggers, or compatibility projection code;
- alter the v1 or v2 UI, start Phase D, or treat screenshots as runtime proof;
- commit, push, merge, reset, clean, checkout over, or overwrite the user's dirty worktree without separate explicit
  authorization;
- delete a Vercel target, Supabase project, Stripe test endpoint, or staging credentials as teardown without a
  separate explicit Owner instruction;
- print or commit secrets, auth headers, cookies, database URLs, project refs, deployment URLs, raw webhook bodies,
  Stripe signatures, provider object IDs, customer contact data, free-form notes, ciphertext, nonces, or tags;
- fabricate metrics, booleans, timestamps, approvals, signatures, provider readbacks, or PASS evidence.

If a command could target production and cannot prove its target before writing, do not run it.

### 3. Read before acting

Read these files completely before planning mutations:

- `AGENTS.md`
- `docs/AI_CURRENT_STATUS.md`
- latest rows of `docs/AI_WORK_LOG.md`
- `docs/AI_AGENT_SYNC.md`
- `website/AGENTS.md`
- `website/docs/research/tablecheck-vip-floor-phase-c-gate-c-ui-implementation-plan-2026-07-14.md`
- `website/docs/evidence/vip-floor-v2/gate-c-staging-operator-runbook.md`
- `website/docs/evidence/vip-floor-v2/gate-c-summary-20260714.json`
- `website/docs/evidence/vip-floor-v2/gate-c-staging-preflight-20260714.json`
- `website/scripts/preflight-vip-floor-v2-gate-c-staging.mjs`
- `website/scripts/audit-vip-floor-v2-gate-c.mjs`
- relevant runtime flag, public compatibility, shadow comparison, webhook, and refund worker code under
  `website/src`;
- applicable Stripe best-practice skill and its payments/security references.

Inspect the dirty worktree before editing. Preserve all existing work. Treat the current C0-C6 evidence and v1
fallback as accepted inputs unless current-hash validation disproves them.

### 4. Starting state to verify, not trust

The last known preflight was `HOLD` with these six blockers:

1. `STAGING_TARGET_MISSING`
2. `PREVIEW_ENV_EMPTY`
3. `STAGING_ENV_INCOMPLETE`
4. `STAGING_DATABASE_MISSING`
5. `IMMUTABLE_BUILD_IDENTITY_MISSING`
6. `CURRENT_STAGING_DEPLOYMENT_MISSING`

The last known Git HEAD, runtime-source hash, migration head, and migration-bundle hash are historical hints only.
Recompute them before and after every source-affecting change. Never hardcode the historical values into new PASS
evidence.

### 5. Mandatory subagent operating model

Use three subagents thoroughly. Do not ask multiple agents to mutate the same provider or file. The root agent owns
shared files, cross-provider sequencing, every flag transition, and the final decision.

#### Wave 0 — parallel read-only audit

Spawn all three before any external write:

- **Agent A — Vercel/source identity:** verify linked project/scope, plan support for Custom Environments, current
  targets, production aliases, environment-name inventory, deployment metadata capabilities, dirty-source freeze,
  and the exact non-production deployment procedure.
- **Agent B — Supabase isolation/migrations:** verify the current linked production fingerprint without printing it,
  determine organization/region/quota, design a separate staging project and isolated CLI workdir, audit all
  migrations/seeds, and prove no production data is required.
- **Agent C — Stripe/evidence/security:** verify test-mode account posture, least-privilege RAK requirements, webhook
  and refund paths, runtime sample provenance, evidence schemas, privacy rules, budgets, signature rules, and stop
  conditions.

Each agent must report facts, commands proposed, write scope, rollback, and blockers. Authenticated read-only
provider inventory calls are allowed in Wave 0; file edits and provider mutations are not. Root reconciles all three
reports before proceeding.

#### Wave 1 — non-overlapping provisioning

After the Wave 0 review:

- Agent A may own Vercel Custom Environment and staging env-name provisioning only.
- Agent B may own creation and migration of the single new Supabase staging project only.
- Agent C remains read-only and continuously verifies production isolation, secret handling, and evidence tooling.
- Root owns Stripe test resource creation, cross-service secret wiring, deployment, flag changes, and shared files.

Record provider ownership and every mutation in a sanitized C7 agent ledger. Agents must not expose refs, URLs,
tokens, or secrets in messages or repository files.

#### Wave 2 — independent readiness review

Rotate review responsibilities after provisioning:

- Agent A read-only reviews the staged Supabase catalog/migration evidence.
- Agent B read-only reviews Vercel target/deployment/source identity.
- Agent C read-only reviews Stripe test classification, webhook reachability, env-class isolation, and redaction.

Do not begin the business cycle until all three independently accept their assigned boundary and the root records
the decision.

#### Wave 3 — runtime observation

The root is the only state-transition operator. Subagents observe non-overlapping evidence:

- Agent A validates immutable deployment transitions and authenticated Node flag readbacks.
- Agent B validates DB setting transitions, migration identity, inventory/hold integrity, and rollback.
- Agent C validates shadow aggregates, signed webhook paths, refund-worker ownership, provider-effect counts, and
  privacy scans.

Use unique synthetic run IDs held outside repository evidence. Do not let agents run competing business cycles or
provider mutations concurrently.

#### Wave 4 — three-way evidence review

Before signatures, all three agents independently review the final evidence package for source/hash binding,
runtime authenticity, privacy, provider duplication, rollback, and summary consistency. Root resolves every finding
and reruns the reviews. Subagents cannot sign for humans.

### 6. Phase 0 — freeze safety and evidence contracts

Before provisioning:

1. Capture a redacted before-snapshot proving:
   - the selected Vercel project is the expected linked project;
   - the production deployment/alias fingerprint is recorded as a one-way hash;
   - the currently linked Supabase production ref is recorded only as a one-way fingerprint;
   - no staging target or independently named staging Supabase candidate currently exists, unless discovery shows
     the blocker has already changed;
   - Stripe CLI is authenticated to test mode without printing its key.
2. Run the existing preflight read-only and preserve its expected `HOLD` result as a before-state artifact.
3. Inventory all runtime-source inputs used by `createRuntimeSourceBundleSha256()` and compute the current bundle
   hash.
4. Inventory all migrations, head, and bundle hash.
5. Record `git status --porcelain` without modifying the worktree.
6. Propose non-zero performance/log budgets and an observation window before collecting any samples. The Owner and
   Engineer must explicitly approve:
   - p95 shadow overhead budget in milliseconds;
   - event-count budget for the observation window;
   - distinct-key/cardinality budget;
   - minimum observation duration if longer than the 1,000-completed-sample floor.
7. If those budgets are unavailable, pause only the runtime-observation phase. Infrastructure may be prepared and
   left all-off, but no retroactive budget may be chosen to make results pass.

The current audit accepts a trivially small successful sample. This execution contract is stricter: collect at
least **1,000 completed, attributable shadow samples**. For compatibility with the current observation schema and
audit, `sampleAttempts` means completed, attributable comparisons and is the denominator for
`sampleSuccesses / sampleAttempts`. Record upstream requests, scheduled attempts, concurrency skips, and collector
losses only as additional provenance fields; do not mix them into `sampleAttempts`. The summary and observation
must use the identical denominator.

### 7. Evidence-tooling hardening allowed before source freeze

Audit the current tooling before trusting it. If necessary, add staging-only collectors or tests, but do not change
product behavior or UI.

Required hardening outcomes:

- observation JSON must be generated from sanitized measured events, not hand-authored true/zero values;
- preserve an outside-repository raw-source digest or sanitized provenance digest without retaining PII, secrets,
  raw webhooks, broad Vercel logs, or provider IDs;
- record collector version/hash, exact time range, immutable deployment identity, migration identity, and command
  result;
- enforce the 1,000 completed-sample floor even though the current audit does not;
- verify exactly three unique signature roles, one same non-placeholder human name, distinct role timestamps,
  role-specific attestation codes, and one manifest SHA when signatures eventually exist;
- verify chronological flag steps and authentic readback rather than accepting screenshots alone;
- verify remote value classes without printing values: Supabase variables resolve to the new staging project;
  Stripe values are test-mode and from the same test account; secrets are staging-specific;
- create a content-addressed source/build procedure: freeze a source manifest, build from a quiescent snapshot, hash
  the exact prebuilt/upload artifact for each env posture, and bind that artifact digest to provider deployment
  provenance;
- treat Git HEAD and caller-supplied deployment metadata as supporting evidence only, never as independent proof of
  deployed bytes;
- harden the preflight/audit and their tests to reject READY/runtime evidence unless provider provenance matches the
  frozen artifact digest. If no independently verifiable provider artifact identity is available, keep Gate C
  `HOLD` rather than accepting self-attested metadata;
- add an acceptance test proving `sampleAttempts` maps only to completed attributable comparisons while upstream
  invocations/skips remain additional provenance.

The existing preflight blocks when Preview has no environment variables even if a valid custom staging target is
selected. This task does not authorize Preview mutation. Minimally harden the preflight so an empty Preview is
informational when a complete custom `staging` target is selected, and add positive/negative tests. Do not add a
dummy Preview variable, copy staging secrets to Preview, or weaken the custom-target requirement. If a reviewed
preflight correction is impossible, stop and request separate Preview authority.

Do not weaken any production-target refusal, current-source check, staging isolation check, or safety assertion.

After all tooling changes, rerun local deterministic checks. Only then freeze the final runtime-source and
migration hashes used for deployment and evidence.

### 8. Phase 1 — create the isolated Supabase staging project

Use a default name such as `ghost-vip-floor-staging`; if an existing project already matches, prove it is genuinely
independent and authorized before reusing it. There must be exactly one matching staging candidate for preflight.

1. Confirm organization, same-region latency choice, smallest approved compute size, quota, and cost.
2. Generate the DB password in a secret manager or in-memory secret channel. Never put it in source, evidence,
   shell history, or tool output.
3. Create a brand-new project. Stop if its ref equals the production fingerprint, if the provider proposes a branch,
   or if production data cloning is enabled.
4. Wait for a healthy database.
5. Do not relink `website/supabase/.temp`, which currently represents another project. Use an isolated temporary
   operational directory containing the exact migration bundle.
6. Run a migration dry-run against staging. Review the target identity and migration list.
7. Apply every migration from zero to staging. The Phase C database setting must remain false after migration.
8. Verify the remote migration head/bundle, PostgreSQL version, catalog counts, functions, triggers, indexes,
   constraints, RLS, FORCE RLS, ACLs, and all existing Gate A/B/C deterministic contracts.
9. Seed synthetic-only event days, inventory, admin/operator credentials, and test contacts. Use obviously synthetic
   values and a future business date. Do not seed provider IDs pretending to be real Stripe objects.
10. Capture only aggregate and hashed evidence. Keep the staging ref and DB URL out of repository evidence.

Provider commands commonly emit project refs or URLs. Before running them, create a mode-`0600` temporary output
area outside the repository, disable debug/trace output, redirect machine-readable stdout/stderr there, and parse
only sanitized booleans/counts/fingerprints into repository evidence. Never allow raw provider output into the tool
transcript when a command cannot redact it. Retain the private operational files only as long as needed for the C7
run and human review, then securely remove local transient files without deleting provider resources.

### 9. Phase 2 — create the Vercel Custom Environment

Use the currently linked project and target slug exactly `staging`.

1. Confirm the team is Pro or Enterprise and the current actor is a team owner or project admin. If Custom
   Environments are unavailable, stop. Do not silently substitute Preview, production, or a second Vercel project;
   those would require a reviewed preflight-contract change.
2. Create the target through the Vercel Dashboard or official REST API. The installed CLI can list and use custom
   targets but does not create them.
3. Do not import Production environment variables. Authentically audit team-level shared variables, project-level
   shared variables, and integration-injected variables too; none may inject production Supabase, Stripe,
   Turnstile, LINE, or other provider values into `staging`. Detach inherited values or stop if their origin/value
   class cannot be proved.
4. Do not attach a production domain. A staging-only domain is optional and requires separate DNS/cost review.
5. Configure the required names below. Use Vercel sensitive variables for secrets and interactive/stdin or a secret
   manager so values never appear in command arguments or logs.

Required names:

```text
ADMIN_BOOTSTRAP_SECRET
CRON_SECRET
FEATURE_ADMIN_MUTATION_ENABLED
FEATURE_LINE_NOTIFICATIONS_ENABLED
FEATURE_PUBLIC_BOOKING_ENABLED
FEATURE_VIP_CUSTOMER_PROFILE_WRITE_ENABLED
FEATURE_VIP_FLOOR_DUAL_WRITE_ENABLED
FEATURE_VIP_FLOOR_V2_MUTATION_ENABLED
FEATURE_VIP_FLOOR_V2_READ_ENABLED
FEATURE_VIP_FLOOR_V2_SHADOW_COMPARE_ENABLED
FEATURE_WEBHOOK_PROCESSING_ENABLED
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
RESERVATION_HASH_SALT
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL
TURNSTILE_SECRET_KEY
TURNSTILE_SITE_KEY
VIP_CUSTOMER_PROFILE_ENCRYPTION_KEY
VIP_CUSTOMER_SEARCH_KEY
VIP_FLOOR_SHADOW_COMPARE_KEY
VIP_FLOOR_V2_SHADOW_SAMPLE_RATE_BPS
WORKER_RUN_SECRET
```

Initial posture:

- every `FEATURE_*` value is explicitly false;
- `VIP_FLOOR_V2_SHADOW_SAMPLE_RATE_BPS=0`;
- Supabase URL/anon/service-role values belong only to the new staging project;
- Stripe publishable and restricted server keys are test mode and belong to the same test account/sandbox;
- Turnstile uses staging/test credentials;
- all salts, encryption/search/comparison keys, admin/cron/worker secrets are newly generated for staging;
- LINE stays disabled and no LINE secret is introduced.

Create a redacted value-class verifier. Environment-name presence alone is insufficient.

`STRIPE_WEBHOOK_SECRET` is the one intentional bootstrap dependency: do not invent a placeholder just to satisfy
preflight. Create the initial all-off deployment first, then create the Stripe test endpoint, store the genuine
signing secret, and redeploy before requesting a READY preflight.

### 10. Phase 3 — Stripe test-mode staging boundary

1. Prefer a dedicated Stripe sandbox when available; otherwise use test mode with clearly isolated staging
   metadata.
2. Create a staging-specific restricted API key (`rk_test_`) with the minimum permissions required by the current
   Checkout Session, Customer, SetupIntent/PaymentIntent, and Refund paths. Use separate operator credentials for
   endpoint administration or broader readback.
3. Use the current Stripe API version/SDK required by repository policy. Do not change API shape merely for C7.
4. Keep dynamic payment methods; do not add `payment_method_types`.
5. Prepare the endpoint configuration, but register it only after the Phase 4 all-off bootstrap deployment exists.
6. After bootstrap, register one test-mode endpoint, store its unique signing secret only in the staging secret
   store, and redeploy. Keep the same Stripe endpoint so its signing secret remains stable; update that endpoint's
   URL after each immutable deployment, or use an explicitly approved stable staging-only domain.
7. Before the business cycles, authenticate that the endpoint URL resolves exactly to the current both-on
   deployment, not an older deployment or alias.
8. Verify the application uses the raw request body and validates the Stripe signature before enqueueing or
   processing any event.
9. If deployment protection prevents Stripe from reaching only the webhook route and no scoped safe bypass exists,
   stop for an access-policy decision. Do not disable project protection globally as a shortcut.

### 11. Phase 4 — immutable staging deployment and READY preflight

The worktree may remain dirty. Do not create a Git commit without separate authorization. Git SHA plus a
self-declared metadata hash does not prove deployed bytes. Use a content-addressed build procedure:

1. Freeze the runtime-source manifest and migration manifest immediately before deployment. Enforce a quiescent
   window for every runtime-hash input.
2. Build from that frozen snapshot, hash the exact prebuilt/upload artifact, and retain its sanitized file manifest
   outside the repository. For later env-posture transitions, rebuild only from the identical frozen source and
   hash each resulting artifact separately.
3. Deploy the frozen artifact only with `vercel deploy --prebuilt --target=staging`; never use `--prod`.
4. Attach non-secret deployment metadata containing runtime-source, migration-bundle, and artifact hashes, but do
   not accept those caller-supplied values as sole proof.
5. Independently read provider deployment provenance/file or build-output identity and bind it to the local artifact
   digest. The hardened preflight/audit must verify this binding. If Vercel cannot expose enough provenance to
   distinguish uploaded bytes, record the limitation and keep Gate C `HOLD`; metadata repetition alone cannot
   permit PASS.
6. Wait for `READY` and read back:
   - custom target is `staging`;
   - provider Git SHA equals the current Git HEAD;
   - provider provenance, local artifact digest, and custom source/migration/artifact metadata agree;
   - no production alias is attached;
   - source manifests are unchanged before/after deploy.
7. Treat the first deployment as all-off bootstrap. Register the Stripe test endpoint against it, store the genuine
   `whsec_` value, rebuild/redeploy the same frozen source, and authenticate endpoint-to-deployment identity.
8. Run readiness, current-migration, schema/static, API, crypto, Stripe boundary, TypeScript, lint, and build checks.
9. Capture an authenticated all-off `GET /api/admin/runtime/flags` readback without storing its URL or auth token.
10. Rerun the staging preflight with explicit target/project/build identity where needed and write a new timestamped
   preflight JSON.

The C7 sequence may start only when:

```bash
cd website
npm run preflight:vip-floor-v2-gate-c-staging
```

exits `0`, the decision is `READY`, `blockers` is empty, and every `safety` value is false. Hash-link this new file
as `runtime.preflightEvidencePath`. A preflight exit `2` is a mandatory `HOLD`, not permission to continue.

Bind the invocation explicitly with `VIP_FLOOR_STAGING_VERCEL_TARGET`,
`VIP_FLOOR_STAGING_SUPABASE_PROJECT_NAME`, and `VIP_FLOOR_STAGING_BUILD_SHA256`. Supply them from in-memory,
non-secret run state. Atomically capture JSON to a timestamped temporary file while preserving the real command exit
code; validate/redact it before moving the artifact into `docs/evidence`. Do not use a pipeline that hides the
preflight exit status.

### 12. Phase 5 — state-transition rules

Vercel environment variable changes apply only to new deployments. Therefore every Node/shadow/public/admin/webhook
flag transition requires a new immutable deployment of the **same frozen source**, followed by metadata and runtime
readback. A Vercel env edit by itself is not evidence of a runtime transition.

Capture an authenticated readback after every transition. Maintain at least these six states:

1. all-off: Node dual-write false, DB dual-write false, shadow false;
2. DB-only: Node false, DB true, shadow false;
3. DB + shadow: Node false, DB true, bounded shadow true;
4. both-on business-cycle posture: Node true, DB true, only the minimum admin/webhook/public flags required;
5. rollback/restored: Node false first, verified v1, then DB false, all exposure flags false;
6. intentional Node-only invalid posture: Node true, DB false, with the minimum public-booking/webhook readiness
   required to reach the compatibility decision. Authenticated availability and hold calls must return the exact
   documented misalignment failure (for example the route contract's 503), not an unrelated disabled-booking 403.
   Compare reservation, assignment, payment, and provider-effect counts before/after to prove zero acquisition and
   zero side effects, then immediately restore.

The normal rollout sequence is:

1. all flags and DB setting off;
2. enable `app_settings.vip_floor_v2_dual_write` in staging DB only;
3. verify v1 availability/hold and compatibility projection;
4. deploy bounded shadow comparison with Node public dual-write still off;
5. verify deterministic comparison before public v8 routing;
6. deploy Node public dual-write and the minimum required staging-only business-cycle flags;
7. run the business cycle and observation;
8. rollback Node flags through a new all-off deployment;
9. prove v1 public availability/hold/admin operation;
10. disable DB dual-write;
11. test Node-only invalid posture in isolation and prove fail-closed/no inventory;
12. restore final all-off Node posture and DB false.

Do not enable `FEATURE_VIP_FLOOR_V2_READ_ENABLED` merely to expose Phase D UI. Enable only flags required by the
existing server API for the synthetic cycle and keep all UI work prohibited.

### 13. Phase 6 — authentic synthetic business cycle

Use synthetic future business dates and the existing application/saga/worker ownership boundaries. Before any
provider call, create and hash-link a sanitized expectation ledger. For every scenario it must freeze the safe
provider category, expected integer count, and owning saga/worker. Never change expected counts after observation
except through an explicit FAIL amendment that preserves the original ledger.

Derive the ledger from current code before execution and include every applicable Customer, Checkout Session,
SetupIntent, PaymentIntent, and Refund category. A category that is not created by the authoritative path must be
recorded as not applicable with a reviewed reason, not silently omitted after observation.

Complete at least two distinct real Stripe test-mode cycles because card setup and refundable deposit ownership are
different:

```text
Cycle A — card setup
availability → seat availability → atomic begin-hold
→ Checkout Session/card-setup path → SetupIntent completion
→ genuinely signed webhook → webhook worker readback → replay/idempotency proof

Cycle B — refundable deposit
availability → seat availability → atomic begin-hold
→ deposit PaymentIntent through the supported server path → genuine Stripe test confirmation
→ genuinely signed webhook → webhook worker readback → reservation confirm → check-in
→ cancel/refund-required handoff → existing refund worker
→ authenticated Stripe test-mode refund readback
```

Also exercise and prove:

- signed webhook success;
- invalid-signature rejection before processing;
- failure handling;
- Stripe retry/manual resend;
- conflict handling;
- replay/idempotency;
- the expectation ledger's Checkout Session/SetupIntent, PaymentIntent, and Refund categories all reconcile;
- duplicate provider effect count zero;
- refund case/job is created once and the existing refund worker is the only code that creates the Stripe refund;
- no SQL/trigger/compatibility path invokes a provider.

Use test payment methods only. Provider IDs may exist ephemerally in a private, permission-restricted operational
file, but must never enter repository evidence, agent messages, screenshots, or logs retained for the handoff.

Vercel Cron invokes production deployment paths, so do not wait for or rely on `vercel.json` cron schedules in the
custom staging environment. Invoke the exact staging worker routes manually with the staging `CRON_SECRET` or
`WORKER_RUN_SECRET` as required. Never invoke the production hostname.

### 14. Phase 7 — bounded runtime sampling

1. Use the code's bounded shadow execution path; do not move comparison work into the served-response critical
   path.
2. Collect at least 1,000 completed, attributable samples from the frozen deployment and migration bundle. Store
   this count as `sampleAttempts` because the current audit uses it as the canonical denominator.
3. Filter only the structured `VIP Floor shadow comparison` events. Do not download or commit broad Vercel logs.
4. Aggregate in memory or in a permission-restricted temporary file.
5. Compute actual:
   - `sampleAttempts` = completed attributable comparisons, at least 1,000;
   - `sampleSuccesses` and success rate = `sampleSuccesses / sampleAttempts`, at least `0.999`;
   - upstream requests, scheduled attempts, collector losses, and concurrency skips as separate provenance only;
   - critical mismatch count/rate, both zero;
   - privacy violation count, zero;
   - unknown divergence count, zero;
   - p95 `durationMs`;
   - event count and distinct-key/cardinality count.
6. Compare against budgets approved before the observation. Never revise a budget after seeing measurements.
7. Hash the sanitized provenance and record the collector/tool hash and observation interval. Do not retain provider
   IDs, reservation IDs, raw canonical arrays, secrets, or PII.

### 15. Phase 8 — rollback rehearsal and final safe posture

Rollback order is mandatory:

1. disable Node public dual-write and all temporary public/admin/webhook/shadow exposure through a new deployment;
2. authenticate runtime readback;
3. prove v1 availability, hold, and admin operation;
4. disable DB dual-write;
5. authenticate DB and runtime readback;
6. prove no provider effect was duplicated across the transition;
7. retain migrations, rows, and audit evidence; do not down-migrate under incident pressure.

Default final posture pending signatures:

- all C7 application flags off;
- DB dual-write false;
- staging retained but quarantined;
- no production alias;
- Stripe test webhook/RAK retained only as long as required for evidence review;
- an owner, expiry/review date, and cost alert recorded without secrets.

Destructive teardown requires a separate Owner decision after exact staging-vs-production identity checks.

### 16. Mandatory stop and rollback triggers

Stop immediately and execute rollback when any of these occurs:

- Vercel plan lacks Custom Environments or an unapproved charge/upgrade is required;
- a selected Vercel target, alias, hostname, Supabase ref, or Stripe key/object is production/live;
- staging Supabase equals production, is only a branch, or contains copied production data;
- source or migration hash drifts after freeze;
- deployed metadata cannot prove the frozen source and migration identity;
- a secret, URL, ref, provider ID, PII, ciphertext, note, cookie, or auth header appears in retained evidence;
- seat duplication, availability/hold disagreement, invalid version/revision delta, or v1 response regression;
- critical or unknown shadow mismatch, privacy finding, or snapshot race;
- deadlock, lock timeout increase, hold latency breach, p95 budget breach, or log budget breach;
- Node/DB misalignment does not fail closed;
- Stripe/LINE/refund duplicate effect or idempotency regression;
- webhook signature is not verified before processing;
- runtime state, provider truth, or rollback cannot be authenticated;
- an agent proposes manually entering PASS booleans, copying runbook example numbers, or impersonating a signer.

On any stop, retain sanitized evidence of the failure, keep Gate C `HOLD`, and report the exact blocker.

### 17. Phase 9 — generate immutable runtime evidence

Generate a new timestamped file under:

```text
website/docs/evidence/vip-floor-v2/gate-c-staging-observation-YYYYMMDDTHHMMSS.json
```

Use schema `vip-floor-gate-c-staging-observation.v1` and the exact shape required by the existing runbook/audit.
Every count, rate, boolean, budget, timestamp, and readback must come from the named measured source for the exact
staging deployment. Do not copy example values.

At minimum it must prove:

- current runtime-source hash and migration head/bundle;
- at least two distinct synthetic business cycles: card setup and refundable deposit;
- at least 1,000 completed samples and success rate at least 99.9%;
- zero critical/privacy/unknown divergence;
- p95 and logging within pre-approved non-zero budgets;
- all six webhook/refund booleans required by the audit;
- non-empty authenticated provider-effect categories with actual = expected and duplicate = 0;
- at least six authenticated flag-readback steps including all-off, DB-only, both-on, rollback, restored, and
  Node-only fail-closed;
- every observation and step timestamp is timezone-bearing ISO-8601, step names are unique, steps are strictly
  chronological, and only the intentional Node-only rejection step has `failClosed=true`;
- privacy scan passed with PII, secret, and provider-ID findings all zero;
- provenance/tool hashes and observation interval as additional sanitized fields if the schema permits.

Then:

1. hash-link the new READY preflight and observation in `gate-c-summary-20260714.json`;
2. copy observation aggregates into `summary.runtime` exactly;
3. truthfully set `operations.stagingFlagChanged=true` and
   `operations.externalProviderCallPerformed=true`; keep `productionDeployPerformed=false`,
   `productionFlagChanged=false`, and `uiPhaseStarted=false`;
4. clear every resolved historical blocker. If runtime passes but signatures are missing, list only the exact
   signature blockers. Set decision `PASS` with an empty blocker list only after all three signatures validate;
5. update the summary `capturedAt` to the final decision time using timezone-bearing ISO-8601;
6. use an explicit `VIP_FLOOR_GATE_C_SUMMARY` path during the run to avoid selecting a stale latest file;
7. run the normal Gate C audit.

```bash
cd website
export VIP_FLOOR_GATE_C_SUMMARY=docs/evidence/vip-floor-v2/gate-c-summary-20260714.json
npm run audit:vip-floor-v2-gate-c
```

Do not request signatures while audit failures exist.

### 18. Human approvals and signatures

Agents may prepare the manifest but may not sign, invent, infer, or copy human approval.

After runtime evidence passes:

```bash
cd website
export VIP_FLOOR_GATE_C_SUMMARY=docs/evidence/vip-floor-v2/gate-c-summary-20260714.json
npm run print:vip-floor-v2-gate-c-signature-manifest
```

Create a new immutable `vip-floor-gate-c-signatures.v2` JSON only after the sole real person reviews the exact
manifest SHA separately in all three roles and explicitly decides `PASS`:

- Owner
- Floor Manager
- Engineer

Require the active `single_operator_multi_role_v1` governance object, three unique roles, the same non-placeholder
human name, three distinct timezone-bearing ISO-8601 timestamps, explicit PASS decisions, role-specific attestation
codes, and the same evidence manifest SHA in every record. This is one human making three role decisions, not three
independent reviewers. Copy the exact records into the summary and hash-link the signature file.

After the signature file validates, set `signaturesEvidencePath`, copy the same three records into the summary,
hash-link the signature file, set `decision.status="PASS"`, clear `decision.blockers`, and update `capturedAt`. If the
runtime evidence passes but signatures are incomplete, keep `decision.status="HOLD"` and list only the exact missing
or declined signature roles.

If any role decision is unavailable or declines, leave Gate C `HOLD`. Report runtime-ready status and the remaining
role-decision blocker without fabricating a signature.

### 19. Final validation

Run the current local and Gate C validation appropriate to the final source, including:

The public-dual-write SQL, race, and rollback commands are write-capable and use ambient PostgreSQL connection
variables. Run them only against the established disposable PostgreSQL 16 harness after authenticating a unique
local/disposable fingerprint and explicitly refusing any production or hosted staging hostname/ref. Clear inherited
`DATABASE_URL`, `PGHOST`, `PGPORT`, `PGDATABASE`, and related variables before the harness supplies its own values.
Never run these deterministic fixtures against production or the new hosted staging project.

```bash
cd website
export VIP_FLOOR_GATE_C_SUMMARY=docs/evidence/vip-floor-v2/gate-c-summary-20260714.json
npm run ci:local
npm run test:vip-floor-v2-public-dual-write
npm run test:vip-floor-v2-dual-write-races
npm run test:vip-floor-v2-rollback
npm run audit:vip-floor-v2-gate-c
npm run audit:vip-floor-v2-gate-c -- --require-pass
```

Interpret results exactly:

- require-pass exit `0`: Gate C PASS for the exact hashes and signatures;
- exit `2`: valid evidence package remains HOLD;
- any other non-zero: invalid evidence package.

After external work, repeat the redacted production fingerprint checks and prove production Vercel aliases,
production deployment fingerprint, linked production Supabase fingerprint, production flags, and production Stripe
mode were unchanged. Do not perform a production write to prove non-change.

Update `docs/AI_WORK_LOG.md` and `docs/AI_CURRENT_STATUS.md` according to the shared protocol. Phase D and all UI
work remain forbidden unless require-pass exits `0`.

### 20. Final response contract

Report concisely:

- terminal outcome: Gate C PASS, runtime-ready HOLD, or fail-closed HOLD;
- staging resources created by safe names only, never refs/URLs;
- final runtime-source and migration hashes;
- preflight and audit exit codes;
- measured sample count/rate, zero-count assertions, p95 versus approved budget, and log budgets;
- synthetic business-cycle, signed webhook, refund-worker, provider duplicate, flag rollout, and rollback results;
- signature status by role without pretending an unavailable signature exists;
- final staging posture and production-unchanged proof;
- evidence and coordination files changed;
- remaining blockers and exact next action, if any.

Never include secrets, provider IDs, project refs, deployment URLs, raw logs, or customer data in the response.

## Prompt ends

---

## Official operational references

- Vercel Custom Environments, creation, plan limits, and `--target=staging`:
  <https://vercel.com/docs/deployments/environments>
- Vercel target CLI behavior: <https://vercel.com/docs/cli/target>
- Vercel environment changes requiring a new deployment:
  <https://vercel.com/docs/environment-variables/managing-environment-variables>
- Vercel Cron invoking production deployment paths: <https://vercel.com/docs/cron-jobs>
- Supabase CLI project creation, linking, and migration push:
  <https://supabase.com/docs/reference/cli/supabase-orgs-list>
- Supabase environment separation: <https://supabase.com/docs/guides/deployment/managing-environments>
- Stripe webhook signature verification/retry behavior: <https://docs.stripe.com/webhooks>
- Stripe restricted-key guidance: <https://docs.stripe.com/keys-best-practices>
- Stripe test mode: <https://docs.stripe.com/testing>
- Stripe refunds and refund events: <https://docs.stripe.com/refunds>
