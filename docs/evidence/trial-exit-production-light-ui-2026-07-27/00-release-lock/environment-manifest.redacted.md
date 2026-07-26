# Environment manifest (redacted)

Frozen: 2026-07-27 02:17 JST. Secret values are intentionally omitted.

## VIP App Production environment

| Key | Frozen state |
|---|---|
| `GHOST_VIP_TRIAL_MODE` | `true` |
| `GHOST_ADMIN_API_ORIGIN` | configured HTTPS origin; not Website production |
| `GHOST_BACKEND_PROTECTION_BYPASS` | present |
| `VIPAPP_BASIC_USER` | present |
| `VIPAPP_BASIC_PASSWORD` | present |

This is still the Trial build environment and is not acceptable for the final
production candidate.

## Website staging environment

| Flag | Frozen value |
|---|---|
| `GHOST_VIP_TRIAL_MODE` | `true` |
| `FEATURE_PUBLIC_BOOKING_ENABLED` | `false` |
| `FEATURE_ADMIN_MUTATION_ENABLED` | `true` |
| `FEATURE_VIP_FLOOR_V2_READ_ENABLED` | `true` |
| `FEATURE_VIP_FLOOR_V2_MUTATION_ENABLED` | `true` |
| `FEATURE_VIP_FLOOR_DUAL_WRITE_ENABLED` | `false` |
| `FEATURE_VIP_FLOOR_V2_SHADOW_COMPARE_ENABLED` | `false` |
| `FEATURE_VIP_CUSTOMER_PROFILE_WRITE_ENABLED` | `true` |
| `FEATURE_WEBHOOK_PROCESSING_ENABLED` | `false` |
| `FEATURE_LINE_NOTIFICATIONS_ENABLED` | `false` |
| `FEATURE_EMAIL_NOTIFICATIONS_ENABLED` | `false` |

Staging contains separate Supabase/admin/customer secrets. Production Stripe,
LINE, and email-provider secret values were not copied into this evidence.

## Website Production environment

The pre-candidate production environment has the existing public booking,
Stripe, LINE, webhook, Supabase, worker, and admin keys. New VIP v2
read/mutation/customer flags are absent. Existing public/provider values must
not be bulk-replaced during VIP release preparation.

The required initial production candidate values are:

```text
FEATURE_VIP_FLOOR_V2_READ_ENABLED=true
FEATURE_ADMIN_MUTATION_ENABLED=false
FEATURE_VIP_FLOOR_V2_MUTATION_ENABLED=false
FEATURE_VIP_FLOOR_DUAL_WRITE_ENABLED=false
FEATURE_VIP_FLOOR_V2_SHADOW_COMPARE_ENABLED=false
FEATURE_VIP_CUSTOMER_PROFILE_WRITE_ENABLED=false
```

Provider delivery, dual-write, and shadow compare remain outside the automatic
promotion scope and require separate approval.
