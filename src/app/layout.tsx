import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { isGhostVipMaintenanceMode } from "@/lib/server/maintenanceMode";

import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
