# GHOST Osaka VIP Floor C7 immutable staging bootstrap / RAK / webhook execution prompt

Date: 2026-07-14 JST

Status: execution prompt only; creating this document does not deploy, change flags, create Stripe objects, or alter provider state

Scope: all-off immutable Vercel staging deployment, runtime verification of the staging Stripe restricted key, one Stripe test-mode webhook endpoint, genuine signing-secret wiring, and a second immutable all-off deployment

## How to use this document

Give everything from **Prompt starts** through **Prompt ends** to the primary implementation agent. Run it from:

```text
/home/kokoro/projects/clients/ghost
```

This is a narrow continuation of:

```text
website/docs/research/tablecheck-vip-floor-c7-staging-runtime-evidence-execution-prompt-2026-07-14.md
```

It does not authorize the C7 business cycles, shadow sampling, Node/DB flag transitions, production work, live-mode
Stripe activity, Phase D UI, or human signatures. Runtime observation budgets may remain pending while this bootstrap
is completed.

---

## Prompt starts

You are the primary implementation agent for the next GHOST Osaka VIP Floor C7 bootstrap step. Work persistently
until one truthful terminal outcome is reached:

1. **BOOTSTRAP READY:** two all-off staging deployments use the same frozen source artifact; the second deployment
   has all 26 required environment names; the staging RAK is authenticated as restricted test-mode and passes the
   approved capability matrix; exactly one Stripe test webhook endpoint is enabled and bound to the second
   deployment; artifact/provider provenance validates; production fingerprints are unchanged.
2. **BOOTSTRAP HOLD:** the deployments and Stripe resources are safe and partially complete, but provider artifact
   provenance, deployment protection, or another non-destructive boundary cannot be proven. Record the exact
   blocker and leave all application flags off.
3. **FAIL-CLOSED HOLD:** source drift, secret exposure, production/live selection, permission mismatch, duplicate
   endpoint, provider side-effect mismatch, or another stop condition requires immediate halt. Preserve sanitized
   evidence and leave staging all-off.

Do not claim Gate C PASS. This prompt ends before C7 runtime observation and human signatures.

### 1. Authority and exact write scope

You may:

- harden staging-only artifact/provenance tooling and add tests;
- add one authenticated, staging-only Stripe capability probe that returns aggregate booleans and safe enums only;
- freeze and build the exact current dirty runtime source without committing it;
- deploy the frozen prebuilt artifact to Vercel custom target `staging` exactly twice;
- perform one bounded Stripe test-mode RAK capability smoke with synthetic-only objects;
- create exactly one Stripe test-mode webhook endpoint for `/api/stripe/webhook` using the local operator credential;
- write the endpoint's one-time signing secret directly to Vercel `staging` as `STRIPE_WEBHOOK_SECRET` Sensitive;
- update that same endpoint to the second immutable deployment URL;
- perform authenticated, read-only runtime and provider readbacks;
- write sanitized bootstrap evidence and update Gate C/shared coordination documents.

Root owns every provider mutation, shared file, deployment, RAK probe invocation, webhook endpoint creation/update,
and final decision. Subagents, if required by the parent C7 execution contract, are read-only reviewers for this
narrow prompt and must not receive secrets, URLs, refs, deployment IDs, Stripe IDs, or raw provider responses.

### 2. Absolute prohibitions

Never:

- use `--prod`, `--target=production`, `vercel promote`, `vercel alias`, or a production hostname;
- create a Preview variable to silence the preflight;
- import Production or Development variables into staging;
- change any application feature flag or the staging DB dual-write setting from false;
- connect to or write the production Supabase project;
- use Stripe live mode, `--live`, a live key, real payment data, or production objects;
- put the local broad/operator Stripe credential into Vercel or application runtime;
- use the staging app RAK to create/read/update webhook endpoints;
- widen the RAK automatically when a probe fails;
- add `payment_method_types` to any Stripe create call;
- create more than one staging webhook endpoint;
- create a replacement endpoint merely because a one-time signing secret was lost;
- print, commit, or retain in repository evidence any secret, auth header, cookie, URL, query string, provider ID,
  project ref, raw webhook body, Stripe signature, customer data, ciphertext, or free-form note;
- expose an unauthenticated environment-dump or capability endpoint;
- treat Git HEAD, deployment metadata supplied by the caller, a READY state, or a screenshot as deployed-byte proof;
- fabricate a RAK class, permission, provider effect, count, timestamp, provenance link, or PASS boolean;
- commit, push, clean, reset, checkout over, or otherwise overwrite the dirty worktree.

If a command can target production and cannot prove its target before writing, do not run it.

### 3. Read completely before acting

Read:

- `AGENTS.md`
- `docs/AI_AGENT_SYNC.md`
- `docs/AI_CURRENT_STATUS.md`
- latest rows of `docs/AI_WORK_LOG.md`
- `website/AGENTS.md`
- parent C7 execution prompt named above
- `website/docs/evidence/vip-floor-v2/gate-c-staging-operator-runbook.md`
- `website/docs/evidence/vip-floor-v2/gate-c-staging-preflight-20260714.json`
- `website/docs/evidence/vip-floor-v2/gate-c-c7-resume-20260714.json`
- `website/docs/evidence/vip-floor-v2/gate-c-summary-20260714.json`
- `website/scripts/preflight-vip-floor-v2-gate-c-staging.mjs`
- `website/scripts/audit-vip-floor-v2-gate-c.mjs`
- `website/scripts/lib/vip-floor-gate-c-contracts.mjs`
- `website/src/lib/server/stripe.ts`
- `website/src/lib/server/stripeEventPolicy.ts`
- `website/src/app/api/stripe/webhook/route.ts`
- `website/src/lib/server/stripeWebhook.ts`
- `website/src/app/api/admin/runtime/flags/route.ts`
- all application Stripe create/retrieve/refund calls found by source search
- the applicable Stripe best-practices skill and its security/payments references
- current Vercel Custom Environment, prebuilt deployment, deployment protection, environment-variable, and REST API
  documentation.

Inspect the dirty worktree. Preserve all unrelated changes.

### 4. Starting state: verify, never trust

The latest sanitized evidence says:

- Vercel custom target `staging` exists exactly once with no branch, domain, or imported environment;
- staging Supabase is a separate healthy Tokyo project with all 31 migrations;
- staging has 25 of 26 required environment names;
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is present as test publishable material;
- `STRIPE_SECRET_KEY` exists exactly once as Sensitive, but its value/class/permissions are not readable;
- only `STRIPE_WEBHOOK_SECRET` is absent;
- all application flags and DB dual-write are off;
- there is no staging deployment;
- production deployment/alias fingerprints were unchanged at the last readback;
- current preflight is expected `HOLD`;
- the runtime source is dirty and has not been bound to a provider-verifiable artifact.

Historical hashes are hints only. Recompute all hashes. Historical values must never be copied into new evidence.

### 5. Mandatory pre-mutation boundary audit

Before editing or writing providers:

1. Create a dedicated operational directory outside the repository with mode `0700`.
2. Ensure every secret-bearing or provider-identity-bearing file is mode `0600`.
3. Capture one-way before fingerprints for:
   - production deployment inventory;
   - production alias/domain inventory;
   - current staging target record;
   - staging env name/type inventory;
   - linked production Supabase identity;
   - independent staging Supabase identity and migration list;
   - Stripe test webhook endpoint inventory.
4. Reduce provider responses in memory. Do not save broad raw Vercel/Stripe JSON in repository evidence.
5. Prove:
   - Vercel target is exactly `staging`;
   - staging Supabase differs from production;
   - Stripe operator credential is test mode;
   - staging has a single Sensitive `STRIPE_SECRET_KEY` record;
   - no existing Stripe endpoint is already classified for this staging bootstrap;
   - no production deployment or alias mutation is pending.
6. Run the current preflight and normal Gate audit. Preserve their real exit codes. Expected state is valid `HOLD`.

If a staging webhook endpoint already exists, do not create another. Privately reconcile its description, URL
digest, event set, API version, status, and whether its signing secret is still recoverable. If the secret is lost,
stop for an Owner decision rather than duplicating the endpoint.

### 6. Harden artifact identity before deployment

The current preflight contains placeholder `artifactIdentity` fields. Do not deploy first and invent provenance
later. Implement and test the missing proof path.

Prefer small, reviewable modules such as:

```text
website/scripts/lib/vip-floor-gate-c-artifact.mjs
website/scripts/verify-vip-floor-v2-gate-c-bootstrap-contracts.mjs
website/scripts/deploy-vip-floor-v2-gate-c-bootstrap.mjs
```

The execute script must be dry-run by default and require an explicit execute switch. It must refuse every target
except exact `staging`. It must not accept a deployment URL, project ID, secret, or provider object ID on argv.

Required artifact contracts:

1. Enumerate the exact runtime inputs used by `createRuntimeSourceBundleSha256()`.
2. Build a canonical source manifest of sorted relative path, SHA-256, byte size, file type, and executable mode.
3. Record the source-manifest hash and migration bundle hash before build.
4. Enforce a quiescent window: the manifest must be byte-identical before and after build and after each deploy.
5. Build with the selected, reviewed Vercel CLI using target `staging` and no production switch.
6. Canonicalize `.vercel/output` without trusting tar timestamps or filesystem traversal order.
7. Compute:
   - local source-manifest SHA-256;
   - runtime-source bundle SHA-256;
   - migration bundle SHA-256;
   - local Build Output file-manifest SHA-256;
   - normalized artifact/Merkle SHA-256.
8. After deployment, use authenticated provider APIs to retrieve the deployment and file inventory. Normalize only
   reviewed fields required for identity.
9. Prove the provider file identities map to the exact local upload manifest. Do not require equality between two
   differently shaped manifests without a tested canonical mapping.
10. Compute a provider deployment-provenance SHA-256 from target, state, immutable file identities, and reviewed
    non-secret metadata.
11. Populate `artifactIdentity` only from measured results. Caller-supplied metadata is corroboration, not proof.
12. Add positive and negative tests for path order, modified byte, missing file, duplicate path, provider digest
    mismatch, source drift, metadata-only spoofing, wrong target, production alias, and second-deploy artifact drift.

If Vercel does not expose a provider identity that can be independently mapped to the uploaded artifact, keep the
bootstrap/Gate decision `HOLD`. Do not weaken `validatePreflightArtifactIdentity()`.

### 7. Staging-only RAK capability probe

Sensitive Vercel values are intentionally unreadable. Validate the RAK inside the staging runtime without returning
or logging it.

If no safe existing surface can perform this proof, add a minimal endpoint and helper, for example:

```text
website/src/app/api/admin/runtime/stripe-capabilities/route.ts
website/src/lib/server/stripeCapabilityProbe.ts
```

The probe must:

- use Node runtime;
- require `assertWorkerRequest()` or an equally strong existing worker authentication check;
- return `404` unless `process.env.VERCEL_TARGET_ENV === "staging"`;
- use `POST`, `Cache-Control: no-store`, and one private idempotent run token;
- refuse when any application flag or DB dual-write setting is on;
- never return/log the RAK, its prefix, Stripe IDs, URLs, request-log links, raw errors, or object bodies;
- return only stable capability names, safe status enums, counts, `livemode=false`, cleanup booleans, and one-way
  digests;
- sanitize Stripe errors to `allowed`, `permission_missing`, `authentication_failed`, `invalid_request`, or
  `unexpected`; never include raw messages;
- be covered by static/contract tests proving authentication, staging-only refusal, redaction, and no live mode.

Before the probe creates anything, freeze a private bootstrap capability expectation ledger and a sanitized hash.
The probe is not a C7 business cycle and must not be counted as one.

Validate exactly these application permissions:

```text
Customers: Write
Checkout Sessions: Write
Setup Intents: Read
Payment Intents: Write
Payment Methods: Read
Refunds: Write
```

Use bounded test-mode operations and idempotency:

- create one clearly synthetic Customer and delete it during cleanup;
- create one setup-mode Checkout Session without `payment_method_types`, then expire it;
- perform a read-only SetupIntent list/retrieve probe;
- retrieve a Stripe test PaymentMethod or perform the minimum read-only PaymentMethod probe;
- create and confirm one minimal test PaymentIntent with an official Stripe test payment method, then create one
  test refund so Refunds Write is proven by a real test-mode operation;
- assert every returned Stripe object has `livemode=false`;
- prove the exact expected counts, no duplicates, and cleanup/final status;
- read back provider truth with the operator credential, not by trusting the application response alone.

Also prove separation of duties:

- app RAK prefix class is `rk_test` inside runtime, reported only as safe enum `restricted_test`;
- app RAK cannot enumerate webhook endpoints;
- app RAK is never copied to local logs or the operator config;
- local operator credential is never injected into the deployment.

On `permission_missing`, stop. Report the missing capability by safe name and ask the Owner to amend the RAK in
Stripe Dashboard. Do not fall back to the broad Development `sk_test` key.

### 8. Freeze one source and one prebuilt artifact

All source/tooling changes, including the capability probe, must finish before freeze.

1. Run local deterministic validation appropriate to changed files.
2. Recompute the runtime source and migration manifests.
3. Freeze the canonical source manifest in the private operations directory and write only its digest to sanitized
   evidence.
4. Run the target-aware local build. Do not export Sensitive values to a file.
5. Confirm server-only Stripe/Supabase secrets are not embedded in `.vercel/output` by scanning for credential
   classes and known secret digests without printing matches.
6. Hash and freeze `.vercel/output`.
7. Do not rebuild between deployment 1 and deployment 2. Reuse the exact same frozen output.

The documented command shape is:

```bash
cd website
vercel build --target=staging
vercel deploy --prebuilt --target=staging --format=json
```

Do not run these ad hoc. The hardened execute script must capture deployment stdout privately because it contains a
URL/ID, reduce it in memory, preserve the real exit code, and emit only sanitized booleans/digests.

Pin or record the exact Vercel CLI version used. Do not globally upgrade tools during the execution. If the installed
CLI cannot produce required structured output, use an explicitly versioned ephemeral CLI after reviewing its help
and record the version in evidence.

### 9. Deployment 1: all-off bootstrap without webhook secret

Deploy the frozen prebuilt artifact exactly once to target `staging` with non-secret metadata containing only the
recomputed source, migration, artifact, and env-posture hashes.

The first env posture is:

```text
all application flags=false
DB dual-write=false
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY present
STRIPE_SECRET_KEY Sensitive present
STRIPE_WEBHOOK_SECRET absent
```

After Vercel reports READY:

1. Confirm `VERCEL_TARGET_ENV=staging` through authenticated runtime readback.
2. Confirm every application flag is configured and disabled.
3. Confirm Node dual-write false, DB dual-write false, and alignment `aligned`.
4. Confirm no production alias/domain is attached.
5. Confirm source and artifact manifests did not drift.
6. Bind provider file/provenance identity to the frozen local artifact.
7. Invoke the capability probe exactly once and complete the RAK matrix.
8. Use Vercel's authenticated curl/bypass mechanism for operator calls; never print the deployment URL or bypass
   secret.

The first deployment may remain preflight `HOLD` because `STRIPE_WEBHOOK_SECRET` is intentionally absent. That is
not permission to begin C7 business cycles.

### 10. Deployment protection decision

Determine anonymously, without logging the URL, whether Stripe can reach the exact webhook route.

- Keep deployment protection enabled.
- Prefer no bypass if the route is already reachable.
- If protection blocks Stripe, use the already-created purpose-noted Vercel automation bypass secret only through
  the documented query parameter required for third-party webhooks.
- Keep the complete URL plus query string only in the private `0700/0600` operations area and in Stripe provider
  state. Repository evidence may contain only a URL digest and `protectionBypassUsed` boolean.
- Never disable project protection globally and never attach a production domain.

Remember: the Vercel automation bypass secret is project-wide. Any exposure is an immediate stop/rotation event.

### 11. Create exactly one Stripe test webhook endpoint

Use the local Stripe operator credential for endpoint administration. Do not use the app RAK.

Immediately before creation:

1. Re-list test webhook endpoints privately.
2. Prove no endpoint has the exact bootstrap description or URL digest.
3. Derive the enabled event set directly from current `STRIPE_WEBHOOK_EVENT_TYPES`; compare it to source and reject
   duplicates or wildcard `*`.
4. Use API version `STRIPE_API_VERSION` from current source.
5. Set `connect=false`, status enabled, and a stable description such as
   `ghost-vip-floor-staging-c7-20260714`.

The current source event policy is authoritative. Do not silently omit dispute or payment-method events and do not
subscribe to unrelated events.

Create the endpoint once. Stripe returns the signing secret only at creation. The orchestration must:

- stream the response directly to a parser;
- never print or retain the raw response;
- write endpoint identity, full protected URL, and the one-time signing secret only to separate `0600` private
  files or keep them in memory;
- write a sanitized receipt containing test-mode, enabled, API-version match, event-set hash, URL hash, count=1,
  and no IDs/secrets;
- if creation succeeds but later wiring fails, reuse the same endpoint and retained private secret;
- if the private secret is lost, stop for Owner direction rather than creating a duplicate.

Do not send or trigger a webhook event in this phase. Genuine delivery belongs to the later provider expectation
ledger/business cycle.

### 12. Wire `STRIPE_WEBHOOK_SECRET` safely

Write the one-time `whsec_` value to Vercel custom environment `staging` only:

```text
name: STRIPE_WEBHOOK_SECRET
environment: staging only
type: Sensitive
```

Use stdin or an SDK request body held in memory. Never use `--value`, argv, shell history, or a repository `.env`
file. Read back name, environment, and type only. Prove:

- exactly one record;
- type Sensitive;
- no git branch binding;
- staging env count 26/26;
- Preview remains unchanged;
- Production remains unchanged.

### 13. Deployment 2: same artifact, webhook-bound all-off posture

Do not rebuild. Recheck the frozen output manifest, then deploy the exact same prebuilt artifact a second time to
`staging` so the new Sensitive variable is present at runtime.

Record a new env-posture hash but require the source/artifact hashes to match deployment 1 exactly.

After READY:

1. Update the same Stripe endpoint URL to deployment 2. Do not create another endpoint.
2. Preserve the endpoint signing secret; changing the URL must not rotate it.
3. Read back endpoint state with the operator credential and prove:
   - test mode;
   - enabled;
   - account endpoint, not Connect;
   - API version equals source;
   - enabled event set exactly equals source;
   - endpoint count remains one;
   - URL digest matches deployment 2;
   - signing-secret value is not read or printed.
4. Authenticated runtime readback must show:
   - `VERCEL_TARGET_ENV=staging`;
   - all application flags false;
   - Node/DB dual-write false/aligned;
   - publishable, RAK, and webhook-secret presence true;
   - no LINE readiness or delivery was enabled.
5. Prove deployment 2 maps to the exact same local artifact and has no production alias.
6. Do not trigger a real or synthetic Stripe webhook yet.

An unsigned POST should be rejected before storage, but do not use this as proof that the signing secret works.
Genuine signed delivery is deferred to the later expectation-ledger business cycle.

### 14. READY preflight and evidence

Run a new timestamped read-only preflight bound to:

```text
VIP_FLOOR_STAGING_VERCEL_TARGET=staging
VIP_FLOOR_STAGING_SUPABASE_PROJECT_NAME=ghost-vip-floor-staging
VIP_FLOOR_STAGING_BUILD_SHA256=<recomputed current runtime-source hash>
VIP_FLOOR_STAGING_ARTIFACT_SHA256=<measured frozen artifact hash>
VIP_FLOOR_STAGING_ARTIFACT_FILE_MANIFEST_SHA256=<measured canonical manifest hash>
```

Values must come from in-memory measured state, not manual transcription. Preserve the real process exit code.
Sanitize before moving evidence into the repository.

The final preflight may be `READY` only if:

- custom staging target exists and Preview emptiness is informational;
- 26/26 required env names are present;
- independent staging Supabase and migration identity match;
- deployment 2 is READY/current;
- source is quiescent or explicitly bound to the supplied current-source hash;
- local artifact and provider provenance are cryptographically bound;
- Stripe local operator credential remains test mode;
- blockers are empty;
- every `safety` value remains false.

Write one timestamped sanitized bootstrap evidence file, for example:

```text
website/docs/evidence/vip-floor-v2/gate-c-c7-bootstrap-YYYYMMDDTHHMMSS.json
```

It must contain only safe names, booleans, counts, timestamps, hashes, CLI versions, and error classes. At minimum:

- source/migration/artifact/provider-provenance hashes;
- deployment count=2 and identical artifact assertion;
- env posture before/after and 26/26 final count;
- all-off runtime/DB readback;
- RAK class `restricted_test` and six capability results;
- bootstrap provider-effect expectation/actual/duplicate/cleanup counts;
- endpoint count=1, test/enabled/account/API-version/event-set/URL-digest assertions;
- production deployment/alias/Supabase/Stripe-live unchanged booleans;
- secret/PII/provider-ID scan results;
- terminal outcome and exact blockers.

Hash-link the new preflight/bootstrap evidence in `gate-c-summary-20260714.json`. Clear only blockers actually resolved.
Keep `decision.status="HOLD"`, runtime observation fields unready, signatures empty, and Phase D prohibited.

### 15. Stop conditions and compensation

Stop immediately if:

- target or provider mode is production/live;
- source/migration/output hash drifts after freeze;
- a Vercel deployment gains a production alias/domain;
- provider file identity cannot be mapped to the local artifact;
- any secret, URL, query string, provider ID, auth material, PII, or raw response reaches retained output/evidence;
- the runtime reports a non-staging target;
- any application or DB dual-write flag is on;
- RAK prefix class is not `restricted_test`;
- a required RAK capability returns `permission_missing` or a probe produces unexpected objects/counts;
- a Stripe object is live mode;
- the operator credential appears in deployment state;
- webhook endpoint count is not exactly one;
- event set/API version/connect mode differs from source contract;
- endpoint creation succeeded but the signing secret is lost;
- deployment protection cannot be satisfied without disabling protection or exposing the bypass secret;
- production fingerprints change.

Compensation rules:

- leave all flags and DB dual-write off;
- cancel/expire/delete only the synthetic capability-smoke objects explicitly owned by the private run ledger;
- do not delete the staging project, target, deployment, endpoint, RAK, or bypass secret without Owner approval;
- if an endpoint exists after a later step fails, retain it and the private signing secret for safe continuation;
- if a secret is exposed, stop, rotate/revoke it, record sanitized incident evidence, and do not continue automatically;
- keep Gate C `HOLD` and record the exact unresolved boundary.

### 16. Validation

Run validations proportional to changed files, including:

```bash
cd website
node scripts/verify-vip-floor-v2-gate-c-contracts.mjs
node scripts/verify-vip-floor-v2-gate-c-bootstrap-contracts.mjs
npm run test:stripe-replay
npm run test:stripe-unbound
npm run test:reservation-saga
npm run test:vip-static
npm run lint
npm run build
npm run audit:vip-floor-v2-gate-c
npm run audit:vip-floor-v2-gate-c -- --require-pass
```

If the new bootstrap verifier is added to `package.json`, update the lockfile only when dependencies actually
change. Do not manufacture a package-lock diff for a script-only entry.

Interpretation:

- normal Gate audit must be valid;
- require-pass exit `2` is expected because runtime observation/signatures remain incomplete;
- require-pass exit `0` is not expected from this narrow prompt;
- any other non-zero indicates invalid evidence or tooling failure.

Run JSON parse, evidence hash, secret-class, provider-ID/URL, whitespace, and `git diff --check` scans. Negative
fixtures must prove the scanner actually detects prohibited content.

### 17. Final production-unchanged review

Repeat read-only fingerprints and prove:

- production deployment inventory unchanged;
- production alias/domain inventory unchanged;
- production environment variables unchanged;
- linked production Supabase identity/migrations/data were not written;
- no Stripe live request/object/endpoint occurred;
- no Preview variable was added;
- no LINE call occurred;
- no UI/Phase D change occurred.

Update `docs/AI_WORK_LOG.md` and `docs/AI_CURRENT_STATUS.md` according to the shared protocol.

### 18. Final response contract

Report concisely:

- terminal outcome: BOOTSTRAP READY, BOOTSTRAP HOLD, or FAIL-CLOSED HOLD;
- final source/migration/artifact/provenance hashes;
- deployment 1/2 READY and same-artifact result without IDs/URLs;
- all-off runtime/DB readback;
- RAK safe class and capability matrix results;
- bootstrap synthetic provider counts and cleanup;
- Stripe endpoint count/test/enabled/event-set/API-version/binding results;
- env 26/26 and Sensitive webhook-secret presence;
- final preflight and Gate audit exit codes;
- production-unchanged proof;
- evidence/tooling files changed;
- exact remaining C7 blockers: budget approval, business cycles, observation, rollout/rollback, and human signatures.

Never include secrets, URLs, query strings, deployment/provider IDs, project refs, raw responses, or customer data.

## Prompt ends

---

## Official references

- Vercel Custom Environments and `--target=staging`:
  <https://vercel.com/docs/deployments/environments>
- Vercel prebuilt deployment and target options:
  <https://vercel.com/docs/cli/deploy>
- Vercel CLI local prebuilt workflow:
  <https://vercel.com/docs/cli/deploying-from-cli>
- Vercel environment changes applying only to new deployments:
  <https://vercel.com/docs/environment-variables/managing-environment-variables>
- Vercel system/custom target identity (`VERCEL_TARGET_ENV`):
  <https://vercel.com/docs/environment-variables/system-environment-variables>
- Vercel authenticated curl for protected deployments:
  <https://vercel.com/docs/cli/curl>
- Vercel Protection Bypass for Automation:
  <https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation>
- Vercel REST API and deployment file inventory:
  <https://vercel.com/docs/rest-api>
- Stripe restricted API keys and key security:
  <https://docs.stripe.com/keys>
- Stripe webhook endpoint creation API:
  <https://docs.stripe.com/api/webhook_endpoints/create>
- Stripe webhook signature, retries, event delivery, and endpoint registration:
  <https://docs.stripe.com/webhooks>
- Stripe test-mode payment methods:
  <https://docs.stripe.com/testing>

