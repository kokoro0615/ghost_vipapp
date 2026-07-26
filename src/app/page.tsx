import { Suspense } from "react";

import MaintenanceAnchor from "@/components/admin/vip-floor-v2/MaintenanceAnchor";
import VipFloorWorkspace from "@/components/admin/vip-floor-v2/VipFloorWorkspace";
import { isGhostVipMaintenanceMode } from "@/lib/server/maintenanceMode";

export default function HomePage() {
  if (isGhostVipMaintenanceMode()) {
    return <MaintenanceAnchor />;
  }

  return (
    <Suspense fallback={<main aria-busy="true" aria-label="VIP Managerを読み込んでいます" />}>
      <VipFloorWorkspace />
    </Suspense>
  );
}
