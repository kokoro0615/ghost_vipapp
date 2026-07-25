import { NextResponse } from "next/server";

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
  const suffix = date ? `?date=${encodeURIComponent(date)}` : "";
  const response = await ghostAdminFetch(`/api/admin/vip-status${suffix}`, {}, token);
  return NextResponse.json(await copyJson(response), { status: response.status, headers: { "Cache-Control": "no-store" } });
}
