# D6 Local Full Validation Gate

Date: 2026-07-27 JST  
Gate: PASS

## Final integrated validation

- ESLint: PASS.
- TypeScript: PASS.
- Unit tests: `16/16` PASS.
- Contract tests: `48/48` PASS.
- PII artifact scan: PASS across four scanned roots.
- Next.js Production build: PASS.
- Maintenance anchor runtime: PASS.
- `git diff --check`: PASS.

## Visual and accessibility matrix

- Browsers/viewports: eight required Chromium sizes plus WebKit iPad landscape.
- Required states per viewport: `40`.
- Audited viewports: `9`.
- Full-page screenshots: `360`.
- Missing states: `0`.
- Missing viewports: `0`.
- Actionable axe findings: `0`.
- Horizontal overflow findings: `0`.
- Important controls below 44 px: `0`.
- Old purple chrome findings: `0`.
- Console errors: `0`.
- Unexpected server 5xx: `0`.

The external mode-0600 QA summary was hashed as
`9414132dc23df2e43e02770e105ff3894e4802a92dfebf56541b55bd0346d3e2`.
Screenshots and raw browser artifacts remain outside the repository.
