import { NextResponse } from "next/server";

import { copyJson, ghostAdminFetch, readAdminToken } from "@/lib/server/ghostAdminProxy";

export const runtime = "nodejs";

const routes = {
  check_in: (id: string) => `/api/admin/reservations/${encodeURIComponent(id)}/check-in`,
  assignment: (id: string) => `/api/admin/reservations/${encodeURIComponent(id)}/assign`,
  seat_extension: (id: string) => `/api/admin/reservations/${encodeURIComponent(id)}/extend-seat`,
} as const;

export async function POST(request: Request) {
  const token = readAdminToken(request);
  if (!token) return NextResponse.json({ ok: false, error: "missing_admin_session" }, { status: 401 });
  const body = await request.json().catch(() => null) as { kind?: keyof typeof routes; reservationId?: string; payload?: Record<string, unknown> } | null;
  if (!body?.kind || !body.reservationId || !routes[body.kind]) return NextResponse.json({ ok: false, error: "unsupported_command" }, { status: 400 });
  const payload = body.kind === "assignment"
    ? { publicResourceCode: Array.isArray(body.payload?.tableIds) ? body.payload?.tableIds[0] : undefined, reason: body.payload?.reason }
    : body.kind === "seat_extension"
      ? { extendMinutes: body.payload?.extendMinutes, reason: body.payload?.reason }
      : { reason: body.payload?.reason };
  const response = await ghostAdminFetch(routes[body.kind](body.reservationId), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }, token);
  return NextResponse.json(await copyJson(response), { status: response.status });
}
