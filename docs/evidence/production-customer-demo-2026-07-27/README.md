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
| D7–D9 | Added as each gate is completed | PENDING |
