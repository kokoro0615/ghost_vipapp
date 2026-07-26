# Aliasless production smoke manifest

Status: `HOLD_ALIASLESS_CANDIDATES_NOT_AVAILABLE`

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
