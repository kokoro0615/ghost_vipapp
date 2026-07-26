# TableCheck VIP Floor Gate C V18 — one-shot exact-three-finding remediation, rollback, and signed-PASS execution prompt

Use this prompt only after the Owner sends the exact two authorization lines in **Authority gate**. The Owner message that requested creation of this proposal and prompt predates the proposal SHA and is not itself exact adoption. Do not infer adoption from this document, the proposal, V17 authority, or an AI statement.

## Mission

Continue the TableCheck VIP Floor Gate C lineage from immutable V17 checkpoint SHA-256 `d9a21c9c92a1a73da7363ef3e09f72d21073f43cd244176eea3af50baf667b61`. Remediate exactly its three recorded findings, obtain a fresh adversarial-audit PASS, independently verify a new manifest, obtain exact 3/3 independent read-only ACCEPT on that same manifest, execute custom-staging Gate C within carried lifetime ceilings, perform mandatory rollback and final readback, collect genuine post-evidence signatures, pass normal and `--require-pass` audits, and atomically publish one `SIGNED_GATE_C_PASS` terminal.

“Pass Gate C” is the target. It is never permission to fabricate evidence, weaken assertions, skip review, treat a local mock as real delivery, synthesize a human signature, or relabel a checkpoint. If a required fact is false, a new unrelated blocker appears, or a ceiling is exhausted, preserve evidence and stop at a recoverable nonterminal checkpoint.

## Authority gate

Accept V18 execution authority only when the direct Owner message is exactly these two non-empty lines, allowing only presentation whitespace around the SHA token:

```text
OWNER_VIP_FLOOR_V18_GATE_C_ONE_SHOT_EXECUTION_AUTHORIZATION_V1
2947616d3960dd51571f75b6bb49cfba60de3edf3393e48bb04fdd47370da400
```

The second line is the full SHA-256 of:

`website/docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v18-gate-c-pass-authorization-proposal-v1-20260723.json`

Before reviewer dispatch, private-state access, credential read, provider/database call, deployment, or external mutation:

1. Hash the proposal bytes and require the exact value above.
2. Validate its closed schema, role code, directive SHA, research SHA, complete V17 ancestor chain, fixed findings, ceilings, boundaries, and prohibitions.
3. Freeze one additive V18 Owner authorization artifact containing the exact direct message, canonical two lines, proposal path/SHA, authenticated principal facts, and zero-at-freeze V18 counters.
4. Use durable exclusive creation, file and parent-directory fsync, mode 0600 where private, and a public digest-only receipt.
5. Hash and validate the frozen authorization through the executable public preflight.
6. Stop before secrets or network access if the role, proposal SHA, principal, schema, any ancestor, or a zero counter differs.

The execution authorization permits bounded execution under this proposal. It is not a post-evidence Owner attestation and cannot be reused as one.

## Mandatory workspace protocol

At start, read `AGENTS.md`, `docs/AI_CURRENT_STATUS.md`, the latest rows of `docs/AI_WORK_LOG.md`, and `docs/AI_AGENT_SYNC.md`. For Stripe work, read `.agents/skills/stripe-best-practices/SKILL.md` and its security reference in full. Preserve unrelated dirty work. Use additive V18 files; never overwrite V17 artifacts or another agent's changes. Before final response, update current status and the work log factually without secrets or private identifiers.

Independent reviewers must be genuinely isolated, read-only, exact-manifest reviewers. They may not edit files, access secrets, call providers, or rely on another reviewer's conclusion.

## Immutable starting facts

Recompute each SHA-256 from file bytes before trusting it:

- V17 proposal: `2eb7c5516334ba8c5ded669bf58e6fe2678a60c8f790ad222c87dc023bc06da0`.
- V17 Owner authorization: `43cfba9a6658e14b17338a3e8ee54d1a3002f7cb7e703220fc1340e0c8fb1415`.
- V17 final audit: `74826dea45a8aa959acb5965b5047c52eaae8f5bc22992f9b2da495fcf8296dd`.
- V17 manifest r2: `359789d9bccb9ad956c890a91899f56396e70ab0679838102e4ac95b70a16894`.
- V17 bundle build 2: `302acb01bd0945b364024dbee282e1e88008afc926f356b63714a80132c51031`.
- V17 provenance ACCEPT: `f3425dc28740261f2a35d878ec66d72f133ba79cce08d767fb7da63a36e20521`.
- V17 runtime REJECT: `ff0a80b6b555038565076d3a00983ef177b444f3eec611d97d63db0151cd76ef`.
- V17 security REJECT: `dc44b8bd898453ba7d0038aca3b3d594faa9b11202d0de6d59dea4a299e6dcbf`.
- V17 review aggregate: `b113a5a2df209ac1fd9113dcae71bc8840ec02fe067f69e379226b288047fa88`.
- V17 recoverable checkpoint: `d9a21c9c92a1a73da7363ef3e09f72d21073f43cd244176eea3af50baf667b61`.
- PostgreSQL 16 proof: `603a9bfc510146550c21e94ed3c971e5c26a8cec8fee0e6f0044f238cf9b9e65`.
- custom-staging catalog snapshot: `912e9a0c232e50330905712d87830cf659c76b03cc05b4bef64d735e346005f0`.
- pre-network ledger evidence: `583c5f572f32c0828311d8822d8ef37a73ec4c98a07b7857a15cc6492e26ac84`.

Require V17 manifest independent verification PASS, file count 240, closure count 25, V16 declared drift zero, privacy findings zero, audit rounds 3/3, bundle builds 2/4, manifest freezes 2/4, review rounds 1/4, and reviewer dispatches 3/12.

Require the checkpoint to state runtime process starts, new credential reads, new catalog reads, provider calls, external calls, external mutations, deployments, webhook mutations, database mutations, human attestations, and terminal publications all equal zero. Carried credential and catalog reads remain five each.

V17 audit 3/3 is exhausted. V18 receives fresh counters; never rewrite or retroactively extend V17.

## The only three authorized findings

Require exact byte-for-byte equality with these V17 strings:

1. `full_child_process_fixture_does_not_execute_the_production_v17_startup_path_before_asserting_rollback_resume`
2. `same_value_environment_upsert_receipt_accepts_an_empty_provider_receipt_identity`
3. `joined_real_delivery_proof_accepts_arbitrary_nonempty_database_hash_text_without_sha256_shape_validation`

Do not use V18 for unrelated refactoring. A defect directly introduced by implementing these three corrections may be fixed within remaining V18 ceilings. Any pre-existing or unrelated new blocker requires a new Owner authority and a recoverable checkpoint.

## Absolute boundaries

- custom `staging` only; production, Preview, LINE, live Stripe, and real-customer mutations are zero;
- Stripe sandbox and dedicated `rk_test_` restricted key only; no `sk_test_`, live key, ambient fallback, or default profile;
- Stripe API version remains `2026-04-22.dahlia`;
- do not add `payment_method_types` or modify existing Checkout, SetupIntent, PaymentIntent, refund, worker, or application contracts;
- application source, migrations, package lock, frozen application artifact, and every V17 artifact are immutable;
- only additive V18 tooling, fixtures, bundle, manifests, reviews, and evidence may change;
- Stripe endpoint create/delete/replacement and signing-secret rotation are zero;
- catalog refresh, replacement, and synthetic catalog fallback are zero;
- never print, return, commit, or publish secrets, tokens, cookies, JWTs, private URLs, query strings, private paths, raw provider responses, raw provider identities, event IDs, payment object IDs, customer PII, or raw webhook payloads;
- no AI-generated human attestation and no PASS before every fact exists;
- Gate D and Gate E remain unstarted.

## Ceilings

### Fresh V18 tooling and review

- bundle builds: maximum 6, starting at zero;
- pre-manifest adversarial audit rounds: maximum 6, starting at zero;
- a fresh audit PASS is required for every candidate manifest;
- manifest freezes: maximum 4, starting at zero;
- review rounds: maximum 4, starting at zero;
- exactly three reviewers per round: provenance, runtime, security;
- reviewer dispatches: maximum 12;
- reviewer secret reads, provider calls, external calls, external mutations, and file mutations: zero.

Every failed build, audit, manifest freeze, or dispatch consumes its ceiling. Never reset a counter through a filename, process, authority, manifest, or private-root change. A manifest must not be frozen from a bundle that lacks a fresh V18 adversarial-audit PASS.

### Carried Gate C runtime ceilings

- phase/lifetime calls: 500/500;
- forward/rollback calls: 472/28;
- forward/rollback mutations: 60/3;
- cumulative credential reads: maximum 11, including five carried;
- operating-system runtime process starts: maximum three—initial plus two crash resumes;
- private config reads: maximum one per runtime process;
- decrypted provider-environment reads: maximum one per runtime process;
- cumulative catalog reads: maximum eight, including five carried; refresh calls zero;
- custom-staging `STRIPE_WEBHOOK_SECRET` same-value upsert: maximum one and only under the strict conditional contract below;
- deployments: 1 prebuilt + 6 runtime-state + 2 watchdog = 9;
- webhook updates/compensations: 9/1;
- database CAS/affected rows: 3/3;
- synthetic cycles: exactly two;
- uniquely attributable comparisons: at least 1,000 with success rate at least 0.999;
- watchdog deployment timeout: 420,000 ms;
- absolute rollback deadline: 600,000 ms;
- endpoint create/delete/replacement/secret rotation and production/Preview/LINE/live/real-customer mutation: zero.

Offline child-process fixture starts do not consume Gate C runtime process starts, but must have separately closed counters and may never share real private state or credentials. Runtime counters remain cumulative across actual crashes.

## Phase 1 — freeze authority and prove the ancestor chain

1. Acquire the existing global bootstrap/execution lock before private access.
2. Freeze and verify V18 authorization as specified above.
3. Verify the proposal, directive, research, V17 proposal/authorization/audit/manifest/bundle/reviews/checkpoint, PG16 proof, catalog snapshot, and pre-network ledger from bytes.
4. Verify all cross-references and the exact three finding strings.
5. Independently verify V17 manifest closure and prove application source, migrations, package lock, frozen artifact, V16 ancestors, and all V17 artifacts are unchanged.
6. Record zero V18 pre-execution provider calls, external mutations, and deployments.

## Phase 2 — implement exact finding 1: production-startup child processes

Create additive V18 runtime/recovery modules and one V18 production startup export plus its production CLI/bootstrap entrypoint. Do not patch V17 in place.

### Required production path

Every crash and resume child must invoke the same production entrypoint that Gate C will invoke and traverse, in order:

1. public authority/manifest/review/ceiling/private-root preflight;
2. global lock assertion;
3. durable process-start registration and fourth-start rejection;
4. runtime and rollback journal validation before forward/rollback selection;
5. ledger allocation and durable append of a unique credential attempt;
6. descriptor-bound mode-0600 config read;
7. provider/runtime context reconstruction and durable counter hydration;
8. pending mutation reconciliation using the production idempotency/readback contract;
9. production resume-versus-rollback selection;
10. the same rollback executor and checkpoint assembler used by real execution.

A helper that directly calls ledger functions, a fixture-owned recovery-state JSON file, an in-process retry, or direct rollback invocation does not close the finding.

### Held-evaluation seam

Offline fixtures may supply descriptor-bound synthetic private inputs and replace only the lowest provider transport with a held-evaluation adapter. The adapter may return scripted provider responses but must not allocate ledger records, write recovery journals, decide rollback, change counters directly, or call terminal/checkpoint assemblers.

Deterministic crash hooks must be inside the production state machine immediately after:

- durable private-config credential intent;
- durable forward external-mutation intent and before receipt;
- durable rollback initialization and before completion.

Hooks must require an explicit unforgeable in-process held-evaluation capability object. Public config, environment variables, argv, filenames, provider data, or persisted state must not enable them. Live startup must reject any serialized attempt to enable a hook.

### Required process evidence

Spawn actual fresh Node processes sharing only one synthetic descriptor-bound private ledger/journal root per scenario. Require a sanitized call trace, bound to entrypoint/module/bundle hashes, proving the production entrypoint and all applicable stages were entered. Prove:

- each of the three deterministic crashes and successor-process resumes;
- crash after mutation intent reaches production reconciliation and rollback selection;
- crash after rollback initialization reaches production rollback completion;
- stable logical operation ID and unique ledger-allocated ordinal/action ID per physical credential read;
- interrupted attempts remain consumed;
- no duplicate deployment, webhook update, provider mutation, database CAS, or compensation;
- fourth runtime start is rejected before credential intent/read;
- cross-authority, cross-manifest, cross-review, reordered, truncated, duplicated, corrupt, and fixture-capability injection cases fail closed;
- the V16 fixed-action replay remains a negative baseline;
- neither synthetic credential/provider value nor private path appears in public evidence.

## Phase 3 — implement exact finding 2: exact provider receipt identity

In additive V18 webhook/environment tooling:

1. Preserve V17's exactly-one `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` custom-staging inventory and run-keyed HMAC requirements.
2. Permit the one authenticated same-value upsert only when the Sensitive webhook value is genuinely unreadable.
3. Before the PATCH, retain the already validated exact target env-record identity privately.
4. Require the authenticated PATCH receipt identity to be an actual string, already normalized by a closed parser, non-empty after trim, free of control characters, and byte-for-byte equal to the target env-record identity.
5. Do not use `String(value)`, an alternate-ID fallback, a placeholder, or a hash of an unchecked value.
6. Require the subsequent authenticated full inventory readback to contain exactly one record with the same key, custom-staging identity, exact raw record identity, and exact update timestamp from the receipt.
7. Only after all comparisons pass, emit the identity SHA-256 and booleans to public evidence. Keep raw identities in a descriptor-bound mode-0600 private receipt.

Require positive coverage and failures for missing, undefined, null, non-string, empty, whitespace-only, control-character, wrong-record, wrong-environment, wrong-key, wrong-timestamp, duplicate-readback, and receipt/readback-mismatch identities.

## Phase 4 — implement exact finding 3: database SHA-256 validation

In additive V18 runtime/joined-proof tooling:

1. Define one exact lowercase SHA-256 predicate: `^[a-f0-9]{64}$`.
2. Require every selected `webhook_events.raw_body_hash` and `received_signature_header_hash` to pass it before any `rawBodyVerified`, `realDelivery`, or `storedEventReconciled` value can be true.
3. Verify immutable `src/lib/server/stripeWebhook.ts` still derives the fields as SHA-256 of the exact raw body bytes and received signature header; do not edit application source.
4. Preserve the V17 join to exact event, provider object, namespace, test environment, API version, event type, selected endpoint, authenticated post-env deployment, stored-once state, signature-success path, and Stripe readback.
5. Do not validate arbitrary text by hashing the text and accepting the new digest. Validate the database value itself.
6. Keep individual raw database values private; public evidence may contain only sanitized joined digests and booleans.

Require failures for missing, null, non-string, empty, whitespace, 63-character, 65-character, uppercase, non-hex, arbitrary-text, swapped, duplicated-event, wrong-environment, and invalid-signature-path values.

## Phase 5 — offline validation, build, audit, manifest, and 3/3 review

1. Run focused V18 unit, integration, actual-production-start child-process, environment-receipt, database-hash, source/bundle parity, counter, privacy, and negative-control fixtures.
2. Run the unchanged V17 fixtures as regressions. Do not claim their prior PASS closes a V18 requirement.
3. Build a fresh additive held-evaluation V18 bundle. Count every attempt, successful or failed.
4. Require source/bundle exports, production entrypoint identity, call-trace stages, proposal/authorization hashes, constants, behavior, and fixtures to match independently.
5. Run a fresh official V18 adversarial audit against the exact bundle candidate. It must execute authoritative fixture paths, inspect full dependency closure, verify the child process truly enters production startup, inspect the exact receipt identity comparison and both database SHA predicates, run privacy scanners, and prove V17/application immutability.
6. Freeze a content-addressed V18 manifest only after that exact candidate's fresh audit PASS. Include all source, bundle, entrypoint, adapters, fixtures, traces, audit evidence, ancestors, counters, and privacy results.
7. Independently verify every manifest byte without importing implementation code under review.
8. Dispatch exactly three isolated read-only reviewers against the same exact manifest:
   - provenance: ancestor chain, closure, source/bundle parity, counters, PG/catalog/pre-network evidence, immutability, privacy;
   - runtime: actual children entering the production startup path, fault-hook isolation, journals, attempt allocation, reconciliation, rollback selection, idempotency, fourth-start behavior;
   - security: exact env receipt identity and readback, lowercase SHA-256 validation for both database fields, endpoint/env/deployment/real-delivery join, raw-body signature model, restricted-key and privacy boundaries.
9. ACCEPT requires exact 3/3, zero blockers, same manifest SHA, and zero reviewer write/secret/provider/external-call counters.

Any REJECT freezes that round. If the finding is one of the three authorized findings or a defect directly introduced by its V18 implementation and ceilings remain, remediate additively, rebuild, run a fresh audit, freeze a new manifest, independently verify, and dispatch a fresh 3-role round. Never review an old manifest after a code change. Stop on an unrelated blocker or exhausted ceiling.

Do not start Gate C on 2/3, conditional acceptance, waived finding, reviewer disagreement, different manifest hashes, stale audit, or self-review substituted for an independent reviewer.

## Phase 6 — runtime preflight after exact 3/3 ACCEPT

1. Reacquire the global lock and re-hash the complete public chain.
2. Revalidate private-root descriptor identity and all private ledger/journal hash chains without exposing contents.
3. Require the bound catalog snapshot still satisfies its authorized freshness contract. If stale, stop; V18 authorizes no refresh.
4. Carry exactly five credential and five catalog/provider reads from the bound pre-network evidence. Reject missing, pending, duplicated, rewritten, or counter-mismatched evidence.
5. Initialize process-start and credential-attempt intents before physical reads.
6. Authenticate exact Vercel principal/project/custom staging, Stripe sandbox account/selected endpoint/restricted key, Supabase custom staging, and frozen artifact.
7. Require exactly one approved custom-staging env record per Stripe key.
8. If the webhook secret value is unreadable, execute at most one same-value upsert under Phase 3's exact identity contract; otherwise perform no env mutation.
9. Create the authenticated custom-staging deployment only after the matching env record install/update time. Environment-variable changes never prove they reached an older deployment.
10. Preserve at least 20 rollback provider reads, eight rollback other calls, three rollback mutations, and the 600-second rollback deadline.

## Phase 7 — execute custom-staging Gate C once

Follow the exact accepted V18 manifest:

- authenticated prebuilt deployment and provider-artifact readback;
- full Stripe endpoint pagination and exact selected sandbox endpoint/account/status/API-version/event-set/target uniqueness proof;
- bounded selected endpoint target update with durable intent, idempotency, and exact readback;
- exactly two namespaced synthetic cycles: card setup and refundable deposit;
- selected endpoint real Stripe sandbox deliveries to the authenticated post-env deployment;
- deployed raw-body and actual `Stripe-Signature` verification using deployed `STRIPE_WEBHOOK_SECRET`;
- exact database SHA-256 shape checks and event/provider/namespace reconciliation;
- webhook and refund worker rehearsal;
- at least 1,000 uniquely attributable comparisons and success rate at least 0.999;
- complete public/private evidence separation and counter reconciliation.

A locally signed payload is a negative/control fixture only. It cannot prove selected-endpoint delivery or ownership of the deployed endpoint secret.

On SIGINT, SIGTERM, deadline, crash, provider ambiguity, counter drift, failed assertion, or unknown mutation outcome, use only the durable production resume/rollback path. A replacement runtime process may start only within the three-start and eleven-credential lifetime ceilings.

## Phase 8 — mandatory rollback and final readback

Rollback is required after apparent success and after any failure once context exists. It must:

- restore the selected endpoint target to its exact baseline;
- remove or revert only authorized namespaced synthetic state;
- reconcile refunds, holds, worker state, database CAS effects, runtime flags, and deployments;
- compensate the one env same-value upsert only if the accepted V18 plan requires and can prove a safe exact baseline action within the authorized mutation contract; never delete, replace, or rotate the endpoint secret;
- complete within 600 seconds and reserved counters;
- perform exact authenticated final readback;
- prove production, Preview, LINE, live Stripe, real customers, application source, migrations, package lock, frozen artifact, Gate D, and Gate E unchanged.

Unknown rollback state is nonterminal and never PASS.

## Phase 9 — evidence, direct signatures, and atomic PASS

1. Assemble public machine evidence with private descriptor/digest references only. Scan filenames and all public content recursively.
2. Require the production-start trace, exact env receipt identity booleans, per-event database SHA validation booleans, selected endpoint joined proof, counters, and rollback evidence to bind the exact V18 authorization/manifest/review hashes.
3. Run normal audit against the complete machine evidence. It must PASS.
4. Freeze the final evidence manifest before requesting human attestations.
5. Collect new direct, strong-MFA-bound Owner, Floor Manager, and Engineer attestations for that exact final manifest and machine result. Do not reuse execution authority or any V16/V17 approval. Do not accept AI proxy, inferred, pre-evidence, copied, or synthesized signatures.
6. If a signer is unavailable, publish a recoverable nonterminal human-attestation checkpoint and wait; do not claim PASS.
7. Assemble the signed final result and run audit with `--require-pass`. It must PASS.
8. Under the publication lock, re-hash every bound artifact, recheck all counters and privacy scans, and atomically publish exactly one durable `SIGNED_GATE_C_PASS` terminal.
9. Resolve the canonical terminal to exactly one current PASS. Gate D and Gate E remain unstarted.

No checkpoint, `READY`, review ACCEPT, normal audit PASS, rollback PASS, or unsigned machine result is a Gate C PASS alias.

## Required final report

Report concisely without private data:

- V18 Owner authorization path/SHA;
- exact three remediation results;
- final bundle path/SHA and build count out of six;
- adversarial audit path/SHA/result and count out of six;
- manifest path/SHA, freeze count out of four, file/closure counts, and independent verification;
- provenance/runtime/security review paths, decisions, aggregate 3/3 state, review rounds and dispatch totals;
- production-start child-process call-trace result and all runtime process/credential attempt totals;
- env receipt exact-identity result and both database SHA-256 validation results using digests/booleans only;
- Gate C runtime, real delivery, comparisons, rollback, final readback, normal audit, direct attestations, `--require-pass`, and terminal result;
- provider/external call, mutation, deployment, webhook, database, credential, and catalog counters;
- confirmation that production, Preview, LINE, live Stripe, real customers, application source, migrations, package lock, frozen artifact, V17 artifacts, and Gate D/E were untouched;
- if nonterminal, the exact blocker, consumed ceilings, immutable checkpoint SHA, and why no PASS was published.
