# Demo Login, Cue, Expiry, and Reset Boundary

## Outcome

Make the synthetic demo unmistakable before and after login, keep Owner and demo access lanes independent, fail closed at the exact deadline, and allow safe local reset.

## Exact access contract

- Allowed business dates: `2026-07-27` through `2026-08-27`, inclusive.
- Demo expiry: `2026-08-27 23:59:59 JST`.
- Open tabs must lose mutation authority within 60 seconds of expiry or lease failure.
- All timing decisions for mutation use a server-validated lease.

## Login

- Login shows `GHOST OSAKA`, `VIP Manager`, a non-color `DEMO` cue, synthetic-only scope, and exact expiry.
- Demo Basic leads only to demo PIN/session logic.
- Owner Basic leads only to the existing Owner PIN/Production path.
- The client cannot choose its lane through a trusted header or query.
- Opposite-lane cookies are ignored and cleared.
- Login errors do not reveal whether a credential component was correct.
- Rate limiting and constant-time verification apply.

## Authenticated cue

- A persistent service ribbon includes `DEMO`, synthetic-only scope, business date, and exact expiry.
- The cue is present in List, Floor, Chart, queue, Inspector, wizard, and mobile sheet contexts.
- It is text/icon based, not a colored banner alone.
- First viewport includes brand, manager purpose, selected view, primary create action, and operational context.

## Lease and failure behavior

- Lease renewal interval is no greater than 60 seconds.
- Mutation checks lease immediately before commit.
- Offline, unauthorized, disabled, expired, or malformed lease moves the workspace to read-only/expired state.
- Demo failure never falls back to Owner cookie, Production session, Production API, or Production board.
- Owner lane behavior is unaffected by demo expiry.

## Near-expiry

- A persistent clock cue appears before expiry while there is time to save or cancel.
- Exact JST expiry remains readable.
- New long tasks may be disabled when they cannot safely complete within the remaining lease.
- Existing drafts can be reviewed or discarded; save still requires a valid lease.

## Expired

- Demo PIN/session refresh and mutation fail closed.
- Open tabs stop mutation within the lease bound.
- Synthetic content is not replaced by Production content.
- The next load purges the expired local envelope.
- The expired screen states the deadline and provides logout only; it does not expose reset as a way to regain access.

## Reset

- Reset is available only in an authenticated, unexpired demo lane.
- A confirmation dialog states that only the browser-local synthetic workspace will change.
- Cancel is the initial safe action.
- Confirm performs one atomic replacement with the deterministic baseline and new revision.
- Reset appends a synthetic audit event in the new envelope.
- Owner cookies, Owner data, Production endpoints, and other browser storage namespaces remain untouched.

## Accessibility

- Login fields have visible labels and useful autocomplete policy.
- Demo, near-expiry, expired, and reset states use text plus icon/border cues.
- Login error and expiry change are announced without repeated noise.
- Focus moves into dialogs/sheets and returns correctly.
- Important controls meet 44px and work at 320px without overflow.

## Acceptance

- Cross-lane credential/cookie attempts fail.
- Exact start/end window and inclusive date allowlist are covered by boundary tests.
- Expiry and lease failure stop mutation in 60 seconds or less.
- Expired/local-storage error paths have zero Production fallback.
- Reset is confirmed, atomic, synthetic-only, persistent, and auditable.
- Login and shell expose a non-color demo cue in the first viewport.

