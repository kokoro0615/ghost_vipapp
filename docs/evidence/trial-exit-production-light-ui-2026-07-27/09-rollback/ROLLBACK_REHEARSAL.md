# Rollback rehearsal

Status: `HOLD_PERMANENT_CREDENTIAL_COMPATIBILITY_UNPROVEN`

Before promotion, prove the exact rollback artifacts are READY and work with
the permanent Basic/PIN, or can be rebuilt safely with the frozen environment
manifest. Old Trial credentials are not a valid rollback dependency.

Rehearsal order:

1. set VIP/admin mutation flags off;
2. prove UI read-only;
3. verify the intended VIP rollback deployment without moving the alias;
4. verify the intended Website rollback deployment without moving the alias;
5. prove current permanent authentication or a simultaneous safe rotation;
6. record expected environment differences;
7. inspect logs, audit and active sessions.

During an authorized incident, apply the same order and only then use
`vercel rollback <exact-deployment>`. Database rollback is forward-compatible;
do not run a down migration or delete applied schema.
