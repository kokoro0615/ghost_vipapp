# Production backup and restore Gate

Status: `HOLD_BACKUP_RESTORE_NOT_REHEARSED`

Read-only Supabase Management API evidence on 2026-07-27 JST:

- production project: `cpfsrwctjymhmwvsbwdi`;
- backup inventory request: HTTP 200;
- PITR enabled: false;
- available physical backups: zero.

No production dump, restore or database mutation was performed by this lane.
The prior transaction-scoped synthetic logical-restore fixture does not satisfy
this Gate.

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
