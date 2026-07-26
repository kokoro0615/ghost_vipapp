# GHOST VIP Manager Trial Release Draft

Status: TR-0 / TR-1 QA harness draft; not a deployment authorization.

## Canonical staging mutation lifecycle

`scripts/staging-mutation-e2e.mjs` exercises the aliasless VIP App deployment
through its existing authenticated proxy only. It does not create an E2E API
route or call Website endpoints directly.

Before any network request, the harness requires two external mode-600 files:

- `GHOST_VIPAPP_E2E_ENV_FILE`: `VIPAPP_BASIC_USER`,
  `VIPAPP_BASIC_PASSWORD`, `VIPAPP_OWNER_PIN`,
  `GHOST_VIPAPP_PROTECTION_BYPASS`, and an exact
  `GHOST_VIPAPP_ALLOW_STAGING_MUTATION=E2E削除可` confirmation.
- `GHOST_VIPAPP_TRIAL_MANIFEST_PATH`: `trialRunId`, `businessDate`, a seeded
  `reservationId`, exact VIP and backend staging origins/hosts/SHA-256
  fingerprints, absolute Website cleanup and verification script paths, and a
  separate mode-600 `websiteLifecycleEnvFile` path.

The manifest must point to exactly:

- `website/scripts/cleanup-vip-manager-trial.mjs`
- `website/scripts/verify-vip-manager-trial.mjs`

The Website scripts are invoked without forwarding their output. Their shared
CLI contract is:

```text
--confirm-staging --trial-run-id <id> --business-date <YYYY-MM-DD> --phase <before-cleanup|cleanup|after-cleanup>
```

They receive only the lifecycle env-file path in
`GHOST_VIP_MANAGER_LIFECYCLE_ENV_FILE`; they must load it themselves and must
not print it or its values. The VIP protection-bypass value is sent only as
`x-vercel-protection-bypass` on each request to the aliasless VIP deployment.

Each manifest fingerprint is the lowercase SHA-256 digest of its canonical
origin string (for example `https://host.example`), not a free-form label.
`trialRunId` must match `^trial-[a-z0-9][a-z0-9-]{7,80}$`.

After configuration validation, cleanup is mandatory even when PIN login or a
board read fails because the seed already exists. The harness logs in with
Basic plus Owner PIN, reads the canonical
`/api/admin/vip-floor?date=...` board, sends one versioned/idempotent `note`
command through `/api/admin/vip-floor/commands`, and verifies the returned
audit ID plus the board reservation version and board revision. It then invokes
the Website verifier, cleanup script, post-cleanup verifier, and logout in that
order. Once a mutation is attempted, cleanup also runs on a mutation failure.

## Safety boundary

- The public VIP alias, Website production alias, non-HTTPS origins, embedded
  credentials, manifest host/origin mismatches, invalid fingerprints, missing
  mode-600 files, missing confirmation, and non-Website cleanup paths fail
  before HTTP.
- No Basic value, PIN, protection-bypass value, session cookie,
  lifecycle-script output, or manifest contents are emitted.
- There is no VIP App audit-detail endpoint in the canonical candidate. Audit
  evidence is therefore the command response `auditLogId`; version and revision
  are independently reread from the existing board endpoint. Do not add a
  trial-only audit API to close this gap.

## Remaining integration dependency

The Website seed/verify/cleanup scripts must implement the documented shared
arguments and write the seeded reservation ID plus staging fingerprints into
the external manifest. Until that contract is available and the actual staging
environment passes the harness, this draft does not satisfy TR-4 or TR-6.
