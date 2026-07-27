# Rollback rehearsal

Status: `PASS_AUTHENTICATED_CANDIDATES`

Observed: 2026-07-27 JST

Rollback artifacts were built from frozen source, inspected as `READY`, and
smoked aliaslessly without moving the final aliases.

| Scope | Exact rollback | Purpose |
|---|---|---|
| Website safe hold | `dpl_6hWiRDuyyf1kSU3JbBBnsrkyK6FQ` | read-only admin/customer mutation flags OFF |
| Website prior wave | `dpl_3rvcJ6hKWsbq1dWvpvCmBCDPjFUS` | core mutation ON, customer profile write OFF |
| VIP App | `dpl_CqjndQff4UuwEbYv9XfAKFxDJFzq` | permanent-auth maintenance anchor |

The VIP rollback was rebuilt from source
`1f34fc1ec9f138fa60f2ba7b76316bf642f0e439` with permanent Basic auth and
maintenance mode. It does not depend on revoked Trial credentials. Outer 401,
permanent Basic 200, maintenance copy, absent workspace/mutation controls and
server `5xx` 0 passed.

## Incident procedure

1. Promote the Website read-only deployment:
   `vercel promote https://ghost-5kqmz9sjs-kokoro06152002-7861s-projects.vercel.app --scope kokoro06152002-7861s-projects`.
2. Verify public availability 200, public hold write 403, provider delivery 0
   and fixed Website alias identity.
3. Promote the VIP maintenance deployment:
   `vercel promote https://ghost-vipapp-1k2idh1gz-kokoro06152002-7861s-projects.vercel.app --scope kokoro06152002-7861s-projects`.
4. Verify outer 401, permanent Basic 200, maintenance copy and fixed VIP alias
   identity.
5. Keep the forward-compatible Production schema; do not run a down migration.

For a customer-profile-only incident, promote the prior Website wave instead
of the full read-only hold. The encrypted pre-migration logical backup remains
the database recovery artifact.
