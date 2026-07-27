"use client";

import { Clock3, LogOut, ShieldAlert } from "lucide-react";

import styles from "../VipFloorWorkspace.module.css";

export function DemoExpiryBoundary({
  onLogout,
}: {
  onLogout: () => Promise<void>;
}) {
  return (
    <main className={styles.demoExpiredShell}>
      <section className={styles.demoExpiredPanel} aria-labelledby="demo-expired-title">
        <div className={styles.loginMark} aria-hidden><span>G</span></div>
        <p className={styles.loginEyebrow}>GHOST OSAKA · VIP MANAGER · DEMO</p>
        <h1 id="demo-expired-title">デモ利用期間は終了しました</h1>
        <div className={styles.demoExpiredStatus} role="alert">
          <ShieldAlert size={20} aria-hidden />
          <div>
            <strong>更新操作は停止しています</strong>
            <span><Clock3 size={14} aria-hidden />2026-08-27 23:59:59 JST 失効</span>
          </div>
        </div>
        <p>
          合成データをProduction情報へ置き換えることはありません。
          次回load時に期限切れのbrowser-local workspaceを破棄します。
        </p>
        <button type="button" className={styles.primaryButton} onClick={() => void onLogout()}>
          <LogOut size={16} />ログアウト
        </button>
      </section>
    </main>
  );
}

