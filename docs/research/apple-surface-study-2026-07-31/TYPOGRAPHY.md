# Typography — font bake-off and role decision

Date: 2026-07-31 JST

## Reference result

The Apple Japan product pages resolved Japanese text through `SF Pro JP` and
used SF Pro Text/Display roles. Product-page body/navigation was mainly 400;
labels, titles, and large statements were mainly 600; 700 appeared selectively
on price. Ordinary tracking was `normal`; measured positive display tracking
was only about `0.196–0.231px` at 19–28px.

Apple's HIG advises a small number of typefaces, readable sizes, avoiding light
UI weights, deliberate weight/size/color hierarchy, and text enlargement that
preserves hierarchy. It does not authorize embedding Apple font files.

## Candidate licensing and availability

| Candidate | License / delivery | Cross-platform result |
|---|---|---|
| M PLUS 2 | SIL OFL 1.1; `next/font/google` self-hosted build output | consistent JP/Latin webfont; current canonical family |
| Noto Sans JP | SIL OFL 1.1; webfont possible | consistent and neutral, but more generic product voice |
| IBM Plex Sans JP | SIL OFL 1.1; webfont possible | deeper descent and stronger corporate/technical voice |
| Apple system stack | OS runtime only; no Apple font bundled | true Apple/SF Pro JP rendering not available on Linux/Windows |
| Hiragino-first stack | OS runtime fallback | true Hiragino rendering not available on this Linux host |

License sources:

- `https://github.com/google/fonts/blob/main/ofl/mplus2/OFL.txt`
- `https://github.com/google/fonts/blob/main/ofl/notosansjp/OFL.txt`
- `https://github.com/IBM/plex/blob/master/LICENSE.txt`
- `https://developer.apple.com/fonts/`

No Apple font or asset was downloaded, bundled, or converted to webfont.

## Chromium specimen at 15px / 500

The Linux Chromium specimen measured actual webfont candidates; Apple and
Hiragino rows resolved to Linux fallback and are therefore marked not run as
true candidate renders.

| Metric | M PLUS 2 | Noto Sans JP | IBM Plex Sans JP |
|---|---:|---:|---:|
| `H` width / ascent | 10.950 / 11 | 11.115 / 12 | 11.235 / 12 |
| `x` width / ascent | 8.310 / 8 | 7.890 / 9 | 8.280 / 9 |
| `予約` width / ascent / descent | 30 / 13 / 2 | 30 / 13 / 2 | 30 / 13 / 1 |
| `4名` width | 24.600 | — | — |
| `¥120,000` width | 72.661 | 64.320 | 71.026 |
| `22:30–翌01:15` width | 110.221 | 100.441 | 109.546 |
| `VIP-8` width | 39.915 | — | 41.910 |
| `GHO-0726-01` width | 105.706 | 94.951 | 103.021 |
| `予約・Walk-in` width | 98.551 | 97.888 | — |
| `プロモーター／集客担当` width | 165.001 | — | — |

All tested long labels fit the 288px specimen allowance at 13px. Inline-flex
icon/text optical-center delta measured 0 in the controlled specimen.

Next's bundled capsize metrics corroborate the family differences:

| Family | cap / ascent / descent / x-height | average width, regular → 600 → 700 |
|---|---|---|
| M PLUS 2 | 730 / 1160 / -288 / 520 | 492 → 500 → 502 |
| Noto Sans JP | 733 / 1160 / -288 / 543 | 467 → 487 → 495 |
| IBM Plex Sans JP | 733 / 1060 / -440 / 541 | 472 → 488 → 494 |

IBM's -440 descent is materially deeper than the -288 of M PLUS/Noto, making a
swap riskier for the frozen 11/12px dense rows. Noto is materially narrower in
Latin/data runs and would change many label widths. M PLUS is the lowest-risk
licensed choice for the ≤1px container geometry contract.

## Current-font diagnosis

- source declarations before refinement: 400 ×3, 500 ×26, 600 ×15, 700 ×59
- only 400/500/700 were loaded, so requested 600 matched an available heavier
  face instead of a true Semibold
- `--track-caps: 0.09em` was used by 18 selectors
- 15 additional positive tracking literals and 8 negative tracking literals
  existed for bounded optical roles
- the built M PLUS package referenced 119 unique WOFF2 shards, 2,672,960 bytes
  potential packaged data; this is not equivalent to first-view transfer
- built M PLUS 2 showed zero measured width delta between default spacing and
  `palt` for audited Japanese/mixed labels; the global `palt` contract was dead
- tabular digit spread remained 0; the one-family mixed-run seam stayed absent
- the wizard's native `<small>` rule escaped the token scale at 9.16667px

## Decision

Retain M PLUS 2 and improve the system, not the logo resemblance:

1. load 600 explicitly alongside 400/500/700;
2. use 400 reading, 500 quiet UI, 600 section/action/data, 700 display-only;
3. set `font-synthesis: none` so missing weights cannot be fabricated;
4. reduce caps tracking from `.09em` to `.04em`;
5. remove global `palt` declarations and keep effective `tnum`;
6. inherit `tnum` from the operator root so mixed runs share the same scope;
7. set wizard `<small>` explicitly to the 11px inherited token role;
8. keep the six-step 11/12/13/15/18/22 scale to preserve frozen layout.

The 11/12px roles remain metadata only and use contrast-safe ink and adequate
weight. A 1440-physical/720-CSS page-zoom-equivalent probe passed representative
states; true browser text-only zoom remains not established on this headless
host. Primary content stays 13px or larger.

Post-change build evidence: adding 600 produced 476 `@font-face` declarations
(119 unicode shards × four weights) but still only 119 unique WOFF2 files and
2,672,960 unique bytes — no packaged-font byte increase. A local built-CSS
specimen containing the audited Japanese/Latin/data strings at all four weights
requested two shared variable shards, 61,264 encoded bytes (61,864 transfer
bytes including local response overhead).

## Not run

- true SF Pro JP/SF Pro Text/SF Pro Display rendering on an Apple device
- true Hiragino rendering on macOS/iOS
- macOS Safari, iPadOS Safari, Dynamic Type, VoiceOver
- Windows ClearType-specific rasterization

Fallback behavior on those systems must be witnessed before a future family
change. These conditions are not claimed as passed.
