import { NextResponse } from "next/server";

import { clearAdminToken, copyJson, ghostAdminFetch, readAdminToken } from "@/lib/server/ghostAdminProxy";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = readAdminToken(request);
  if (!token) return NextResponse.json({ ok: false, error: "missing_admin_session" }, { status: 401 });
  const response = await ghostAdminFetch("/api/admin/session", {}, token);
  const payload = await copyJson(response);
  if (response.status === 401) { const local = NextResponse.json(payload, { status: 401 }); clearAdminToken(local); return local; }
  return NextResponse.json(payload, { status: response.status });
}

export async function DELETE(request: Request) {
  const token = readAdminToken(request);
  const response = token ? await ghostAdminFetch("/api/admin/session", { method: "DELETE" }, token) : null;
  const local = NextResponse.json(response ? await copyJson(response) : { ok: true }, { status: response?.ok ? 200 : response?.status ?? 200 });
  clearAdminToken(local);
  return local;
}
