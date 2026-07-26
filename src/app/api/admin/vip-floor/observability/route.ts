import { NextResponse } from "next/server";

import {
  copyJson,
  ghostAdminFetch,
  readAdminSession,
  readAdminToken,
} from "@/lib/server/ghostAdminProxy";

export const runtime = "nodejs";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

export async function GET(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const rawWindow = Number(url.searchParams.get("windowMinutes") ?? 60);
  const windowMinutes = Number.isSafeInteger(rawWindow)
    ? Math.min(1440, Math.max(5, rawWindow))
    : 60;
  const response = await ghostAdminFetch(
    `/api/admin/v2/observability/slo?windowMinutes=${windowMinutes}`,
    { cache: "no-store" },
    auth.token,
  );
  return NextResponse.json(await copyJson(response), { status: response.status });
}

export async function POST(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const event = body?.event === "realtime_gap" || body?.event === "realtime_unavailable"
    ? body.event
    : null;
  const businessDate = typeof body?.businessDate === "string"
    && DATE_PATTERN.test(body.businessDate)
    ? body.businessDate
    : null;
  const gapSize = typeof body?.gapSize === "number"
    && Number.isSafeInteger(body.gapSize)
    && body.gapSize >= 0
    && body.gapSize <= 1_000_000
    ? body.gapSize
    : null;
  if (!event || !businessDate || (event === "realtime_gap" && gapSize === null)) {
    return NextResponse.json({ ok: false, error: "invalid_metric_event" }, { status: 400 });
  }
  const response = await ghostAdminFetch(
    "/api/admin/v2/observability/events",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event,
        businessDate,
        ...(event === "realtime_gap" ? { gapSize } : {}),
      }),
    },
    auth.token,
  );
  return NextResponse.json(await copyJson(response), { status: response.status });
}

async function requireOwner(request: Request) {
  const token = readAdminToken(request);
  if (!token) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "missing_admin_session" }, { status: 401 }),
    };
  }
  const session = await readAdminSession(token);
  if (!session.ok || session.actor.role !== "owner") {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "insufficient_role" }, { status: 403 }),
    };
  }
  return { ok: true as const, token };
}
