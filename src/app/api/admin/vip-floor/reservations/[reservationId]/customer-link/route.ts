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

// Customer-link bodies carry a handful of ids; 8 KiB is generous.
const LINK_BODY_MAX_BYTES = 8 * 1024;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const FIXED_REASON = "管理画面操作";

type RouteContext = {
  params: Promise<{ reservationId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const boundary = assertOperatorMutation(request);
  if (!boundary.ok) {
    return NextResponse.json({ ok: false, error: boundary.error }, { status: boundary.status });
  }

  const access = await requireAdminOperation(request, { ownerOnly: true });
  if (!access.ok) return access.response;
  const token = access.token;
  const { reservationId } = await context.params;
  const idempotencyKey = request.headers.get("idempotency-key");
  let body: Record<string, unknown>;
  try {
    body = await readBoundedJsonObject(request, LINK_BODY_MAX_BYTES);
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
  const expectedVersion = typeof body?.expectedVersion === "number"
    && Number.isSafeInteger(body.expectedVersion)
    && body.expectedVersion >= 1
    ? body.expectedVersion
    : null;
  const customerId = body?.customerId === null
    ? null
    : typeof body?.customerId === "string" && UUID_PATTERN.test(body.customerId)
      ? body.customerId
      : undefined;
  if (
    !UUID_PATTERN.test(reservationId)
    || !idempotencyKey
    || expectedVersion === null
    || customerId === undefined
  ) {
    return NextResponse.json({ ok: false, error: "invalid_customer_link" }, { status: 400 });
  }
  const response = await ghostAdminFetch(
    `/api/admin/v2/reservations/${encodeURIComponent(reservationId)}/customer-link`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify({ expectedVersion, customerId, reason: FIXED_REASON }),
    },
    token,
  );
  return NextResponse.json(await copyJson(response), { status: response.status });
}
