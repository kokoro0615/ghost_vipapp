import { NextResponse } from "next/server";

import {
  copyJson,
  ghostAdminFetch,
  readAdminSession,
  readAdminToken,
} from "@/lib/server/ghostAdminProxy";

export const runtime = "nodejs";

const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

export async function GET(request: Request) {
  const token = readAdminToken(request);

  if (!token) {
    return NextResponse.json({ ok: false, error: "missing_admin_session" }, { status: 401 });
  }

  const session = await readAdminSession(token);

  if (!session.ok) {
    return NextResponse.json(
      { ok: false, error: "invalid_admin_session" },
      { status: session.status || 401 },
    );
  }

  if (session.actor.role !== "owner") {
    return NextResponse.json({ ok: false, error: "insufficient_role" }, { status: 403 });
  }

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
    token,
  );
  const payload = await copyJson(response);

  return NextResponse.json(payload, { status: response.status });
}
