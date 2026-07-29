import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_JP } from "next/font/google";
import type { ReactNode } from "react";

import { isGhostVipMaintenanceMode } from "@/lib/server/maintenanceMode";

import "./globals.css";

/*
 * Type pairing for the "OPERATIONS PAPER" direction.
 *
 * IBM Plex Sans JP carries both Japanese and Latin in one family with a real
 * weight range, so hierarchy comes from weight rather than from size inflation.
 * IBM Plex Mono owns every figure — times, codes, counts, revisions — which is
 * what keeps a dense ledger from reflowing column to column.
 */
const operatorFont = IBM_Plex_Sans_JP({
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-operator",
  preload: false,
  fallback: ["Hiragino Sans", "Yu Gothic UI", "Noto Sans JP", "sans-serif"],
});

const figureFont = IBM_Plex_Mono({
  weight: ["500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-figure",
  fallback: ["ui-monospace", "SFMono-Regular", "monospace"],
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
  themeColor: "#f5f4f2",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <body className={`${operatorFont.className} ${operatorFont.variable} ${figureFont.variable}`}>
        {children}
      </body>
    </html>
  );
}
