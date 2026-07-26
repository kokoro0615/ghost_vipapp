# Gate C→D→E V12 external-call authority research

Captured: 2026-07-22 07:49 JST

This note supports the bounded V12 continuation authority and standalone execution prompt. Research used public official documentation only. It did not authenticate to a provider, read a credential or private adopted artifact, call a project/account API, or mutate an external system.

## Immutable starting point

- V11 terminal: `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-terminal-hold-v11-20260722T074042+0900.json`, SHA-256 `b94941d6447bd830fb08551d99b2cefaf38ea1c5cdff57b3db006119d926c42d`.
- V11 stopped after candidate 2 adoption and before manifest freeze or reviewer dispatch.
- V11 recorded two pre-review network-capable command invocations against an external-call maximum of zero. No reviewer, authenticated provider API, deployment, or external mutation was started.
- The V11 terminal embeds three candidate-boundary digests that do not match the immutable checkpoint and adoption result it links. V12 must preserve the terminal byte-for-byte, bind an additive correction record, and treat the checkpoint plus adoption result as the canonical candidate boundary. V12 may not silently use either conflicting set.

## Official-source findings

### Vercel

- Vercel documents that running any CLI command can display an update-available message. Consequently, a version-only CLI invocation is still network-capable unless egress denial is proven. Pre-review inventory must read pinned package metadata and binary hashes without executing the CLI, or run inside a proven network-denied namespace.
- `vercel deploy --prebuilt` uploads an existing `.vercel/output`; Vercel also documents that command stdout is the deployment URL. The URL must therefore be captured only in private evidence and represented publicly by a run-keyed identity/digest.
- Vercel REST requests require access-token authentication and expose rate-limit headers. Exhaustive inventory must consume cursors, record response completeness, and stop on 429/unknown outcomes rather than blind retry.

Sources:

- <https://vercel.com/docs/cli>
- <https://vercel.com/docs/cli/deploy>
- <https://vercel.com/docs/cli/deploying-from-cli>
- <https://vercel.com/docs/rest-api>

### Stripe

- Stripe saves the first result for a mutation idempotency key and returns it on the same request; parameter drift under a reused key is rejected. All V12 Stripe POST mutations must use a pre-journaled logical-operation key and retain that key for reconciliation.
- A webhook endpoint update is a POST mutation. Retrieval is read-only and must be used for authenticated before/after readback.
- Signature verification requires the exact raw request body, `Stripe-Signature`, and endpoint-specific signing secret. V12 must not parse or transform the body before verification and must not publish raw bodies or secrets.
- Security remains test-mode, restricted-key, least-privilege, and no key/signing-secret creation or rotation.

Sources:

- <https://docs.stripe.com/api/idempotent_requests>
- <https://docs.stripe.com/api/webhook_endpoints/update>
- <https://docs.stripe.com/api/webhook_endpoints/retrieve>
- <https://docs.stripe.com/webhooks>
- <https://docs.stripe.com/keys/restricted-api-keys>

### Supabase

- Management API calls require bearer authentication over HTTPS and are rate-limited per user and scope. V12 must account for each explicit request, honor rate-limit headers, and treat an unclassified timeout or 429 outcome as consumed ceiling with no blind retry.
- Database setting changes remain exact compare-and-swap operations with same-transaction returned revision and affected-row evidence. A before/after diff alone is not a mutation receipt.

Sources:

- <https://supabase.com/docs/reference/api/introduction>
- <https://supabase.com/docs/guides/database/custom-postgres-config>

## V12 accounting decision

V12 uses a logical external-call unit that is enforceable at orchestration boundaries:

- one top-level network-capable CLI/tool command invocation = one unit, including implicit update checks;
- one explicit SDK/direct HTTP request = one unit;
- one non-loopback browser automation action that intentionally initiates remote traffic = one unit;
- every retry and every unknown-outcome attempt consumes one additional unit;
- loopback-only work and commands executed inside a verified egress-denied namespace consume zero external-call units;
- reviewer dispatch is counted separately and reviewers must make zero external calls.

Phase ceilings are cumulative and non-transferable:

- before fresh manifest freeze and throughout exactly-three review: external calls 0;
- after exact 3/3 ACCEPT through Gate C completion: external calls 4,224 maximum, of which authenticated read-only provider/runtime requests are at most 4,096;
- Gate D after authentic signed Gate C PASS: external calls 128 maximum;
- Gate E after truthful Gate D PASS: external calls 256 maximum;
- V12 lineage lifetime: external calls 4,608 maximum.

All narrower operation ceilings continue to apply. A larger phase total never authorizes an otherwise prohibited deployment, webhook update, DB mutation, credential operation, Production/Preview/LINE/live-Stripe/real-customer mutation, or scope expansion.

The two V11 calls and the two public-documentation research tool calls used to prepare V12 remain historical counters. They are recorded but are not reset, erased, or charged to V12 execution, whose counters begin only after the exact V12 authorization freeze.
