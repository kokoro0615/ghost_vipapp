# Component Spec: Shell Service Ribbon

## Role

Persistent operational header for venue identity, business date, service period,
demo/lease state, and the primary reservation-create action.

## Required content

- `GHOST OSAKA`
- `VIP Manager`
- active business date with previous/next/day-picker controls
- service-period context
- synthetic-demo cue in text and icon
- connectivity/lease state
- one graphite-filled primary create action

Do not place venue/action identity only in global navigation.

## Geometry

- Desktop target height: 50–58px.
- Warm-white shell edge with a white working surface.
- One champagne hairline along the workspace boundary.
- Horizontal padding follows an 8px rhythm.
- Controls are compact visually but expose at least 44×44px hit areas.
- Radius 0–6px; no decorative shadow.

## Responsive behavior

- 1440/1194: single row; low-priority service detail may shorten before controls
  wrap.
- 768: two rows—identity/date first, state/primary action second.
- 390/320: two compact rows; date controls and create action remain visible.
  Secondary status detail may collapse into a labeled disclosure.
- Ribbon height changes must reserve space; content may not slide underneath.

## States

- normal
- loading/reconnecting
- read-only/offline
- near expiry
- expired
- date outside demo range

Each state uses text/icon/border cues. Expired removes mutation affordance and
never offers production fallback.

## Interaction and accessibility

- Date controls have explicit accessible names including target date.
- Primary action is first in the action group and remains keyboard reachable.
- State updates use a polite live region; errors do not steal focus.
- Focus ring is at least 3px dark champagne/bronze.
- Reduced motion removes ribbon transitions.

## Acceptance

- First viewport communicates venue, product, date, active operational context,
  demo condition, and create action.
- No blue/purple/dark major chrome.
- No control below 44×44px.
- Long labels do not overlap at 320px.

