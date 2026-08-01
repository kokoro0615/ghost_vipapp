import type { Metadata, Viewport } from "next";
import { M_PLUS_2 } from "next/font/google";
import type { ReactNode } from "react";

import { isGhostVipMaintenanceMode } from "@/lib/server/maintenanceMode";

import "./globals.css";

/*
 * Type for the "OPERATIONS PAPER" direction: one Japanese-first family.
 *
 * M PLUS 2 (M+ FONTS, OFL) carries Japanese and Latin in one voice with
 * 400/500/600/700, so hierarchy comes from weight rather than size inflation.
 * 600 is loaded explicitly: the operator surface uses it for controls and
 * section hierarchy, while 700 is reserved for the largest display copy.
 * It also has uniform digit advances and a working `tnum`, which is the one job
 * the retired IBM Plex Mono was doing: a ledger column must never reflow when a
 * digit changes. Keeping figures inside the text family additionally removes the
 * seam in mixed runs like `4名` / `¥120,000`, where the digit and the counter
 * used to come from two different fonts.
 *
 * The fallback list is the Hiragino-first system stack, so a slow font fetch
 * degrades to the best local Japanese face rather than to a Latin default.
 * Measurements: docs/ui/VIP_MANAGER_LIGHT_RESERVATION_RESEARCH.md §4.
 */
const operatorFont = M_PLUS_2({
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-operator",
  preload: false,
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
  themeColor: "#f5f4f2",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <body className={`${operatorFont.className} ${operatorFont.variable}`}>
        {children}
      </body>
    </html>
  );
}
