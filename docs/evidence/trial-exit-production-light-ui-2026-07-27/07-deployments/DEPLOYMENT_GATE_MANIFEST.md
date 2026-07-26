# Deployment Gate manifest

Status: `HOLD_CANDIDATES_NOT_BUILT`

Prepare one mode-600 redacted JSON using schema
`ghost-vip-production-deployment-release.v1`, then run:

```text
npm run verify:deployment-release -- --manifest <mode-600-json>
```

It must bind exact SHA, tree, deployment and authenticated rollback deployment
for Website and VIP App. Website flags begin with read enabled and all admin,
v2 mutation, dual-write, shadow compare and customer-write flags disabled.

VIP App evidence must prove:

- production Website origin;
- Trial mode false;
- protection bypass absent and no staging origin;
- new permanent Basic and Owner PIN rotations (presence only);
- Trial cue zero;
- physical iPad Safari witness PASS.

The verifier rejects secret-bearing keys and does not read secret values.
Promotion requires separate fresh Owner approvals for Website, VIP and each
mutation wave.
