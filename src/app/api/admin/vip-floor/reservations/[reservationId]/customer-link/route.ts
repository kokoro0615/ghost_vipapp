import { NextResponse } from "next/server";

import {
  copyJson,
  ghostAdminFetch,
  readAdminSession,
  readAdminToken,
} from "@/lib/server/ghostAdminProxy";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const FIXED_REASON = "管理画面操作";

type RouteContext = {
  params: Promise<{ reservationId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const token = readAdminToken(request);
  if (!token) {
    return NextResponse.json({ ok: false, error: "missing_admin_session" }, { status: 401 });
  }
  const session = await readAdminSession(token);
  if (!session.ok || session.actor.role !== "owner") {
    return NextResponse.json({ ok: false, error: "insufficient_role" }, { status: 403 });
  }
  const { reservationId } = await context.params;
  const idempotencyKey = request.headers.get("idempotency-key");
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
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
