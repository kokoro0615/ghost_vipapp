import { NextResponse } from "next/server";

import {
  OWNER_SESSION_COOKIE,
  TRUSTED_ACCESS_LANE_HEADER,
} from "@/lib/demo/accessContract";
import { clearDemoPinAttempts, consumeDemoPinAttempt } from "@/lib/demo/rateLimit.server";
import {
  clearDemoSessionCookie,
  createDemoSession,
  getDemoAccessState,
  getDemoPublicConfiguration,
  setDemoSessionCookie,
  verifyDemoPin,
} from "@/lib/demo/session.server";
import { copyJson, loginAdminPin, setAdminToken } from "@/lib/server/ghostAdminProxy";

export const runtime = "nodejs";

function clearOwnerSessionCookie(response: NextResponse) {
  response.cookies.set(OWNER_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api",
    maxAge: 0,
  });
}

async function ownerPinLogin(request: Request) {
  const body = await request.text();
  const response = await loginAdminPin(body);
  const payload = await copyJson(response) as { token?: string; expiresAt?: string } & Record<string, unknown>;
  if (!response.ok || !payload.token) return NextResponse.json(payload, { status: response.status });
  const { token, ...safePayload } = payload;
  const local = NextResponse.json({ ...safePayload, ok: true, mode: "owner" });
  setAdminToken(local, token, payload.expiresAt);
  clearDemoSessionCookie(local);
  return local;
}

async function demoPinLogin(request: Request) {
  const state = getDemoAccessState();
  if (state.status === "expired") {
    return NextResponse.json(
      { ok: false, error: "demo_expired" },
      { status: 410, headers: { "cache-control": "no-store" } },
    );
  }
  if (state.status !== "active") {
    return NextResponse.json(
      { ok: false, error: "demo_authentication_failed" },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }

  const rateLimit = consumeDemoPinAttempt(request);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: "demo_authentication_failed" },
      {
        status: 429,
        headers: {
          "cache-control": "no-store",
          "retry-after": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const body = await request.json().catch(() => null) as { pin?: unknown } | null;
  if (!await verifyDemoPin(body?.pin)) {
    return NextResponse.json(
      { ok: false, error: "demo_authentication_failed" },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }

  const session = createDemoSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "demo_authentication_failed" },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }
  clearDemoPinAttempts(request);

  const response = NextResponse.json(
    {
      ...getDemoPublicConfiguration(session.config),
      ok: true,
      authenticated: true,
      role: "owner-compatible-demo",
      displayName: "Demo Operator",
      sessionExpiresAt: new Date(session.claim.exp * 1000).toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
  setDemoSessionCookie(response, session.token);
  clearOwnerSessionCookie(response);
  return response;
}

export async function POST(request: Request) {
  const lane = request.headers.get(TRUSTED_ACCESS_LANE_HEADER);
  if (lane === "owner") return ownerPinLogin(request);
  if (lane === "demo") return demoPinLogin(request);
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}
