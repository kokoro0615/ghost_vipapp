# Table Block Workspace

## Outcome

Create, update, cancel, and repeat a synthetic operational block over official GHOST table/time geometry.

## Layout

- Entry point is available from Floor, Chart, and the operational category rail.
- Desktop uses a compact Inspector editor beside the affected geometry.
- Mobile uses a step sheet: schedule → tables → reason/repeat → review.
- Block visuals use a neutral hatch or pattern, outline, lock icon, and label; color alone is insufficient.

## Fields

- Business date.
- Start and end time.
- One or more of `VIP-1` through `VIP-8`.
- Block scope/category defined by the GHOST contract.
- Synthetic operational reason.
- Optional repeat rule constrained to the demo date window.

## Interaction

- Creating previews affected table/time regions before commit.
- Update begins from current block version.
- Cancel requires confirmation and retains an audit history entry.
- Repeat expands to an explicit occurrence summary before commit.
- Any repeated result outside `2026-07-27` through `2026-08-27` is rejected.
- Mutation is atomic across block, board revision, and audit history.

## Conflict behavior

- Reservation overlap prevents commit unless the GHOST contract explicitly permits that block category.
- Block overlap identifies the existing block and affected tables/times.
- Stale version offers reload, revise, or cancel; no merge is automatic.
- Offline, missing lease, realtime gap, and expiry disable commit.
- Preview never changes saved state.

## Responsive and accessibility

- Floor/Chart remains visible beside the desktop editor.
- On mobile, the sheet provides an accessible summary of selected tables and time ranges without requiring the canvas.
- Table selection is keyboard-operable and has selected semantics.
- Conflict regions have text equivalents.
- Important targets meet 44px and the page has no horizontal overflow.

## Acceptance

- Create/update/cancel/repeat operate only on the synthetic envelope.
- Repeat cannot create an occurrence outside the exact demo window.
- Only official GHOST tables can be selected.
- Reservation and block conflicts are deterministic and non-destructive.
- No Production or external-provider request occurs.

