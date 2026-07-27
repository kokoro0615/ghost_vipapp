# Reservation Command Center

## Outcome

Apply one high-frequency operational command to the selected synthetic reservation with minimal navigation and complete local auditability.

## Commands

The center exposes exactly six command families:

1. Check-in.
2. Arrival-time correction.
3. Service-status change.
4. Table assignment or unassignment.
5. Seat extension.
6. Operational note.

These are demo-local actions. They do not trigger messages, payments, providers, webhooks, or Production writes.

## Layout

- Desktop: a compact command rail in the persistent Inspector.
- iPad landscape: collapsible Inspector section that keeps the workspace visible.
- Mobile: bottom-sheet command picker followed by a focused command form.
- Current reservation, current state, table, time, revision, and lease state remain visible.
- Primary action is graphite; secondary/cancel actions are white with hairlines.

## Interaction

- Opening requires one selected reservation.
- Each command begins from the current entity version and board revision.
- A command-specific reason is required where the production contract requires accountability.
- Confirmation summarizes the exact local change before commit.
- Commit performs lease, transition, schedule/table, version, and idempotency checks.
- Success updates every linked surface and appends one synthetic audit event.
- Repeating the same idempotency key returns the prior result without a second mutation.

## State and conflict rules

- Invalid transitions are disabled with adjacent reason text.
- Table or time conflicts show the collision target and resolution choices.
- Stale version shows current and attempted revision; no silent overwrite.
- Offline, expired, or unproven lease makes all command commits unavailable.
- Realtime gap forces full envelope reload before another command.
- Optimistic presentation rolls back visibly if validation fails.

## Command-specific requirements

| Command | Required input | Completion evidence |
|---|---|---|
| Check-in | Current eligible state | State label, timestamp, audit entry |
| Arrival correction | Synthetic arrival time and reason | Previous/new time and audit entry |
| Service status | Allowed next state | Transition text and audit entry |
| Assignment | Official table or unassigned | Linked Floor/Chart/List update |
| Extension | Allowed duration increment | New end time and conflict result |
| Note | Synthetic operational note | Note revision and audit entry |

## Accessibility and density

- Every icon has a visible or accessible label.
- Status is never conveyed by color alone.
- Disabled reason is available without hover.
- Focus moves to the command heading, then input, then confirmation.
- Closing restores focus to the invoking command.
- All important targets are at least 44px.

## Acceptance

- All six commands persist locally and survive refresh.
- Each success increments entity and board revision exactly once.
- Audit includes actor mode, command, before/after summary, time, and revision without private data.
- Cross-surface selection remains stable.
- Demo command network ledger contains no Production business request.

