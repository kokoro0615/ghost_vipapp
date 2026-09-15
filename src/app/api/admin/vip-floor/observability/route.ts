import { NextResponse } from "next/server";

import {
  copyJson,
  ghostAdminFetch,
  requireAdminOperation,
} from "@/lib/server/ghostAdminProxy";
import {
  assertOperatorMutation,
  isHttpBodyError,
  readBoundedJsonObject,
} from "@/lib/server/httpBoundary";

export const runtime = "nodejs";

// Metric event bodies are tiny; 4 KiB is generous.
const METRIC_BODY_MAX_BYTES = 4 * 1024;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

export async function GET(request: Request) {
  const auth = await requireAdminOperation(request, { ownerOnly: true });
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
  const boundary = assertOperatorMutation(request);
  if (!boundary.ok) {
    return NextResponse.json({ ok: false, error: boundary.error }, { status: boundary.status });
  }

  const auth = await requireAdminOperation(request, { ownerOnly: true });
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try {
    body = await readBoundedJsonObject(request, METRIC_BODY_MAX_BYTES);
  } catch (error) {
    if (isHttpBodyError(error)) {
      const tooLarge = error.code === "body_too_large" || error.code === "declared_length_too_large";
      return NextResponse.json(
        { ok: false, error: tooLarge ? "request_body_too_large" : "invalid_json_body" },
        { status: tooLarge ? 413 : 400 },
      );
    }
    throw error;
  }
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
