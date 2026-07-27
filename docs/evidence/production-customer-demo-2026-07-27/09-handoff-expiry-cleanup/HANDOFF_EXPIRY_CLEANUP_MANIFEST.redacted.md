# D9 Handoff, Expiry, and Cleanup Gate

Date: 2026-07-27 JST
Status: `PASS`

## Secure handoff

The credential handoff remains outside the repository:

`/home/kokoro/.local/share/ghost-vip-manager/production-customer-demo-20260727-2900d569ea5d/GHOST_VIP_MANAGER_PRODUCTION_CUSTOMER_DEMO_HANDOFF.json`

Directory mode is `0700`; file mode is `0600`. Values are intentionally absent
from this evidence. The handoff contains these fields:

- canonical fixed URL;
- rotated Owner Basic username/password and PIN;
- demo Basic username/password and PIN;
- exact start, expiry, and allowed business-date window;
- allowed operations;
- prohibited PII, Production transport, and external delivery;
- reset and logout instructions;
- early-revoke instructions;
- expiry behavior;
- cleanup witness instruction.

The exact demo window is `2026-07-27T00:00:00+09:00` through
`2026-08-27T23:59:59+09:00`, with allowed business dates
`2026-07-27` through `2026-08-27`, inclusive.

## Early revoke

If early revoke is required:

1. set `VIPAPP_DEMO_ENABLED=false`;
2. rotate or remove demo Basic, PIN verifier, HMAC, and workspace values;
3. build an aliasless owner-only Production candidate;
4. prove demo Basic/PIN rejected and Owner login/board/logout healthy;
5. promote the owner-only candidate once;
6. recheck Website/public/DB/provider baselines.

The prepared executable rollback anchor is
`dpl_HzWdJ6QLDaft6kN2TBeJCxR1GwMs`. It uses known-good code with the current
rotated Owner credentials and rejects demo Basic. Historical deployment
`dpl_CvFzDDArUGR8j7QyAUtXG9cQ6gxf` remains a provenance anchor, not the preferred
post-rotation executable target.

## Exact expiry cleanup

1. Code-level expiry takes effect at `2026-08-27T23:59:59+09:00`.
2. By `2026-08-28T00:15:00+09:00`, witness demo HTTP 401/410 at
   `https://ghost-vipapp.vercel.app`.
3. Create a staged Production build with demo credentials removed or rotated.
4. Smoke Owner-only access and promote that candidate.
5. Reconfirm demo session, Basic, and PIN are invalid.
6. Securely delete the repository-external credential handoff.
7. Retain only redacted expiry evidence and its hashes.

Future external scheduling is intentionally not claimed. The exact Owner
witness and owner-only promotion are the next required physical actions.

## Cleanup completed now

- browser-local synthetic stores were reset at the end of every full journey;
- final Production admin smoke sessions were retired; remaining active: 0;
- test-only Vercel automation bypasses were revoked; remaining: 0/0;
- temporary service credentials, environment pulls, bypass bodies, and project
  JSON are securely deleted after evidence preservation;
- no TableCheck screenshot, asset, copied text corpus, raw DOM, PII, or secret
  was committed.

Known residual: `none`.
