# Apple HIG publication patterns — research record

## Measured website family

- global nav: 44px, `#fafafc`, no shadow/blur
- article: three-step ink, 17/25 body, 600–700 headings
- filter: 40px high, 1px `#d2d2d7`, 12px radius
- table: strong header rule, light 1px row separators, 10px cells
- note: `#f5f5f7`, 16px inset, 15px radius

These are values from the documentation website shell, not normative UIKit or
AppKit component metrics.

## Official guidance carried forward

- minimize type families and avoid very light interface weights
- communicate hierarchy through deliberate weight, size, ink, alignment
- keep controls distinct from content
- group related information and preserve reading order
- support 200% enlargement, contrast, non-color cues, alternate input
- use materials semantically and sparingly

## GHOST use

Use the guidance, not the publication chrome. Retain GHOST 44px controls,
2/3/4px radius, solid warm-white/white planes, champagne focus, dense geometry,
and existing breakpoints. Reject Liquid Glass, Apple font/Symbol assets, blue,
15px notes, website navigation, and editorial spacing.

Evidence: `../APPLE_HIG.md` and `../raw-hig/`.
