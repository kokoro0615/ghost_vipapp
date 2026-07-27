# D0 Source Freeze and Release Lock

Date: 2026-07-27 JST  
Gate: PASS

## Source and deployment anchors

| Scope | Exact anchor |
|---|---|
| Working branch | `codex/vip-manager-production-light-ui-20260727` |
| Frozen source commit before this run | `ce99985` |
| VIP fixed URL | `https://ghost-vipapp.vercel.app` |
| VIP current deployment | `dpl_CvFzDDArUGR8j7QyAUtXG9cQ6gxf` |
| VIP runtime source | `47653b883e6b670c5f16329013576aeca5387bd5` |
| VIP Vercel project | `prj_mchunQTOAeQMkn86A1zCtMapdVqp` |
| Website fixed URL | `https://ghost-ruby-one.vercel.app` |
| Website current deployment | `dpl_Gj89YEqt6KSnxaL1fcatCpQ2Y75e` |
| Website runtime source | `ff7c6097371bdcb1789468dc7b7eec1448d6e0c7` |
| Website Vercel project | `prj_ve4VBLGc7Ao5xqvepbEa06X7n8wM` |
| Vercel team | `team_jigv2yIrWezsBSkwtlQS1e9F` |
| Production Supabase project | `cpfsrwctjymhmwvsbwdi` |
| Production migration head | `20260726205147` |
| VIP rollback | `dpl_CqjndQff4UuwEbYv9XfAKFxDJFzq` |
| Website safe-hold rollback | `dpl_6hWiRDuyyf1kSU3JbBBnsrkyK6FQ` |

Fresh read-only Vercel inspection resolved each fixed URL to the deployment
listed above and reported both deployments `READY`. Supabase project and
migration-list inspection reported the Production project healthy, 45 remote
migrations, and the exact head above. The same-day authenticated release
evidence in
`docs/evidence/trial-exit-production-light-ui-2026-07-27/09-rollback/ROLLBACK_REHEARSAL.md`
remains the rollback authentication anchor. Both Owner and rollback paths must
be re-proven with the newly rotated credentials before promotion.

## Data and provider baseline

The immutable same-day Production completion evidence records:

- official active seats: 8 (`VIP-1` through `VIP-8`);
- inactive historical seats: 2;
- provider sent baseline: 5;
- provider pending: 0;
- public booking write: 403.

No database query credential was printed or copied into this worktree. A fresh
delta readback is mandatory immediately before staged deployment and after
promotion. The expected delta for all four values is zero.

## Environment inventory

VIP Production environment names present:

- `GHOST_ADMIN_API_ORIGIN`
- `GHOST_VIP_TRIAL_MODE`
- `VIPAPP_BASIC_PASSWORD`
- `VIPAPP_BASIC_USER`

Values were not read. Demo/rotated credential variables are not yet present and
no environment mutation has occurred.

## Security and release lock

- Current Owner credential material has appeared in prior conversation context
  and is treated as exposed. Rotation is mandatory before promotion.
- The working tree began without tracked modifications. This run owns only the
  untracked research/evidence and subsequent explicitly reviewed source changes.
- Production DB mutation: 0.
- Production provider mutation: 0.
- Vercel alias mutation: 0.
- Vercel environment mutation: 0.
- Secret output: 0.

Release lock is active. Only read-only inspection and local source/test work are
allowed until later gates explicitly authorize staged Production actions.

