# TableCheck VIP Floor Gate C V16 pass strategy research

Date: 2026-07-22 JST  
Scope: read-only repository and official-primary-source research; no credential read, provider call, external mutation, or deployment

## Conclusion

V15 failed before Gate C because it tried to prove a real `booking_slots` row from a migration that explicitly does not insert any `booking_slots`, rejected only RFC UUID v1-v5 rather than every UUID-shaped hexadecimal string, and shipped a review assembler whose CLI key contract did not match its invocation. Repeating V15 with a larger fixture is insufficient.

V16 must make four architectural corrections:

1. Reject every case-insensitive `8-4-4-4-12` hexadecimal public identifier shape, regardless of RFC version/variant, including nil, v6, v7, v8, and non-RFC variants.
2. Obtain public slot/offering/resource identifiers from an authoritative staging catalog using a bounded read-only query, persist only sanitized public identifiers and eligibility fields in a content-addressed snapshot, and revalidate that snapshot immediately before the synthetic cycles.
3. Resolve cycle identifiers from the catalog snapshot/readback instead of trusting hand-authored private config identifiers. Configuration may constrain business date, guest count, offering allowlist, and synthetic namespace, but must not invent a slot.
4. Permit bounded rolling remediation reviews. Every rejected manifest/review remains immutable, but a rejected round does not consume the entire authority before the identified defect can be fixed.

The decisive repository finding is that V15 inspected the wrong seed boundary. `20260530092000_ghost_vip_seed_catalog.sql` seeds offerings/resources but intentionally omits `event_days` and `booking_slots`; the immediately following migrations do seed them:

- `20260530093000_ghost_vip_seed_event_days.sql` SHA-256 `1dbca6f3ef7a74abbeeb8d0b7695ad4636fadc1d6ae06bc64fc5e912e5ad150b` covers 2026-06-01 through 2026-08-31.
- `20260530095000_ghost_vip_seed_event_days_q4.sql` SHA-256 `c1ffa4472e628232650f35a68db917a8d728d3cf4439c21c640d48e1f9e634cf` covers 2026-09-01 through 2026-12-31.

Both derive `ghost-osaka-YYYYMMDD-HHMM` rows for Wednesday-Sunday operating dates. 2026-12-31 is Thursday, so the Q4 migration deterministically inserts `ghost-osaka-20261231-2200` when the ordered migration bundle is applied. V16 must prove this by executing the immutable seed SQL in disposable PostgreSQL and by a read-only staging row readback; a regex over comments or policy JSON is not sufficient.

The same one-shot workflow must then continue beyond tooling acceptance through private pre-bootstrap, all-off custom-staging deployment, authenticated readbacks, two synthetic cycles, at least 1,000 attributable shadow comparisons, performance/log budgets, signed webhook/refund rehearsal, rollback, and post-evidence human attestations. A tooling review ACCEPT is not Gate C PASS.

## Evidence findings

- V15 manifest `0dff01ca...e4e1` passed its verifier but runtime/security review was 0/2 ACCEPT.
- The 0920 catalog seed states that it does not seed `event_days` or `booking_slots`, but the 0930/0950 schedule migrations do insert them. V15 omitted those authoritative inputs and therefore reached the wrong evidence conclusion.
- V15's `UUID_SHAPED` regular expression only matches versions 1-5 and RFC variant bits.
- V15's review assembler stores argument keys with the leading `--`, while the consumer expects unprefixed keys.
- Accepted V14 tooling remains useful immutable ancestry but must not be executed with invented catalog identifiers.
- The frozen application boundary remains source `7f6b2dc1...7626`, migration bundle `c2e751f1...3272`, artifact `5796deee...d5f9`, provider comparable `038f01c5...12cf`.

## Gate C pass conditions carried forward

- Local F01-F40, mandatory cases, race matrix, rollback, Stripe/provider replay, v1 fallback, privacy, TypeScript, ESLint, and production build remain passing.
- Custom staging only; all flags begin and end disabled unless the exact runtime plan temporarily enables them.
- At least two completed synthetic business cycles, including card setup and refundable deposit behavior.
- At least 1,000 unique attributable completed comparisons and success rate at least 99.9%.
- Critical mismatch, privacy violation, snapshot race, and unexplained error counts are zero.
- p95 shadow overhead and log/cardinality remain within the ratified budget.
- Signed Stripe webhook, retry/failure behavior, refund worker, provider-effect readback, Node/DB flag alignment, and rollback are verified.
- Exact evidence manifest receives Owner, Floor Manager, and Engineer post-evidence direct-human attestations; same-person multi-role waiver remains explicit and strong-MFA-backed.
- Final normal and `--require-pass` audits both pass before publishing a single atomic `GATE_C_PASS` terminal.

## Official contract checks

- Stripe sandbox keys are isolated from live mode; restricted keys (`rk_test_`) are preferred and webhook signing secrets are separate from API keys: https://docs.stripe.com/keys
- Stripe signature verification requires the unmodified raw request body, `Stripe-Signature`, and the endpoint-specific signing secret: https://docs.stripe.com/webhooks/signature
- Vercel custom environments isolate their own variables and support `vercel deploy --target=staging`: https://vercel.com/docs/deployments/environments
- Vercel supports deploying previously built `.vercel/output` with `vercel deploy --prebuilt`; system environment limitations must be accounted for: https://vercel.com/docs/cli/deploy
- Supabase Data API access is governed by grants and RLS; elevated secret/service-role keys bypass RLS and must stay server-side: https://supabase.com/docs/guides/api/securing-your-api and https://supabase.com/docs/guides/getting-started/api-keys
- Supabase Management API provides a read-only SQL-query capability under database-read permissions; use it only if the existing reviewed read path cannot return the exact catalog projection: https://supabase.com/docs/reference/api/run-sql-query

## Safety boundary

No prompt can truthfully guarantee Gate C if the staging catalog has no eligible slot, required credentials are unavailable, an external provider is down, or the human post-evidence attestations are withheld. V16 therefore aims for deterministic completion under satisfied external prerequisites and refuses to manufacture PASS. It may create a staging-only synthetic catalog row only under a separately enumerated mutation budget and only when read-only discovery proves no eligible row exists; it must never mutate production, Preview, live Stripe, LINE, or real customer data.
