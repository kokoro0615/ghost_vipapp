# Production smoke manifest

Status: `PASS`

Observed: 2026-07-27 JST

Aliasless candidates and the final fixed URLs passed:

- unauthenticated outer request: 401;
- permanent Basic and Owner PIN login: PASS;
- session read, current board, alternate date and local search: PASS;
- direct List, Floor and Chart, queue and Inspector: PASS;
- logout cleared the browser cookie and subsequent session read returned 401;
- Trial/maintenance customer copy: absent;
- active visible tables: exact `VIP-1` through `VIP-8`;
- read-only smoke business mutations: 0;
- browser console errors and final deployment `5xx`: 0;
- provider sent delta and provider delivery logs: 0.

Public Website checks on `https://ghost-ruby-one.vercel.app`:

| Endpoint | Result |
|---|---|
| availability for `2026-07-29`, 2 guests | 200, 24 rows |
| seat availability for `2026-07-29`, 2 guests | 200, 48 rows |
| public hold POST | 403 `public_booking_disabled` |

The final fixed aliases independently resolved to Website
`dpl_Gj89YEqt6KSnxaL1fcatCpQ2Y75e` and VIP
`dpl_CvFzDDArUGR8j7QyAUtXG9cQ6gxf`.

After all authenticated smoke and mutation canaries, the dedicated Production
admin remained active while all of its temporary sessions were deleted.
Canary reservations, action requests and isolated arrival controls were 0.
