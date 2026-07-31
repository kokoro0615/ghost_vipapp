# Apple product-page patterns — research record, not an implementation spec

## Repeated visual family

- lineup/buying card: solid surface, media-led, 28px marketing radius, no shadow
- title/body/price/action hierarchy: 600/400/700/400
- paddle/disclosure: 36px visual inside a 44px target where provided
- primary CTA: stable 44px geometry, immediate background-state feedback
- responsive card widths: 372 / 344 / 260px at sampled regimes

## Interaction evidence

- CTA hover/focus/pressed changes color without changing the box.
- disabled paddle preserves geometry but Apple uses opacity `.42`.
- hover-capable cards scale 1.01613 for 300ms without layout reflow.
- mobile disclosures expose content in place.

## GHOST use

Translate only stable geometry, weight economy, target-size separation, and
solid surface hierarchy. Do not implement this component family. Reject Apple
copy/media/icons/blue, 28px radius, pill CTA, disabled opacity, scale hover,
marketing widths, and section topology.

Evidence: `../APPLE_IPHONE_PAGES.md` and `../raw-iphone-pages/`.
