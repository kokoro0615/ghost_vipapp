# TableCheck VIP Floor Gate C V18 — exact three-finding remediation and signed-PASS strategy

Date: 2026-07-23 JST

## Decision

V18 is a new additive lineage bound to the immutable V17 recoverable checkpoint SHA-256 `d9a21c9c92a1a73da7363ef3e09f72d21073f43cd244176eea3af50baf667b61`. It may remediate exactly the three blocking findings recorded by the V17 same-manifest review, then must perform a fresh adversarial audit, freeze and independently verify a new manifest, obtain exact 3/3 read-only ACCEPT on that same manifest, and only then enter custom-staging Gate C. Gate C still requires mandatory rollback, direct post-evidence attestations, normal audit PASS, `--require-pass` audit PASS, and one atomic signed PASS terminal.

The requested outcome is a truthful `SIGNED_GATE_C_PASS`, not permission to invent a fact or bypass a gate. Any false prerequisite, exhausted ceiling, missing direct-human attestation, or ambiguous mutation produces a recoverable nonterminal checkpoint.

## Immutable V17 authority and evidence

- V17 proposal: `2eb7c5516334ba8c5ded669bf58e6fe2678a60c8f790ad222c87dc023bc06da0`
- V17 Owner authorization: `43cfba9a6658e14b17338a3e8ee54d1a3002f7cb7e703220fc1340e0c8fb1415`
- V17 final adversarial audit: `74826dea45a8aa959acb5965b5047c52eaae8f5bc22992f9b2da495fcf8296dd`
- V17 manifest r2: `359789d9bccb9ad956c890a91899f56396e70ab0679838102e4ac95b70a16894`
- V17 bundle build 2: `302acb01bd0945b364024dbee282e1e88008afc926f356b63714a80132c51031`
- V17 provenance ACCEPT: `f3425dc28740261f2a35d878ec66d72f133ba79cce08d767fb7da63a36e20521`
- V17 runtime REJECT: `ff0a80b6b555038565076d3a00983ef177b444f3eec611d97d63db0151cd76ef`
- V17 security REJECT: `dc44b8bd898453ba7d0038aca3b3d594faa9b11202d0de6d59dea4a299e6dcbf`
- V17 aggregate review: `b113a5a2df209ac1fd9113dcae71bc8840ec02fe067f69e379226b288047fa88`
- V17 checkpoint: `d9a21c9c92a1a73da7363ef3e09f72d21073f43cd244176eea3af50baf667b61`

V17 performed no Gate C runtime start, credential or catalog read beyond the five carried reads in each class, provider call, external mutation, deployment, webhook mutation, database mutation, human attestation, or terminal publication. V18 therefore carries the V16/V17 runtime ceilings without resetting or consuming them, while receiving separate fresh tooling/audit/manifest/review ceilings.

## Fixed findings and exact closure contracts

### 1. The child-process fixture must execute the production startup path

The V17 fixture spawns real Node children, but those children directly exercise `createDurableRecoveryLedgerV17` and a fixture-owned state file. They do not invoke the production `runGateCExecutableV17` startup path before claiming rollback/resume behavior.

V18 must expose one production startup function and one production CLI/bootstrap entrypoint. Each crash/resume child must invoke that exact entrypoint and traverse the same public preflight, lock assertion, process-start registration, durable journal inspection, credential-attempt allocation, descriptor-bound config read, counter hydration, pending-mutation reconciliation, and forward-versus-rollback selection used by Gate C. A held-evaluation adapter may replace the lowest provider transport and supply synthetic descriptor-bound private inputs, but it may not decide rollback, write fixture-only recovery state, call ledger helpers as a substitute for startup, or skip any startup stage under review.

Deterministic fault hooks must live in the production state machine immediately after the durable config intent, external-mutation intent, and rollback initialization. They must be unreachable in live execution unless an explicit in-process held-evaluation capability object is supplied; environment variables, argv, filenames, or public config cannot enable them. The manifest must bind the production entrypoint, test driver, helper child, adapter, call-trace schema, and negative tests. Static source-token checks alone are insufficient.

Closure requires actual fresh processes sharing the same private ledger/journal directory, a recorded call trace proving the production entrypoint was entered, crash/resume reaching rollback through production selection logic, no duplicate mutation, and rejection of a fourth runtime process before credential access.

### 2. Same-value environment upsert receipt identity must be non-empty and exact

V17 accepted any string for `providerReceiptIdentity`, including `""`, then hashed it. V18 must reject missing, non-string, empty, whitespace-only, control-character-bearing, coerced, or mismatched identities before hashing.

The authenticated PATCH receipt identity must be byte-for-byte equal to the already validated target environment-record identity, and the subsequent authenticated inventory readback must return exactly the same record identity and exact update timestamp. Neither `String(undefined)`, an alternate `uid` fallback, nor a digest of an empty value is evidence. Public evidence contains only the resulting SHA-256 and booleans; the raw provider identity remains in a descriptor-bound mode-0600 receipt.

The negative matrix must include missing, empty, whitespace, wrong identity, wrong environment, wrong key, wrong timestamp, duplicate readback, and receipt/readback mismatch.

### 3. Joined delivery database hashes must have exact SHA-256 shape

V17 treated arbitrary non-empty strings in `raw_body_hash` and `received_signature_header_hash` as raw-body verification evidence. V18 must require both values for every selected stored event to match lowercase `^[a-f0-9]{64}$` before setting `rawBodyVerified`, `realDelivery`, or `storedEventReconciled` true.

The frozen application source already derives these fields with `sha256Hex(rawBody)` and `sha256Hex(signatureHeader)` in `src/lib/server/stripeWebhook.ts`; V18 verifies that immutable source identity and joins the stored hashes to the exact Stripe event, provider object, cycle namespace, selected endpoint, authenticated post-env deployment, and signature-success handler path. It may not replace the application contract or treat a second hash of arbitrary database text as validation.

The negative matrix must include missing, empty, whitespace, 63-character, 65-character, uppercase, non-hex, arbitrary text, swapped values, duplicate event, wrong environment, and invalid-signature-path records.

## Primary-source security boundary

- Stripe requires the raw request body, the received `Stripe-Signature` header, and the secret associated with the endpoint; modifying the raw body breaks verification. A Dashboard endpoint secret and a Stripe CLI listener secret are different even though both use the `whsec_` prefix: <https://docs.stripe.com/webhooks/signature>.
- Stripe recommends signature verification with the endpoint secret and explicitly requires the unmodified raw body: <https://docs.stripe.com/webhooks#verify-official-libraries>.
- Vercel states that environment-variable changes apply only to new deployments, which preserves the V17 requirement that the authenticated custom-staging deployment postdate the env install/update: <https://vercel.com/docs/environment-variables>.
- Vercel custom environments have their own variables and are deployed with an explicit custom target, preserving the custom-staging-only boundary: <https://vercel.com/docs/deployments/environments>.

Stripe remains sandbox-only with a dedicated `rk_test_` restricted key, API version `2026-04-22.dahlia`, no `sk_test_` fallback, no `payment_method_types` addition, and no endpoint creation, deletion, replacement, or signing-secret rotation. Production, Preview, LINE, live Stripe, and real-customer mutation remain zero.

## V18 bounded execution design

Fresh V18 tooling counters start at zero and do not reset V17 or Gate C lifetime counters:

- bundle builds: maximum 6;
- pre-manifest adversarial audit rounds: maximum 6, with a fresh PASS required for every candidate manifest;
- manifest freezes: maximum 4;
- review rounds: maximum 4;
- reviewers: exactly provenance, runtime, and security on one exact manifest per round;
- reviewer dispatches: maximum 12;
- reviewer secret reads, provider calls, external calls, external mutations, and file mutations: zero.

The larger build/audit allowance covers failed builds and preserves up to four complete manifest/review candidates without repeating V17's exhausted-audit dead end. Remediation between rejected rounds remains additive and may address only the three fixed findings or defects directly introduced by their V18 implementation. A newly discovered unrelated blocker requires a new authority.

After exact 3/3 ACCEPT, retain the V17 Gate C limits: phase/lifetime calls 500; forward/rollback calls 472/28; forward/rollback mutations 60/3; cumulative credential reads 11 with 5 carried; runtime process starts 3; catalog reads 8 with 5 carried and refresh 0; deployments 9; webhook updates 9 and compensation 1; database CAS/affected rows 3/3; synthetic cycles 2; same-value custom-staging env upsert 1; endpoint create/delete/replacement/secret rotation 0. Every attempt consumes its ceiling even on failure or unknown outcome.

## Required execution order

1. Exact direct Owner adoption of the V18 proposal; freeze and verify the V18 authorization before reviewer dispatch, private access, or network use.
2. Re-hash the complete V17 checkpoint chain and prove V17/application immutability.
3. Implement the three additive V18 corrections and their positive/negative fixtures.
4. Build, run the fresh adversarial audit, freeze one candidate manifest, and independently verify it from bytes.
5. Dispatch three isolated read-only reviewers to the same manifest. Continue only on 3/3 ACCEPT with zero blockers.
6. Re-run runtime preflight and enter custom-staging Gate C under carried ceilings.
7. Complete two synthetic cycles, selected-endpoint real Stripe delivery proof, and mandatory rollback/final readback.
8. Freeze machine evidence, pass normal audit, then collect direct strong-MFA-bound Owner, Floor Manager, and Engineer attestations for that exact final manifest.
9. Pass `--require-pass`, re-hash under the publication lock, and atomically publish exactly one `SIGNED_GATE_C_PASS` terminal. Gate D and Gate E remain unstarted.

This research/proposal session performs none of steps 1-9 beyond producing the directive, strategy, proposal, and prompt. It does not read credentials, dispatch reviewers, call providers, deploy, mutate external state, run Gate C, collect attestations, or publish a terminal.
