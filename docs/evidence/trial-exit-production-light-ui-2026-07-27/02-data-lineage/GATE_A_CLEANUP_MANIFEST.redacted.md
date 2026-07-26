# Gate A exact-run cleanup manifest

Status: `GATE_A_PASS`
Observed: 2026-07-27 04:32:48 JST
Cleanup target: Supabase staging `rsvrtaavofflkvtfzsfh` only
Exact Trial run: `trial-20260726-adaa919e0001`

This central release record mirrors the Data/API source evidence in the
Website release branch. It contains counts only and no PII or credentials.

## Frozen inventory

- Staging seat rows: 16 active = official `VIP-1`–`VIP-8` plus Trial
  `T1`–`T8`.
- Production `cpfsrwctjymhmwvsbwdi`: 10 physical seat rows = 8 active
  official seats plus 2 inactive historical verification seats.
- Production inactive history references: 2 `reservation_resources` rows and
  2 `offering_resource_requirements` rows. Raw delete is forbidden.
- Production Trial/T resource rows: 0.
- Baseline SHA-256:
  `08abb1dee60ee7d74f281f058b70fd253e374cfc40066a7eeaf359f840306e40`.
- Provider deliveries with Trial lineage and `sent` state: 0.
- Non-expired active Trial sessions at freeze: 0.

## Exact planned delete counts at freeze

The live Trial can still change, so all counts must be rerun and re-frozen
immediately before a fresh Owner approval.

| Lineage table | Planned rows |
|---|---:|
| `admin_users` | 1 |
| `admin_pin_credentials` | 1 |
| `admin_pin_ip_rate_limits` | 2 |
| `admin_sessions` | 4 |
| `admin_action_requests` | 0 |
| `event_days` | 1 |
| `vip_floor_day_revisions` | 1 |
| `floor_sections` | 1 |
| `seat_resources` | 8 |
| `booking_offerings` | 1 |
| `booking_slots` | 1 |
| `reservations` | 12 |
| `reservation_resources` | 12 |
| `reservation_notes` | 4 |
| `reservation_service_events` | 12 |
| `reservation_assignment_events` | 24 |
| `customers` | 4 |
| `customer_profiles` | 4 |
| `customer_tags` | 4 |
| `audit_logs` | 15 |
| `reservation_customer_link_events` | 4 |
| `reservation_blocks` | 2 |
| `reservation_block_targets` | 2 |
| `vip_waitlist_entries` | 2 |
| `vip_staff_members` | 3 |
| `vip_table_staff_assignments` | 3 |
| `notification_jobs` | 1 |
| `vip_manager_metrics` | 5160 |
| **28-table total** | **5289** |

Control rows outside the 28 lineage tables:
`vip_manager_trial_run_events=0`, `vip_manager_trial_baselines=1`,
`vip_manager_trial_runs=1`. Expected total including control rows is 5291 at
the observation time.

## Execution and recovery contract

The approved harness may delete only this exact run in dependency order: run
events; notification outbox; restricted append-only/event rows through
`cleanup_vip_manager_trial_restricted_rows_v17`; remaining 28-table dependency
order; then baseline and run control rows.

Completion requires all 28 run-scoped counts zero, control rows zero, orphan
zero, baseline hash restored, provider delivery zero, staging active official
seats exact 8, and T/TRIAL resources zero.

Cleanup is not one cross-request transaction and has no down migration.
Partial cleanup recovery is to rerun the idempotent exact-run harness while
the baseline row remains. Reseed requires a clean verification, the same
v16/v17 staging schema, a fresh lifecycle credential and a separate fresh
Owner approval. It is not automatic authorization to recreate the Trial.

Gate A remains HOLD only for its separate fresh Owner approval. The exact
session-retirement credential path was proven without persisting or emitting
the key. No cleanup was executed.

## Latest pre-promotion re-freeze

At 2026-07-27 03:43:23 JST, all run-scoped counts were unchanged except
`vip_manager_metrics`, which had increased from the initial 1646 to 3898 while
the Trial remained live. The 28-table total was therefore 4025; control rows
remained run 1, baseline 1 and run events 0. Baseline SHA-256 remained
unchanged, active seats remained 16 with official seats 8 and Trial seats 8,
and sent provider jobs remained 0.

The seeded `trial_attention_fixture` metric was no longer present anywhere in
the metrics table, so the full seeded-state verifier now stops at
`trial_attention_metric_missing`. The remaining run metrics were 3598
successful board reads and 300 observed realtime-unavailable events. No
repair/reseed was attempted. This drift reinforces that PR-5 must use a new
release-candidate run only after Gate A restores the official-eight-table
baseline; it does not change the exact-run cleanup target.

Two active sessions remained. Their non-secret expiry times were 2026-07-27
13:19:44 JST and 13:29:22 JST. The cleanup manifest must be re-frozen again
after exact-run session retirement and maintenance alias promotion, then
presented for a separate fresh Gate A approval.

## Post-maintenance Gate A freeze

Owner separately approved retirement of the two non-expired active sessions
and promotion of maintenance deployment
`dpl_6zRMGjhUo7HLwAcuWAKRMVKxZg7C`. The session retirement used only
`retire_admin_session_v7` for the exact run and completed 2/2; an independent
read-only check returned zero non-expired active sessions.

The fixed URL now resolves to the exact maintenance deployment. Smoke evidence:
outer Basic absent `401`, valid existing Basic `200`, maintenance copy present,
PIN/workspace/form/input zero, and session/board/command without a PIN session
all `401`. Recent deployment logs contained zero `5xx` and zero error-level
entries.

The 04:32:48 JST snapshot validated the exact baseline hash and produced the
current table above. The only non-telemetry delta from the 03:43 freeze was two
run-scoped `admin_session.retire` audit rows. Control rows remain run 1,
baseline 1 and run events 0; sent provider jobs remain 0; official active seats
remain 8 and Trial active seats remain 8.

At this freeze, the cleanup dry-run repeated the exact dependency order and
refused the Production Supabase ref; cleanup had not yet executed. If any
count, baseline hash, target ref, run ID, session count or fixed deployment
differed before execution, the contract required a newly frozen approval.

## Approved execution and fail-closed partial stop

At 2026-07-27 04:43:05 JST, the execution-time snapshot matched the approved
28-table 5289 rows, control 2, baseline SHA-256, session 0, official/Trial seat
shape, sent provider 0, exact ref/run and maintenance deployment. The approved
cleanup then stopped at the final `admin_users` delete on
`audit_logs_actor_admin_id_fkey`.

Read-only diagnosis identified one pre-existing unscoped
`admin_pin.set`/`admin_pin_credentials` audit row with
`trial_run_id=NULL` that references the exact Trial admin. It was not included
in the approved 5289 run-scoped rows. Per the Owner's no-drift condition, it
was not deleted and no inferred authorization was used.

Residual freeze:

- 28-table exact-run lineage: `admin_users=1`; the other 27 tables are 0;
- unscoped Trial PIN audit orphan: 1;
- controls: run 1, baseline 1, run events 0;
- baseline SHA-256 remains `08abb1...`;
- official active `VIP-1`–`VIP-8` unchanged; T/TRIAL seats/sections 0;
- sent provider 0.

At this point Gate A remained HOLD for new exact residual-cleanup approval
covering the one orphan audit row, one run-scoped admin row and two controls.

## Exact residual cleanup completion

Owner separately approved the residual orphan audit 1, run-scoped admin 1 and
controls 2. The immediate preflight revalidated the READY maintenance
deployment `dpl_6zRMGjhUo7HLwAcuWAKRMVKxZg7C`, all residual counts, exact
orphan shape, baseline SHA, official 8, T/TRIAL 0 and sent provider 0.

The dedicated executor deleted the orphan audit and admin in the approved
order, restored and verified the exact 28-table baseline SHA
`08abb1dee60ee7d74f281f058b70fd253e374cfc40066a7eeaf359f840306e40`,
then deleted baseline 1 and run 1. A separate after-cleanup verifier returned
28 lineage tables 0, all three control counts 0, orphan 0, T/TRIAL resources
0, official active `VIP-1`–`VIP-8`, and provider delivery 0.

Gate A is PASS as of 2026-07-27 04:54 JST. Fresh PR-5 may now start from the
official-eight staging baseline.
