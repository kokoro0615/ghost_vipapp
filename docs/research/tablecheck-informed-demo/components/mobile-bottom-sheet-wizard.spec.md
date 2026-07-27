# Mobile Bottom Sheet and Wizard

## Outcome

Complete the full operator workflow at 320–390px without preserving clipped desktop columns, losing the primary action, or introducing page-level horizontal overflow.

## Mobile information architecture

- Default route is List-first.
- Floor and Chart are each reachable in one explicit view-switch action.
- Queue is reachable from a labeled operational action with an active-count text cue.
- Inspector opens as a bottom sheet from a selected row, table, bar, or queue item.
- Create/edit, command, block, waitlist seat, staff assignment, and customer edit use short step flows.

## Sheet geometry

- Sheet has accessible heading, close action, drag affordance only as a supplement, scrollable body, and fixed action footer.
- It opens at a useful task height and may expand to near-full height.
- Page behind becomes inert while modal.
- Footer respects safe-area inset.
- Radius remains within 0–6px; separation uses a hairline, not a shadow.
- Sheet width is the viewport; no off-canvas clipping.

## Wizard contract

- Progress is expressed as text and ordered steps.
- Each step contains one coherent task group.
- Back preserves validated draft state.
- Continue validates only the current step; Review validates the full draft.
- Final save repeats lease, version, conflict, and input-policy checks.
- Closing a changed draft requires discard confirmation.
- Reopening after discard starts from saved state.

## Navigation and focus

- Opening focuses the sheet heading or first required field.
- Focus remains within a modal sheet and returns to the invoker on close.
- Browser Back closes the current sheet/step before leaving the workspace where routing permits.
- Escape closes only the topmost layer.
- Screen-reader announcements cover step progress, validation summary, conflict, and save result.

## Visual and touch requirements

- Important targets are at least 44px.
- Dense rows may be 40–48px only when the entire row is not the sole touch target; embedded primary actions remain 44px.
- Labels wrap safely; values use tabular numerals where relevant.
- Sticky headers and footers never overlap focused inputs.
- Virtual keyboard does not hide the active field or final action.
- No hover-only control or information.

## State behavior

- Loading retains sheet dimensions and heading.
- Empty steps provide one plain next action.
- Conflict replaces the action summary without dismissing the draft.
- Offline/read-only freezes mutation controls and preserves review.
- Realtime gap requires a full synthetic-envelope reload.
- Near-expiry appears in both the service ribbon and sheet action area.
- Expired closes mutation layers, purges on next load, and never changes to Owner/Production content.

## Acceptance

- Test at 390×844, 375×812, and 320×800.
- Page-level horizontal overflow is zero.
- Every primary workflow completes by touch and keyboard.
- Fixed primary action remains reachable with long Japanese/English labels and virtual keyboard.
- Floor/Chart can be left without losing the selected entity.
- Axe actionable finding count is zero.

