# Synthetic Customer Workspace

## Outcome

Edit a clearly synthetic customer profile, attributes, and reservation linkage while preventing real-person data from entering the demo workspace.

## Scope

- Create/edit a synthetic profile label and permitted demo attributes.
- Link, unlink, and relink a synthetic reservation.
- Show local reservation history and audit history.
- Reject input that resembles real contact, secret, token, payment, or social-identity data.

No Production search, CRM lookup, export, notification, or provider call is available.

## Layout

- Desktop: reservation context and customer detail share a split Inspector.
- Mobile: customer detail is a bottom-sheet step reachable from reservation create/edit and the selected reservation Inspector.
- Sections use headings and hairlines: identity cue, attributes, linked reservations, audit.
- No profile card pile, large avatar, decorative summary, or soft shadow.

## Input policy

- The profile must be visibly synthetic.
- Contact-like values are rejected unless explicitly allowed by the shared synthetic validator.
- Phone, payment, external account, image upload, and free-form real-person lookup are unavailable.
- Notes accept only synthetic operational content.
- Rejection explains the permitted synthetic format without echoing the rejected value.

## Interaction

- Link/relink displays the target synthetic reservation and current revision.
- Unlink requires confirmation and does not delete either entity.
- Save validates lease, input policy, entity version, linkage integrity, and idempotency.
- Profile and linkage changes write atomically with audit history.
- History is read-only and ordered by revision/time.

## States

- Empty customer linkage offers create/link actions.
- Selected profile stays linked to selected reservations.
- Validation errors appear inline and in the Inspector summary.
- Stale version shows current revision and explicit recovery actions.
- Offline/read-only preserves review but disables save/link/unlink.
- Near-expiry keeps the exact expiry visible.

## Accessibility and privacy

- Every attribute has a visible label.
- Validation does not rely on placeholder text.
- Rejected values are not logged, audited, or displayed in error summaries.
- Icon-only linkage actions have accessible names.
- Mobile primary action is fixed and meets 44px.

## Acceptance

- Synthetic edit, attributes, link, unlink, and relink persist after refresh.
- Real-looking or secret-like input is rejected before storage.
- Audit records the field category and revision, not rejected/raw private values.
- Demo mode performs no Production customer read or business request.

