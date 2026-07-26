import { Clock3, ShieldCheck } from "lucide-react";

import styles from "./VipFloorWorkspace.module.css";

export default function MaintenanceAnchor() {
  return (
    <main className={styles.maintenanceShell}>
      <section className={styles.maintenancePanel} aria-labelledby="maintenance-title" role="status">
        <div className={styles.maintenanceMark} aria-hidden="true">G</div>
        <p className={styles.maintenanceEyebrow}>GHOST OSAKA · VIP MANAGER</p>
        <h1 id="maintenance-title">Trial終了・本番移行作業中</h1>
        <p>
          Customer Trialは終了しました。現在、正式Productionへの安全な切替作業を行っています。
        </p>
        <div className={styles.maintenanceStatus}>
          <Clock3 size={18} aria-hidden="true" />
          <div>
            <strong>閲覧・更新を一時停止しています</strong>
            <span>作業完了後、同じURLから正式な運用画面を利用できます。</span>
          </div>
        </div>
        <p className={styles.maintenanceSecurity}>
          <ShieldCheck size={16} aria-hidden="true" />
          この画面からPIN、予約台帳、更新操作にはアクセスできません。
        </p>
      </section>
    </main>
  );
}
