# Final QA acceptance

Outcome: `HOLD_REQUIRED_GATES`

QA may report `PRODUCTION_READY` only when all of the following evidence is
bound to the same source/deployments:

- PR-5 complete staging regression and cleanup;
- six-viewport screenshot/axe/computed-style QA;
- physical iPad landscape Safari witness;
- encrypted production logical dump and isolated restore PASS;
- exact 24 migration checksums with Trial migrations excluded;
- aliasless Website and VIP smoke PASS;
- fresh Owner approvals for cleanup, DB, Website, VIP and mutation waves;
- permanent credentials and authenticated rollback;
- provider delivery, real-customer mutation, orphan, console error and 5xx zero;
- Trial credentials, sessions, bypass, env, mode and temporary files revoked
  after production stability.

Until then, report the narrow achieved state and an explicit `HOLD_<REASON>`.

## 2026-07-27 maintenance runtime evidence

- maintenance=true exact build/runtime: `PASS`
- outer Basic guard: unauthenticated request returned `401`
- maintenance anchor copy: present
- PIN, workspace, mutation form controls: absent
- final maintenance=false rebuild: `PASS`
- final false-mode hydrated PIN screen: `PASS`

The latest exact `npm run ci` passed lint, typecheck, unit 11/11, contract 33/33,
PII-safe artifact scan, production build, maintenance true/false runtime and
the 216-screenshot light UI matrix. Automated light UI acceptance is PASS.

The overall release outcome remains `HOLD_REQUIRED_GATES`: staging release
candidate live regression/cleanup, production logical dump plus isolated
restore, Gate A–E Owner approvals, final production candidate proof, physical
iPad Safari and post-promotion rollback/revocation evidence are not complete.

The customer fixed URL is now the authenticated read-only maintenance anchor
`dpl_6zRMGjhUo7HLwAcuWAKRMVKxZg7C`, after separately approved retirement of
the exact Trial run's two active sessions. Maintenance fixed-URL smoke passed
and non-expired active Trial sessions are zero. This is Trial shutdown
evidence, not final Production readiness or Gate A cleanup evidence.
