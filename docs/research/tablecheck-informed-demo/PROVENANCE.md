# GHOST VIP Manager — Research Provenance

## Scope and privacy

This research supports a GHOST-owned operations interface. It records only abstract layout hierarchy, information density, interaction roles, responsive task models, and state behavior.

It does not retain screenshots, reference-product brand elements, wording, assets, fonts, style rules, document structure, private service interfaces, customer information, staff information, credentials, tokens, or private venue/account references.

## Live observation record

| Field | Record |
|---|---|
| Date | 2026-07-27 JST |
| Method | Owner-authorized, authenticated browser session observed through a read-only browser connector |
| Interaction boundary | Navigation, view switching, temporary selection, form open/close, focus, responsive emulation |
| Mutation count | 0 |
| Saved raw artifacts | 0 in repository |
| Data handling | Operational content was neither transcribed nor retained; only GHOST abstractions were written |

The live observation established:

- A dense desktop reservation editor can keep scheduling inputs, operational details, and a persistent validation/action Inspector in one task surface.
- Floor operations benefit from direct category switching and a searchable operational rail.
- Loading, empty, selected, focus, hover, and disabled states must preserve dense operational geometry.
- A narrow reference viewport retained desktop columns and clipped. GHOST explicitly rejects that behavior and requires a mobile-specific List-first wizard and bottom-sheet Inspector with zero page overflow.

Conflict, warning, history, offline, realtime-gap, expiry, and reset treatment in these specifications is derived from existing GHOST production contracts and the execution prompt. It is not represented as a pixel observation of the reference UI.

## Public first-party sources

The following official public materials were used only to validate feature topology and responsibility boundaries:

- [Reservation management: floor, chart, and block concepts](https://www.tablecheck.com/ja/join/features/reservation-management/)
- [Reservation creation and customer-information workflow](https://www.tablecheck.com/ja/join/features/reservation-and-table-management/)
- [Operations, seating, and door-waitlist concepts](https://www.tablecheck.com/en/join/features/enhance-operations/)
- [Staff-to-table assignment announcement](https://www.tablecheck.com/ja/join/about-us/press/2026630tablecheck/)
- [Public API component boundaries](https://tablecheck.atlassian.net/wiki/spaces/API/pages/44859761/Components)
- [Terms and intellectual-property boundary](https://www.tablecheck.com/en/join/terms/)

Release and rollback semantics are grounded in Vercel’s official materials:

- [CLI production deployment and staged deployment](https://vercel.com/docs/cli/deploying-from-cli)
- [Promotion of a verified deployment](https://vercel.com/docs/deployments/promoting-a-deployment)
- [Instant rollback](https://vercel.com/docs/instant-rollback)
- [Deployment protection](https://vercel.com/docs/deployment-protection)

## Transformation rules

For every observed or documented concept:

1. Preserve only the operational problem and interaction relationship.
2. Replace visual identity, terminology, content, and assets with GHOST-owned design and language.
3. Use warm-white canvas, white panes, graphite actions, champagne hairlines, and the real GHOST `VIP-1`–`VIP-8` geometry.
4. Prefer task completion, scanability, keyboard access, touch access, exception handling, and auditability.
5. Reject any responsive behavior that clips, overflows, or preserves a desktop multi-column editor on mobile.
6. Keep demo data synthetic and browser-local, with no Production fallback.

## Source confidence

| Requirement area | Primary evidence | Confidence |
|---|---|---|
| Dense desktop editor and action Inspector | Authenticated read-only observation | High for structure; no source pixels or copy retained |
| Floor categories and searchable rail | Authenticated read-only observation | High for interaction topology |
| Reservation, floor, chart, block, waitlist, customer, and staff concepts | Official public product materials | High for feature boundary |
| Mobile List-first wizard and bottom sheet | GHOST explicit contract | Authoritative |
| Conflict, revision, audit, offline, gap, expiry, reset | Existing GHOST production/demo contracts | Authoritative |
| Deployment, promotion, rollback, protection | Official Vercel documentation | High |

## Exclusions

- No reference-product mutation occurred.
- No application source mutation occurred.
- No source code, test, package, deployment, environment, database, or provider state was changed by this research lane.
- No claim is made that GHOST reproduces the exact visual identity or private behavior of another product.
