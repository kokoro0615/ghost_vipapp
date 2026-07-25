import { NextResponse } from "next/server";

import { copyJson, ghostAdminFetch, setAdminToken } from "@/lib/server/ghostAdminProxy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.text();
  const response = await ghostAdminFetch("/api/admin/session/pin", { method: "POST", headers: { "content-type": "application/json" }, body });
  const payload = await copyJson(response) as { token?: string; expiresAt?: string } & Record<string, unknown>;
  if (!response.ok || !payload.token) return NextResponse.json(payload, { status: response.status });
  const { token, ...safePayload } = payload;
  const local = NextResponse.json({ ...safePayload, ok: true });
  setAdminToken(local, token, payload.expiresAt);
  return local;
}
