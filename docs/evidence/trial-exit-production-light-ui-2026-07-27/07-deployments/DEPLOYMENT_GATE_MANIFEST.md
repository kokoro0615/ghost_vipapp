# Deployment Gate manifest

Status: `PASS_MAINTENANCE_FIXED_URL`

## PR-3 maintenance candidates

- Website read-only staging backend:
  `dpl_FSf7tGxgDmpnnfJzNwC8kQFZAWvE` (`READY`, target `staging`)
- Website source:
  `1c616a18d90b04d40b0eb39ebc7dc4eb52af7bbc`, tree
  `411f3089cd2c636f8588dcd069d89d4e9010215e`
- backend flag overrides: v2 read enabled; admin mutation, public booking, v2
  mutation, customer write, dual write, shadow compare, email and LINE
  disabled; Trial safety remains enabled
- VIP maintenance anchor:
  `dpl_6zRMGjhUo7HLwAcuWAKRMVKxZg7C` (`READY`, target `production`,
  promoted to the customer fixed URL after fresh Owner approval)
- VIP source:
  `1f34fc1ec9f138fa60f2ba7b76316bf642f0e439`, tree
  `87bfdc82bf0b2d465fe088673744aac83a6f17c9`
- VIP backend origin: the exact read-only staging deployment above
- customer fixed URL resolves to maintenance deployment
  `dpl_6zRMGjhUo7HLwAcuWAKRMVKxZg7C`; previous Trial deployment
  `dpl_3kwpgwP3H3wQ7CnEwoHU7ZbdYxBR` remains only as frozen history
- Website production remains on
  `dpl_5RaU3Mpz8KanMeEnfcZK5b9NGFSP`

The maintenance anchor is not the final Gate C/D production candidate. Owner
approved retirement of the exact run's two non-expired active sessions and
promotion of this deployment. Retirement completed 2/2, an independent check
returned zero, and the fixed URL promotion/smoke passed. Gate A cleanup still
requires a separate fresh approval.

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
