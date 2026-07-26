# Aliasless production smoke manifest

Status: `PASS_MAINTENANCE_FIXED_URL_ONLY`

The maintenance anchor `dpl_6zRMGjhUo7HLwAcuWAKRMVKxZg7C` first passed
aliasless smoke and then, after exact session retirement and fresh Owner
approval, passed the same checks on the fixed URL:

- Vercel protection bypassed only through the authenticated CLI;
- outer Basic absent: 401;
- existing Basic present: 200;
- maintenance copy present;
- PIN, workspace, reservation search and form controls: zero;
- local session read without a PIN session: 401;
- command POST without a PIN session: 401;
- fixed URL resolved to `dpl_6zRMGjhUo7HLwAcuWAKRMVKxZg7C`;
- exact Trial run non-expired active sessions: 0;
- fixed URL session, board and command routes without a PIN session: `401`;
- recent deployment `5xx` and error-level logs: 0.

The candidate points to read-only staging backend
`dpl_FSf7tGxgDmpnnfJzNwC8kQFZAWvE`. No business mutation, provider call,
Gate A cleanup or production database change was performed.

This is PR-3 maintenance evidence only. The final Website/VIP read-only
production candidates, permanent credentials, authenticated production board,
physical iPad witness and Gate C/D approvals remain HOLD.

Required on the exact candidates before alias promotion:

- unauthenticated outer request returns 401;
- permanent Basic succeeds;
- permanent Owner PIN succeeds and creates a session;
- current-day board, alternate date and local search succeed;
- List, Floor and Chart are directly reachable;
- logout clears the session and the next session read returns 401;
- mutation requests executed: zero;
- Trial/T cues: zero;
- visible active tables: exact `VIP-1` through `VIP-8`;
- console errors and server 5xx: zero;
- provider delivery and real-customer mutation: zero.

Use only synthetic, PII-free data. Do not use `prod-e2e.mjs` for mutation.
