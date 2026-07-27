# Deployment Gate manifest

Status: `PASS_FINAL_PRODUCTION`

Observed: 2026-07-27 JST

## Fixed Production aliases

| Component | Fixed URL | Exact deployment | Runtime source |
|---|---|---|---|
| Website | `https://ghost-ruby-one.vercel.app` | `dpl_Gj89YEqt6KSnxaL1fcatCpQ2Y75e` | `ff7c6097371bdcb1789468dc7b7eec1448d6e0c7` |
| VIP App | `https://ghost-vipapp.vercel.app` | `dpl_CvFzDDArUGR8j7QyAUtXG9cQ6gxf` | `47653b883e6b670c5f16329013576aeca5387bd5` |

Independent `vercel inspect` calls resolved each fixed URL to the deployment in
this table with status `READY`.

## Final runtime posture

Website points to Production Supabase `cpfsrwctjymhmwvsbwdi`. Final flags are:

- public booking write, webhook processing, LINE, email, dual write and shadow
  compare: OFF;
- admin mutation, VIP floor v2 read/mutation and customer profile write: ON;
- Trial mode: false;
- Production customer encryption/search key presence: verified.

VIP App points only to `https://ghost-ruby-one.vercel.app`, has Trial mode
false, no staging origin, and no backend protection-bypass environment
variable. Permanent Basic and dedicated Owner PIN were rotated and stored
outside the repository with mode 600. Secret values are not present in this
evidence.

## Candidate and promotion checks

- Website began from read-only candidate
  `dpl_6hWiRDuyyf1kSU3JbBBnsrkyK6FQ`, then passed isolated core mutation on
  `dpl_3rvcJ6hKWsbq1dWvpvCmBCDPjFUS`, and customer-ready mutation on the final
  deployment.
- VIP final candidate passed aliasless and fixed-URL auth/read smoke before and
  after promotion.
- public availability and seat availability returned 200; public hold write
  returned `403 public_booking_disabled`.
- final Website/VIP deployments had unexpected `5xx` 0 in the post-release
  observation window.
- provider sent delta and provider delivery logs were 0.

Release-specific Trial and PR-5 protection bypasses were revoked. Vercel's
required automation environment-variable entry and the unrelated pre-existing
Website C7 staging webhook entry remain; neither has a Trial/PR-5 note.
`GHOST_VIP_TRIAL_RUN_ID` was removed from staging.

## UI coverage

The final candidate passed List/Floor/Chart, queue and Inspector on Chromium
desktop 1440×900, Chromium mobile 375×812 and 320×568, and direct WebKit
iPad-landscape 1194×834. Important targets were at least 44px, horizontal
overflow was 0, console errors were 0 and logout passed. Physical iPad Safari
was unavailable; the single named witness handoff is recorded in final QA.
