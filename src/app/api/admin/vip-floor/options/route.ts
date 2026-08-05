import { NextResponse } from "next/server";

import { normalizeGhostBusinessDay } from "@/lib/ghostOperatingHours";
import {
  copyJson,
  ghostAdminFetch,
  requireAdminOperation,
} from "@/lib/server/ghostAdminProxy";

export const runtime = "nodejs";

const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

export async function GET(request: Request) {
  const access = await requireAdminOperation(request, { ownerOnly: true });
  if (!access.ok) return access.response;

  const url = new URL(request.url);
  const businessDate = url.searchParams.get("date");

  if (
    !businessDate
    || !BUSINESS_DATE_PATTERN.test(businessDate)
    || [...url.searchParams.keys()].some((key) => key !== "date")
  ) {
    return NextResponse.json({ ok: false, error: "invalid_business_date" }, { status: 400 });
  }

  const response = await ghostAdminFetch(
    `/api/admin/v2/vip-floor/options?businessDate=${encodeURIComponent(businessDate)}`,
    {},
    access.token,
  );
  const payload = await copyJson(response);

  // A missing event day is an expected outcome while the operator is choosing
  // a future phone-reservation date. Preserve the exact domain code but avoid
  // turning this recoverable branch into a browser-level failed-resource error.
  if (
    response.status === 404
    && payload
    && typeof payload === "object"
    && "error" in payload
    && payload.error === "event_day_not_found"
  ) {
    return NextResponse.json(payload, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (
    response.ok
    && payload
    && typeof payload === "object"
    && typeof payload.businessDay === "object"
    && payload.businessDay !== null
    && typeof payload.businessDay.businessDate === "string"
  ) {
    const businessDay = payload.businessDay as {
      businessDate: string;
      operatingStartAt: string;
      operatingEndAt: string;
    };
    return NextResponse.json({
      ...payload,
      businessDay: normalizeGhostBusinessDay(businessDay),
    }, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json(payload, {
    status: response.status,
    headers: { "Cache-Control": "no-store" },
  });
}
