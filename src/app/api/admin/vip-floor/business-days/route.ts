import { NextResponse } from "next/server";

import {
  copyJson,
  ghostAdminFetch,
  requireAdminOperation,
} from "@/lib/server/ghostAdminProxy";
import { readBusinessDate } from "@/lib/vipFloorV2Contract";
import {
  readVipManagerBusinessDates,
  VIP_MANAGER_MAX_BUSINESS_DAY_SUGGESTIONS,
} from "@/generated/vipManagerRuntimeContract";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requireAdminOperation(request, { ownerOnly: true });
  if (!access.ok) return access.response;

  const url = new URL(request.url);
  const rawAfterBusinessDate = url.searchParams.get("after");
  const limit = Number(url.searchParams.get("limit"));

  let afterBusinessDate: string;

  try {
    afterBusinessDate = readBusinessDate(rawAfterBusinessDate, "after");
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_business_date_query" }, { status: 400 });
  }

  if (
    !Number.isSafeInteger(limit)
    || limit < 1
    || limit > VIP_MANAGER_MAX_BUSINESS_DAY_SUGGESTIONS
    || [...url.searchParams.keys()].some((key) => key !== "after" && key !== "limit")
    || url.searchParams.getAll("after").length !== 1
    || url.searchParams.getAll("limit").length !== 1
  ) {
    return NextResponse.json({ ok: false, error: "invalid_business_date_query" }, { status: 400 });
  }

  const response = await ghostAdminFetch(
    `/api/admin/v2/vip-floor/business-days?afterBusinessDate=${encodeURIComponent(afterBusinessDate)}&limit=${limit}`,
    { cache: "no-store" },
    access.token,
  );

  const payload = await copyJson(response);
  const businessDates = readVipManagerBusinessDates(payload);
  if (response.ok && businessDates === null) {
    return NextResponse.json(
      { ok: false, error: "business_days_contract_mismatch" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(businessDates === null ? payload : { ok: true, businessDates }, {
    status: response.status,
    headers: { "Cache-Control": "no-store" },
  });
}
