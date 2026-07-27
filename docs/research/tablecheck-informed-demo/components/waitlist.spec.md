# Waitlist Workspace

## Outcome

Manage a synthetic arrival queue from intake through call, expiry, cancellation, or seating, while preserving scan speed and reservation linkage.

## Layout

- Queue rail groups current, called, and resolved items without card piles.
- Each 40–48px row shows queue position, party size, elapsed time, status text, and linkage marker.
- Search and status filters remain above the rail.
- Desktop may show queue, Floor/List, and Inspector together.
- Mobile opens a full-height bottom sheet with sticky filters and fixed primary action.

## Actions

- Create synthetic waitlist entry.
- Call locally with an explicit “no external delivery” result.
- Expire.
- Cancel.
- Seat and link to a new or existing synthetic reservation.
- Reorder only when the resulting audit event records the change.

No action sends email, SMS, LINE, push, webhook, or provider request.

## Interaction

- Selecting a queue row opens its Inspector and highlights a linked reservation/table when present.
- Seating launches a compact schedule/table step and applies the same conflict validator as reservation creation.
- Call action writes only a local call-attempt audit marker.
- Resolved items leave the active queue but remain available in history/filter results.
- Mutation requires a valid lease and current entity version.

## States

- Empty distinguishes “no queue today” from “no filter results.”
- Called, expired, cancelled, and seated use text and icon cues.
- A stale item requires reload/revise/cancel.
- A table/block collision prevents seating and identifies the conflicting time range.
- Offline/read-only keeps queue history visible but disables mutation.
- Near-expiry shows remaining access in the service ribbon and action sheet.

## Accessibility

- Queue order is exposed in text, not only visual position.
- Row actions are reachable without hover.
- Focus order follows filters, queue rows, then Inspector.
- Reordering, if implemented, has keyboard controls and an announced result.
- Mobile sheets trap focus only while open and return focus on close.

## Acceptance

- Create, local call, expire, cancel, and seat/link persist after refresh.
- Seating updates queue, reservation, table assignment, audit, entity version, and board revision atomically.
- Active/resolved filters and search are deterministic.
- No external-delivery or Production business request occurs.

