import { Suspense } from "react";

import MaintenanceAnchor from "@/components/admin/vip-floor-v2/MaintenanceAnchor";
import VipBootScreen from "@/components/admin/vip-floor-v2/VipBootScreen";
import VipFloorWorkspace from "@/components/admin/vip-floor-v2/VipFloorWorkspace";
import { isGhostVipMaintenanceMode } from "@/lib/server/maintenanceMode";

export default function HomePage() {
  if (isGhostVipMaintenanceMode()) {
    return <MaintenanceAnchor />;
  }

  return (
    <Suspense fallback={<VipBootScreen />}>
      <VipFloorWorkspace />
    </Suspense>
  );
}
