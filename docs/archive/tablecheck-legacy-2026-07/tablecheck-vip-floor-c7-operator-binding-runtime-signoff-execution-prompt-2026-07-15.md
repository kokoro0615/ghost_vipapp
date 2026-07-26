# GHOST Osaka VIP Floor C7 operator binding / runtime evidence / sign-off execution prompt

Date: 2026-07-15 JST

Status: execution prompt only; creating this document does not authenticate Stripe, mutate a provider, deploy,
change a flag or database setting, sign for a human, or start Phase D UI work

Scope: resume from the current fail-closed bootstrap HOLD, prove the Stripe operator-to-RAK account/environment
binding, finish the immutable webhook bootstrap, collect authentic C7 runtime evidence, obtain three role-specific
attestations from the sole human operator, reach Gate C PASS if and only if every contract passes, and unlock Phase D0

## How to use this document

Give everything from **Prompt starts** through **Prompt ends** to the primary implementation agent. Run it from:

```text
/home/kokoro/projects/clients/ghost
```

This is a continuation of both existing C7 contracts:

```text
website/docs/research/tablecheck-vip-floor-c7-immutable-staging-bootstrap-rak-webhook-execution-prompt-2026-07-14.md
website/docs/research/tablecheck-vip-floor-c7-staging-runtime-evidence-execution-prompt-2026-07-14.md
```

The Owner has authorized the staging/test-only actions in this prompt and has authorized the collection and
recording of the three-role decision. The active versioned governance amendment is
`single_operator_multi_role_v1`: Owner, Floor Manager, and Engineer are roles held by one real person. The human
must review the final manifest separately in all three roles; this does not count as three independent reviewers.
The current authorization is not itself any final role attestation.

This prompt deliberately ends at Phase D0 handoff. Mixing UI source changes into the provider/runtime evidence
window would invalidate source quiescence and make the Gate C decision harder to audit. D1-D5 implementation uses
the accepted Phase C/UI plan only after the final require-pass audit exits 0.

---

## Prompt starts

You are the primary implementation agent responsible for resuming GHOST Osaka VIP Floor C7 from the exact
2026-07-15 fail-closed HOLD. Work persistently until one truthful terminal outcome is reached:

1. **GATE C PASS / PHASE D0 UNLOCKED:** the dedicated Stripe operator profile is proven to manage the same test
   account/environment as the staging RAK; the retained three synthetic objects match exactly; exactly one test
   webhook endpoint exists; its genuine signing secret is present as staging-only Sensitive material; deployment 2
   reuses the exact frozen artifact without rebuild; the READY preflight passes; two authentic business cycles,
   bounded shadow observation, performance/log budgets, signed webhook/refund paths, flag rollout/rollback, privacy,
   production-isolation, and all three sole-operator role attestations pass; the final require-pass audit exits 0.
2. **OPERATOR AUTHENTICATION HOLD:** Owner action is still required to authenticate the dedicated local Stripe CLI
   profile, or the authenticated profile cannot prove the 3/3 retained-object binding. No webhook is created.
3. **BOOTSTRAP READY / RUNTIME HOLD:** operator binding, one endpoint, 26/26 env, same-artifact deployment 2, and
   READY preflight pass, but a budget, runtime, observation, or provider rehearsal prerequisite is not approved or
   valid. Leave staging all-off and Gate C HOLD.
4. **RUNTIME READY / SIGNATURE HOLD:** authentic runtime evidence passes, but one or more of Owner, Floor Manager,
   or Engineer has not genuinely signed the exact evidence manifest. Leave Gate C HOLD and staging in the defined
   safe posture.
5. **FAIL-CLOSED HOLD:** a source/artifact drift, secret exposure, production/live boundary, unexpected provider
   effect, duplicate endpoint, invalid signature path, unprovable readback, privacy finding, or other stop condition
   occurs. Roll back to the safe posture and record only sanitized evidence.

Do not collapse these outcomes. Infrastructure READY is not Gate C PASS. User authorization is not a signature.

### 1. Exact authority for this continuation

You may:

- ask the Owner to authenticate a dedicated local Stripe CLI operator profile through browser OAuth in a separate
  private terminal;
- receive only the fixed completion statement defined below, never a key, verification code, URL, or account ID;
- minimally harden the existing webhook orchestration script so it selects the dedicated named Stripe CLI profile
  and refuses the default profile;
- use the dedicated operator profile for authenticated test-mode readback and endpoint administration;
- prove the retained capability-probe PaymentIntent, SetupIntent, and Refund are exactly 1/1/1 in the same test
  account/environment;
- create exactly one test-mode account webhook endpoint using the already frozen source event policy;
- store its one-time signing secret directly in Vercel custom environment `staging` as Sensitive;
- deploy the exact deployment-1 frozen prebuilt artifact as deployment 2 without rebuilding;
- update the same webhook endpoint to deployment 2 and perform authenticated safe readbacks;
- execute the previously authorized staging-only business cycles, shadow sampling, performance/log observation,
  signed webhook/retry/failure/refund tests, and Node/DB rollout/rollback;
- collect the sole human operator's separate Owner, Floor Manager, and Engineer decisions for the exact evidence
  manifest under the active governance amendment;
- write sanitized evidence, update Gate C summary/status/work log, and set PASS only after require-pass exits 0;
- begin Phase D0 handoff after Gate C PASS, without implementing D1-D5 in this provider-evidence run.

This authority is staging/test-only. It does not authorize production, Stripe live mode, paid upgrades, destructive
teardown, secret disclosure, LINE delivery, commits/pushes, or a fabricated/proxy signature.

### 2. Non-negotiable prohibitions

Never:

- use `--prod`, target `production`, a production hostname, a production alias, or `vercel promote`;
- connect to, migrate, seed, query customer data from, or write the production Supabase project;
- use a Stripe live key, live object, live webhook endpoint, or real payment method;
- pass an API key with `--api-key`, `STRIPE_API_KEY`, argv, clipboard-to-agent, or an agent-visible environment;
- ask the Owner to paste a Stripe key, pairing code, browser URL, poll URL, provider ID, or CLI config;
- run `stripe login --non-interactive` in an agent-retained transcript;
- use `stripe login --interactive` to paste a key when browser OAuth is available;
- overwrite or silently switch the pre-existing default Stripe CLI profile;
- let the webhook orchestration fall back from the dedicated profile to `default`;
- use the staging application RAK for webhook endpoint administration;
- put the local operator credential in Vercel, source, `.env`, logs, evidence, or deployment state;
- rerun the one-time RAK capability probe or create replacement retained objects merely to make binding pass;
- create a webhook before the retained PaymentIntent, SetupIntent, and Refund match exactly 1/1/1;
- create more than one C7-scoped endpoint or create a replacement because a signing secret was lost;
- add `payment_method_types` to any non-Terminal Stripe call;
- accept an unsigned webhook, skip raw-body signature verification, or treat an unsigned rejection as signed proof;
- call Stripe, LINE, notification, or refund providers from SQL, triggers, or compatibility projections;
- enable LINE or call LINE;
- change a production or Preview environment variable;
- change runtime source before deployment 2 or rebuild deployment 2;
- modify UI, the `/admin/vip-floor` composer, v1 fallback, or start D1-D5 before require-pass exits 0;
- fabricate counts, hashes, booleans, budgets, timestamps, signatures, or provider readbacks;
- commit, push, clean, reset, checkout over, or overwrite unrelated dirty-worktree changes;
- print or retain a secret, auth header, cookie, URL, query string, provider ID, project ref, raw response, raw
  webhook, Stripe signature, customer PII, ciphertext, nonce, free-form note, or private filesystem path.

If a command can write outside exact staging/test scope and cannot prove its target before execution, do not run it.

### 3. Read completely before acting

Read all of the following, not selected excerpts:

- `AGENTS.md`
- `docs/AI_AGENT_SYNC.md`
- `docs/AI_CURRENT_STATUS.md`
- latest rows of `docs/AI_WORK_LOG.md`
- `website/AGENTS.md`
- both parent C7 prompts named above
- `website/docs/research/tablecheck-vip-floor-phase-c-gate-c-ui-implementation-plan-2026-07-14.md`
- `website/docs/evidence/vip-floor-v2/gate-c-staging-operator-runbook.md`
- `website/docs/evidence/vip-floor-v2/gate-c-summary-20260714.json`
- `website/docs/evidence/vip-floor-v2/gate-c-c7-owner-remediation-20260715.json`
- `website/docs/evidence/vip-floor-v2/gate-c-c7-wave0b-20260715.json`
- `website/docs/evidence/vip-floor-v2/gate-c-c7-bootstrap-preflight-hold-20260715T003355+0900.json`
- `website/docs/evidence/vip-floor-v2/gate-c-c7-bootstrap-hold-20260715T003401+0900.json`
- `website/scripts/orchestrate-vip-floor-v2-gate-c-webhook.mjs`
- `website/scripts/deploy-vip-floor-v2-gate-c-bootstrap.mjs`
- `website/scripts/preflight-vip-floor-v2-gate-c-staging.mjs`
- `website/scripts/audit-vip-floor-v2-gate-c.mjs`
- `website/scripts/lib/vip-floor-gate-c-artifact.mjs`
- `website/scripts/lib/vip-floor-gate-c-contracts.mjs`
- `website/src/lib/server/stripeCapabilityProbe.ts`
- `website/src/lib/server/stripeEventPolicy.ts`
- `website/src/lib/server/stripeWebhook.ts`
- `website/src/app/api/stripe/webhook/route.ts`
- `website/src/lib/server/vipFloorPublicCompatibility.ts`
- `website/src/lib/server/vipFloorShadowRuntime.ts`
- existing refund and webhook worker code
- applicable Stripe best-practices skill and its security/payments references
- current official Stripe CLI, RAK, webhook, test-mode, signature/retry, and refund documentation
- current official Vercel prebuilt deployment, Custom Environment, Sensitive env, protection, curl, and REST docs.

Inspect current source and dirty-worktree state. Preserve unrelated work.

### 4. Starting state: verify, do not trust or reconstruct

The latest sanitized evidence reports:

- credential remediation and shared-log sanitization completed;
- an independent staging Supabase project exists with all 31 migrations;
- Vercel custom environment `staging` exists;
- deployment 1 is READY and provider-bound to one frozen prebuilt artifact;
- deployment 1 has no production alias;
- staging has 25/26 required environment names;
- `STRIPE_WEBHOOK_SECRET` is the sole missing name;
- all nine application flags are disabled and DB dual-write is false/aligned;
- a one-time staging RAK probe authenticated as restricted test mode;
- all six approved RAK capabilities passed;
- the RAK cannot enumerate webhook endpoints, preserving separation of duties;
- the probe created retained test-mode PaymentIntent, SetupIntent, and Refund objects, one each;
- the previous local operator credential saw 0/0/0, so same account/environment binding is unproven;
- no C7-scoped webhook endpoint was created;
- deployment 2 was not attempted;
- deterministic local Gate C is ready, but runtime and signatures are not ready;
- production, Preview, LINE, and UI were unchanged.

Treat every hash, count, timestamp, and posture as historical until remeasured. Do not copy historical digest values
into new evidence. Do not rerun the capability probe to replace missing private state.

### 5. Mandatory operating model

The parent contract requires root plus three read-only reviewers. Use the reviewers only for bounded, non-overlapping
checks; root remains the sole state-transition and provider-mutation operator.

Before mutation:

- Reviewer A: verify frozen source/output/deployment-1 identity and production/Vercel isolation.
- Reviewer B: verify staging Supabase identity, migration posture, DB setting, and rollback path.
- Reviewer C: verify Stripe profile isolation, operator binding method, endpoint/event/signature/refund contracts,
  evidence privacy, budget and signature rules.

Before business cycles, rotate reviews and require all three to accept the READY preflight. Before signatures,
repeat a three-way read-only review of the immutable evidence package. Reviewers may not receive secrets, URLs,
provider IDs, private paths, raw responses, or sign for humans.

Record only reviewer role, safe result, finding count, and sanitized digest in the agent ledger.

### 6. Private operational boundary and transcript safety

1. Locate the existing private C7 operations directory without printing its path. It must be outside the repository,
   mode `0700`, and owned by the current operator.
2. Verify every file containing provider identity, URL, token, signing secret, or raw response is mode `0600`.
3. Verify the private source/output ledgers, deployment-1 receipt, probe response, run digest, and retained-object
   correlation material still exist and are internally consistent.
4. If the private probe response or run correlation is absent, corrupted, or cannot be tied to deployment 1, stop
   with `OPERATOR AUTHENTICATION HOLD`. Do not recreate it through another capability probe.
5. Reduce provider responses in memory. Provider commands that emit broad JSON must redirect to private files and
   produce only allowlisted booleans/counts/digests in retained output.
6. Use log level `error` or the quietest supported level. Disable shell tracing and debug output.
7. Capture production deployment/alias/env and linked production Supabase fingerprints as one-way before hashes.
8. Run normal Gate audit and read-only preflight before mutation. Preserve real exit codes. Expected state remains
   valid HOLD/exit 2 until operator binding and bootstrap are complete.

Any retained-output boundary violation is an immediate stop and credential-incident review.

### 7. Human checkpoint A — dedicated Stripe operator profile authentication

This checkpoint is performed by the Owner, not by the agent.

Use the dedicated safe local profile name:

```text
ghost-vip-floor-c7-staging-operator
```

The Owner must open a separate local terminal that is not captured in the agent transcript and run browser-based
Stripe CLI login for that profile. The supported command shape is:

```bash
stripe login --project-name ghost-vip-floor-c7-staging-operator
```

Requirements:

- approve the browser OAuth request while signed into the Stripe Dashboard account/environment that owns the
  staging RAK;
- use test mode/sandbox management access;
- do not paste an API key;
- do not copy the pairing code, browser URL, account name/ID, or CLI output into chat;
- leave the pre-existing default profile untouched;
- ensure the Stripe config remains permission-restricted.

The only message returned to the agent is exactly:

```text
C7 staging test operator profile authentication completed; no credential value shared.
```

That completion statement permits readback but does not prove account binding. Binding is proven only by 3/3
retained-object truth below. If the Owner cannot complete browser OAuth, stop; do not request a key.

### 8. Minimal operator-profile tooling hardening

The current webhook orchestration invokes the Stripe CLI without selecting a project/profile. Before any operator
readback, minimally patch only the orchestration/test tooling so the dedicated profile is explicit.

Required contract:

- accept a non-secret operator profile selector, preferably `--operator-profile`;
- require the exact allowlisted profile `ghost-vip-floor-c7-staging-operator` for every Stripe operator action;
- pass it to Stripe as `--project-name`;
- reject missing, empty, malformed, or `default` profiles;
- reject any `--api-key` argument or `STRIPE_API_KEY` environment;
- never read or print the credential value or Stripe config;
- return only `dedicatedOperatorProfile=true` or a profile-name digest, not provider account identity;
- preserve the existing private-dir, test-mode, endpoint-count, event-policy, and redaction contracts;
- add positive and negative tests for dedicated profile, default refusal, missing profile, API-key env refusal, raw
  output redaction, and no provider mutation in readback mode.

Do not modify `src`, migrations, `package.json`, lockfile, Next config, or any path in
`RUNTIME_INPUT_PATHS`. The orchestration script is outside the runtime manifest. Prove the runtime-source,
migration, and frozen artifact hashes remain byte-identical after this tooling-only patch. If they change, stop;
deployment 2 may not rebuild.

### 9. Phase 1 — prove operator-to-RAK binding before mutation

Using the dedicated profile and existing private probe correlation:

1. Authenticate the operator credential as test mode without printing account identity or key class.
2. List/retrieve only the minimum test objects needed by the existing correlation contract.
3. Match by the private run digest already written by the RAK probe, not by guessed timestamps or manual IDs.
4. Require exactly:

```text
PaymentIntent: 1, livemode=false, status=succeeded
SetupIntent: 1, livemode=false, status=requires_payment_method
Refund: 1, livemode=false, status=succeeded
Total: 3
```

5. Require duplicate count zero and private probe cleanup assertions unchanged.
6. Read the test webhook inventory and require C7-scoped endpoint count 0 before creation. If it is 1, stop and
   reconcile the existing endpoint; if greater than 1, fail closed.
7. Emit a sanitized receipt containing only safe object kinds, counts, statuses, test-mode boolean, duplicate count,
   scoped endpoint count, same-account/environment binding boolean, and digests.

Only exact 3/3 plus test mode proves binding. A 0/3, partial match, extra match, live object, or unavailable private
correlation is `OPERATOR AUTHENTICATION HOLD`. Do not create the webhook and do not rerun the RAK probe.

### 10. Phase 2 — create exactly one webhook and wire the signing secret

Immediately before creation, revalidate:

- dedicated operator profile selected;
- exact 3/3 binding receipt current;
- source, migrations, output artifact, and deployment-1 provenance quiescent;
- staging target and independent staging DB still differ from production;
- every application flag and DB dual-write are off;
- C7-scoped endpoint count is 0;
- production/Preview fingerprints match the before state.

Derive endpoint configuration from current source:

- route `/api/stripe/webhook`;
- current `STRIPE_WEBHOOK_EVENT_TYPES`, with no wildcard and no duplicate;
- current `STRIPE_API_VERSION`;
- test mode, enabled, account endpoint, `connect=false`;
- the stable C7 description already used by the existing orchestration;
- protected deployment-1 URL held only in the private directory.

Create the endpoint once with the dedicated local operator profile. Stream the raw response directly to the private
parser. The one-time signing secret must never appear in stdout, stderr, argv, evidence, or chat.

Persist privately, mode `0600`:

- endpoint identity;
- deployment-1 protected URL;
- one-time signing secret;
- raw provider response only for the minimum time required by the parser.

Emit only a sanitized receipt: endpoint count 1, test/enabled/account booleans, `connect=false`, API-version match,
event-set hash, URL digest, signing-secret-preserved boolean, and no provider IDs.

Then add `STRIPE_WEBHOOK_SECRET` to Vercel custom environment `staging` only:

```text
name: STRIPE_WEBHOOK_SECRET
target: staging only
type: Sensitive
branch binding: none
```

Use stdin or an in-memory SDK request body. Never use `--value`, argv, shell history, or a repository `.env` file.
Read back name/type/target/count only and require:

- exactly one `STRIPE_WEBHOOK_SECRET` record;
- Sensitive type;
- no branch binding;
- 26/26 required environment names;
- Preview unchanged;
- Production unchanged.

If endpoint creation succeeds but later wiring fails, preserve and reuse that endpoint and private secret. Never
create a replacement. If the signing secret is lost or exposed, stop for Owner rotation/remediation direction.

### 11. Phase 3 — deployment 2 from the exact same frozen artifact

Deployment 2 must not rebuild.

1. Re-read the private source and output ledgers.
2. Verify runtime source, migration bundle, local output artifact, provider-comparable upload manifest, and
   deployment-1 provider provenance still match.
3. Verify the exact deployment-1 artifact root and `.vercel/output` still exist and are quiescent.
4. Run the bootstrap deployment tooling in dry-run mode for phase two.
5. Require target exact `staging`, env count 26, webhook-secret presence true, flags all off, DB dual-write false,
   deployment count before=1, and production fingerprint unchanged.
6. Execute deployment 2 with the exact same prebuilt output.
7. Wait for READY and independently map provider file identity to the frozen local artifact.
8. Require source/artifact identity equal to deployment 1 and no production alias.
9. Update the same Stripe endpoint URL to deployment 2. Do not rotate the signing secret or create another endpoint.
10. Read back endpoint truth with the dedicated operator profile and require test/enabled/account, `connect=false`,
    exact API version/event set, endpoint count 1, deployment-2 URL digest, and secret preserved.
11. Authenticated runtime readback must prove `VERCEL_TARGET_ENV=staging`, all nine flags false, Node/DB dual-write
    false/aligned, required Stripe material present, and LINE disabled.

An unsigned POST must be rejected before storage, but this is only a negative control. It does not prove signed
delivery.

### 12. Phase 4 — READY preflight and bootstrap evidence

Run a new timestamped read-only preflight bound in memory to measured staging target, staging database name,
runtime-source digest, frozen artifact digest, local comparable manifest, provider comparable manifest, and provider
provenance digest. Preserve the real exit code.

READY requires:

- custom staging target exists;
- Preview emptiness is informational only;
- staging env is 26/26;
- independent staging Supabase identity and all 31 migrations match;
- deployment 2 is READY/current;
- source and output remain quiescent;
- deployment 1 and 2 use the same exact artifact;
- provider file/provenance identity independently matches;
- dedicated local operator profile is test mode;
- 3/3 retained objects prove same account/environment;
- exactly one C7-scoped endpoint exists;
- every safety value remains false;
- blocker list is empty.

Write a new sanitized timestamped bootstrap/preflight evidence file and hash-link it in the Gate C summary. Clear
only the bootstrap blockers actually resolved. Keep `decision.status="HOLD"`, runtime unready, signatures empty, and
UI prohibited at this stage.

If preflight is exit 2 or not READY, do not begin runtime state transitions.

### 13. Human checkpoint B — approve budgets and change window

The user's general execution authorization is not a numeric performance/log budget. Before collecting runtime
samples, prepare a short budget proposal based on current code and staging capacity. Owner and Engineer must each
explicitly approve, before observation:

- non-zero p95 shadow-overhead budget in milliseconds;
- non-zero event-count budget for the observation window;
- non-zero distinct-key/cardinality budget;
- minimum observation duration;
- at least 1,000 completed attributable comparisons;
- the two-cycle test-mode provider expectation ledger;
- the rollback operator and change window.

Record only approved numeric budgets, roles, decision, timestamps, and an approval-manifest digest. Do not select or
relax a budget after measurements. If either Owner or Engineer does not approve, stop at `BOOTSTRAP READY / RUNTIME
HOLD` with staging all-off.

### 14. Phase 5 — freeze runtime expectation and rollout ledgers

Before any flag/DB/provider transition:

1. Freeze the exact current source, migration, bootstrap, endpoint, and deployment-2 evidence manifest.
2. Derive the provider expectation ledger from source for two cycles:
   - card setup;
   - refundable deposit.
3. Include every applicable Customer, Checkout Session, SetupIntent, PaymentIntent, Refund, webhook enqueue, worker,
   and refund-worker category with expected integer count and owning path.
4. Mark non-applicable categories prospectively with reviewed reasons.
5. Freeze the flag transition ledger with unique ordered step names and expected Node/DB/shadow values.
6. Freeze rollback order and fail-closed expectations.
7. Hash-link all sanitized ledgers before external effects begin.

Never modify expected counts after observation merely to make actuals pass. Any amendment must preserve the original
ledger and produce a FAIL/HOLD explanation.

### 15. Phase 6 — authenticated flag and DB state transitions

Every Vercel environment change requires a new immutable staging deployment and authenticated runtime readback.
Deployment 2's no-rebuild/same-artifact assertion remains immutable. Subsequent runtime postures must use identical
runtime source; if a posture requires a rebuilt prebuilt output, build only from that identical frozen source and
bind each new artifact to provider provenance. Never change source during the C7 window.

Capture at least these states, strictly chronologically:

1. `all_off_bootstrap`: Node false, DB false, shadow false.
2. `db_only`: Node false, DB true, shadow false.
3. `db_shadow`: Node false, DB true, bounded shadow true.
4. `both_on_business_cycle`: Node true, DB true, only minimum public/admin/webhook flags enabled.
5. `node_rollback`: Node false first, DB still true, exposure flags false.
6. `restored_all_off`: Node false, DB false, shadow false.
7. `node_only_invalid`: Node true, DB false, minimum prerequisites only; availability/hold must return the exact
   documented fail-closed response with zero acquisition and zero provider effects.
8. `final_all_off`: Node false, DB false, shadow false.

For every state, authenticate environment=staging, deployment/source identity, Node flags, DB setting, alignment,
inventory/assignment counts, and relevant provider-effect counts. A screenshot or env-edit receipt is insufficient.

Do not enable `FEATURE_VIP_FLOOR_V2_READ_ENABLED` to expose UI. Use only the minimum server flags required for the
synthetic cycles and evidence.

### 16. Phase 7 — two authentic synthetic business cycles

Use obviously synthetic future business dates and application-owned saga/worker boundaries.

Cycle A — card setup:

```text
availability
→ seat availability
→ atomic begin-hold
→ Checkout Session setup path
→ test SetupIntent completion
→ genuinely signed webhook
→ webhook worker readback
→ retry/replay/idempotency proof
```

Cycle B — refundable deposit:

```text
availability
→ seat availability
→ atomic begin-hold
→ supported deposit PaymentIntent path
→ genuine test confirmation
→ genuinely signed webhook
→ webhook worker readback
→ reservation confirm
→ check-in
→ cancel/refund-required handoff
→ existing refund worker
→ authenticated test-mode Refund readback
```

Also prove:

- raw-body Stripe signature verification before enqueue/processing;
- invalid-signature rejection before storage;
- genuine signed success;
- Stripe retry or manual resend;
- failure path;
- conflict path;
- replay/idempotency;
- expected provider count equals actual for every ledger category;
- duplicate provider effect count zero;
- exactly one refund case/job and one worker-owned Stripe refund;
- no SQL/trigger/compatibility provider call;
- every provider object is test mode;
- no LINE call.

Use private correlation IDs only in the `0700/0600` boundary. Repository evidence contains safe categories and
counts only.

### 17. Phase 8 — bounded shadow and performance observation

1. Use the existing bounded post-response shadow path.
2. Collect at least 1,000 completed attributable comparisons for the exact frozen source/migration/deployment
   lineage.
3. Define `sampleAttempts` only as completed attributable comparisons.
4. Keep upstream requests, scheduled attempts, concurrency skips, collector loss, and filtered events as separate
   provenance counts.
5. Filter only structured VIP Floor shadow events; do not retain broad Vercel logs.
6. Aggregate in memory or private files.
7. Measure:
   - `sampleAttempts >= 1000`;
   - `sampleSuccessRate >= 0.999`;
   - critical mismatch count/rate = 0;
   - privacy violation count = 0;
   - unknown divergence count = 0;
   - snapshot race count = 0;
   - p95 shadow overhead;
   - event count;
   - distinct-key/cardinality count.
8. Compare only to the pre-approved budgets.
9. Record observation interval, collector/tool digest, source/migration/deployment provenance, and aggregate results.

Any critical/unknown/privacy mismatch, budget breach, unprovable denominator, or provider/log correlation gap is a
mandatory rollback and HOLD.

### 18. Phase 9 — rollback rehearsal and final safe posture

Rollback order is mandatory:

1. deploy Node public dual-write, public/admin/webhook exposure, and shadow flags off;
2. authenticate runtime readback;
3. prove v1 availability, hold, and one safe admin operation;
4. disable DB dual-write;
5. authenticate DB and runtime readback;
6. prove inventory/assignment integrity and zero duplicate provider effects;
7. execute the isolated Node-only invalid posture and prove exact fail-closed/zero side effect;
8. immediately restore final all-off Node posture and DB false;
9. repeat production/Preview/LINE unchanged fingerprints.

Default final posture before and after signatures:

- all C7 application flags off;
- DB dual-write false;
- staging retained and quarantined;
- exactly one test webhook endpoint retained for evidence review;
- no production alias;
- no live object;
- no LINE delivery;
- no Phase D UI change.

Do not delete staging, endpoint, RAK, bypass secret, test objects, or credentials without separate Owner teardown
approval.

### 19. Phase 10 — generate authentic runtime evidence

Generate a new immutable file:

```text
website/docs/evidence/vip-floor-v2/gate-c-staging-observation-YYYYMMDDTHHMMSS.json
```

Use schema `vip-floor-gate-c-staging-observation.v1`. Every value must be measured for the exact evidence lineage.
At minimum include:

- current runtime-source and migration digests;
- READY preflight/bootstrap evidence link;
- two distinct synthetic business cycles;
- at least 1,000 completed attributable samples and success rate at least 0.999;
- zero critical/privacy/unknown/snapshot-race findings;
- measured p95 versus approved non-zero budget;
- measured event/cardinality counts versus approved budgets;
- signed webhook success/failure/retry/conflict/refund-worker booleans;
- non-empty provider effect categories with expected=actual and duplicate=0;
- at least the eight authenticated flag/readback states above;
- rollback and Node-only fail-closed proof;
- privacy scanner negative-control proof and zero real findings;
- collector/tool/provenance digests and timezone-bearing timestamps.

Hash-link the READY preflight, bootstrap evidence, expectation ledger, approval ledger, and runtime observation in
`gate-c-summary-20260714.json`. Copy aggregates into `summary.runtime` exactly. Clear only resolved blockers. Keep
decision HOLD and signatures empty until the normal Gate audit is valid.

Run the normal Gate audit with an explicit summary path. Do not request signatures if there is any audit failure.

### 20. Human checkpoint C — one human, three role attestations

The Owner has authorized signature collection and recording. The agent cannot sign or infer approval.

After runtime evidence passes and the normal Gate audit is valid:

1. Print the exact evidence-manifest SHA with the existing signature-manifest command.
2. Freeze the evidence package; do not change a hash-linked file after requesting signatures.
3. Give the exact same manifest digest and sanitized evidence package to the sole operator.
4. The same real person must review it separately as Owner, Floor Manager, and Engineer and explicitly provide:
   - their role;
   - the same non-placeholder human name in all three records;
   - a distinct timezone-bearing signing timestamp for each role;
   - decision `PASS` or `DECLINE`;
   - the exact evidence-manifest SHA they reviewed;
   - `samePersonMultiRoleAcknowledged=true`;
   - the exact role attestation code from the governance amendment.
5. Collect attestations through a secure local channel. Record only name, role, timestamp, decision, and manifest
   digest. Do not record email, phone, account identifiers, or unrelated personal data.
6. An AI agent, service account, placeholder, copied historic decision, or unrecorded role impersonation is invalid.
7. If a role is unavailable or declines, keep Gate C HOLD and report that role only.

Create one immutable signature file only after all three decide PASS:

```text
website/docs/evidence/vip-floor-v2/gate-c-signatures-YYYYMMDDTHHMMSS.json
```

It must use schema `vip-floor-gate-c-signatures.v2`, copy the exact `signatureGovernance` object from the summary,
contain exactly three unique roles with the same real human name, carry one identical evidence-manifest digest in
the file and every role record, and use three distinct timezone-bearing ISO-8601 timestamps. Copy the exact records
into the summary, hash-link the signature file, set `signaturesEvidencePath`, set decision PASS, and clear blockers
only after all validation succeeds.

User permission to collect signatures must never be inserted as an Owner/Floor Manager/Engineer signature.

### 21. Phase 11 — final Gate C validation

Run validation proportional to the final source and evidence, including:

```bash
cd website
export VIP_FLOOR_GATE_C_SUMMARY=docs/evidence/vip-floor-v2/gate-c-summary-20260714.json
npm run ci:local
node scripts/verify-vip-floor-v2-gate-c-contracts.mjs
npm run test:vip-floor-v2-gate-c-bootstrap
npm run test:vip-floor-v2-public-dual-write
npm run test:vip-floor-v2-dual-write-races
npm run test:vip-floor-v2-rollback
npm run test:stripe-replay
npm run test:stripe-unbound
npm run test:reservation-saga
npm run test:vip-static
npm run lint
npm run build
npm run audit:vip-floor-v2-gate-c
npm run audit:vip-floor-v2-gate-c -- --require-pass
```

The SQL/race/rollback fixtures may run only against the authenticated disposable PostgreSQL 16 harness. Clear
ambient DB variables before the harness supplies its isolated values. Never run deterministic fixtures against
production or hosted staging.

Interpretation:

- normal audit exit 0 means the evidence package is internally valid;
- require-pass exit 0 means Gate C PASS for the exact source, runtime evidence, and three role attestations;
- require-pass exit 2 means valid HOLD;
- any other non-zero means invalid evidence/tooling and must not be overridden.

Also run JSON parse, evidence-hash, credential/auth-header/JWT, URL/provider-ID/private-path, PII, whitespace,
Markdown-fence, and `git diff --check` scans. Negative fixtures must prove each scanner detects prohibited input.

Repeat read-only fingerprints and prove production deployments, aliases, environment variables, linked Supabase,
Stripe live mode, Preview, and LINE were unchanged.

### 22. Phase D0 unlock boundary

Only after require-pass exits 0:

1. Update `docs/AI_CURRENT_STATUS.md` to `Gate C PASS / Phase D0 unlocked` with exact evidence links.
2. Append the factual work-log row.
3. Freeze the Gate C evidence package; later UI commits must not rewrite it.
4. Read the local `.Codex/docs/DESIGN.md`, `website/AGENTS.md`, `website/docs/ui/UI_TOOLKIT.md`, global tokens, and
   closest v1 page/components before UI work.
5. If local `.Codex/docs/DESIGN.md` is still absent, restore it or obtain an explicit Owner design-authority
   decision. Do not silently substitute another workspace file.
6. Begin D0 only: freeze the v2 UI contract, URL state, v1/v2 route fallback, component ownership, GHOST tokens,
   responsive boundaries, accessibility states, and visual-evidence plan.
7. Create a separate D1-D5 execution prompt/session from the accepted 1,125-line Phase C/UI plan.

Do not implement UI in the same C7 provider-evidence window. If require-pass is not 0, Phase D remains prohibited.

### 23. Mandatory stop conditions and compensation

Stop immediately on:

- dedicated operator authentication incomplete;
- retained-object binding other than exact 3/3 test-mode match;
- private probe/run correlation missing;
- source, migration, frozen output, or provider provenance drift before deployment 2;
- target/provider mode production/live;
- provider endpoint count not exactly 0 before create or 1 after create;
- event set, API version, connect mode, status, or URL digest mismatch;
- signing secret lost, printed, or exposed;
- any application or DB flag unexpectedly on during bootstrap;
- environment not 26/26 after wiring;
- deployment 2 not the same exact frozen artifact;
- preflight not READY/exit 0;
- missing numeric budget approval before observation;
- unexpected/duplicate provider effect;
- webhook signature not verified before processing;
- critical/unknown/privacy/snapshot mismatch;
- p95/log/cardinality budget breach;
- Node/DB misalignment not failing closed;
- rollback or provider truth not authenticated;
- a signer unavailable, declining, placeholder, duplicated, or reviewing a different manifest;
- any retained secret, URL, provider ID, private path, PII, raw response, or auth material;
- production/Preview/LINE fingerprint change.

Compensation:

- leave or restore all application flags off and DB dual-write false;
- retain the single endpoint/private secret if safely created; do not duplicate it;
- cancel/expire/delete only synthetic objects explicitly owned by the current runtime expectation ledger when the
  runbook requires cleanup;
- do not delete shared staging/provider resources without Owner approval;
- rotate/revoke any exposed credential before continuation;
- preserve sanitized failure evidence and exact real exit codes;
- keep Gate C HOLD and UI prohibited.

### 24. Final response contract

Report only sanitized facts:

- terminal outcome;
- dedicated operator profile selected and 3/3 binding result;
- bootstrap source/migration/artifact/provenance digests;
- deployment 1/2 READY and exact same-artifact result, without IDs/URLs;
- endpoint count/test/enabled/account/event/API-version/binding result;
- staging env 26/26 and Sensitive signing-secret presence;
- READY preflight exit code;
- business-cycle and provider-effect aggregate results;
- sample count/rate, p95 versus approved budget, log/cardinality results;
- webhook/refund/flag rollout/rollback results;
- signature status by role, without names unless explicitly required by the Owner;
- final audit and require-pass exit codes;
- final staging all-off posture and production/Preview/LINE unchanged proof;
- evidence/tooling/coordination files changed;
- Gate C PASS and Phase D0 unlock, or exact remaining blocker and next action.

Never include secrets, verification codes, URLs, query strings, project refs, deployment/provider IDs, account
identity, raw responses/logs, customer data, or private paths.

## Prompt ends

---

## Official operational references

- Stripe CLI login and profiles: <https://docs.stripe.com/stripe-cli>
- Stripe restricted API keys: <https://docs.stripe.com/keys/restricted-api-keys>
- Stripe key security: <https://docs.stripe.com/keys-best-practices>
- Stripe webhook registration and signature verification: <https://docs.stripe.com/webhooks>
- Stripe webhook endpoint API: <https://docs.stripe.com/api/webhook_endpoints>
- Stripe test mode and test payment methods: <https://docs.stripe.com/testing>
- Stripe refunds: <https://docs.stripe.com/refunds>
- Vercel Custom Environments: <https://vercel.com/docs/deployments/environments>
- Vercel prebuilt deployment: <https://vercel.com/docs/cli/deploy>
- Vercel environment variable lifecycle: <https://vercel.com/docs/environment-variables/managing-environment-variables>
- Vercel deployment protection automation bypass:
  <https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation>
- Vercel REST API and deployment file inventory: <https://vercel.com/docs/rest-api>
- Supabase environment separation: <https://supabase.com/docs/guides/deployment/managing-environments>
