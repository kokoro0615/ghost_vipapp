# GHOST Osaka VIP Floor Phase C / Gate C / UI implementation plan

Date: 2026-07-14 JST

Status: implementation-ready plan; Phase C and UI code are not implemented by this document

Scope: `website/` VIP Floor P0, legacy compatibility, shadow comparison, Gate C, post-Gate-C operator UI

Supersedes: the Phase C, Gate C, and immediate post-Gate-C UI portions of the earlier P0 and end-to-end plans where they conflict with this document

## 1. Executive decision

Gate B is the verified starting point. All v2 application flags and the database setting
`app_settings.vip_floor_v2_dual_write` remain `false`; v1 routes and the production UI remain unchanged.

Phase C will not be implemented as a second application write from every route. The safe model is:

1. v8 mutations remain the explicit, authoritative business writers.
2. Existing v7, Stripe-webhook, expiry, and worker writers remain operational.
3. Database compatibility logic projects every successful legacy semantic write into the P0 fields,
   versions, redacted audit trail, and event-day board revision.
4. Public v2 availability and public hold acquisition switch as one atomic compatibility unit.
5. Shadow comparison observes both contracts without changing the response served to users.
6. Gate C requires deterministic database evidence plus sampled runtime evidence and a rehearsed rollback.
7. The v2 operator UI starts only after Gate C is signed. The current v1 UI stays intact as the fallback.

The central invariant is:

> One accepted command produces one business outcome, no duplicate provider side effect, exactly one
> semantic version change per changed row, and exactly one board revision increment per affected
> event day per transaction.

## 2. Verified baseline

The plan assumes the following Gate B evidence is still current when implementation begins:

| Area | Verified baseline |
|---|---|
| Clean database | PostgreSQL 16.14; 28 migrations; 47 tables; 92 functions; 14 triggers; 0 catalog issues |
| Gate A data | 23/23 |
| v1 runtime fixture | 12/12 |
| v8 helpers | 41/41 |
| v8 reads | 10/10 |
| v8 mutations | 28/28 |
| Two-session races | 2/2 |
| Application checks | API/static/crypto/Stripe replay/saga/VIP static/TypeScript/ESLint/build pass |
| Runtime posture | all v2 flags `false`; DB dual-write `false`; UI and v1 paths unchanged |

Before C0 begins, rerun and archive the Gate B suite. A changed hash, changed PostgreSQL version, new
migration, or changed legacy writer inventory invalidates the baseline and returns the work to C0.

Primary local authorities:

- `docs/AI_CURRENT_STATUS.md`
- `website/docs/evidence/vip-floor-tablecheck/gate-b-runtime-review.md`
- `website/docs/evidence/vip-floor-v2/wave-b2-gate-b-summary-20260714.json`
- `website/docs/research/tablecheck-vip-floor-p0-data-contract-2026-07-14.md`
- `website/docs/research/tablecheck-vip-floor-p0-implementation-plan-2026-07-14.md`
- `website/docs/research/tablecheck-vip-floor-end-to-end-implementation-plan-2026-07-14.md`
- `website/docs/evidence/vip-floor-tablecheck/behavior-inventory.md`
- `website/docs/evidence/vip-floor-tablecheck/component-spec.md`
- `website/docs/evidence/vip-floor-tablecheck/rollback-contract.md`

The workspace instruction names `.Codex/docs/DESIGN.md` under this project, but that file is absent at
the time of this research. This is a pre-UI documentation blocker, not a reason to guess a new visual
language. Before D0, restore that file or record an owner decision that the temporary design authority is
`website/AGENTS.md`, `website/docs/ui/UI_TOOLKIT.md`, current venue media, and current GHOST tokens.

## 3. Scope and non-goals

### In scope

- legacy v7 and worker write compatibility for P0 fields;
- exact row version and event-day board revision behavior;
- complete redacted writer audit coverage;
- public v8 availability and atomic hold path;
- optional best-effort encrypted customer profile update after a successful public begin-hold;
- v1/v2 shadow comparison, classification, evidence, and alert thresholds;
- missing v2 confirm and check-in HTTP adapters;
- staged flag rollout and rollback rehearsal;
- Gate C decision package;
- v2 admin UI from read-only shell through operational mutations after Gate C.

### Explicitly out of scope for Phase C

- changing Stripe account configuration or payment method policy;
- calling Stripe, LINE, refund, email, or any network provider from a database trigger;
- removing or rewriting v1 routes;
- turning on the v2 UI;
- automatic seat optimization;
- POS integration, waitlist optimization, or advanced reporting;
- migrating or exposing provider object identifiers in the v2 board;
- plaintext customer PII in comparison output, logs, or evidence.

## 4. Non-negotiable invariants

### 4.1 Business and database invariants

- Existing v7 function signatures and legacy response shapes remain compatible.
- Existing P0 projection needed for `NOT NULL` safety remains active even when dual-write is off.
- New version, compatibility-audit, and revision behavior is gated by the database setting.
- v8 writers set the existing transaction-local marker `ghost.vip_floor_v8_writer=on`; no competing
  marker such as `ghost.vip_floor_v8_managed` is introduced.
- A replayed idempotent command performs no semantic write, version increment, or revision increment.
- An `updated_at`-only write performs no semantic version or revision change.
- A v8 write is not reprocessed by the legacy compatibility path.
- Every active assignment interval remains within its reservation interval.
- All seat locks follow the established order: action preclaim, reservation, sorted seats, sorted
  relations, overlapping blocks, audit/action response, event-day revision last.
- An event-day revision is incremented once per successful transaction, not once per changed row.
- A failed or rolled-back transaction leaves no version, audit, or revision residue.

### 4.2 Provider and Stripe invariants

- Checkout Sessions remains the public card-setup surface and PaymentIntents remain the deposit surface.
- Stripe API stays pinned to the repository's current `2026-04-22.dahlia` version during this phase.
- `payment_method_types` remains omitted so Dashboard-compatible payment configuration continues to apply.
- Webhook signatures continue to be verified before processing.
- Provider object creation/finalization and refund-worker ownership do not move into compatibility code.
- A retry never creates a second Checkout Session, PaymentIntent, refund, or notification.
- Server secrets remain server-only; production keys should be restricted `rk_` keys with least privilege.

### 4.3 Privacy and security invariants

- Shadow evidence excludes names, email, phone, free-form notes, ciphertext, and provider IDs.
- Internal UUIDs are excluded from production logs; mismatch keys are hashed where correlation is needed.
- Customer profile encryption failure cannot roll back an already acquired inventory hold.
- New functions are security-definer only when needed, pin `search_path`, validate caller role, and receive
  explicit ACL review. Public tables remain RLS/FORCE-RLS protected.
- Every mutation API authenticates the caller and validates capability independently.

### 4.4 UI invariants

- The first viewport must immediately communicate GHOST Osaka reservation operations.
- The v1 UI remains available behind the existing route as a kill-switch fallback.
- The v2 UI uses black-violet lacquer, champagne-metal hairlines, real venue/floor geometry, LED rhythm,
  and dense operator controls—not glassmorphism, gradients, card piles, or generic SaaS styling.
- Important mobile controls are at least 44px; focus, labels, non-color state, and reduced motion are required.

## 5. Current gaps that Phase C must close

| Gap | Current state | Required closure |
|---|---|---|
| Legacy row version | v8 increments explicitly; legacy writers do not all increment deterministically | semantic legacy changes increment exactly once |
| Board revision | v8 revisions are explicit; legacy transactions can touch multiple rows | one deferred increment per transaction/event day |
| Legacy audit | assignment history exists; reservation status-only worker changes are incomplete | redacted audit coverage for every writer |
| Public availability | v8 understands blocks, eligibility, operational lock, and intervals | v8 response adapted to legacy public shape |
| Public hold | no `begin_public_reservation_hold_v8` | full atomic v8 begin-hold; not a precheck around v7 |
| Shadow mode | no independent comparison flag or canonical comparator | safe canonical projections, ledger, thresholds, evidence |
| Admin v2 HTTP | confirm/check-in RPCs exist but HTTP routes are absent | add strict authenticated v2 adapters |
| Writer inventory | effective writers include reads that expire holds | executable inventory and one test per writer |
| UI | v1 is a monolithic client board with 45s polling | server-gated v2 shell and bounded client workspace after Gate C |
| Design authority | local `.Codex/docs/DESIGN.md` absent | restore or explicitly resolve before D0 |

## 6. Phase C architecture

```text
v8 admin API ───────────────► v8 RPC ──[v8 writer marker]──► P0 tables
                                                               │
v1 admin/public/worker ─────► v7 RPC / legacy SQL ─────────────┤
                                                               ▼
                                              existing projection +
                                              gated version/audit +
                                              deferred day revision

public route decision ── false ─► v7 availability + v7 begin-hold
                      └── true  ─► v8 availability + v8 begin-hold

shadow flag ─► read both canonical projections ─► classify ─► redacted evidence
            └► never decides the served response and never writes business state
```

Two switches are intentionally independent:

- `FEATURE_VIP_FLOOR_DUAL_WRITE_ENABLED`: chooses the public compatibility path and asserts alignment
  with the DB setting.
- `FEATURE_VIP_FLOOR_V2_SHADOW_COMPARE_ENABLED`: compares contracts without exposing v2 reads.

`FEATURE_VIP_FLOOR_V2_READ_ENABLED` controls v2 admin read exposure, and
`FEATURE_VIP_FLOOR_V2_MUTATION_ENABLED` controls v2 admin mutations. Neither is used as a substitute for
the shadow flag.

## 7. Work packages and dependency order

| WP | Outcome | Depends on | UI allowed? |
|---|---|---|---|
| C0 | contract, writer inventory, fixtures, evidence schema frozen | Gate B | no |
| C1 | legacy projection/version/audit/revision migration | C0 | no |
| C2 | catch-up and reconciliation tools | C1 | no |
| C3 | public v8 availability + atomic begin-hold + profile handoff | C1 | no |
| C4 | shadow comparator and runtime sampling | C2, C3 | no |
| C5 | confirm/check-in v2 HTTP adapters | C1 | no |
| C6 | complete fixtures, races, rollback rehearsal | C2–C5 | no |
| C7 | staged observation and Gate C decision | C6 | no |
| D0 | design authority and UI contract freeze | Gate C signed | planning/scaffold only |
| D1–D5 | read-only UI, operations, mobile/a11y/performance | D0 and staged UI gates | yes |

No downstream WP may waive an upstream failure. A failure in inventory, revision exactness, public hold
atomicity, or provider idempotency is a stop-the-line condition.

## 8. C0 — freeze the executable contract

### C0.1 Writer inventory

Create `website/docs/evidence/vip-floor-v2/gate-c-writer-inventory.json` with one record per effective
writer. At minimum include:

| Writer family | Examples that must be enumerated |
|---|---|
| Admin hold | create, extend, release, expiry |
| Reservation operations | assign, confirm, cancel, check-in, no-show, late-cancel |
| Walk-in | create and arbitrary-time schedule |
| Seat interval | extension, reassignment, release |
| Public hold | begin and expiry |
| Stripe webhook | confirm locks; failure/conflict/refund-required branches |
| Public status read | effective write through expired-hold cleanup |
| Workers | Stripe/webhook and every reservation/resource SQL mutation path |
| v8 admin | all 14 mutation RPC outcomes including replay and conflict |

Each record must contain:

```json
{
  "writerId": "stable-name",
  "entrypoint": "route/function/worker",
  "dbFunctions": ["function_signature"],
  "tables": ["reservations", "reservation_resource_assignments"],
  "semanticFields": ["status", "scheduled_start_at"],
  "auditOwner": "domain|v7_compat|v8",
  "providerSideEffect": "none|stripe|line|refund",
  "fixtureId": "Fxx",
  "expectedVersionDelta": 1,
  "expectedRevisionDelta": 1
}
```

Static verification fails if a route/RPC/worker mutates a tracked table without an inventory record.

### C0.2 Semantic field matrix

Freeze explicit comparison lists in the migration tests; never use a broad `OLD IS DISTINCT FROM NEW`
test. The minimum semantic groups are:

| Table | Semantic groups |
|---|---|
| `reservations` | lifecycle/status, service status, event day, scheduled start/end, expected release, guest count, type/source, customer link, payment/refund business state, cancel reason/classification |
| `reservation_resource_assignments` | reservation/resource link, assignment role, interval, active/released state |
| `reservation_resource_blocks` | resource/event day, block interval, type/reason, active state |
| `reservation_notes` | note existence/category/visibility; body never enters shadow evidence |
| event-day/resource configuration | online eligibility, operational lock, capacity/geometry fields that affect availability |

System-maintained timestamps, the version column itself, compatibility metadata, and audit linkage are not
semantic changes. An exact no-op must produce zero deltas.

### C0.3 Decision records

Record these decisions before SQL changes:

- reuse `ghost.vip_floor_v8_writer`;
- extend the existing v7 projection functions instead of creating competing BEFORE triggers;
- defer event-day revision to transaction end and deduplicate by event-day UUID;
- keep public v7 and v8 paths shape-compatible at the route boundary;
- introduce a distinct shadow flag;
- treat arbitrary-time v2 intervals as expected divergence only when the fixture ledger proves why;
- prohibit PII/provider IDs/note bodies from comparator data and logs.

## 9. C1 — database compatibility migration

Primary migration:

`website/supabase/migrations/20260714120000_ghost_vip_floor_p0_dual_write.sql`

### C1.1 Extend, do not duplicate, projection functions

`20260714095000_ghost_vip_floor_p0_v7_write_compat.sql` already owns:

- reservation BEFORE projection;
- reservation AFTER assignment interval projection;
- assignment BEFORE projection;
- assignment history AFTER trigger.

Phase C replaces or extends those functions in place while preserving trigger names unless a migration
test proves a rename is required. This avoids ambiguous alphabetical ordering of same-kind triggers.
PostgreSQL executes same-kind triggers in alphabetical order, and the row returned by one BEFORE trigger
becomes the input to the next. A separate generic version trigger would therefore be order-sensitive.

### C1.2 Gating helper

Add one internal helper that reads `app_settings.vip_floor_v2_dual_write` defensively and returns `false`
for absent, malformed, or non-boolean values. It must not trust a client session GUC as the feature flag.

The new compatibility work runs only when:

```text
DB setting is true
AND current_setting('ghost.vip_floor_v8_writer', true) IS DISTINCT FROM 'on'
```

Required P0 NOT-NULL projection remains ungated so v1 rollback stays valid.

### C1.3 Legacy row version algorithm

Fold version logic into the existing reservation and assignment BEFORE projection functions:

1. Apply existing P0 field projection.
2. Compare the frozen semantic fields against `OLD`.
3. If dual-write is off, keep compatibility projection but do not add Phase C deltas.
4. If the v8 marker is on, leave explicit v8 version management untouched.
5. For a legacy semantic change, set `NEW.version = OLD.version + 1` exactly once.
6. For an insert, normalize the initial version to `1`.
7. For no-op or timestamp-only changes, preserve the old version.
8. Reject an external attempt to decrement or arbitrarily overwrite the version.

Assignment propagation caused by a legacy reservation schedule change increments each semantically changed
assignment once. It must not cause a second reservation increment.

### C1.4 Redacted compatibility audit

The compatibility path appends an immutable `audit_logs` record for each legacy semantic change not already
owned by v8. The record contains only:

- safe actor/source classification;
- table/entity kind and an internal reference allowed only inside the protected DB;
- safe changed-field names;
- old and new version numbers;
- event day;
- `source_contract = 'v7_compat'`;
- command/request correlation when already safe and available.

It must not contain raw names, email, phone, customer labels, free-form notes, ciphertext, Stripe object IDs,
LINE IDs, request bodies, or before/after row dumps.

If a legacy domain function already creates a domain audit, the inventory marks both records and tests that
the compatibility audit is a projection record, not a second business event. Later consolidation is allowed
only after F40 proves every writer still has coverage.

### C1.5 Deferred event-day revision

Use an `AFTER ROW` constraint trigger declared `DEFERRABLE INITIALLY DEFERRED` on every table whose semantic
change affects the board. The trigger function:

1. skips when dual-write is off or the v8 writer marker is on;
2. derives all affected old/new event-day IDs;
3. adds those IDs to transaction-local state via `set_config(..., true)`;
4. on deferred execution, increments each unique event-day revision only once;
5. runs after compatibility audit creation and preserves `last_audit_log_id` when no safe link exists.

The transaction-local set must be bounded and accept UUIDs only. Tests must cover multi-row propagation,
same-day repeated mutations, old-day/new-day schedule movement, and rollback.

Because `SET CONSTRAINTS ... IMMEDIATE` can force deferred constraint triggers early, application code must
not issue it. Static scans and a database fixture must prove the application path keeps default deferred
behavior. If runtime testing shows the trigger cannot guarantee one final increment, stop and replace the
mechanism with a transaction-keyed queue whose cleanup and transaction-ID wrap behavior are explicitly
designed; do not accept per-row increments.

### C1.6 Trigger ownership and privileges

- Pin `search_path` for every security-definer function.
- Revoke public/anon/authenticated execution unless explicitly required.
- Keep compatibility triggers free of network calls and extension-dependent HTTP.
- Preserve RLS/FORCE-RLS and append-only constraints.
- Add catalog assertions for function owner, volatility, security mode, ACL, trigger timing, deferrability,
  and enabled state.

### C1.7 C1 acceptance

- v7 fixture remains 12/12 with dual-write off;
- dual-write on produces exact version/revision/audit deltas;
- all v8 mutation fixtures remain 28/28 with no duplicate compatibility deltas;
- no-op, updated-at-only, idempotent replay, exception, and rollback produce zero deltas;
- multi-row one-day command produces one revision increment;
- one transaction affecting two event days produces one increment for each day;
- provider side-effect count remains unchanged.

## 10. C2 — catch-up and reconciliation

Phase C cannot assume historical rows are clean merely because new triggers are correct.

Create a rerunnable reconciliation tool that:

- reapplies deterministic P0 projection using the same rules as the Gate A backfill;
- repairs active assignment intervals from reservation schedules where safe;
- reports, but never guesses, ambiguous interval or lifecycle cases;
- seeds or repairs event-day revision rows without pretending historical increments occurred;
- never rewrites provider IDs, payment intent ownership, or refund truth;
- emits aggregate-only evidence.

Required pre/post counts:

| Check | Gate C target |
|---|---|
| active reservation required-field NULLs | 0 |
| active assignment required-field NULLs | 0 |
| assignment outside reservation interval | 0 |
| active resource overlap violating policy | 0 |
| orphan reservation/resource/customer links | 0 |
| unresolved lifecycle/service projection | 0 |
| missing active event-day revision row | 0 |
| `legacyFallbackCount` in v8 reads | 0 |
| ciphertext/search-hash consistency failures | 0 |

Ambiguous records are a No-Go list with stable internal references stored in protected evidence; they are
not silently normalized.

## 11. C3 — public v8 compatibility path

Suggested second migration:

`website/supabase/migrations/20260714121000_ghost_vip_floor_p0_public_dual_write_v8.sql`

### C3.1 One route-level decision

Implement one server-only helper that resolves:

- Node `FEATURE_VIP_FLOOR_DUAL_WRITE_ENABLED`;
- DB `vip_floor_v2_dual_write` setting;
- runtime environment and safe fallback posture.

The same decision must route all of these together:

- public offering/slot availability;
- public seat availability;
- public begin-hold.

Never serve v8 availability and acquire inventory through v7 allocation. v7 allocation does not fully
honor v2 interval blocks, `online_eligible`, or `operational_locked`, so a precheck wrapper remains racy.

### C3.2 Full atomic begin-hold v8

Implement `begin_public_reservation_hold_v8` or an equivalently atomic RPC. It must preserve the current
public request and response contract while applying v8 eligibility and interval rules under locks.

Required behavior:

- preserve rate-limit and Turnstile boundaries in the route;
- preserve idempotency keys and current reservation/payment/Stripe-binding saga;
- resolve event day and requested interval once;
- lock candidate seats in stable order;
- exclude blocks, offline/operationally locked seats, and conflicting assignment intervals;
- write the reservation and assignment using P0 fields and versions;
- return the current `customerId` and public response fields needed by the route;
- make replay return the original result without a second hold;
- emit no provider call from SQL;
- fail atomically on capacity, interval, or eligibility conflict.

Only the begin-hold database selection changes. Existing Stripe object creation and finalize functions stay
in their current saga positions and require their existing replay tests.

### C3.3 Availability response adapters

The v8 availability row may contain candidate-only fields such as `business_date`. Route adapters must
strip additions and preserve the legacy public JSON shape, sorting, timestamp format, error status, cache
policy, and empty-state behavior.

The same fixture must compare:

- ordinary availability where v1 and v2 must be equal;
- v2 block exclusion;
- `online_eligible=false` exclusion;
- operational lock exclusion;
- arbitrary interval overlap;
- daylight/business-day boundary;
- concurrent final-seat acquisition.

### C3.4 Best-effort encrypted customer profile

After a successful begin-hold and outside the inventory transaction, the route may invoke a service-role-only
system RPC to upsert encrypted customer profile fields using the current AES-256-GCM envelope and HMAC exact
search. Failure is reported only as redacted operational telemetry; it does not release or roll back the hold.

This behavior is separately gated by `FEATURE_VIP_CUSTOMER_PROFILE_WRITE_ENABLED`. No application client
receives direct write access to the profile table.

### C3.5 Safe flag alignment

Roll forward:

1. deploy code and migrations with all flags off;
2. set DB dual-write `true`;
3. verify runtime alignment endpoint and compatibility fixtures;
4. set Node dual-write `true`;
5. verify public availability and hold shadow probes.

`Node=true, DB=false` is fail-closed and a No-Go. `Node=false, DB=true` is the planned transition state:
public routes remain v7 while legacy compatibility projection is active.

Rollback reverses application exposure first: Node dual-write `false`, verify v7 public path, then DB setting
`false`. Required P0 projection remains active.

## 12. C4 — shadow comparison

### C4.1 Operating rule

Shadow comparison is observation, not routing. Before cutover it serves v1 and compares v2; after read
cutover it may serve v2 and compare v1 for rollback confidence. A comparison exception never changes the
served response and never executes a mutation.

Introduce:

`FEATURE_VIP_FLOOR_V2_SHADOW_COMPARE_ENABLED=false`

Optional sampling configuration must be bounded and default to zero in production until C4 fixtures pass.

### C4.2 Deterministic comparator vs runtime sampler

Use two modes:

1. **Gate comparator:** runs against synthetic fixtures in a quiescent database or one shared transaction
   snapshot and is the authoritative Gate C result.
2. **Runtime sampler:** invokes current route/read adapters and reports operational drift. The v1 admin route
   performs multiple queries, so benign cross-query races are classified separately and cannot replace the
   deterministic gate.

### C4.3 Admin canonical projection

Compare safe business keys and normalized values only:

| Domain | Canonical fields |
|---|---|
| Event day | business date, open/closed identity, totals |
| Reservation | public code, normalized lifecycle, normalized service status, guest count, start/end |
| Assignment | public table code, active interval, assignment role where representable |
| Payment summary | status/type/amount, payment-method-saved boolean, webhook/provider-object status category |
| Board totals | reservations by status, assigned/unassigned, seats in use, conflict counts |

Normalization rules include:

- v1 `checked_in` lifecycle maps to v2 lifecycle `confirmed` plus service state `seated`;
- equivalent expiry variants map to canonical `expired`;
- timestamps normalize to UTC ISO strings;
- unordered arrays sort by public code and interval;
- missing vs empty optional safe values normalize only where the contract declares equivalence.

Exclude customer display labels, guest labels, notes, operator notes, internal UUIDs, ciphertext, and Stripe/
LINE/provider object IDs.

### C4.4 Public canonical projection

- Availability key: slot plus offering/public resource class.
- Seat key: slot plus public resource code.
- Strip candidate-only `business_date` before legacy shape comparison.
- Normalize timestamps and stable ordering.
- Compare capacity/available boolean/count and safe public price fields only.

### C4.5 Expected-divergence ledger

Every non-equal result is one of:

| Class | Meaning | Gate impact |
|---|---|---|
| `equal` | canonical contracts match | pass |
| `expected_v2_rule` | active block, offline eligibility, operational lock, interval-vs-slot rule, or documented status decomposition | pass only with exact ledger evidence |
| `snapshot_race` | runtime v1 multi-query observation changed during read | runtime warning; never accepted in deterministic fixture |
| `critical_missing` | entity exists on only one side without approved reason | fail |
| `critical_value` | normalized lifecycle/time/assignment/payment summary differs | fail |
| `critical_error` | one read fails, times out, or returns invalid shape | fail |
| `privacy_violation` | forbidden field appears in comparator/evidence | immediate fail |

The expected-divergence ledger records fixture/rule IDs, not free-form production data. Unknown divergence is
always critical.

### C4.6 Evidence schema

Each run emits aggregate JSON similar to:

```json
{
  "schemaVersion": 1,
  "runId": "uuid",
  "mode": "deterministic|runtime-sample",
  "servedContract": "v1|v2|none",
  "businessDateHash": "sha256-prefix",
  "counts": {
    "equal": 0,
    "expectedV2Rule": 0,
    "snapshotRace": 0,
    "criticalMissing": 0,
    "criticalValue": 0,
    "criticalError": 0,
    "privacyViolation": 0
  },
  "ruleCounts": {"V2_BLOCK": 0},
  "durationMs": 0,
  "buildSha": "sha",
  "migrationHead": "timestamp-name"
}
```

Production mismatch identifiers are one-way hashes with an environment-specific comparison key. Do not
write raw canonical arrays to logs.

### C4.7 Thresholds

Gate C deterministic thresholds:

- privacy violations: 0;
- critical missing/value/error: 0;
- snapshot races: 0;
- expected divergence: exact fixture-ledger count only;
- comparator coverage: every canonical field and rule branch exercised.

Runtime observation thresholds before Gate C:

- at least one complete synthetic business cycle;
- staging sample success at least 99.9%;
- critical mismatch rate 0;
- p95 shadow overhead within the agreed server budget and never added to the user response critical path;
- no log volume or cardinality breach.

For production rollout after Gate C, use a low sample rate and a concurrency limiter. Shadow work should be
detached only through a platform-supported completion mechanism; do not fire an untracked promise that may
be terminated after response.

## 13. C5 — missing admin v2 HTTP adapters

Add:

- `website/src/app/api/admin/v2/reservations/[reservationId]/confirm/route.ts`
- `website/src/app/api/admin/v2/reservations/[reservationId]/check-in/route.ts`

Each route must:

- require the master admin and v2 mutation flags;
- authenticate the session and check its explicit capability;
- parse a strict body schema and reject unknown/oversized fields;
- accept or create an idempotency key according to the frozen API contract;
- call only the matching v8 RPC;
- map domain conflicts to stable HTTP errors;
- redact error logs;
- return the same v2 command envelope used by the existing routes;
- prove replay, stale version, unauthorized, flag-off, and conflict behavior.

Do not silently fall back from a v2 mutation route to v1.

## 14. C6 — verification suite

### C6.1 Planned artifacts

Add or update:

- `website/scripts/verify-vip-floor-v2-dual-write-static.mjs`
- `website/scripts/verify-vip-floor-v2-dual-write.sql`
- `website/scripts/verify-vip-floor-v2-public-dual-write.sql`
- `website/scripts/verify-vip-floor-v1-v2-compare.mjs`
- `website/scripts/verify-vip-floor-v2-dual-write-races.sh`
- `website/scripts/audit-vip-floor-v2-gate-c.mjs`
- `website/docs/evidence/vip-floor-v2/gate-c-writer-inventory.json`
- `website/docs/evidence/vip-floor-v2/gate-c-shadow-ledger.json`
- `website/docs/evidence/vip-floor-v2/gate-c-summary-<timestamp>.json`

Package scripts:

```json
{
  "test:vip-floor-v2-dual-write": "...",
  "test:vip-floor-v2-public-dual-write": "...",
  "test:vip-floor-v1-v2-compare": "...",
  "audit:vip-floor-v2-gate-c": "..."
}
```

The CI aggregator includes static checks, while database/runtime suites run in a clean disposable PostgreSQL
16 job with all migrations applied from zero.

### C6.2 Mandatory cases

The existing F01–F40 matrix remains authoritative; Gate C must not regress to older F01–F27 wording.
In addition, Phase C evidence explicitly demonstrates:

1. each inventory writer succeeds once;
2. each writer replay/no-op has zero deltas;
3. v7 semantic reservation write gives reservation version `+1` and day revision `+1`;
4. v7 assignment propagation increments each changed assignment once and the day once;
5. v8 command does not receive compatibility double increments;
6. one transaction with many same-day rows gives revision `+1`;
7. two affected days each receive `+1`;
8. transaction rollback gives all deltas `0`;
9. concurrent v7/v8 commands cannot double-book or deadlock;
10. public final-seat races have one winner;
11. block, eligibility, operational lock, and arbitrary interval affect both v8 availability and hold;
12. public shape adapter leaks no candidate field;
13. signed Stripe webhook success/failure/replay keeps existing saga behavior;
14. refund-required branch creates one case/job and one provider refund through the existing worker only;
15. customer crypto/profile failure leaves the hold valid;
16. public status-triggered expiry receives audit/version/revision coverage;
17. all audit records are redacted;
18. shadow fixtures classify exact expected divergences and reject an injected unknown mismatch;
19. injected forbidden PII makes the comparison audit fail;
20. flag misalignment fails closed.

### C6.3 Deadlock and race matrix

Run two-session tests for:

- v7 assign vs v8 assign on the same seat;
- public begin-hold vs admin block;
- expiry vs confirm webhook;
- cancel vs check-in;
- schedule change vs seat extension;
- two event days touched in opposite command order;
- same idempotency key in concurrent sessions.

Capture SQLSTATE, lock timeout, final row versions, final revisions, active overlaps, audit count, and provider
job count. Any unclassified deadlock is a Gate C failure.

### C6.4 Rollback rehearsal

On a disposable environment with dual-write active:

1. execute representative v7, v8, public, webhook, expiry, and refund paths;
2. turn Node dual-write off;
3. prove v7 public availability and begin-hold still work;
4. turn DB dual-write off;
5. prove required projection still protects P0 NOT-NULL fields;
6. prove versions/revisions stop receiving Phase C legacy deltas as designed;
7. turn DB on, reconcile, verify alignment, then turn Node on;
8. prove no duplicate provider effect across both transitions.

Record exact commands, UTC/JST timestamps, operator, build SHA, migration head, before/after flags, and results.

## 15. C7 — rollout and Gate C

### C7.1 Environment ladder

| Environment | Required sequence | Minimum observation |
|---|---|---|
| Disposable PG16 | clean apply, all fixtures, races, rollback | full deterministic suite |
| Local app | route/API/static/TS/lint/build; no external provider calls | all local checks |
| Staging | DB on → shadow on → Node dual-write on; signed webhook test | one synthetic business cycle |
| Production dark | code/migrations deployed, all flags off | runtime/readiness checks |
| Production compatibility | DB on, Node off, shadow sampled | agreed observation window |
| Production public v8 | DB on, Node on, shadow sampled | owner-approved canary window |
| UI | only after Gate C signature | D0 onward |

No production flag is changed by a migration. Flag changes are separate, reversible operator actions.

### C7.2 Gate C checklist

Gate C is PASS only when every item is checked and linked to evidence:

- Gate B baseline rerun passes with current hashes.
- Clean PostgreSQL 16 applies every migration from zero.
- F01–F40 all pass.
- All C6 mandatory cases and race cases pass.
- Every effective writer has an inventory record, fixture, and audit owner.
- Active required-field NULLs, invalid intervals, overlaps, missing revisions, and legacy fallback are zero.
- Version and revision exact-delta assertions pass for v7 and v8.
- Deterministic shadow critical/privacy/snapshot-race counts are zero.
- Expected divergence equals the approved rule ledger exactly.
- Runtime sampled critical mismatch is zero for the observation window.
- Public v8 availability and begin-hold are switched together and preserve legacy response shapes.
- Signed webhook, retry, failure, conflict, and refund-worker paths pass with no duplicate provider effects.
- Node and DB dual-write state is aligned; misalignment is observable and fail-closed.
- Customer encryption/search/rotation tests pass; logs and evidence contain no PII/secret/provider IDs.
- TypeScript, ESLint, build, schema/static/API/crypto/Stripe/VIP suites pass.
- Roll forward and rollback have both been rehearsed.
- v1 behavior and visual fallback are unchanged.
- Owner, Floor Manager, and Engineer sign the decision with timestamp and evidence SHA. Under the versioned
  `single_operator_multi_role_v1` amendment, one real person may provide all three role-specific records using the
  same name, distinct timestamps, role attestation codes, and the same final manifest SHA; this does not represent
  three independent reviewers.

Gate C is not satisfied by “migration deployed,” a zero-row production sample, UI screenshots, or a manual
happy path alone.

### C7.3 Gate C evidence manifest

The summary JSON must point to immutable or hashed evidence for:

- migration list and SHA-256;
- database version/catalog counts;
- all fixture result files;
- race result files;
- writer inventory and coverage result;
- reconciliation aggregates;
- shadow ledger and run aggregates;
- flag readback before/after rollout and rollback;
- webhook and provider replay evidence;
- privacy/secret scan;
- v1 fallback screenshots or visual-diff result;
- signer names/roles/timestamps and explicit PASS/FAIL.

## 16. Stop conditions and rollback triggers

Immediately stop rollout and serve v1 when any of these occurs:

- duplicate active seat assignment or availability/hold disagreement;
- critical shadow mismatch without a pre-approved rule;
- version or revision delta other than the declared exact value;
- deadlock, lock timeout increase, or public hold latency outside the approved budget;
- Stripe/LINE/refund duplicate side effect or idempotency regression;
- PII, ciphertext, secret, note body, or provider ID in evidence/logs;
- Node/DB flag misalignment;
- v1 response-shape regression;
- unexpected legacy fallback after reconciliation;
- inability to authenticate runtime state or collect rollback evidence.

Rollback order:

1. disable v2 UI/read exposure if enabled after Gate C;
2. disable v2 mutation exposure;
3. disable Node public dual-write routing;
4. confirm v1 availability/hold and admin operation;
5. disable DB Phase C dual-write behavior;
6. retain migrations, rows, and audit evidence; do not down-migrate under incident pressure;
7. reconcile and diagnose offline before re-enabling.

## 17. Post-Gate-C UI implementation

The UI is Phase D and begins only after a signed Gate C evidence package exists.

### 17.1 D0 — authority and contract freeze

Before editing UI:

- restore `.Codex/docs/DESIGN.md` or log the owner-approved substitute authority;
- reread `website/AGENTS.md`, `website/docs/ui/UI_TOOLKIT.md`, component spec, behavior inventory, and current
  `VipFloorDashboard.tsx`;
- capture current v1 desktop/mobile fallback screenshots;
- freeze v2 board and mutation TypeScript contracts;
- freeze capability-to-control mapping and status vocabulary;
- freeze URL state and mobile primary-action behavior;
- create a scoped visual token sheet from existing GHOST primitives.

No generic palette returned by a design library overrides GHOST venue tokens.

### 17.2 Route and feature-gate architecture

Keep `website/src/app/admin/vip-floor/page.tsx` as a Server Component. It should:

- authenticate and authorize on the server;
- resolve the v2 read/UI flag on the server;
- render the current v1 dashboard unchanged when v2 UI is off;
- fetch a sanitized initial v2 board when v2 UI is on;
- pass the smallest serializable payload into a bounded client workspace.

Pages/layouts remain Server Components by default. Place `"use client"` at the narrowest interactive
boundary so server-only modules and secrets cannot enter the client bundle.

Do not send customer ciphertext, provider IDs, internal audit payloads, or unnecessary board fields through
React Server Component props.

### 17.3 URL state contract

Use shareable, privacy-safe URL state:

```text
/admin/vip-floor
  ?date=YYYY-MM-DD
  &view=floor|chart|list
  &reservation=<publicCode>
  &table=<publicResourceCode>
  &panel=reservation|table|block|walk-in
```

Rules:

- no PII, internal UUID, ciphertext, note body, or provider ID in the URL;
- invalid dates/views/codes fall back safely;
- browser back/forward restores selection and panel;
- changing view preserves date and valid selection;
- mobile drawer state is representable without causing desktop modal traps.

Next 16 page `searchParams` is asynchronous; await it in the Server Component.

### 17.4 Proposed component ownership

```text
src/components/admin/vip-floor-v2/
├── VipFloorV2Workspace.tsx          # narrow client state boundary
├── vipFloorReducer.ts               # deterministic UI state only
├── vipFloorCommands.ts              # API dispatcher/idempotency ownership
├── VipFloorCommandBar.tsx
├── VipFloorStatusRail.tsx
├── VipFloorViewSwitch.tsx
├── floor/
│   ├── VipFloorCanvas.tsx
│   ├── VipFloorTableNode.tsx
│   └── VipFloorMapLegend.tsx
├── chart/
│   ├── VipFloorTimeline.tsx
│   └── VipFloorTimelineRow.tsx
├── list/
│   ├── VipFloorReservationList.tsx
│   └── VipFloorReservationRow.tsx
├── detail/
│   ├── VipReservationPane.tsx
│   ├── VipCustomerPane.tsx
│   └── VipAuditTimeline.tsx
├── dialogs/
│   ├── VipAssignDialog.tsx
│   ├── VipCancelDialog.tsx
│   ├── VipBlockDialog.tsx
│   └── VipWalkInDialog.tsx
└── mobile/
    ├── VipFloorMobileToolbar.tsx
    └── VipFloorMobileDrawer.tsx
```

Use CSS Modules or a tightly scoped v2 layer. Do not globally rewrite the existing `.vfb-*` white console
styles because they are the fallback. New v2 tokens should derive from the existing GHOST black-violet and
champagne variables.

### 17.5 Client state and data policy

- Use the initial server board as the first render.
- Keep UI state in a reducer: date, view, selection, panel, filters, pending command, and last reconciliation.
- Do not add a new global state/data dependency unless D1 proves the built-in model insufficient.
- Poll only as a bounded fallback; prefer revision-aware revalidation when available.
- Abort obsolete requests on date/view change.
- Fetch independent server data in parallel.
- Preserve one idempotency key across a user-visible retry of the same command.
- Dangerous mutations are never optimistic commits. Show pending state, execute, then reconcile from the
  server board and revision.
- On version conflict, keep user input, show the changed server state, and require an explicit retry.

### 17.6 D1 — read-only operational shell

Deliver:

- date/business-day selector;
- floor/chart/list switch;
- search and compact filters;
- status rail with counts and non-color labels;
- revision/refresh state;
- floor geometry using the real VIP map;
- reservation selection and read-only detail pane;
- v1 fallback flag and error boundary.

Acceptance:

- first viewport clearly says GHOST Osaka VIP operations and exposes date, status, and primary view;
- real table geometry is visible without a decorative hero;
- no mutation control is enabled;
- URL restoration, loading, empty, unauthorized, stale, and error states work;
- desktop and 390px mobile have no horizontal scroll.

### 17.7 D2 — floor, chart, and list parity

Floor:

- real seat/table positions;
- assignment, block, occupancy, payment/service state, and conflict cues;
- keyboard-selectable nodes and useful accessible labels.

Chart:

- time axis and current-time marker;
- assignment intervals and blocks;
- collision/turnover visibility;
- horizontal scrolling contained inside the timeline only.

List:

- dense sortable rows, not cards;
- lifecycle, service, payment, guest count, time, table, and exception columns;
- sticky header and filter summary;
- content visibility or virtualization when result count exceeds the measured threshold.

Load chart and large-list client code dynamically from a client wrapper. Next cannot automatically split a
Client Component dynamically imported directly by a Server Component in this pattern.

### 17.8 D3 — core operations

Enable operations in risk order:

1. confirm;
2. assign/reassign;
3. check-in/service status;
4. schedule and seat extension;
5. walk-in;
6. block create/update/delete;
7. notes;
8. cancel/refund decision handoff;
9. encrypted customer profile update for authorized roles.

Each command surface includes capability gating, version, idempotency key, pending state, conflict recovery,
success reconciliation, keyboard path, and redacted error handling.

Cancellation is a structured dialog with impact summary, classification/reason, payment/refund posture, and
explicit confirmation. It never presents a generic destructive button without consequence context.

### 17.9 D4 — mobile operator workflow

Mobile is a dedicated operational composition, not the desktop grid squeezed down:

- sticky date/view/status strip;
- one persistent primary action relevant to current selection;
- bottom drawer for reservation/table detail;
- list-first fallback when floor geometry is too dense;
- 44px minimum important targets;
- long Japanese/English labels wrap or truncate with accessible full text;
- no body-level horizontal scroll;
- input zoom, virtual keyboard, and safe-area behavior verified on iOS-sized viewports.

### 17.10 D5 — visual, accessibility, and performance quality

Visual direction:

- black-violet lacquer surfaces with champagne hairlines;
- sparse LED rhythm for real operational state, not decorative glow;
- venue media/floor-plan geometry as primary visual material;
- receipt/ticket/bottle-service details where they improve scanability;
- compact radii, controlled depth, and no nested floating cards.

Accessibility:

- logical heading/landmark structure;
- visible `:focus-visible` treatment;
- accessible names for icon controls and table nodes;
- status communicated by label/icon/pattern as well as color;
- dialog focus trap and return target;
- live regions only for concise command outcomes;
- reduced-motion path for transitions and current-time effects;
- contrast evidence for text, status, focus, and disabled states.

Performance targets on the agreed test device/network:

- LCP ≤ 2.5s;
- INP ≤ 200ms;
- CLS ≤ 0.1;
- bounded initial client bundle;
- no request waterfall for independent reads;
- long lists use `content-visibility` and, after measurement, virtualization above approximately 50 rows;
- filters/search use transitions or deferred values where they would otherwise block input;
- chart/list code is loaded only when needed.

### 17.11 UI gate sequence

| Gate | Decision |
|---|---|
| D0 | design authority, contract, route fallback, tokens, URL state signed |
| D1 | read-only shell and all three views accepted; v1 fallback proven |
| D2 | core command subset accepted with idempotency/conflict evidence |
| D3 | full P0 operations, mobile, a11y, performance, and visual regression accepted |
| D4 | staging floor-manager rehearsal and rollback accepted |

No UI gate reopens Gate C assumptions. A backend mismatch returns the UI rollout to v1 and the incident to
Phase C diagnosis.

## 18. UI validation matrix

Required automated and manual coverage:

| Layer | Coverage |
|---|---|
| Type/contract | board decoder, command bodies, error envelopes, URL parser |
| Reducer | selection, date/view changes, retry key retention, conflict state |
| Component | status rail, floor node, list row, dialogs, mobile drawer |
| Route/API | auth, capability, flags, invalid body, replay, stale version, conflict |
| E2E desktop | floor→detail→assign→confirm→check-in→cancel, fallback switch |
| E2E mobile | list-first, drawer, walk-in, labels, keyboard, no horizontal scroll |
| Visual | 1440×900, 1024×768, 768×1024, 390×844; light is not a supported substitute theme |
| Accessibility | keyboard-only, screen-reader names, focus return, contrast, reduced motion |
| Performance | bundle, LCP/INP/CLS, large board, slow network, polling/revalidation load |
| Resilience | stale revision, 409 conflict, 401/403, 429, 5xx, offline/retry, flag rollback |

Use real or contract-accurate fixtures, including long Japanese/English names, but never production PII in
screenshots or test snapshots.

## 19. File-by-file implementation order

1. Evidence inventory and contract fixtures.
2. `20260714120000_ghost_vip_floor_p0_dual_write.sql`.
3. Dual-write database/static verifier.
4. Reconciliation tool and aggregate evidence.
5. `20260714121000_ghost_vip_floor_p0_public_dual_write_v8.sql`.
6. Shared public route decision helper and legacy-shape adapters.
7. Best-effort encrypted profile system RPC/route handoff.
8. Independent shadow flag and canonical comparator modules.
9. Admin v2 confirm/check-in HTTP adapters.
10. Race, saga, comparison, rollback, and Gate C audit scripts.
11. Staging observation and signed Gate C package.
12. D0 design authority and v2 UI contracts.
13. Server-gated route plus read-only v2 workspace.
14. Floor/chart/list parity.
15. Core operations, then cancel/profile.
16. Mobile, accessibility, performance, visual regression, floor-manager rehearsal.

Shared files such as `package.json`, CI, runtime flag reporting, evidence summary, and the route switch should
have one owner per implementation wave. Parallel work may use disjoint files, but migration numbering,
shared contracts, and final integration remain serialized.

## 20. Definition of done

Phase C is done when Gate C is signed, rollback is rehearsed, runtime flags are in the approved posture, and
the evidence manifest is reproducible from a clean environment.

The post-Gate-C UI is done when:

- floor/chart/list and all P0 commands use v2 contracts;
- v1 remains an immediate flag-controlled fallback;
- no PII/provider identifiers leak into client payloads, URLs, logs, or screenshots;
- desktop and mobile operational flows pass;
- accessibility and performance targets pass;
- the GHOST Osaka visual gate passes without generic glass/card aesthetics;
- floor staff complete a staging rehearsal and sign the handoff;
- no unresolved Gate C critical mismatch exists.

## 21. Immediate next action

Begin C0 only:

1. rerun the Gate B baseline from a clean PostgreSQL 16 database;
2. generate the executable writer inventory;
3. freeze semantic field matrices, shadow canonical schema, and expected-divergence ledger;
4. review the proposed deferred revision mechanism with a focused two-session SQL prototype;
5. only then implement `20260714120000_ghost_vip_floor_p0_dual_write.sql`.

Do not enable a flag, alter the v1 UI, or start the v2 UI during C0/C1.

## 22. Research references

Repository sources are listed in Sections 2 and 5. Database design decisions additionally rely on the
official PostgreSQL 16 documentation:

- [CREATE TRIGGER](https://www.postgresql.org/docs/16/sql-createtrigger.html): same-kind trigger ordering,
  row-level constraint-trigger requirements, and deferrable execution.
- [Trigger behavior overview](https://www.postgresql.org/docs/16/trigger-definition.html): BEFORE row chaining
  and deferred AFTER-trigger behavior.
- [SET](https://www.postgresql.org/docs/16/sql-set.html): transaction-local setting lifetime.
- [System administration functions](https://www.postgresql.org/docs/16/functions-admin.html):
  `set_config(..., true)` and `current_setting(..., true)` semantics.

Stripe decisions follow the existing repository integration and the project security rules: current pinned
API version, Checkout Sessions/PaymentIntents ownership, signature verification, restricted server keys,
and provider-side effects outside database triggers.
