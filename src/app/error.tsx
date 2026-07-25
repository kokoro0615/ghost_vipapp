"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import styles from "@/components/admin/vip-floor-v2/VipFloorWorkspace.module.css";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className={styles.routeError} role="alert">
      <AlertTriangle size={30} />
      <h1>VIP Floorを表示できません</h1>
      <p>画面の初期化に失敗しました。再試行しても直らない場合は管理者へ連絡してください。</p>
      <button type="button" onClick={reset}>
        <RefreshCw size={16} />
        再試行
      </button>
    </main>
  );
}
