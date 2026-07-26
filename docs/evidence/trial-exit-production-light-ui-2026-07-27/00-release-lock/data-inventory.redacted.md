# Data inventory (redacted)

Frozen: 2026-07-27 JST. All values are aggregate and PII-free.

## Staging `rsvrtaavofflkvtfzsfh`

- Project state: `ACTIVE_HEALTHY`.
- Active seat rows: 16.
- Official active seats: exact `VIP-1` through `VIP-8`.
- Trial active seats: exact `T1` through `T8`.
- Exact open Trial run: `trial-20260726-adaa919e0001`.
- The run has a stored 28-table baseline and provider sent count 0.
- Principal run counts at freeze include 12 reservations, 12 reservation
  resources, 24 assignment events, 13 audit rows, 1,490 metric rows, and 4
  sessions.

Cleanup is not authorized by this inventory. Gate A still requires the complete
28-table dry-run delete manifest, full baseline SHA-256, rollback/reseed
statement, a fresh lifecycle credential, and fresh Owner approval.

## Production `cpfsrwctjymhmwvsbwdi`

- Project state: `ACTIVE_HEALTHY`.
- Migration head: `20260604090000`.
- Seat rows: 10 total.
- Active official seats: exact 8.
- Inactive historical verification seats: 2.
- Trial `T*` / `TRIAL-*` seats: 0.
- The two inactive rows retain two reservation-resource references and two
  offering references. Physical deletion is prohibited.
- PITR is not enabled and a downloadable physical-backup restore has not been
  demonstrated.

The inactive rows expose a forward-migration blocker because
`20260714094500` makes geometry fields non-null while current
`20260714093000` rejects every unmapped row. PR-2 must provide safe inactive
geometry, require active official exact eight, and reject only active unmapped
rows. The legacy VIP status route must also return active seats only.

## Migration boundary

- Production allowlist: exact 24 migrations from `20260714090000` through
  `20260726175000`.
- Explicitly excluded Trial migrations: `20260726180000` and
  `20260726181000`.
- No migration, repair, cleanup, or business mutation was performed during
  this freeze.
