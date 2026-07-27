# Production completion audit

Observed: 2026-07-27 JST
Outcome: `COMPLETE_EXCEPT_PHYSICAL_WITNESS`

Runtime source:

- VIP App `47653b883e6b670c5f16329013576aeca5387bd5`, tree
  `a3e85ededd922e0a4e8f7c76d7983afb07fc7c50`;
- Website `ff7c6097371bdcb1789468dc7b7eec1448d6e0c7`, tree
  `daf1ccc0055a3945fcf6eb4cc4df7c670317f74c`.

## Definition of Done

| # | Requirement | State |
|---:|---|---|
| 1 | Fixed VIP URL is final Production deployment | PASS |
| 2 | Website/VIP Production origin/ref exact | PASS |
| 3 | `GHOST_VIP_TRIAL_MODE=false` | PASS |
| 4 | active/UI official `VIP-1`–`VIP-8` exact | PASS |
| 5 | Trial/RC lineage, controls, orphans and sessions 0 | PASS |
| 6 | inactive history 2 and 2+2 refs preserved/hidden | PASS |
| 7 | exact 25 checksummed Production migrations | PASS |
| 8 | encrypted logical backup isolated restore | PASS |
| 9 | public booking/read-only regression | PASS |
| 10 | List/Floor/Chart, queue, Inspector, create/edit, six commands | PASS |
| 11 | Walk-in/Waitlist/block/staff/customer/realtime/SLO | PASS |
| 12 | permanent Basic/PIN, fail-closed auth and logout | PASS |
| 13 | unexpected console error/`5xx` 0 | PASS |
| 14 | provider DB/log delivery delta 0 | PASS |
| 15 | rollback targets, procedure and recovery smoke | PASS |
| 16 | Trial/release bypasses and temporary credentials/files removed | PASS after R7 secure cleanup |
| 17 | final CI, contract, lint, typecheck and build | PASS |
| 18 | redacted evidence and shared AI docs updated | PASS |

## Final database posture

- migration rows 45; head `20260726205147`;
- active official seats 8; active seats total 8; inactive history 2;
- Trial seats/sections/control rows 0;
- canary reservations, action requests and arrival controls 0;
- invalid foreign keys, resource orphans and audit actor orphans 0;
- dedicated permanent Owner active 1; its temporary sessions 0;
- provider sent baseline 5, delta 0; pending delivery 0.

## Residual exception

No physical iPad was attached or externally reachable. Direct WebKit
iPad-landscape emulation passed and the only remaining action is the single
ten-minute witness checklist in `FINAL_QA_ACCEPTANCE.md`. This does not reopen
the completed Production rollout.
