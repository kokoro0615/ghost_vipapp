# Production completion audit

Observed: 2026-07-27 04:54:07 JST
Outcome: `GATE_A_PASS_PR5_NEXT`

This matrix audits the execution prompt against current source, runtime and
data evidence. `PASS` means the requirement has direct evidence at its full
scope. `PARTIAL` means a safe prerequisite is proven but the named live Gate
is not complete. `HOLD` means required evidence or approval is absent.

Runtime code candidates remain:

- VIP App `1f34fc1ec9f138fa60f2ba7b76316bf642f0e439`, tree
  `87bfdc82bf0b2d465fe088673744aac83a6f17c9`;
- Website `1c616a18d90b04d40b0eb39ebc7dc4eb52af7bbc`, tree
  `411f3089cd2c636f8588dcd069d89d4e9010215e`.

Current evidence/tooling tips are VIP `ee63820` plus this evidence commit and
Website `0a063e0`. QA/tooling commits do not alter the runtime candidates.

## PR and Gate matrix

| Scope | State | Direct evidence | Missing proof / next exact action |
|---|---|---|---|
| PR-0 release lock and inventory | PASS | `00-release-lock/`, isolated branches, read-only Git/Vercel/Supabase freeze | Continue drift checks before every state change |
| PR-1 authority | PASS | VIP commit `729eea7`; SPEC 1.1, PLAN 1.2, README and narrow VIP-only AGENTS exception | None |
| PR-2 inactive-history migration blocker | PARTIAL | Website runtime candidate; clean and inactive 2-seat PostgreSQL 16.14 migration/dump/restore; refs 2+2 retained; board 8/8/8/0 | Apply only after encrypted Production snapshot restore and Gate B |
| PR-3 Trial shutdown preparation | PASS | read-only backend `dpl_FSf...`; maintenance fixed URL `dpl_6zR...`; exact session retirement 2/2 and active 0; fixed smoke/log PASS | Destructive Trial data cleanup is Gate A, not part of this PASS |
| Gate A exact staging cleanup | PASS | Initial approved 5289 cleanup fail-closed at one unscoped PIN audit; separate residual approval completed audit1 → admin1 → exact 28-table baseline SHA restore → controls2. Independent verifier: lineage/control/orphan/T/TRIAL/provider all 0; official8 | Start fresh PR-5 from official-eight baseline |
| PR-4 complete light UI | PASS automated | VIP runtime commits `333d02c`/`1f34fc1`; all named routes, views, dialogs and states in 36-state manifest | Physical iPad witness remains a separate QA HOLD |
| PR-5 staging business regression | PARTIAL | full fail-closed runner `c000dd...`; contract 4/4; Website fresh-RC lifecycle pinned by SHA | Run live only after Gate A official-eight baseline, then verify DB and deployment-log provider 0 |
| PR-6 Production backup / migration | HOLD | exact 24 checksum allowlist; clean/inactive synthetic restore rehearsals; PITR false / physical backups zero documented | Obtain Production DB credential; encrypted logical dump; isolated restore; Gate B approval; apply exact 24 |
| PR-7 Website Production candidate | HOLD | runtime candidate and read-only staging deployment exist | After Gate B, create new aliasless Production candidate with permanent secrets and read-only flags; public booking/log smoke; Gate C |
| PR-8 VIP Production candidate | HOLD | white runtime candidate and maintenance anchor exist | Build new aliasless candidate with Production Website origin, Trial mode false, no bypass/staging origin, permanent Basic/PIN; Gate D |
| Gate E mutation waves | HOLD | fail-closed flag and deployment verifiers exist | Separate approvals for admin, v2 and customer-write flags; one notification-disabled synthetic canary; audit delta/cleanup |
| PR-10 Trial asset revocation | HOLD | Trial session retirement complete; fixed URL no longer exposes Trial workspace | After Production stability revoke Trial Basic/PIN/bypass/env/mode/temp cleanup credential and prove old rollback unusable |

## UI QA matrix

| Requirement | State | Evidence |
|---|---|---|
| 320/375/768/1024/1194/1366 | PASS | exact six-viewport manifest |
| Required screenshots/states | PASS | 36 states × 6 = 216 screenshots |
| light scheme / purple chrome | PASS | computed style: old purple 0 |
| WCAG / focus / labels / status cues | PASS automated | axe 0 plus contract/unit checks |
| important controls at least 44px | PASS | undersized controls 0 |
| overflow / long labels / reduced motion | PASS automated | overflow 0 and visual/state contracts |
| console / server 5xx | PASS automated | 0 / 0 |
| physical iPad landscape Safari | HOLD | Owner or named witness must perform login, three views, Inspector, create/edit, one command and logout |

## Definition of Done audit

| # | Requirement | State |
|---:|---|---|
| 1 | Fixed URL uses final Production backend/DB | HOLD — maintenance backend/staging DB |
| 2 | `GHOST_VIP_TRIAL_MODE=false` | HOLD for final Production build |
| 3 | Active/UI tables are official eight only | PASS current staging data shape: official active 8, T/TRIAL seats/sections 0; Gate A controls still open |
| 4 | Trial T tables and run fixture cleaned | PASS — lineage/control/orphan/T/TRIAL 0 |
| 5 | Inactive historical rows safely preserved/hidden | PASS in code and isolated production-shape rehearsal; live application awaits Gate B |
| 6 | Complete light UI, old purple chrome zero | PASS automated |
| 7 | List/Floor/Chart directly reachable | PASS |
| 8 | Full regression, CI, a11y, responsive, iPad | HOLD — live PR-5 and physical iPad remain |
| 9 | Production backup restore and migration evidence | HOLD Gate B |
| 10 | Unintended provider delivery zero | PASS to current boundary; must be reproven at PR-5 and Production canary |
| 11 | Permanent Basic/PIN handoff | HOLD; Trial credentials cannot be reused |
| 12 | Trial credential/bypass/staging connection revoked | HOLD PR-10 |
| 13 | Exact authenticated rollback rehearsed | HOLD permanent-credential compatibility |
| 14 | 5xx, console error and orphan zero | PASS for current automated/maintenance boundary; must be reproven after each live Gate |

## Outstanding approval boundaries

Approvals are not bundled:

1. Gate A: exact staging cleanup described in
   `02-data-lineage/GATE_A_CLEANUP_MANIFEST.redacted.md`;
2. Gate B: encrypted Production backup/restore plus exact 24 migrations;
3. Gate C: exact Website deployment promotion;
4. Gate D: exact VIP deployment promotion;
5. Gate E: each mutation flag wave.

Gate A approvals are fully consumed and the exact Trial is clean. The next
in-scope action is fresh PR-5 staging regression; Production DB, promotion and
mutation gates remain separately approval-bound.
