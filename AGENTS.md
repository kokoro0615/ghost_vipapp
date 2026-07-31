# GHOST VIP Manager Agent Rules

## Production source of truth

For `https://ghost-vipapp.vercel.app/`, do not infer current behavior from a
sibling project or an older admin implementation.

1. Read `/home/kokoro/projects/clients/ghost/docs/AI_CURRENT_STATUS.md`.
2. Resolve the current Production commit and confirm this checkout with
   `git rev-parse HEAD`.
3. Use `src/components/admin/vip-floor-v2` for the current operator UI and
   `src/app/api/admin/vip-floor` for its BFF adapters.
4. Use `/home/kokoro/projects/clients/ghost/website/src/app/api/admin/v2` and
   its v2 contracts only for the canonical backend boundary.
5. Never use
   `/home/kokoro/projects/clients/ghost/website/src/components/admin/VipFloorDashboard.tsx`
   to answer whether a standalone VIP Manager control exists. That file is a
   legacy website-admin surface.
6. Before claiming that a Production control exists, confirm it in both the
   exact deployed source and a rendered UI or an exact contract test.

Run `node --test tests/contract/source-of-truth-guard.test.mjs` after changing
the source boundary, and keep `README.md` aligned with this file.

## Operator UI

Read `docs/DESIGN.md` first. It is the canonical contract for this app's locked
decisions, tech stack and authoring conventions, and it takes precedence over
the workspace-wide `.claude/rules/ui-ux-excellence.md`, which is written for the
public marketing site and assumes Tailwind and an animation runtime that this
app does not have. Styling here is CSS Modules plus the OKLCH tokens in
`src/app/globals.css`; Tailwind, CSS-in-JS, component libraries and animation
libraries are banned.

`docs/ui/OPERATIONS_PAPER.md` carries the visual language: warm-white paper,
white panes, graphite actions, restrained champagne hairlines, real GHOST floor
geometry, dense List / Floor / Chart / queue / inspector workflows. Do not copy
TableCheck assets or branding, and do not introduce generic SaaS cards,
glassmorphism, large radius, decorative gradients, or soft shadow stacks.

Destructive or financially adjacent actions require an explicit confirmation
step, least-destructive initial focus, version/idempotency checks, a durable
audit trail, and typed recovery. Demo actions must stay browser-local and must
never call Production business or provider endpoints.
