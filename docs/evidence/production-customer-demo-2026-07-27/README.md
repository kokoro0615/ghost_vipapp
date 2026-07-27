# Production Customer Demo Evidence

Redacted execution evidence for the fixed Production URL customer-demo lane and
GHOST-owned light operator UI.

## Rules

- No credential values, private customer data, raw DOM, screenshots, request
  payloads, or copied third-party assets are stored here.
- Production database and provider state are read-only baselines for this run.
- Deployment, environment, and alias mutations are forbidden until the staged
  Production gates pass.
- The exact demo window is `2026-07-27` through `2026-08-27`, inclusive, with
  expiry at `2026-08-27 23:59:59 JST`.

## Gate index

| Gate | Evidence | Status |
|---|---|---|
| D0 | `00-release-lock/BASELINE_MANIFEST.redacted.md` | PASS |
| D1 | `01-reference-observation/OBSERVATION_MANIFEST.redacted.md` | PASS |
| D2 | `02-tests-first/RED_CONTRACT_MANIFEST.md` | PASS |
| D3 | `03-dual-lane-auth/AUTH_GATE_MANIFEST.redacted.md` | PASS |
| D4 | `04-local-demo-data/LOCAL_DATA_GATE_MANIFEST.redacted.md` | PASS |
| D5 | `05-light-operator-ui/UI_GATE_MANIFEST.redacted.md` | PASS |
| D6 | `06-local-validation/VALIDATION_GATE_MANIFEST.redacted.md` | PASS |
| D7 | `07-aliasless-candidate/STAGED_PRODUCTION_GATE_MANIFEST.redacted.md` | PASS |
| D8 | `08-production-promotion/PRODUCTION_PROMOTION_GATE_MANIFEST.redacted.md` | PASS |
| D9 | `09-handoff-expiry-cleanup/HANDOFF_EXPIRY_CLEANUP_MANIFEST.redacted.md` | PASS |

## Final release anchors

- canonical fixed URL: `https://ghost-vipapp.vercel.app`;
- Production deployment: `dpl_GBhCXNAVnqwJW7N4GAGgnfKhVveo`;
- deployed application source commit:
  `7c6481005b87a330245a8861ae76da56665fbee0`;
- deployed application source tree:
  `1e6f97a5bf5df392d2455db1eff6022d6a31f4de`;
- demo window: `2026-07-27T00:00:00+09:00` through
  `2026-08-27T23:59:59+09:00`;
- Production business/provider delta: zero;
- final active Production admin smoke sessions: zero.

All credential values and full aggregate snapshots remain outside the
repository in a mode-`0700` handoff directory. This evidence contains only
redacted outcomes and content hashes.
