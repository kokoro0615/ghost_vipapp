import type { Metadata, Viewport } from "next";
import { M_PLUS_2 } from "next/font/google";
import type { ReactNode } from "react";

import { isGhostVipMaintenanceMode } from "@/lib/server/maintenanceMode";

import "./globals.css";

/*
 * Type for the "OPERATIONS PAPER" direction: one Japanese-first family.
 *
 * M PLUS 2 (M+ FONTS, OFL) carries Japanese and Latin in one voice with
 * 400/500/700, so hierarchy comes from weight rather than from size inflation.
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
  weight: ["400", "500", "700"],
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
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
  /* sRGB equivalent of the --paper token, so mobile browser chrome matches the
   * application ground. Update both together. */
  themeColor: "#f2f1ee",
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
