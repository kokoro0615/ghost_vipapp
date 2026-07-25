import styles from "@/components/admin/vip-floor-v2/VipFloorWorkspace.module.css";

export default function Loading() {
  return (
    <main className={styles.routeState} aria-busy="true">
      <div />
      <div />
      <div />
      <p>VIP Floor fixtureを準備しています。</p>
    </main>
  );
}

