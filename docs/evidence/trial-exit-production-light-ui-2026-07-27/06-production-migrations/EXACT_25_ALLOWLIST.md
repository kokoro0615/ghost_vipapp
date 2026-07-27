# Production migration exact allowlist

Status: `PASS_PRODUCTION_APPLIED`

Observed: 2026-07-27 JST

The verifier binds this 25-file forward-only allowlist to the Website source by
SHA-256. Trial-only v16/v17 are excluded. The same exact set passed against the
isolated Production restore before it was applied once to Production through
the supported Supabase CLI migration flow.

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
| `20260726205147` | `4bf5609b1c8f3f9f49d927465b9fecf4682d535404f557a8f6546cc4c954260e` |

Excluded:

- `20260726180000_ghost_vip_manager_trial_safety_v16.sql`
- `20260726181000_ghost_vip_manager_trial_cleanup_v17.sql`

## Production application

Production migration history now contains 45 rows with exact head
`20260726205147`. Source checksums match 25/25 and Trial versions
`20260726180000`/`20260726181000` are absent from the Production application
set.

Post-apply verification returned:

- active/UI official seats 8 and inactive history 2;
- inactive reservation references 2 and offering references 2;
- Trial seats/sections/control tables 0;
- 52/52 public tables with RLS;
- invalid foreign keys, resource orphans and audit-actor orphans 0;
- v18 audit timestamp guard present with restricted execute privileges;
- provider sent baseline unchanged and pending delivery 0;
- public availability read PASS.

`npm run verify:backup-restore` independently recomputed all 25 source
checksums and passed with forbidden Trial migrations 0.
