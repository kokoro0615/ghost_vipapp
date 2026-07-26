# GHOST VIP App Rules

This repository owns the standalone GHOST Osaka VIP Floor operator app.

- Preserve the venue-specific operational intent: floor assignment, arrival queue, hold/block handling, status changes, auditability, and scan speed.
- VIP Manager is the narrow exception to the workspace black-violet rule: use a warm-white/light operator canvas, graphite text/actions, champagne hairlines, real floor geometry, and dense operational panes. Do not change the public website palette.
- The active/UI table master is exactly `VIP-1` through `VIP-8`. Trial `T1` through `T8` are cleanup-only fixtures; never rename, migrate, or visually disguise them as official tables.
- TableCheck is an information-architecture reference only. Do not copy its brand, blue, assets, CSS, DOM, fonts, wording, private data, or pixel geometry.
- Keep List, Floor, and Chart directly discoverable in primary navigation on desktop/iPad; mobile must reach each in one explicit action.
- Keep controls compact, keyboard accessible, and usable at 320px without horizontal page overflow.
- Do not introduce generic SaaS card piles, decorative glassmorphism, gradient orbs, excessive radius, or marketing copy.
- Never connect real customer data, provider credentials, payment systems, or production mutation endpoints without explicit owner approval and a documented rollout gate.
- Production DB migration, alias promotion, mutation enablement, and destructive Trial cleanup each require an exact manifest and fresh Owner approval; prompt invocation is not approval.
- Keep `src/proxy.ts` fail-closed. Never bypass the application authentication gate on a production route.
- Keep fixtures visibly labeled until a real authenticated backend is integrated.
- Run `npm run lint`, `npm run typecheck`, and `npm run build` after source changes.
