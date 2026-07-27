# GHOST VIP Manager — State Matrix

## Purpose

This matrix defines the shared, GHOST-owned state grammar for the customer demo. It is an implementation contract, not a visual copy of any reference product.

Every state uses at least two cues. Color may reinforce meaning, but text, icon, border, control state, or position must carry the same meaning without color.

## Surface contract

- Canvas: warm white.
- Operational panes: white, separated by 1px champagne or warm-neutral hairlines.
- Primary text and actions: graphite.
- Selection and focus: restrained champagne/bronze, never blue or purple.
- Important controls: at least 44px touch target.
- Dense data rows: 40–48px.
- Radius: 0–6px.
- No shadows as primary separation, gradients, glass, nested card piles, or dark major chrome.
- Active geometry is limited to `VIP-1` through `VIP-8`.

## Cross-surface matrix

| State | List / queue | Floor / Chart | Inspector / form | Non-color cues | Required behavior |
|---|---|---|---|---|---|
| Loading | Skeleton rows preserve column widths; controls that depend on data are unavailable | Grid and official table geometry remain visible with neutral placeholders | Section labels remain visible; submit action is unavailable | Progress label, animated indicator, `aria-busy` | No stale selection is presented as current; no layout jump that moves the primary action |
| Empty | One inline empty row spans the data region | Empty time range or unoccupied table nodes remain structurally visible | Contextual next action appears without decorative illustration | Empty-state heading, plain explanation, action label | Search-empty, date-empty, and filter-empty are distinct; clear-filter action only appears for filtered emptiness |
| Selected | Leading marker and inset graphite/champagne rule on exactly one row | Matching reservation or table receives a solid outline and label marker | Inspector title mirrors the selected entity type and revision | Selection icon, `aria-selected`, persistent border | Selection stays linked across List, Floor, Chart, queue, and Inspector |
| Hover | Hairline or background emphasis only; row geometry does not move | Node/bar outline strengthens without exposing a hidden-only action | Control affordance may strengthen but content does not reflow | Pointer cursor only on actionable targets | Hover is optional enhancement; every action remains available by keyboard and touch |
| Focus | 3px bronze/graphite focus ring with adequate offset | Focus order follows view navigation, queue, workspace, then Inspector | First invalid field or sheet heading receives programmatic focus | Visible focus ring, accessible name, focus order | No focus trap except an open modal/bottom sheet; closing returns focus to the invoker |
| Disabled | Label remains readable; unavailable action does not disappear | Non-actionable geometry stays legible | Reason is adjacent or available through described text | Disabled attribute, lock/prohibition icon, reason text | Disabled controls never submit or mutate; reason is not encoded only by opacity |
| Conflict | Affected row and field are marked; current saved value remains visible | Conflicting table/time/block receives outlined collision region | Inspector shows conflict summary, local draft, current revision, and explicit resolution actions | Conflict badge, warning icon, field message, revision text | No silent overwrite; reload, revise, or cancel are explicit; Production fallback is forbidden |
| Warning | Warning row remains in normal sort order | Relevant node/time range receives an ochre outline, not a filled wash | Warning is placed before the primary action and is dismissible only when safe | Warning label, icon, border, described relationship | Warnings do not impersonate errors; save remains available only when the contract allows it |
| Offline / read-only | Mutation actions become unavailable; browsing and local draft review remain possible | Current cached geometry remains visible with stale-state marker | Persistent read-only banner and last known revision appear | Offline icon, “read-only” text, disabled controls | Demo mutation stops immediately when lease cannot be proven; no Production read fallback |
| Realtime gap | Row data is held while refresh is requested | Selection remains anchored by stable synthetic identifier | Gap message offers full local reload | Gap label, revision numbers, refresh icon | On revision discontinuity, reload the whole demo envelope before new mutation |
| Near expiry | Stable ribbon appears without hiding navigation | No geometry change | Remaining access time appears beside mutation actions | Clock icon, exact JST expiry text, persistent ribbon | Begins early enough to complete or cancel a task; lease still governs every mutation |
| Expired | Data rows are replaced by an expired access boundary | Floor/Chart content is not exposed as fallback | Login/session actions for demo are unavailable; reset is not offered as re-entry | Expired heading, timestamp, lock icon | Within 60 seconds of expiry, mutation stops; local synthetic envelope is purged on next load; Owner lane is untouched |
| Reset pending | Current workspace remains unchanged | Current selection remains visible behind modal inert layer | Confirmation names the synthetic scope and consequences | Destructive-action label, confirmation heading, cancel action first | No reset before explicit confirmation; Owner cookie/data/API remain untouched |
| Reset complete | Deterministic baseline rows replace the prior revision | Baseline geometry and selection are restored | Inspector reports new baseline revision; toast is secondary | Completion text, new revision, audit entry | Reset is one atomic local write and is itself recorded in synthetic audit history |

## State precedence

Highest precedence wins:

1. Expired.
2. Offline/read-only or invalid lease.
3. Realtime revision gap.
4. Conflict.
5. Validation error.
6. Warning.
7. Loading.
8. Empty.
9. Selected/hover/focus.

Focus remains visible even when another state is active. A selected entity may also be in warning or conflict, and both labels must remain exposed.

## Control-level grammar

| Control | Rest | Active / selected | Invalid | Disabled |
|---|---|---|---|---|
| Primary action | Graphite fill, white label | Pressed state uses inset border, not motion | Action remains in place; summary links to invalid fields | Warm-neutral fill, readable label, adjacent reason |
| Secondary action | White fill, graphite border | Champagne inset rule | Field-level message and warning icon | White fill, muted graphite, disabled attribute |
| Tab / view switch | Plain text with hairline boundary | Graphite text, champagne underline, selected semantics | Not used for form validation | Visible but unavailable only when access boundary requires it |
| Row | White or warm-white stripe | Leading marker plus inset rule | Row badge and message linkage | Readable locked row with reason |
| Table node / chart bar | White fill, graphite outline | Solid outline and label marker | Collision outline and conflict badge | Locked icon and non-actionable semantics |
| Field | White fill, graphite hairline | Bronze focus ring | Red/ochre border plus message and error summary link | Readable value, locked styling, reason text |

## Authentication and demo-state cues

- Login includes a non-color `DEMO` text cue and exact demo window before PIN entry.
- The authenticated shell repeats `DEMO` in a persistent service ribbon.
- The ribbon includes synthetic-only scope and exact expiry in JST.
- Demo and Owner lanes never share success copy, cookie state, or transport fallback.
- Near-expiry and expired states are determined from server-validated lease time, not browser display time alone.

## Responsive rules

- Desktop may show queue, primary workspace, and Inspector simultaneously.
- iPad landscape keeps the workspace visible while queue and Inspector collapse independently.
- Mobile is List-first; Floor and Chart remain one explicit action away.
- Mobile Inspector and create/edit flows use a bottom sheet with a fixed primary action.
- At 320px, no page-level horizontal overflow is permitted. Long Japanese and English labels wrap or truncate with an accessible full label.
- Hover-only states have no required information.

## Acceptance checks

- Every matrix row has a text or icon cue independent of color.
- Focus remains visible in all states, including conflict and disabled-adjacent controls.
- Selection is consistent across all operational surfaces.
- Conflict never performs last-write-wins silently.
- Offline, gap, expired, and storage-error states never expose Production data or transport.
- Reset is confirmable, atomic, synthetic-only, and auditable.
- Visual audit finds no blue/purple major chrome, dark pane, soft-shadow separation, or radius over 6px.

