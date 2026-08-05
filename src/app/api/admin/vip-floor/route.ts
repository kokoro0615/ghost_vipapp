import { NextResponse } from "next/server";

import { normalizeGhostBusinessDay } from "@/lib/ghostOperatingHours";
import { VIP_FLOOR_SCHEMA_VERSION } from "@/lib/vipFloorV2Contract";
import { copyJson, ghostAdminFetch, readAdminToken } from "@/lib/server/ghostAdminProxy";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = readAdminToken(request);
  if (!token) return NextResponse.json({ ok: false, error: "missing_admin_session" }, { status: 401 });
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  if (date && !/^\d{4}-\d{2}-\d{2}$/u.test(date)) {
    return NextResponse.json({ ok: false, error: "invalid_business_date" }, { status: 400 });
  }
  const businessDate = date ?? new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(new Date());
  const versionedResponse = await ghostAdminFetch(
    `/api/admin/v2/vip-floor?businessDate=${encodeURIComponent(businessDate)}`,
    {},
    token,
  );
  const versionedPayload = await copyJson(versionedResponse);

  if (
    typeof versionedPayload === "object"
    && versionedPayload !== null
    && "dayState" in versionedPayload
  ) {
    return NextResponse.json(versionedPayload, {
      status: versionedResponse.status,
      headers: { "Cache-Control": "no-store", "X-GHOST-Board-Contract": VIP_FLOOR_SCHEMA_VERSION },
    });
  }

  if (
    versionedResponse.ok
    && typeof versionedPayload === "object"
    && versionedPayload !== null
    && versionedPayload?.schemaVersion === VIP_FLOOR_SCHEMA_VERSION
    && typeof versionedPayload.businessDay === "object"
    && versionedPayload.businessDay !== null
    && typeof versionedPayload.businessDay.businessDate === "string"
  ) {
    const businessDay = versionedPayload.businessDay as {
      businessDate: string;
      operatingStartAt: string;
      operatingEndAt: string;
    };
    return NextResponse.json({
      ...versionedPayload,
      businessDay: normalizeGhostBusinessDay(businessDay),
    }, {
      status: versionedResponse.status,
      headers: { "Cache-Control": "no-store", "X-GHOST-Board-Contract": VIP_FLOOR_SCHEMA_VERSION },
    });
  }

  // The production backend may not have v2 enabled during the compatibility
  // window. Legacy read remains available, but the adapter forces mutation off.
  const legacySuffix = date ? `?date=${encodeURIComponent(date)}` : "";
  const legacyResponse = await ghostAdminFetch(`/api/admin/vip-status${legacySuffix}`, {}, token);
  return NextResponse.json(await copyJson(legacyResponse), {
    status: legacyResponse.status,
    headers: { "Cache-Control": "no-store", "X-GHOST-Board-Contract": "legacy-read-only" },
  });
}
