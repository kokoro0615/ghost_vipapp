import { NextResponse } from "next/server";

import {
  DEMO_SESSION_COOKIE,
  TRUSTED_ACCESS_LANE_HEADER,
} from "@/lib/demo/accessContract";
import {
  DEMO_EXPIRES_AT,
  DEMO_STARTS_AT,
  clearDemoSessionCookie,
  getDemoAccessState,
  getDemoPublicConfiguration,
  readDemoSessionCookie,
  verifyDemoSession,
} from "@/lib/demo/session.server";

export const runtime = "nodejs";

function unauthorizedFailure(error: string) {
  const response = NextResponse.json(
    { ok: false, error },
    { status: 401, headers: { "cache-control": "no-store" } },
  );
  clearDemoSessionCookie(response);
  return response;
}

function expiredFailure(error: string) {
  const response = NextResponse.json(
    { ok: false, error },
    { status: 410, headers: { "cache-control": "no-store" } },
  );
  clearDemoSessionCookie(response);
  return response;
}

export async function GET(request: Request) {
  const lane = request.headers.get(TRUSTED_ACCESS_LANE_HEADER);
  const enabled = process.env.VIPAPP_DEMO_ENABLED === "true";
  const configuredStart = process.env.VIPAPP_DEMO_STARTS_AT ?? DEMO_STARTS_AT;
  const configuredExpiry = process.env.VIPAPP_DEMO_EXPIRES_AT ?? DEMO_EXPIRES_AT;
  if (lane !== "demo") return unauthorizedFailure("unauthorized");
  if (!enabled || configuredStart !== DEMO_STARTS_AT || configuredExpiry !== DEMO_EXPIRES_AT) {
    return unauthorizedFailure("demo_unavailable");
  }

  const now = Date.now();
  const access = getDemoAccessState(now);
  if (access.status === "expired") return expiredFailure("demo_expired");
  if (access.status !== "active") return unauthorizedFailure("demo_unavailable");

  const token = readDemoSessionCookie(request);
  const cookieHeader = request.headers.get("cookie");
  if (!token || !cookieHeader?.includes(`${DEMO_SESSION_COOKIE}=`)) {
    return unauthorizedFailure("demo_session_invalid");
  }
  const verification = verifyDemoSession(token, now);
  if (!verification.ok) {
    return verification.reason === "expired"
      ? expiredFailure("demo_session_invalid")
      : unauthorizedFailure("demo_session_invalid");
  }

  const leaseExpiresAt = Math.min(
    now + 60_000,
    verification.claim.exp * 1000,
    Date.parse(access.config.expiresAt),
  );
  return NextResponse.json(
    {
      ...getDemoPublicConfiguration(access.config),
      ok: true,
      mode: "demo",
      workspaceId: verification.claim.workspaceId,
      serverNow: new Date(now).toISOString(),
      leaseExpiresAt: new Date(leaseExpiresAt).toISOString(),
      boardLeaseExpiresAt: new Date(leaseExpiresAt).toISOString(),
      ttlSeconds: Math.max(0, Math.floor((leaseExpiresAt - now) / 1000)),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
