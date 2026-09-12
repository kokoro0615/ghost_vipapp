import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Noto_Sans_JP } from "next/font/google";
import type { ReactNode } from "react";

import { isGhostVipMaintenanceMode } from "@/lib/server/maintenanceMode";

import "./globals.css";

/*
 * Type for the "OPERATIONS PAPER" direction: a Latin instrument face for codes
 * and figures, paired with a neutral Japanese face for labels.
 *
 * The pairing was chosen by measurement, not taste. The ledger is dominated by
 * Latin and figures — `VIP-1`, `22:30`, `GHO-0726-01`, `¥120,000` — so the
 * Latin face carries most of the surface's texture, while Japanese labels
 * support it. The 2026-08-16 bake-off rendered every candidate at operator
 * sizes and measured glyph ink boxes rather than line boxes:
 *
 *   family              x-height  digit ink w   digit height vs Noto Sans JP
 *   Instrument Sans        101         98            +0.8pt   <- adopted
 *   Onest                  105        101            -1.4pt
 *   Inter Tight            108         98            +2.2pt
 *   Host Grotesk            90         83            -8.5pt   <- rejected
 *   M PLUS 2 (previous)    103        113            (single family)
 *
 * Host Grotesk read best in isolation and lost on the only criterion that
 * matters in a mixed run: next to Noto Sans JP its digits sit 8.5 points short
 * and its x-height is 17% smaller, so `4名` and `11名` step down mid-word.
 * Instrument Sans matches the Japanese face's own digit height to within a
 * point. Inter Tight matches even more closely on x-height but is the single
 * most recognisable machine-generated typeface, which is the complaint this
 * pass exists to answer.
 *
 * M PLUS 2 is retired. Its digits carry 23% more ink width than Noto Sans JP's,
 * which is most of why the ledger read as loose and inflated at every density.
 *
 * Both faces load as variable fonts so hierarchy can use the in-between weights
 * (460 / 560) rather than jumping 400 -> 600 -> 700. `font-synthesis: none`
 * still holds; a variable axis resolves these natively.
 *
 * Tabular figures survive the change and are re-verified in the built app:
 * Instrument Sans has proportional digits by default and an effective `tnum`
 * (measured spread 299.3px -> 0.00px at 100px), and `:root` turns
 * `font-variant-numeric: tabular-nums lining-nums` on for the whole surface, so
 * a ledger column still never reflows. Noto Sans JP's digits are uniform
 * regardless. Full matrix: docs/research/vip-manager-type-accent-bakeoff-2026-08-16.md
 *
 * The fallback list stays Hiragino-first, so a slow fetch degrades to the best
 * local Japanese face rather than to a Latin default.
 */
const latinFont = Instrument_Sans({
  display: "swap",
  variable: "--font-operator-latin",
  preload: false,
  adjustFontFallback: true,
  fallback: ["Helvetica Neue", "Arial", "sans-serif"],
});

const japaneseFont = Noto_Sans_JP({
  display: "swap",
  variable: "--font-operator-jp",
  preload: false,
  adjustFontFallback: false,
  fallback: [
    "Hiragino Sans",
    "Hiragino Kaku Gothic ProN",
    "Yu Gothic UI",
    "Meiryo",
    "sans-serif",
  ],
});

export function generateMetadata(): Metadata {
  const maintenanceMode = isGhostVipMaintenanceMode();
  return {
    title: `${maintenanceMode ? "本番移行作業中 — " : ""}VIP Manager | GHOST OSAKA`,
    description: maintenanceMode
      ? "GHOST Osaka VIP Managerは正式Productionへの移行作業中です。"
      : "GHOST Osaka VIP Floorの現場オペレーション画面。",
    robots: {
      index: false,
      follow: false,
      nocache: true,
    },
    /*
     * The venue runs this board on an iPad, and in Safari the tab and address
     * bars take roughly 84pt off a viewport that is only 810pt tall in
     * landscape to begin with — about 12% of the operator's work area, spent on
     * browser chrome that a single-purpose console never uses.
     *
     * Added to the Home Screen the app launches standalone and gets that space
     * back, with no browser UI to mis-tap during service. `default` keeps the
     * status bar opaque so the light masthead starts below it rather than
     * sliding under the clock.
     *
     * Note for whoever installs it: a Home Screen app has its own cookie store,
     * so the Basic challenge is answered once inside the installed app.
     */
    appleWebApp: {
      capable: true,
      title: "VIP Manager",
      statusBarStyle: "default",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
  /* sRGB equivalent of the --paper token, so mobile browser chrome matches the
   * application ground. Update both together. */
  themeColor: "#f7f7f8",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    /* The font variables have to sit on <html>, not <body>: `--font-ui` is
     * composed from them in `:root`, and a custom property is only visible to
     * the element it is declared on and its descendants. Declared on <body>,
     * `var(--font-operator-latin)` resolves to nothing inside `:root`, which
     * makes the whole `font-family` declaration invalid and silently drops the
     * surface to the browser's default serif. */
    <html
      lang="ja"
      className={`${latinFont.variable} ${japaneseFont.variable}`}
      data-ticket-test={process.env.GHOST_TICKET_CANARY_RUN_ID ? "true" : undefined}
    >
      <body>
        {process.env.GHOST_TICKET_CANARY_RUN_ID ? (
          <p className="ticket-test-notice" role="status">TEST · テスト販売 / 実請求なし</p>
        ) : null}
        {children}
      </body>
    </html>
  );
}
