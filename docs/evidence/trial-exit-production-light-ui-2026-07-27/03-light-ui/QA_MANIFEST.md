# Light UI QA manifest

Status: `PASS_AUTOMATED_LIGHT_UI`

The executable manifest is `scripts/light-ui-qa-manifest.mjs`; the browser
runner is `scripts/a11y-visual.mjs`.

Run after an exact production build:

```text
GHOST_VIP_QA_ARTIFACT_DIR=<repo-external-mode-700-directory> npm run test:a11y
```

The runner saves a JPEG screenshot for every required state at 320, 375, 768,
1024, 1194 and 1366 pixels, plus a mode-600 `qa-summary.json`. All data is
synthetic. The run fails on:

- missing state or viewport;
- actionable WCAG 2.2 AA axe findings;
- page horizontal overflow or an enabled important control below 44px;
- non-light root/body `color-scheme`;
- dark major surfaces or computed purple UI chrome;
- status elements with no text/accessible cue;
- console error or unexpected 5xx.

Floor bitmap/media colors are excluded only when the node is an actual
`img`, `picture`, `video`, `canvas`, `svg`, or uses a URL background image.
Surrounding chrome and table nodes remain subject to light/purple checks.

Actual iPad landscape Safari is not automated by this runner. Production
mutation remains `HOLD_REAL_IPAD_SAFARI_WITNESS` until the Owner or named
witness records login, List, Floor, Chart, Inspector, create, edit, one command
and logout on physical hardware.

## 2026-07-27 automated run

Outcome: `PASS`

The exact `npm run ci` run generated 216 screenshots: 36 operational states at
320, 375, 768, 1024, 1194 and 1366 pixels. It reported:

- audited states: 36; missing: 0
- audited viewports: 6; missing: 0
- axe violations: 0
- page horizontal overflow: 0
- undersized important controls: 0
- old purple chrome: 0
- console errors: 0
- unexpected server 5xx: 0

The mode-700, repo-external artifact directory is
`/tmp/ghost-vip-light-ui-ci-20260727-Hn7Tuq` (217 files, 11 MiB). Its
mode-600 `qa-summary.json` SHA-256 is
`b07fdfe6c80962f63a67515a2dbb7097d8209680956707444dfa6f30076cbe88`.
All inputs and screenshots are synthetic.

During fail-closed development the runner exposed and resolved one real axe
defect (the mobile Inspector scroll region was not keyboard focusable) and one
real conflict-recovery defect (a 409 warning was cleared by board hydration
before users could read it). Other stops were exact QA locator/mock contract
errors; the final integrated run is the acceptance result.
