# Production backup and restore Gate

Status: `PASS`

Observed: 2026-07-27 JST

Production project identity was independently fixed to
`cpfsrwctjymhmwvsbwdi`. The platform reported PITR disabled and zero listed
physical backups, so the release created a logical backup through the supported
Supabase CLI connection flow.

## Durable artifact

- encrypted archive:
  `/home/kokoro/.local/share/ghost-production-backups/2026-07-27-vip-manager/production-logical-backup.tar.gpg`
- mode: `0600`
- bytes: `297877`
- SHA-256:
  `22517eb100909c999eb9e163fa32b49b327119cf57513620b9d30152fa576814`
- encryption: GnuPG symmetric AES-256 with iterated salted SHA-512 S2K
- key material: stored separately outside the backup directory and repository
- contents: roles, schema, data, migration history and public custom archive
- excluded by design: Storage object bodies

The temporary Supabase CLI database roles used to capture the backup were
revoked after capture.

## Isolated restore

The encrypted artifact was decrypted only in a mode-700 temporary workspace
and restored into an isolated PostgreSQL 17.6 cluster. Canonical source and
restore hashes matched. The restored snapshot preserved:

- active official seats 8;
- inactive historical seats 2;
- inactive reservation references 2 and offering references 2;
- 52/52 public tables with RLS;
- validated foreign keys and zero business orphans;
- critical RPCs and restricted execute privileges;
- migration history and public booking read contract;
- Trial controls absent and provider sent baseline unchanged.

The exact 25 production migrations were then applied to the restored snapshot
and the same postconditions passed. Restore evidence SHA-256 is
`7f357fbf970ce745ee84ddea25b7cda057203245a452066482036e21e2436464`.

The mode-600 redacted manifest and postflight evidence are retained beside the
encrypted backup. `npm run verify:backup-restore` passed with migration count
25 and forbidden Trial migrations 0.
