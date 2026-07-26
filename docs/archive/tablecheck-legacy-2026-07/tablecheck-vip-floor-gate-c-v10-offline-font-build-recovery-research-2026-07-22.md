# TableCheck VIP Floor Gate C v10 offline font build recovery research

Date: 2026-07-22 JST  
Status: read-only diagnosis complete; v9 terminal remains `GATE_C_HOLD`; no v10 authority or build execution exists

## Outcome

V9 isolated build attempt 3 did not try to acquire a Vercel staging environment. It reached the Next.js 16.2.10 webpack production build and failed because all five `next/font/google` loaders attempted to resolve `fonts.googleapis.com` inside the intentionally network-disabled namespace. The exact observed error was `getaddrinfo EAI_AGAIN`, followed by one failure for each of Inter, Barlow Condensed, Bodoni Moda, Noto Sans JP, and Shippori Mincho.

The earlier public wording, `network_isolation_rejected_remote_environment_acquisition`, and its local-staging-config next action are therefore withdrawn as causal claims. The immutable v9 HOLD, its three-attempt ceiling, and every counter remain valid. The correction is additive evidence, not a terminal rewrite.

## Primary-source findings

The official Next.js font API documentation says `next/font/google` downloads font files during build and then self-hosts them. It also says requests are not sent from the browser after deployment. The official getting-started guide presents `next/font/local` as the local-file alternative. Sources accessed 2026-07-22:

- [Next.js Font Module API](https://nextjs.org/docs/app/api-reference/components/font)
- [Next.js Getting Started: Fonts](https://nextjs.org/docs/app/getting-started/fonts)

The installed Next.js 16.2.10 implementation corroborates the runtime detail:

- `fetch-css-from-google-fonts.js` SHA-256 `7b279a57...eed95d` fetches Google CSS during the loader step.
- `loader.js` SHA-256 `45e38a6d...85f4` extracts each font URL, obtains the bytes, emits a self-hosted file, and rewrites the CSS URL.
- `fetch-font-file.js` SHA-256 `c9476e7f...25539` can read an absolute local file only when the internal `NEXT_FONT_GOOGLE_MOCKED_RESPONSES` test seam is active.

That environment variable is present in the installed implementation and described there as test mocking. It is not a documented public Next.js API. Any use must therefore pin Next 16.2.10 and the three module hashes, remain a private build input, and fail closed if the installed contract changes.

## Exact source dependency

`src/app/layout.tsx` imports four Google families: Bodoni Moda, Noto Sans JP, Shippori Mincho, and Barlow Condensed. `src/app/admin/vip-floor/page.tsx` imports Inter. The two source hashes recorded in the correction evidence bind this finding to the v9 source.

No repository-local font asset currently supplies those five families. Migrating to `next/font/local` is the supported long-term option, but it requires licensed font files, source changes, visual validation, and a new source freeze. It is not a no-op repair under the closed v9 authority.

## Existing-byte feasibility

The immutable v7r5 successful artifact contains all emitted font-face CSS and all referenced WOFF2 files for the same five families:

| Family | Faces/files | Bytes | Missing | WOFF2 signature |
|---|---:|---:|---:|---:|
| Barlow Condensed | 12 | 114,456 | 0 | 12/12 |
| Bodoni Moda | 4 | 136,412 | 0 | 4/4 |
| Inter | 7 | 218,888 | 0 | 7/7 |
| Noto Sans JP | 124 | 5,221,836 | 0 | 124/124 |
| Shippori Mincho | 488 | 15,206,524 | 0 | 488/488 |
| Total | 635 | 20,898,116 | 0 | 635/635 |

The family-level canonical manifest summary is SHA-256 `cdd8e990...a7cbd`. Private artifact paths and provider identifiers are intentionally absent from public evidence.

This supports a deterministic recovery route without source mutation or internet access: generate a private Google-CSS response map for the five exact loader URLs; point every `src` entry at its existing, SHA-verified WOFF2 byte; use the installed mock seam only for the isolated build; and keep `bwrap --unshare-net`. The generated fixture must never enter the provider upload or public evidence, and the resulting candidate still needs the v9 credential-boundary/HMAC/adoption checks plus a fresh three-role review under new authority.

## Recommended new authority scope

A new direct Owner authority should use the v9 terminal SHA `878bce32...a1587fd` as immutable ancestor and authorize only:

1. Read-only re-verification of the 635 prior-artifact font bytes and their family manifests.
2. One private deterministic fixture materialization, mode `0600`, with the five exact Next-generated Google CSS request keys and absolute local WOFF2 sources.
3. At least one new credential-free, network-disabled isolated build attempt with Next 16.2.10 and the three installed-module hashes pinned.
4. Fail-closed behavior if any font byte, request key, loader hash, WOFF2 signature, source hash, or CSS mapping differs.
5. Candidate freeze/adoption and all remaining v9 artifact-safety and fresh-review gates, carried forward explicitly because the v9 terminal closed the old execution authority.
6. Zero Vercel environment pull, zero provider API call, zero deployment, and zero source mutation before a credential-safe candidate and fresh 3/3 review.

If the Owner prefers only documented APIs, the alternative authority must instead permit adding properly licensed local font files, replacing the five `next/font/google` imports with `next/font/local`, performing responsive visual regression checks, and creating a new source freeze. That route is more maintainable but materially broader.

## Current boundary

No offline fixture was created and no fourth build was run. The v9 attempt ceiling remains exhausted at 3/3. Candidate freeze, adoption, HMAC leak scan, fresh review, readiness, Gate D, and Gate E remain unstarted. This research changes only the diagnosis and the required next authority.
