# TableCheck VIP Floor Gate C V17 — one-shot two-blocker remediation and pass execution prompt

Use this prompt only after the Owner sends the exact two authorization lines shown in **Authority gate**. Do not treat this document, the proposal, an earlier V16 authority, or an AI statement as Owner adoption.

## Mission

Continue the TableCheck VIP Floor Gate C lineage from the immutable V16 rejected-review checkpoint. Close exactly the two recorded blockers, obtain a fresh same-manifest 3/3 independent ACCEPT, execute custom-staging Gate C within all ceilings, perform mandatory rollback and final readback, collect post-evidence direct-human attestations, and publish a signed Gate C PASS only if normal audit and `--require-pass` audit both truthfully pass.

“Pass Gate C” is the target, not permission to fabricate evidence, weaken assertions, skip review, or relabel a checkpoint. If a required fact is false or a ceiling is exhausted, preserve evidence and stop at a recoverable nonterminal checkpoint.

## Authority gate

Accept execution authority only when the direct Owner message is exactly these two non-empty lines, allowing only presentation whitespace around the SHA token:

```text
OWNER_VIP_FLOOR_V17_GATE_C_ONE_SHOT_EXECUTION_AUTHORIZATION_V1
2eb7c5516334ba8c5ded669bf58e6fe2678a60c8f790ad222c87dc023bc06da0
```

The second line is the full SHA-256 of:

`website/docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v17-gate-c-pass-authorization-proposal-v1-20260723.json`

Before any credential read, provider call, reviewer dispatch, deployment, or external mutation:

1. Hash the proposal bytes and require the exact value above.
2. Validate its closed schema, role code, directive SHA, research SHA, immutable V16 ancestor hashes, ceilings, boundaries, and prohibitions.
3. Freeze one additive V17 Owner authorization artifact containing the exact direct message, canonical two lines, proposal path/SHA, principal facts, and zero-at-freeze counters.
4. Hash and validate that authorization through the executable's public preflight.
5. If the role, SHA, principal, schema, or any ancestor differs, stop before secrets or network access.

## Mandatory workspace protocol

At start, read `AGENTS.md`, `docs/AI_CURRENT_STATUS.md`, the latest rows of `docs/AI_WORK_LOG.md`, and `docs/AI_AGENT_SYNC.md`. For Stripe work, read `.agents/skills/stripe-best-practices/SKILL.md` and its security reference in full. Preserve unrelated dirty work. Use additive V17 files; never overwrite V16 artifacts or another agent's changes. Before final response, update the current-status and work-log files factually without secrets or private identifiers.

Do not use subagents unless explicitly authorized by the user or repository instructions. Independent reviewers must be genuinely independent, read-only, exact-manifest reviewers; they do not edit files.

## Immutable starting facts

Recompute every SHA from bytes before trusting it:

- V16 manifest: `287442ecb323f8572ecd56b11edf632d94baaf7eebcc8a3d5a29d22635bc39ca`
- V16 rejected review: `20199d073ad454f4af530e58c50199d36bce77c26658c43589f550ea42e97ab6`
- V16 nonterminal checkpoint: `41d9c64eef32c9be49b8f8bfd47c6e69e83338a4a0a0a92bcf9b01d005d46ca1`
- V16 bundle: `ed0cbe88d17f1d38d7837e5f9ae5b40f0d6f3329ca1a72ccc9eff6358dfac86f`
- PostgreSQL 16 proof: `603a9bfc510146550c21e94ed3c971e5c26a8cec8fee0e6f0044f238cf9b9e65`
- custom-staging catalog snapshot: `912e9a0c232e50330905712d87830cf659c76b03cc05b4bef64d735e346005f0`
- pre-network ledger evidence: `583c5f572f32c0828311d8822d8ef37a73ec4c98a07b7857a15cc6492e26ac84`
- V16 review outcome: provenance ACCEPT; runtime REJECT for full-process credential replay; security REJECT for endpoint/deployed-secret binding; external mutation, deployment, Gate C runtime, rollback, attestation, and terminal counts all zero.

V16 bundle build 6/6 is exhausted. V17 has a fresh, separate four-build ceiling; do not edit or retroactively extend V16 counters.

## Absolute boundaries

- custom `staging` only; production, preview, LINE, live Stripe, and real-customer mutations are zero.
- Stripe sandbox and dedicated `rk_test_` restricted key only. No `sk_test_`, live key, ambient fallback, or default profile.
- Stripe API version remains `2026-04-22.dahlia`.
- Do not add `payment_method_types` or change existing Checkout, SetupIntent, PaymentIntent, refund, worker, or application contracts.
- Application source, migrations, package lock, and frozen application artifact are immutable. Only additive V17 tooling, fixtures, bundle, manifests, reviews, and evidence may change.
- Endpoint create/delete/replacement and signing-secret rotation are zero. If the existing selected endpoint cannot be proved without one of those actions, stop for a separate Owner authority.
- Catalog refresh and synthetic catalog fallback are zero. If the bound snapshot is stale at runtime, stop for a separate Owner authority.
- Never print, return, commit, or publish secrets, tokens, cookies, JWTs, private URLs, query strings, private paths, raw provider responses, provider IDs, event IDs, payment object IDs, customer PII, or raw webhook payloads.
- No AI-generated human attestation. No PASS before facts exist.

## Ceilings

### V17 tooling/review

- bundle builds: 4 maximum, starting at zero;
- pre-manifest adversarial audit rounds: 3 maximum;
- manifest freezes: 4 maximum;
- review rounds: 4 maximum;
- exactly 3 reviewers per round—provenance, runtime, security;
- reviewer dispatches: 12 maximum;
- reviewer secret reads, provider calls, external calls, external mutations, and file mutations: zero.

### Runtime continuation

- retain V16 phase/lifetime 500, forward 472, rollback 28, forward mutation 60, rollback mutation 3, deployment 1+6+2=9, webhook update 9, webhook compensation 1, database CAS/affected rows 3, and synthetic cycle 2 ceilings;
- cumulative credential reads: 11 maximum, including 5 already carried;
- operating-system process starts: 3 maximum—initial plus two crash-resume starts;
- private-config reads: at most one per process start;
- decrypted-provider-environment reads: at most one per process start;
- cumulative catalog reads remain 8 with 5 already consumed; no refresh calls;
- custom-staging `STRIPE_WEBHOOK_SECRET` authenticated same-value upsert: at most one, and only under the conditional contract below;
- selected endpoint create/delete/replacement/secret rotation: zero;
- production/preview/LINE/live/real-customer mutation: zero.

Every attempt consumes its ceiling even if it fails or has an unknown outcome. Never reset counters by changing filenames, process IDs, authority objects, manifests, or private roots.

## Phase 1 — freeze authority and audit ancestors

1. Acquire the existing global bootstrap/execution lock before reading private state.
2. Freeze the V17 Owner authorization with durable exclusive create, fsync, parent fsync, mode 0600 for private material where applicable, and immutable public digest evidence.
3. Verify V16 manifest, rejected review, checkpoint, bundle, PG proof, catalog snapshot, and pre-network ledger byte hashes.
4. Verify the V16 review's two blocker strings exactly. Do not broaden remediation into unrelated refactoring.
5. Verify the frozen application source/migration/artifact/provider-comparable-manifest identities remain exact.
6. Record zero pre-execution external mutations and deployments.

## Phase 2 — implement restart-safe credential attempts

Create additive V17 ledger/runtime modules. Do not patch V16 in place.

### Data model

Introduce a closed-schema credential record that separates:

- immutable authority, manifest, review, phase, private-root identity, and ceiling bindings;
- stable `operationId` for the logical private credential source;
- ledger-allocated positive `attemptOrdinal`;
- unique `actionId = sha256(canonical({operationId, scope, attemptOrdinal}))`;
- source class, scope, before/after counters, process-start ordinal, outcome, and hash-chain predecessor;
- no plaintext credential, config content, provider ID, URL, or path.

The ledger must allocate the next ordinal from durable validated history while the global lock is held. PID, timestamp, random bytes, environment variables, filenames, or caller-provided ordinals must not determine it. An intent is durable before bytes are read. A crash after intent consumes the attempt permanently.

### Startup ordering

On each process start:

1. validate public authority, manifest, review, ceilings, private-root descriptor identity, and all ledger/journal hash chains;
2. count prior process starts and reject a fourth before credential access;
3. inspect durable runtime and rollback journals before choosing forward work;
4. allocate and durably append the new private-config credential attempt;
5. read the exact descriptor-bound 0600 config once;
6. reconstruct provider/runtime context, hydrate counters and journals, and select rollback/resume when required;
7. allocate one separate attempt only if a decrypted provider-environment read is physically performed;
8. never replay completed forward work, never erase a pending intent, and never use an old credential receipt as secret bytes.

If a mutation intent lacks a receipt, reconcile through the existing provider-idempotency/readback contract. Unknown non-idempotent mutation state remains a HOLD; never guess.

### Required restart fixtures

Use actual child processes and the same private ledger/journal directory. Kill the child at deterministic hooks and start a fresh Node process. Prove all of these:

- crash after durable config-read intent;
- crash after forward external-mutation intent before receipt;
- crash after rollback journal initialization before completion;
- successor reaches rollback/resume rather than `credential_replay`;
- operation ID remains stable while action ID and attempt ordinal advance exactly once;
- interrupted attempts stay counted;
- cumulative carried/new credential counts remain exact and at most eleven;
- no duplicate deployment, webhook update, provider mutation, database CAS, or compensation;
- fourth process start is rejected before config read;
- cross-authority, cross-manifest, cross-review, reordered, truncated, duplicated, and corrupt records fail closed;
- the original V16 fixed-action replay case is reproduced as a negative baseline, then passes only under V17 semantics.

Do not claim this blocker closed from an in-process retry, mocked ledger-only call, or direct invocation of the rollback function.

## Phase 3 — implement exact webhook-secret binding

Use Stripe's official security model: a signing secret is endpoint-specific and separate from the API key; real verification requires the exact raw request body and `Stripe-Signature`.

### Static/private binding

During the single accounted Vercel environment inventory:

1. require exactly one `STRIPE_SECRET_KEY` and one `STRIPE_WEBHOOK_SECRET` record bound to the approved custom-staging environment;
2. reject production, preview, development, branch, multiple-record, default-target, wrong custom-environment, wrong type, empty-value, and cross-project matches;
3. compare run-keyed HMAC of private `rk_test_` to the `STRIPE_SECRET_KEY` fingerprint;
4. when the webhook value is readable, compare run-keyed HMAC of private endpoint secret to `STRIPE_WEBHOOK_SECRET` fingerprint;
5. retain record identity and update timestamp privately; publish only digests and booleans.

If Vercel intentionally makes the Sensitive value unreadable, an empty/placeholder fingerprint is invalid. The only authorized fallback is one authenticated same-value upsert of the exact in-memory private config secret to the same approved custom-staging key. The value must travel in an in-memory authenticated request body or stdin, never argv/stdout/stderr. Record a private request-body HMAC, provider receipt, environment identity, and update timestamp. Production, preview, branch, and any other key remain untouched.

### Deploy ordering

The Gate C deployment must be authenticated and created after the matching env record's install/update timestamp. Reusing a deployment that predates the secret configuration is invalid. Verify exact custom environment, source, migration, frozen artifact, provider manifest, V17 manifest, and action metadata.

### Selected endpoint binding

With full Stripe pagination, require exactly one approved selected endpoint and verify privately:

- expected endpoint identity and account;
- `livemode=false`, enabled, account endpoint, non-Connect;
- exact API version and exact non-wildcard event allowlist;
- exact protected custom-staging deployment webhook URL;
- uniqueness: no other endpoint can plausibly deliver the tested event types to the same exact target.

Updating the selected endpoint URL within the existing webhook-update ceiling does not rotate its secret. Creation, deletion, replacement, or secret rotation is forbidden.

### Dynamic real-delivery proof

For each relevant synthetic cycle, identify the exact real Stripe sandbox event through existing idempotency and synthetic-scope bindings. Require:

1. selected endpoint target already points to the authenticated deployment;
2. Stripe sends the real event;
3. deployed code reads the unmodified raw body and verifies the actual `Stripe-Signature` using deployed `STRIPE_WEBHOOK_SECRET`;
4. the exact event is stored once/idempotently in custom staging;
5. stored event, Stripe event readback, synthetic hold/provider object, event type, livemode flag, API version, and cycle namespace all reconcile;
6. runtime logs and database evidence show no invalid-signature or wrong-environment path;
7. rollback removes/reverts only the authorized synthetic state and returns the endpoint target to its exact baseline.

A locally signed payload may be used only as a negative/control fixture offline. It cannot establish that Stripe's selected endpoint owns the deployed secret. Missing-signature rejection, a `whsec_` prefix, endpoint existence, matching environment key name, or success from the Stripe CLI listener is not endpoint-specific proof.

### Sanitized joined proof

Produce one V17 public evidence object, bound to exact authority/manifest/review hashes, containing only:

- selected endpoint identity digest;
- custom-staging environment-record identity digest;
- authenticated deployment identity digest;
- event identity digest;
- provider-object identity digest;
- raw-body digest and received-signature-header digest;
- target/event-set/API-version digests;
- env-install-before-deploy, unique-target, test-mode, raw-body-verified, real-delivery, stored-event-reconciled, rollback-complete booleans;
- exact public counter totals.

All raw or identifying values stay in descriptor-bound 0600 private receipts. Scan both filenames and all public content.

### Negative tests

Require failures for wrong secret, transformed raw body, missing/old signature, wrong endpoint, duplicate target endpoint, multiple/mistargeted env records, deployment before env update, live event, CLI-listener secret, locally-generated-only success, wrong account/API version/event set, and public evidence containing a private value.

## Phase 4 — build, audit, manifest, and review

1. Run focused V17 unit, integration, child-process, negative-control, privacy, closure, and counter tests before bundling.
2. Build a fresh additive V17 held-evaluation bundle. Count every build, successful or failed. Maximum four.
3. Require source/bundle exports, boundary constants, proposal/authorization hashes, behavior, fixtures, and bundle SHA references to match independently.
4. Run the official adversarial audit. It must inspect authoritative fixture paths, full dependency closure, secret scanners, restart child processes, joined webhook proof assertions, and V16 ancestor immutability.
5. Freeze a content-addressed V17 manifest only after offline PASS. Count every freeze. Include all V17 inputs, fixtures, outputs, ancestors, counters, and privacy results.
6. Independently verify the manifest from bytes without importing the implementation under review.
7. Dispatch provenance, runtime, and security reviewers against the same exact manifest:
   - provenance: ancestor hashes, closure, PG/catalog/ledger evidence, counters, privacy, immutable artifact;
   - runtime: actual child-process crashes, attempt allocation, resume/rollback ordering, idempotency, ceiling exhaustion;
   - security: selected endpoint + env record + post-env deployment + real Stripe delivery joined proof, raw-body verification, restricted-key boundary, no secret exposure.
8. ACCEPT requires exactly 3/3, zero blockers, zero reviewer writes/secret reads/external calls. Any REJECT freezes that round and permits only additive V17 remediation within remaining ceilings.

Do not start Gate C runtime on 2/3, conditional acceptance, waived finding, reviewer disagreement, or a review of different manifests.

## Phase 5 — runtime preflight

After exact 3/3 ACCEPT:

1. Reacquire the global lock and repeat all public hashes and private descriptor checks.
2. Require the catalog snapshot to remain within its authorized freshness contract. If stale, stop; do not refresh it under V17.
3. Carry forward exactly five credential reads and five catalog/provider reads from the bound V16 pre-network ledger evidence.
4. Reject pending, missing, rewritten, duplicated, or counter-mismatched pre-network evidence.
5. Initialize the V17 process-start and credential-attempt records before physical reads.
6. Authenticate exact Vercel principal/project/custom staging, Stripe sandbox account/endpoint/restricted key, Supabase custom staging, and frozen artifact.
7. Prove environment-secret binding and deploy ordering before enabling webhook processing.
8. Preserve rollback reserves: at least 20 rollback provider reads, 8 rollback other calls, 3 rollback mutations, and the 600-second absolute rollback completion deadline.

## Phase 6 — execute Gate C once

Follow the accepted manifest's exact plan:

- prebuilt deployment and authenticated provider-artifact readback;
- selected webhook target update with idempotency and exact readback;
- two namespaced synthetic cycles only: card setup and refundable deposit;
- real Stripe sandbox event delivery and joined endpoint-secret proof;
- webhook and refund worker rehearsal;
- at least 1,000 uniquely attributable comparisons and success rate at least 0.999;
- exact database CAS/affected-row and provider mutation ceilings;
- runtime logs, receipts, observation evidence, and privacy scans;
- mandatory rollback even after apparent success;
- exact final readback of flags, webhook target, database state, deployments, and zero production/preview/LINE/live/real-customer change.

On SIGINT, SIGTERM, deadline, crash, provider ambiguity, counter drift, failed assertion, or unknown mutation outcome, enter the durable resume/rollback protocol. A replacement process may start only within the three-start and eleven-credential ceilings.

## Phase 7 — evidence, attestations, and terminal publication

After machine execution and rollback pass:

1. Assemble public machine evidence with private descriptors only; run complete privacy/content/path scans.
2. Run normal audit. It must PASS.
3. Freeze the final evidence manifest before requesting human attestations.
4. Collect direct-human, strong-MFA-bound Owner, Floor Manager, and Engineer attestations for that exact final manifest. No AI proxy, inferred approval, reused V16 approval, or pre-evidence signature.
5. Assemble the signed final result and run audit with `--require-pass`. It must PASS.
6. Under publication lock, re-hash everything and atomically publish exactly one durable `SIGNED_GATE_C_PASS` terminal.
7. Gate D and Gate E remain unstarted.

If any condition is absent, publish only a clearly named recoverable nonterminal checkpoint with counters, immutable evidence hashes, exact blocker, and next required authority/action. Never use `READY`, `HOLD`, or checkpoint text as a PASS alias.

## Required final report

Report concisely and without private data:

- V17 Owner authorization path/SHA;
- final bundle path/SHA and build count out of 4;
- adversarial audit result/count;
- manifest path/SHA and independent verification result;
- each reviewer role/decision and aggregate 3/3 status;
- credential process-start/attempt totals and restart-fixture result;
- endpoint-secret joined-proof result using digests/booleans only;
- Gate C runtime, rollback, normal audit, attestations, `--require-pass`, and terminal result;
- external call/mutation/deployment/database/webhook counters;
- confirmation that production, preview, LINE, live Stripe, real customers, application source, migrations, package lock, and Gate D/E were untouched;
- if nonterminal, the exact remaining blocker and why no PASS was published.
