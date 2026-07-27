# Reservation Create/Edit Workspace

## Outcome

Create or edit one synthetic reservation while keeping schedule, assignment, operational details, validation, and save state visible and auditable.

## Desktop and iPad landscape

Use a dense single-screen editor, not a marketing form or stack of cards.

- Header: mode, business date, draft/saved state, close.
- Scheduling band: date, start time, duration/end time, guest count, confirmation/service state.
- Main body: table assignment, source/category, operational markers, reservation notes, synthetic customer link, and optional order/service details.
- Persistent Inspector: progress, validation summary, conflict summary, current revision, audit preview, cancel, and primary save action.
- Section separation uses hairlines and headings; no floating panels or decorative shadows.

The primary save action stays visible. The body may scroll, but header and Inspector action area remain anchored.

## Mobile

Use a step wizard:

1. Schedule.
2. Table and service.
3. Synthetic customer.
4. Notes and markers.
5. Review and save.

Each step shows one task group, progress text, Back, and a fixed Continue/Save action. The review step exposes revision and conflict risk. Inspector detail opens as a bottom sheet; desktop columns are never preserved by clipping.

## Interaction contract

- Create begins with deterministic defaults inside the allowed business-date window.
- Edit begins from the selected saved revision.
- Table choices are only `VIP-1` through `VIP-8`, plus unassigned where allowed.
- Schedule and assignment validation run before mutation.
- Saving performs lease check, synthetic-input validation, stale-version check, conflict check, atomic local write, revision increment, and audit append.
- Cancel with an unchanged draft closes immediately.
- Cancel with changes requires discard confirmation.
- Reopening a saved item restores the saved revision, not an abandoned draft.

## States

- Loading preserves the editor shell.
- Empty optional sections show an inline add action.
- Invalid fields have message text and appear in the Inspector summary.
- Warning permits save only when the rule allows it.
- Conflict shows saved value, draft value, and explicit reload/revise/cancel choices.
- Offline/read-only disables save while preserving the draft for review.
- Near-expiry keeps the exact expiry visible beside the primary action.
- Expired closes mutation paths and never loads Production data.

## Keyboard, touch, and accessibility

- Form order follows visual order.
- Inspector validation links focus the corresponding field.
- Date/time controls expose accessible names and values.
- Important controls meet 44px; desktop density comes from spacing, not smaller targets.
- Enter does not submit from a multiline note.
- Escape closes only the topmost dialog/sheet and restores focus.
- Error summary is announced once after failed validation.

## Data boundary

- Synthetic demo envelope only.
- No real-person lookup or free-form real contact entry.
- No notification, payment, provider, public booking, or Production business request.
- Failed demo storage enters read-only/error state without Production fallback.

## Acceptance

- Desktop completes create/edit without navigating away from the operational workspace.
- Mobile completes the same task at 320px with no page overflow.
- Save is always subordinate to lease, validation, version, and conflict checks.
- Selection and revision update in List, Floor, Chart, queue, and Inspector after one atomic write.
- Cancel/discard, conflict recovery, offline, near-expiry, and expired flows are testable.

