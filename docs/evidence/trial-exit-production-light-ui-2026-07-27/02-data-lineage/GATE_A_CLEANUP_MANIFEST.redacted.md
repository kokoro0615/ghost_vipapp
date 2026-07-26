# Gate A exact-run cleanup manifest

Status: `HOLD_FRESH_OWNER_APPROVAL`
Observed: 2026-07-27 02:19:49 JST
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
- Non-expired active Trial sessions at freeze: 2. Gate A requires 0.

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
| `audit_logs` | 13 |
| `reservation_customer_link_events` | 4 |
| `reservation_blocks` | 2 |
| `reservation_block_targets` | 2 |
| `vip_waitlist_entries` | 2 |
| `vip_staff_members` | 3 |
| `vip_table_staff_assignments` | 3 |
| `notification_jobs` | 1 |
| `vip_manager_metrics` | 1646 |
| **28-table total** | **1773** |

Control rows outside the 28 lineage tables:
`vip_manager_trial_run_events=0`, `vip_manager_trial_baselines=1`,
`vip_manager_trial_runs=1`. Expected total including control rows is 1775 at
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

Gate A remains HOLD because active sessions were nonzero, the lifecycle
credential was unavailable and fresh Owner approval was not obtained. No
cleanup was executed.
