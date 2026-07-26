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
