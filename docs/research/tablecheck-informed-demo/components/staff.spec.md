# Staff and Table Assignment Workspace

## Outcome

Maintain synthetic staff labels and assign them to official VIP tables for operational scanning, without introducing identity or account management.

## Scope

- Create or update a synthetic staff record.
- Mark active/inactive for the demo workspace.
- Assign or unassign one or more official tables.
- Show the assignment on Floor, List, Chart, and Inspector.
- Preserve assignment history in the synthetic audit log.

This is not authentication, role management, payroll, messaging, or a Production staff directory.

## Layout

- Desktop: dense staff list and assignment Inspector; Floor remains available for visual selection.
- iPad landscape: list and Floor alternate without losing selection.
- Mobile: searchable list, then an assignment bottom sheet.
- Rows are 40–48px with staff label, status text, assignment count, and conflict marker.
- No avatar requirement; initials or a staff icon may be generated from synthetic labels.

## Interaction

- New records accept only clearly synthetic staff labels.
- Table assignment uses `VIP-1` through `VIP-8`.
- A preview shows additions and removals before commit.
- Concurrent assignment changes use entity version and board revision checks.
- Deactivating a record with active assignments requires explicit reassignment or unassignment.
- Save writes staff, assignments, revision, and audit atomically.

## States

- Empty provides a single add action.
- Selected staff remains linked to highlighted table nodes.
- Conflict shows current assignment and attempted assignment.
- Disabled reason is shown for unavailable/deactivated staff.
- Offline/read-only allows review and history but no mutation.
- Expired clears demo mutation paths without revealing Owner data.

## Accessibility

- Assignment count and table codes are readable text.
- Multi-select supports keyboard, touch, and selected semantics.
- Focus order is list → assignment controls → review/save.
- Conflict and deactivation consequences are announced.

## Acceptance

- Synthetic staff create/update and table assignment persist locally.
- Only official GHOST table geometry is referenced.
- Assignment changes update all linked surfaces and audit history.
- No real staff information, Production staff lookup, account setting, or external request is used.

