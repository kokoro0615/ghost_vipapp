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
import { isBusinessDate, readBusinessDate } from "@/lib/vipFloorV2Contract";
import {
  isValidVipManagerIdempotencyKey,
  readVipManagerBusinessDates,
  readVipManagerBusinessDayEnsure,
  VIP_MANAGER_MAX_BUSINESS_DAY_SUGGESTIONS,
} from "@/generated/vipManagerRuntimeContract";

export const runtime = "nodejs";

const BUSINESS_DAY_ENSURE_BODY_MAX_BYTES = 4 * 1024;
const REASON_MAX_LENGTH = 240;

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

export async function POST(request: Request) {
  const boundary = assertOperatorMutation(request);
  if (!boundary.ok) {
    return NextResponse.json({ ok: false, error: boundary.error }, { status: boundary.status });
  }

  const access = await requireAdminOperation(request, { ownerOnly: true });
  if (!access.ok) return access.response;

  const idempotencyKey = request.headers.get("idempotency-key");
  if (!isValidVipManagerIdempotencyKey(idempotencyKey)) {
    return NextResponse.json({ ok: false, error: "invalid_idempotency_key" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await readBoundedJsonObject(request, BUSINESS_DAY_ENSURE_BODY_MAX_BYTES);
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

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "invalid_business_day_ensure" }, { status: 400 });
  }
  const fields = body as Record<string, unknown>;
  if (Object.keys(fields).some((key) => key !== "businessDate" && key !== "reason")) {
    return NextResponse.json({ ok: false, error: "invalid_business_day_ensure" }, { status: 400 });
  }
  const businessDate = fields.businessDate;
  const reason = typeof fields.reason === "string" ? fields.reason.trim() : "";
  if (!isBusinessDate(businessDate) || reason === "" || reason.length > REASON_MAX_LENGTH) {
    return NextResponse.json({ ok: false, error: "invalid_business_day_ensure" }, { status: 400 });
  }

  const response = await ghostAdminFetch(
    "/api/admin/v2/vip-floor/business-days",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify({ businessDate, reason }),
    },
    access.token,
  );
  const payload = await copyJson(response);

  if (response.ok) {
    const ensured = readVipManagerBusinessDayEnsure(payload);
    if (ensured === null) {
      return NextResponse.json(
        { ok: false, error: "business_day_ensure_contract_mismatch" },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { ok: true, ...ensured },
      { status: response.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  const failure = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : {};
  const error = failure.error;
  const errorCode = typeof error === "string"
    ? error
    : error && typeof error === "object" && !Array.isArray(error)
      && typeof (error as Record<string, unknown>).code === "string"
      ? (error as Record<string, unknown>).code as string
      : "business_day_ensure_failed";

  return NextResponse.json(
    { ok: false, error: errorCode, status: response.status },
    { status: response.status, headers: { "Cache-Control": "no-store" } },
  );
}
