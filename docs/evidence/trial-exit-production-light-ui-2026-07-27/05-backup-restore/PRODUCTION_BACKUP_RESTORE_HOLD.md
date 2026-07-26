# Production backup and restore Gate

Status: `HOLD_PRODUCTION_DUMP_CREDENTIAL`

Read-only Supabase Management API evidence on 2026-07-27 JST:

- production project: `cpfsrwctjymhmwvsbwdi`;
- backup inventory request: HTTP 200;
- PITR enabled: false;
- available physical backups: zero.

No production dump, restore or database mutation was performed by this lane.
The prior transaction-scoped synthetic logical-restore fixture does not satisfy
this Gate.

## Portable clean rehearsal

A repo-external PostgreSQL 16.14 cluster was initialized without sudo. The 20
base migrations through `20260604090000` and the exact 24-file production
allowlist applied successfully; Trial v16/v17 were not applied. The resulting
clean v15 schema had active official seats 8, active unmapped seats 0, all 52
public tables on RLS, 159 public routines and no Trial control tables.

A mode-600 custom-format dump was restored into a second isolated database
without error. The clean rehearsal artifact is
`/tmp/ghost-pg16-portable-20260727-tYlSuT/clean-v15-rehearsal.dump`, size
866074 bytes, SHA-256
`c9ebc6f86598f600f7e737d347e3f2d1fae745565ddb8291ac5231dbe2c36a92`.
It contains only clean synthetic seed data.

This proves the clean migration and logical restore toolchain, not production
recoverability. The production database password is unavailable; a
service-role JWT cannot replace it. Credential reset, production dump,
encrypted retention and restored production snapshot verification remain
required before Gate B.

## Inactive-history shape rehearsal

A second isolated database was built from the same 20-migration production
head, then given two synthetic inactive seats with two
`reservation_resources` references and two
`offering_resource_requirements` references before applying the exact 24
production migrations. The migration completed with:

- active official seats 8 and active unmapped seats 0;
- inactive seats 2, both in inactive `vip_history_archive`;
- inactive rows locked, offline and assigned deterministic archive geometry;
- both reservation references and both offering references retained;
- v14 board RPC resolved with table count 8, `VIP-1` through `VIP-8` count 8,
  and archive table count 0;
- 52 public tables with RLS, 159 public routines, 100 validated foreign keys
  and zero invalid foreign keys;
- Trial v16/v17 tables absent.

The resulting mode-600 custom-format dump was restored into another isolated
database with the same invariants. Its repo-external path is
`/tmp/ghost-pg16-portable-20260727-tYlSuT/inactive-history-v15-rehearsal.dump`,
size 971719 bytes, SHA-256
`f954cf1a78447afe06b996e1fd1e7f8260a11587f45a619908568dc069977d10`.
It contains only synthetic, non-customer fixture data.

Source and restore produced identical canonical row hashes for
`seat_resources`, `reservation_resources`,
`offering_resource_requirements`, and `floor_sections`; the restored v14 board
RPC repeated the same resolved 8/8/8/0 result. The portable cluster was then
stopped cleanly.

This closes the local inactive-history migration/restore risk but still does
not substitute for the encrypted production dump and its isolated restore.

Before Gate B approval:

1. create a repository-external mode-700 work directory;
2. use the linked production ref only after rechecking it exactly;
3. create schema, roles and data logical dumps with `supabase db dump`;
4. encrypt them to an approved recipient; keep the encrypted artifact mode 600;
5. record SHA-256 without recording a key, password or connection string;
6. restore into an isolated PostgreSQL 16 instance;
7. verify schema, roles, critical RPCs, row counts, hashes, foreign keys and RLS;
8. build the exact 24-file allowlist from `2026-07-14T09:00:00`
   through `2026-07-26T17:50:00`; exclude `2026-07-26T18:00:00`
   and `2026-07-26T18:10:00` (compact UTC-free migration timestamps);
9. store a mode-600 redacted manifest outside the repository;
10. run:

```text
npm run verify:backup-restore -- --manifest <mode-600-json> --website-root <exact-website-source>
```

Any failed restore check, checksum drift, missing backup hash, Trial migration,
or non-isolated target keeps Gate B on HOLD.
