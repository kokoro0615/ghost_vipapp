import { Suspense } from "react";

import MaintenanceAnchor from "@/components/admin/vip-floor-v2/MaintenanceAnchor";
import VipBootScreen from "@/components/admin/vip-floor-v2/VipBootScreen";
import VipFloorWorkspace from "@/components/admin/vip-floor-v2/VipFloorWorkspace";
import { isGhostVipMaintenanceMode } from "@/lib/server/maintenanceMode";
import { readVipTicketOperationsDisplayCapabilities } from "@/lib/server/ticketOperationsDisplayFlags";

export const dynamic = "force-dynamic";

export default function HomePage() {
  if (isGhostVipMaintenanceMode()) {
    return <MaintenanceAnchor />;
  }

  const ticketOperationsCapabilities = readVipTicketOperationsDisplayCapabilities();

  return (
    <Suspense fallback={<VipBootScreen />}>
      <VipFloorWorkspace ticketOperationsCapabilities={ticketOperationsCapabilities} />
    </Suspense>
  );
}
