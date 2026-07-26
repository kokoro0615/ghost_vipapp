# TableCheck VIP Floor Gate C V17 — two-blocker pass strategy

Date: 2026-07-23 JST

## Outcome

V16 must remain immutable. V17 should make only additive tooling, fixture, bundle, manifest, review, and evidence changes needed to close the two findings in the exact V16 rejected review. Gate C runtime remains prohibited until a V17 manifest receives three independent ACCEPT decisions with zero blockers.

This strategy does not promise a fabricated pass. It makes the two known failure modes executable and independently reviewable, then permits Gate C to pass only if runtime, rollback, evidence, human attestations, and both normal and `--require-pass` audits actually pass.

## Immutable inputs

- V16 manifest SHA-256: `287442ecb323f8572ecd56b11edf632d94baaf7eebcc8a3d5a29d22635bc39ca`
- V16 rejected review SHA-256: `20199d073ad454f4af530e58c50199d36bce77c26658c43589f550ea42e97ab6`
- V16 nonterminal checkpoint SHA-256: `41d9c64eef32c9be49b8f8bfd47c6e69e83338a4a0a0a92bcf9b01d005d46ca1`
- V16 bundle SHA-256: `ed0cbe88d17f1d38d7837e5f9ae5b40f0d6f3329ca1a72ccc9eff6358dfac86f`
- Disposable PostgreSQL 16 proof SHA-256: `603a9bfc510146550c21e94ed3c971e5c26a8cec8fee0e6f0044f238cf9b9e65`
- Sanitized custom-staging catalog snapshot SHA-256: `912e9a0c232e50330905712d87830cf659c76b03cc05b4bef64d735e346005f0`
- Pre-network ledger evidence SHA-256: `583c5f572f32c0828311d8822d8ef37a73ec4c98a07b7857a15cc6492e26ac84`

No V16 artifact, rejected review, or checkpoint may be edited, replaced, or relabelled as accepted.

## Finding 1 — full-process restart stops at credential replay

### Confirmed cause

`runGateCExecutableV16` consumes a private-config credential record before creating the runtime context, using the fixed action ID:

```text
sha256(manifestSha256 + reviewSha256 + "private-config-v7r7" + "1")
```

The durable V14 ledger rejects any repeated credential action ID. A second operating-system process therefore fails before journal hydration and before rollback can resume. The existing retry logic for provider calls uses stable logical request identities plus distinct attempt IDs, but the initial private-config read does not.

### Required V17 model

Separate a stable logical credential operation from each physical read attempt:

- `operationId`: binds authorization, manifest, review, phase, source class, and private-config file identity; stable across process restarts.
- `attemptOrdinal`: allocated from the durable ledger while the global execution lock is held; strictly increasing and never derived from PID, wall clock, random bytes, or an untrusted caller.
- `actionId`: SHA-256 of a canonical closed-schema tuple containing `operationId`, scope, and `attemptOrdinal`; unique per physical read.
- every physical secret read consumes exactly one credential-read record; a restart never receives a free read and never reuses an action ID.
- a completed read from an earlier process is evidence, not reusable secret material. A new process must consume a new attempt before reading bytes.
- rollback-required journal state is inspected before selecting forward work. The new process then performs its accounted config read, reconstructs context, hydrates counters, and enters rollback/resume rather than replaying completed forward actions.
- a crash between credential intent and file read remains conservatively consumed. It is never erased or reissued under the same action ID.

V17 should permit at most three operating-system process starts: the initial start plus two bounded crash-resume starts. With five carried credential reads and at most one private-config plus one decrypted-provider-environment read per process, the cumulative credential ceiling is eleven. There is no unlimited retry loop.

### Required tests

Unit-level calls inside one Node process are insufficient. At minimum, spawn real child processes against the same private ledger/journals and prove:

1. crash immediately after the first durable private-config credential record;
2. crash after a forward mutation intent but before its receipt;
3. crash after rollback journal initialization and before rollback completion;
4. the successor process uses a new credential attempt ID, preserves the stable operation ID, and reaches rollback/resume;
5. carried plus new credential counts are exact and never exceed eleven;
6. no forward action, deployment, provider mutation, or compensation is duplicated;
7. a fourth process start fails closed before reading a credential;
8. corrupt, reordered, cross-authority, cross-manifest, and cross-review ledger rows fail closed.

## Finding 2 — signing secret is not exactly bound

### Confirmed cause

V16 validates that the private value starts with `whsec_`, reads the selected endpoint identity, and verifies a keyed fingerprint for deployed `STRIPE_SECRET_KEY`. It does not require a matching `STRIPE_WEBHOOK_SECRET` fingerprint and does not require an end-to-end proof that the selected endpoint's real delivery was verified by the deployed runtime.

### Primary-source constraints

- Stripe defines the webhook endpoint `secret` as the value used to generate signatures and says it is returned only when the endpoint is created: <https://docs.stripe.com/api/webhook_endpoints>
- Creating an endpoint returns the endpoint object with `secret` populated; later retrieval omits the secret: <https://docs.stripe.com/api/webhook_endpoints/create>
- Stripe generates a unique secret for each endpoint. Verification requires the endpoint secret, the `Stripe-Signature` header, and the unmodified raw request body: <https://docs.stripe.com/webhooks> and <https://docs.stripe.com/webhooks/signature>
- Stripe recommends restricted keys and keeping secrets out of source and chat: <https://docs.stripe.com/keys> and <https://docs.stripe.com/keys-best-practices>
- Vercel states that environment changes apply only to new deployments: <https://vercel.com/docs/environment-variables>
- Vercel Sensitive values can be non-readable after creation, so a plaintext readback cannot be the only proof mechanism: <https://vercel.com/docs/environment-variables/sensitive-environment-variables>

### Required V17 proof chain

The pass condition is a conjunction. No individual check is sufficient:

1. **Private config binding:** ledger-accounted read of the exact descriptor-bound 0600 private config; HMAC values use the run-local `shadowCompareKey` and never publish raw secrets.
2. **Vercel configuration binding:** exactly one `STRIPE_WEBHOOK_SECRET` record for the approved custom-staging environment. When the provider returns its value, its run-keyed HMAC must equal the private config secret HMAC. Its identity, target/custom-environment binding, type, and update timestamp are retained privately; public evidence contains only digests and booleans.
3. **Deploy ordering:** the authenticated deployment used for Gate C must be created after the bound environment record was installed or last updated. A deployment predating the environment change is invalid because Vercel does not retroactively change existing deployments.
4. **Stripe endpoint binding:** full pagination must find exactly one selected test-mode endpoint with the approved endpoint identity, exact Gate C URL, exact event allowlist and API version, enabled status, and no Connect scope. The selected endpoint must be the unique endpoint targeting the exact protected deployment webhook URL for the tested event types.
5. **Dynamic endpoint-to-runtime proof:** a real Stripe sandbox event attributable to the synthetic Gate C cycle must be delivered through that selected endpoint. The deployed handler must verify Stripe's real `Stripe-Signature` over the unmodified raw bytes using deployed `STRIPE_WEBHOOK_SECRET`, store the exact event ID, and be reconciled to the same Stripe test event/provider object and selected endpoint target. A locally fabricated signature, prefix check, unsigned rejection, environment-name check, or endpoint-ID check alone is forbidden as proof.
6. **Joined receipt:** create a sanitized proof record joining the selected endpoint digest, environment-record digest, deployment digest, event digest, raw-body digest, received-signature-header digest, event-set digest, API version, and boolean results. The join must be keyed by the immutable V17 manifest/review/authority hashes. No secret, endpoint ID, URL, provider object ID, private path, customer data, or raw payload is public.
7. **Negative controls:** wrong secret, transformed body, wrong endpoint identity, duplicate matching environment records, deployment older than env update, locally synthesized-only signature, live-mode event, and non-selected endpoint delivery all fail closed.

If the Vercel Sensitive value is intentionally non-readable, do not substitute an empty-value fingerprint. The dynamic real-delivery proof remains mandatory, and the configuration leg must use an authenticated write receipt for the exact in-memory secret followed by a later deployment and private digest comparison. Such a write is limited to the same custom-staging `STRIPE_WEBHOOK_SECRET`; production, preview, live mode, secret rotation, and endpoint replacement remain forbidden. If the existing endpoint secret cannot be preserved or proven without rotation/replacement, stop for a separate Owner authority.

## Review and execution ordering

1. Freeze the exact V17 Owner authorization after the role code and proposal SHA match.
2. Re-hash all immutable V16 ancestors and existing PostgreSQL/catalog evidence.
3. Implement only additive V17 ledger/runtime/provider/assertion/fixture/audit tooling.
4. Run offline fixtures, full child-process restart tests, negative secret-binding tests, lint, bundle build, and independent bundle/source parity verification.
5. Freeze a content-addressed V17 manifest.
6. Dispatch exactly three independent read-only reviewers—provenance, runtime, security—against the same manifest. Runtime must inspect child-process restart behavior; security must inspect the full joined proof, not just config validation.
7. On any REJECT, preserve the round, remediate additively within ceilings, rebuild/refreeze, and repeat. Runtime/external execution is forbidden until one round is exactly 3/3 ACCEPT with zero blockers.
8. Revalidate catalog freshness. If the existing snapshot has expired, stop; this two-blocker authority does not silently expand catalog discovery.
9. Execute custom-staging Gate C with ledger-first credential reads, bounded calls, two synthetic cycles, mandatory rollback, final readback, privacy scan, and machine evidence.
10. Collect direct-human Owner, Floor Manager, and Engineer attestations only after machine evidence exists. AI proxy or preauthorization is invalid.
11. Publish one atomic signed Gate C PASS only after normal audit and `--require-pass` audit both pass. Otherwise publish only a recoverable nonterminal checkpoint; never synthesize PASS.

## Proposed fresh ceilings

- V17 bundle builds: 4 maximum, starting at zero; V16's exhausted 6/6 remains immutable.
- V17 manifest freezes: 4 maximum.
- V17 independent review rounds: 4 maximum; three reviewers each; twelve dispatches maximum.
- V17 pre-manifest adversarial audits: 3 maximum.
- Cumulative credential reads: 11 maximum, including the five already carried from V16; at most three process starts and two credential reads per start.
- Existing Gate C call, mutation, deployment, webhook-update, database, cycle, rollback, and production/live zero ceilings remain unchanged.
- Application source, migrations, package lock, frozen application artifact, production, preview, LINE, live Stripe, and real-customer state remain immutable.

These ceilings are deliberately finite. Exhaustion produces a nonterminal checkpoint and requires another exact Owner authority.
