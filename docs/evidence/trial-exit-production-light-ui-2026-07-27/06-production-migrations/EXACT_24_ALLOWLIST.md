# Production migration exact allowlist

Status: `HOLD_PRODUCTION_SNAPSHOT_RESTORE`

Production migration head is `20260604090000`. The Website release branch
verifier binds this 24-file forward-only allowlist to the source files by
SHA-256. Trial-only v16/v17 are excluded.

| Version | SHA-256 |
|---|---|
| `20260714090000` | `c919a7302aedf2f4e56ef47de987c1b18de3fb8774b705da11e00187d3ce049e` |
| `20260714090500` | `eb84c6b500d3e46652dcf9c491730c9cf44c19a74bf7ddc5caebacc5b3b459e9` |
| `20260714091500` | `08fde9d4cdadba1e6e676f8a10e77ae1341b27fa99f85fcd5e11c9a78c93d8aa` |
| `20260714093000` | `945f678fed4728c1b3619717184743221221d7ea9a4412a64761658106f25eee` |
| `20260714094500` | `2e0764c97b781f2dbd748c79119a7329f4af6b53080cf56c334f61bf10ed0544` |
| `20260714095000` | `02cd7fcd82bde239560729f1a5017b07d7f2f573b9553b014ab61bc243fccc9f` |
| `20260714100000` | `a5c6cf95ff0b33f4c31bf3b134a0400f16951403624787f47eac437a29bf2a0e` |
| `20260714103000` | `271b07ced1509c0ac406c33a92b6274d0851577538bdf9202103b106f73b6537` |
| `20260714110000` | `5999db9b834e53a20b35154b1d536faffc9227e59abdaa4af29d45b6aff04916` |
| `20260714120000` | `deae343e27b5b308a8dd6a3b003a52e299a6e2d1f2f7adfd8097126eadb68251` |
| `20260714120500` | `dd61d99606838fe21c17b1e58611acfe437d72df252af356dcab4c9deae7c2b3` |
| `20260714121000` | `1973fd0f505bc01d81f7e50f52ba01a4440e104a07a053025e7144135627a23a` |
| `20260726150000` | `0d77b8caff9f278ce357ff6aa9b650756e88cf9c4695c88eb871955d17364325` |
| `20260726160000` | `ccc6cc763cf8d0b3089a778bc44d2b55db93ff8774840e2728cd34cdbb341f80` |
| `20260726161000` | `1d9feb45952672dd6bb4e89612de9d25efe8d094e979653a15447bef4c2b37cf` |
| `20260726161500` | `3f0359add51bdd3ed22d0eb3907ee23b5ff66f6149636b419693c08422a74923` |
| `20260726170000` | `9aa79b779e3f4bd8d4a64f08dc66363594a4a38548c85e65fc5dbe623f7eeb0b` |
| `20260726171000` | `79cf4dbaa7f86fac0b471e7fb3d1297e24d9a26bb2768dccad0e10d3578385a3` |
| `20260726172000` | `a348af21e877230b0c6cadcecdf232f8a7152c806c1d7179e8b3039d4a18796d` |
| `20260726173000` | `e35524d22a26d8f0ab047247283e2376ff97da57facfb1583045a4a3729ffac6` |
| `20260726174000` | `dc8adab5d413a51a1ee3af7b4835a7ee3c1e7f223e2148b8a4b7a6ab9e072533` |
| `20260726174100` | `23bce01d8d5e095a33081c7d5e8dc2fcb8b468a9ec370dd939f3a501fd7dd753` |
| `20260726174200` | `bb61dcd2417a3a7d7246627ec855520959b1fa5b77cb42e7dfb106a2aa6952cc` |
| `20260726175000` | `03b438786d967da9a0cb2bd808005d578821a4c643c5d9a1b61a10f8720ed8d1` |

Excluded:

- `20260726180000_ghost_vip_manager_trial_safety_v16.sql`
- `20260726181000_ghost_vip_manager_trial_cleanup_v17.sql`

## `20260714093000` history strategy

Staging previously applied the frozen old source with SHA-256
`363fc5752309f0f4ae61a39218d66bcd970444e63e6a9d491f4d79486b54f057`.
Production has not applied this version. The production candidate source
preserves inactive verification rows, supplies deterministic archive-only
geometry before the subsequent NOT NULL transition, requires exactly eight
active official rows, and rejects only active unmapped seats. It does not
repair or replay staging migration history.

Before Gate B, apply the candidate to a clean database and an isolated restore
of the production logical snapshot. Compare v15 schema with staging while
treating v16/v17 as an explicit staging-only extension; verify inactive
references remain 2+2, active official seats exact 8, T/TRIAL rows 0 and
orphans 0.

The Website verifier passed the exact file count, exclusions, active filters
and archive policy. Portable PostgreSQL 16.14 rehearsals passed both a clean
20+24 migration/restore and a production-shaped synthetic case with inactive
seats 2, reservation references 2 and offering references 2. The latter
retained all references, returned only eight official tables from the v14
board RPC, and restored with 52/52 RLS tables, 159 routines, 100 validated
foreign keys and zero invalid foreign keys.

The encrypted production logical snapshot and its isolated restore are still
missing, so Gate B remains HOLD.
