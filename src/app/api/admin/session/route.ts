import { NextResponse } from "next/server";

import {
  OWNER_SESSION_COOKIE,
  TRUSTED_ACCESS_LANE_HEADER,
} from "@/lib/demo/accessContract";
import {
  clearDemoSessionCookie,
  getDemoAccessState,
  getDemoPublicConfiguration,
  readDemoSessionCookie,
  verifyDemoSession,
} from "@/lib/demo/session.server";
import { clearAdminToken, copyJson, ghostAdminFetch, readAdminToken } from "@/lib/server/ghostAdminProxy";
import { normalizeVipAdminRole } from "@/lib/adminPermissions";

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

function demoFailure(status: 401 | 410, error: string) {
  const response = NextResponse.json({ ok: false, error }, {
    status,
    headers: { "cache-control": "no-store" },
  });
  clearDemoSessionCookie(response);
  clearOwnerSessionCookie(response);
  return response;
}

async function getOwnerSession(request: Request) {
  const token = readAdminToken(request);
  if (!token) return NextResponse.json({ ok: false, error: "missing_admin_session" }, { status: 401 });
  const response = await ghostAdminFetch("/api/admin/session", {}, token);
  const payload = await copyJson(response);
  if (response.status === 401 || payload?.ok !== true) {
    const local = NextResponse.json(payload, { status: response.status || 401 });
    clearAdminToken(local);
    clearDemoSessionCookie(local);
    return local;
  }
  const role = normalizeVipAdminRole(payload?.role);
  if (!role) {
    const local = NextResponse.json({ ok: false, error: "invalid_admin_session" }, { status: 401 });
    clearAdminToken(local);
    clearDemoSessionCookie(local);
    return local;
  }
  const local = NextResponse.json(
    { ok: true, mode: "owner", role, displayName: payload?.displayName ?? null },
    { status: response.status, headers: { "cache-control": "no-store" } },
  );
  clearDemoSessionCookie(local);
  return local;
}

function getDemoSession(request: Request) {
  const state = getDemoAccessState();
  if (state.status === "expired") {
    const response = NextResponse.json(
      {
        ok: false,
        authenticated: false,
        error: "demo_expired",
        ...getDemoPublicConfiguration(state.config),
      },
      { status: 410, headers: { "cache-control": "no-store" } },
    );
    clearDemoSessionCookie(response);
    clearOwnerSessionCookie(response);
    return response;
  }
  if (state.status !== "active") return demoFailure(401, "demo_unavailable");

  const publicConfig = getDemoPublicConfiguration(state.config);
  const token = readDemoSessionCookie(request);
  if (!token) {
    const response = NextResponse.json(
      { ok: false, authenticated: false, ...publicConfig },
      { headers: { "cache-control": "no-store" } },
    );
    clearOwnerSessionCookie(response);
    return response;
  }

  const verification = verifyDemoSession(token);
  if (!verification.ok) {
    return demoFailure(verification.reason === "expired" ? 410 : 401, "demo_session_invalid");
  }

  const response = NextResponse.json(
    {
      ...publicConfig,
      ok: true,
      authenticated: true,
      role: "owner-compatible-demo",
      displayName: "Demo Operator",
      sessionExpiresAt: new Date(verification.claim.exp * 1000).toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
  clearOwnerSessionCookie(response);
  return response;
}

async function deleteOwnerSession(request: Request) {
  const token = readAdminToken(request);
  const response = token ? await ghostAdminFetch("/api/admin/session", { method: "DELETE" }, token) : null;
  const local = NextResponse.json(response ? await copyJson(response) : { ok: true }, { status: response?.ok ? 200 : response?.status ?? 200 });
  clearAdminToken(local);
  clearDemoSessionCookie(local);
  return local;
}

function deleteDemoSession() {
  const response = NextResponse.json(
    { ok: true, mode: "demo" },
    { headers: { "cache-control": "no-store" } },
  );
  clearDemoSessionCookie(response);
  clearOwnerSessionCookie(response);
  return response;
}

export async function GET(request: Request) {
  const lane = request.headers.get(TRUSTED_ACCESS_LANE_HEADER);
  if (lane === "owner") return getOwnerSession(request);
  if (lane === "demo") return getDemoSession(request);
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

export async function DELETE(request: Request) {
  const lane = request.headers.get(TRUSTED_ACCESS_LANE_HEADER);
  if (lane === "owner") return deleteOwnerSession(request);
  if (lane === "demo") return deleteDemoSession();
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}
