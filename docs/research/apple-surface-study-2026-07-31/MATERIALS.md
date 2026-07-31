# Materials — solid-surface translation

Date: 2026-07-31 JST

## Measured reference values

| Role | Apple product pages | HIG website sample |
|---|---|---|
| primary light ink | `rgb(29,29,31)` | `rgb(29,29,31)` |
| secondary light ink | `rgb(110,110,115)` | common `rgb(81,81,84)` / `rgb(110,110,115)` |
| canvas | `rgb(245,245,247)` | publication canvas white; nav `rgb(250,250,252)` |
| quiet canvas | `rgb(250,250,252)` | note `rgb(245,245,247)` |
| pane | `rgb(255,255,255)` | article white |
| light separator | sparse/section-dependent | `1px rgb(210,210,215)` table rows |
| card radius | 28px | note/filter 12–15px |
| card shadow | none in sampled product cards | generally none; one note uses a 1px treatment |
| blur | not required for sampled hierarchy | HIG website chrome measured `none` |

## HIG semantic finding

Apple's material guidance separates foreground controls/navigation from
background content. Liquid Glass is a specific Apple platform expression for
that semantic layer, not the principle itself, and Apple says to use it
sparingly. GHOST translates the separation with opaque surfaces.

## GHOST token translation

| Token | Before | After | Reason |
|---|---|---|---|
| `--paper` | `oklch(0.958 0.0035 85)` / `#f2f1ee` | `oklch(0.968 0.0035 85)` / `#f5f4f2` | warm GHOST translation of the measured `#f5f5f7` canvas; less gray desk weight |
| `--surface` | white | white | working pane invariant retained |
| `--surface-quiet` | L `.981` | L `.984` | clearer, quieter zebra/inset role |
| `--surface-sunken` | L `.944` | L `.952` | solid chrome remains distinct without looking disabled by default |
| `--surface-hover` | L `.955` | L `.966` | hover aligns with the refined warm ramp |
| `--surface-active` | L `.932` | L `.944` | pressed remains visibly darker |
| `--rule` | L `.912` | L `.92` | reduce repetitive grid chatter while preserving 1px structure |
| raised shadow alpha | `.14/.30` | `.10/.22` | only floating surfaces receive restrained elevation |
| dialog shadow alpha | `.06/.42` | `.05/.32` | preserve modal separation without a shadow cloud |

Control borders remain at their audited 3:1 non-text contrast floor. Ink,
champagne accent, alert/warn/live states, radius 2/3/4, and the venue floor
palette do not change.

## Explicit rejections

- Liquid Glass, backdrop blur, vibrancy, translucency, floating glass stacks
- Apple blue and Apple status colors
- 28px marketing-card radius and 980px pill CTAs
- Apple dark product-story chrome outside the real venue floor artwork
- copied Apple images, video, icons, logo, copy, or section composition
- nested cards and decorative gradient treatments

The result remains GHOST Operations Paper, not an Apple visual clone.
