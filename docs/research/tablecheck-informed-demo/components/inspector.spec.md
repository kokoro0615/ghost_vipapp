# Component Spec: Reservation Inspector

## Role

Contextual detail and command surface for the shared reservation selection. It
shows enough information to act without replacing the active List, Floor, or
Chart workspace.

## Structure

```text
header
├─ reservation/table context
└─ collapse/close
status summary
tablist
├─ overview
├─ synthetic guest
├─ service
├─ notes
└─ history
tab panel
command area
├─ edit
└─ six GHOST reservation commands
```

The six commands are check-in, arrival-time correction, service-state change,
table assignment, seat extension, and note.

## Geometry and style

- Desktop width: 340–400px.
- White pane separated by a champagne hairline.
- Dense definition rows and audit timeline; no nested cards.
- Command targets are at least 44px high.
- Radius 0–6px and no primary shadow.

## Behavior

- Updates immediately when selection changes from any workspace.
- Collapse preserves selection and active tab.
- Edit/command opens a focused task surface while retaining origin context.
- A command is disabled with an explicit reason when state, lease, role, or
  conflict prevents it.
- Pending command is disabled and announced; success refreshes version/revision.
- Conflict preserves local input and offers reload/retry without hidden
  last-write-wins.
- No selection shows a compact prompt; empty-table selection shows table context.

## Tabs and focus

- Arrow Left/Right changes tab focus and selection; Home/End reach edges.
- Tab panel is keyboard focusable and labelled by its tab.
- Escape closes the topmost command/dialog before collapsing the Inspector.
- Closing/collapsing restores focus to the initiating row/node/bar/queue item.

## Responsive behavior

- 1440: may remain open alongside queue and primary workspace.
- 1194: independently collapsible to protect workspace width.
- 768: modal side sheet or bottom sheet according to available orientation.
- 390/320: bottom sheet with visible close control, dynamic viewport height,
  sticky command footer, and safe-area inset. It must not create horizontal
  overflow.

## Privacy and synthetic demo rules

- Guest/customer content is synthetic and visibly labeled.
- No real-looking contact, payment, social, or external-account data appears.
- History shows GHOST-local synthetic actors/actions only.
- Export, external delivery, and production fallback are absent.

## Accessibility

- Inspector is a labeled complementary region on desktop and a labeled dialog on
  mobile.
- Status and selected context are not color-only.
- Icon-only controls have useful accessible names.
- On mobile, focus is trapped while open and restored on close.

## Acceptance

- Selection changes never leave stale Inspector content.
- All six commands and edit entry are discoverable without opening secondary
  navigation.
- 320px retains readable labels and 44px actions.
- Inspector collapse/expand does not reset view, filters, or selection.

