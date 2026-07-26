import { Suspense } from "react";

import VipFloorWorkspace from "@/components/admin/vip-floor-v2/VipFloorWorkspace";

export default function HomePage() {
  return (
    <Suspense fallback={<main aria-busy="true" aria-label="VIP Managerを読み込んでいます" />}>
      <VipFloorWorkspace />
    </Suspense>
  );
}
