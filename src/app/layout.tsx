import type { Metadata, Viewport } from "next";
import { BIZ_UDPGothic } from "next/font/google";
import type { ReactNode } from "react";

import { isGhostVipMaintenanceMode } from "@/lib/server/maintenanceMode";

import "./globals.css";

const operatorFont = BIZ_UDPGothic({
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-operator",
  preload: false,
  fallback: ["Yu Gothic UI", "Hiragino Sans", "sans-serif"],
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
  themeColor: "#f8f8f7",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <body className={operatorFont.variable}>{children}</body>
    </html>
  );
}
