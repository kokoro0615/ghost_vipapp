# D3 Dual-Lane Authentication Gate

Date: 2026-07-27 JST  
Gate: PASS

## Implemented boundary

- Two constant-time Basic credential pairs resolve exactly one trusted server
  lane.
- Client-supplied lane headers are deleted and overwritten only after Basic
  verification.
- Owner and demo cookies have separate names and the opposite cookie is removed
  from the upstream request and expired on the response.
- Owner PIN/session behavior retains the existing Production backend contract.
- Demo PIN uses asynchronous scrypt verification from salt plus verifier only.
- Demo session uses a bounded HMAC-SHA256 claim with mode, demo-compatible role,
  workspace, issued time, exact expiry, and unique ID.
- Demo session and lease routes make no Production backend request.
- Lease authority is server-timed, same-origin, no-store, and capped at 60
  seconds.
- Expiry is exactly `2026-08-27 23:59:59 JST`; expired session and lease requests
  return fail-closed state without Production fallback.
- PIN rate limiting stores only a per-process keyed subject digest, not a raw
  address.

No credential, salt, verifier, HMAC secret, or session value is stored in source,
docs, logs, or a public environment variable.

## Validation

- Frozen auth contract: 7/7 PASS.
- Owner/Production targeted regression contracts: 18/18 PASS.
- Dynamic owner/demo/disabled/ambiguous Basic probe: PASS.
- Auth owned-file ESLint: PASS.
- TypeScript at D3 handoff: PASS.
- `git diff --check`: PASS.
- Cross-lane access: 0 successful attempts.
- Demo-to-Production session request: 0.

Production database, provider, Vercel environment, deployment, and alias
mutation remained zero.

