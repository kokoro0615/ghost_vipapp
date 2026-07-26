import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { TrialModeProvider } from "@/components/admin/vip-floor-v2/TrialMode";
import { isGhostVipTrialMode } from "@/lib/server/trialMode";

import "./globals.css";

export function generateMetadata(): Metadata {
  const trialMode = isGhostVipTrialMode();
  return {
    title: `${trialMode ? "TRIAL / 仮データ専用 — " : ""}VIP Floor Operations | GHOST OSAKA`,
    description: trialMode
      ? "GHOST Osaka VIP Floorの仮データ専用トライアル環境。実在する個人情報を入力しないでください。"
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
  colorScheme: "dark",
  themeColor: "#0d0911",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const trialMode = isGhostVipTrialMode();
  return (
    <html lang="ja">
      <body data-trial-mode={trialMode || undefined}>
        <TrialModeProvider enabled={trialMode}>{children}</TrialModeProvider>
      </body>
    </html>
  );
}
