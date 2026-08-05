import { NextResponse } from "next/server";

import {
  ACCESS_LOCK_COOKIE,
  BASIC_ACCESS_COOKIE,
  BASIC_ACCESS_MAX_AGE_SECONDS,
  createBasicAccessSession,
  OWNER_SESSION_COOKIE,
  resolveExplicitAccessCredentials,
  TRUSTED_ACCESS_LOCK_HEADER,
  TRUSTED_ACCESS_LANE_HEADER,
} from "@/lib/demo/accessContract";
import {
  clearDemoSessionCookie,
  createDemoSession,
  getDemoAccessState,
  getDemoPublicConfiguration,
  readDemoSessionCookie,
  setDemoSessionCookie,
  verifyDemoSession,
} from "@/lib/demo/session.server";
import {
  clearAdminToken,
  copyJson,
  ghostAdminFetch,
  loginBasicOwnerSession,
  readAdminToken,
  setAdminToken,
} from "@/lib/server/ghostAdminProxy";
import { normalizeVipAdminRole } from "@/lib/adminPermissions";

export const runtime = "nodejs";

function accessConfiguration() {
  return {
    ownerUsername: process.env.VIPAPP_BASIC_USER,
    ownerPassword: process.env.VIPAPP_BASIC_PASSWORD,
    demoEnabled: process.env.VIPAPP_DEMO_ENABLED === "true",
    demoUsername: process.env.VIPAPP_DEMO_BASIC_USER,
    demoPassword: process.env.VIPAPP_DEMO_BASIC_PASSWORD,
  };
}

function setAccessLockCookie(response: NextResponse) {
  response.cookies.set(ACCESS_LOCK_COOKIE, "locked", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: BASIC_ACCESS_MAX_AGE_SECONDS,
  });
}

function clearAccessLockCookie(response: NextResponse) {
  response.cookies.set(ACCESS_LOCK_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

function clearBasicAccessCookie(response: NextResponse) {
  response.cookies.set(BASIC_ACCESS_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

function setBasicAccessCookie(response: NextResponse, token: string) {
  response.cookies.set(BASIC_ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: BASIC_ACCESS_MAX_AGE_SECONDS,
  });
}

function lockedResponse() {
  const response = NextResponse.json(
    { ok: false, error: "access_locked" },
    { status: 423, headers: { "cache-control": "no-store" } },
  );
  clearAdminToken(response);
  clearDemoSessionCookie(response);
  clearOwnerSessionCookie(response);
  clearBasicAccessCookie(response);
  setAccessLockCookie(response);
  return response;
}

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
  let token = readAdminToken(request);
  let issuedExpiresAt: string | undefined;

  if (!token) {
    const loginResponse = await loginBasicOwnerSession();
    if (!loginResponse) {
      return NextResponse.json(
        { ok: false, error: "owner_basic_session_unavailable" },
        { status: 503, headers: { "cache-control": "no-store" } },
      );
    }
    const loginPayload = await copyJson(loginResponse) as {
      token?: string;
      expiresAt?: string;
    } & Record<string, unknown>;
    if (!loginResponse.ok || !loginPayload.token) {
      return NextResponse.json(
        { ok: false, error: "owner_basic_session_unavailable" },
        { status: 503, headers: { "cache-control": "no-store" } },
      );
    }
    token = loginPayload.token;
    issuedExpiresAt = loginPayload.expiresAt;
  }

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
  if (issuedExpiresAt) setAdminToken(local, token, issuedExpiresAt);
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
    const session = createDemoSession();
    if (!session) return demoFailure(401, "demo_unavailable");
    const response = NextResponse.json(
      {
        ...publicConfig,
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
  clearOwnerSessionCookie(local);
  clearBasicAccessCookie(local);
  setAccessLockCookie(local);
  return local;
}

function deleteDemoSession() {
  const response = NextResponse.json(
    { ok: true, mode: "demo" },
    { headers: { "cache-control": "no-store" } },
  );
  clearDemoSessionCookie(response);
  clearOwnerSessionCookie(response);
  clearBasicAccessCookie(response);
  setAccessLockCookie(response);
  return response;
}

async function unlockAccess(request: Request) {
  if (request.headers.get(TRUSTED_ACCESS_LOCK_HEADER) !== "1") {
    return NextResponse.json(
      { ok: false, error: "access_not_locked" },
      { status: 409, headers: { "cache-control": "no-store" } },
    );
  }
  const payload = await request.json().catch(() => null) as {
    username?: unknown;
    password?: unknown;
  } | null;
  if (typeof payload?.username !== "string" || typeof payload.password !== "string") {
    return NextResponse.json(
      { ok: false, error: "invalid_credentials" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }
  const lane = resolveExplicitAccessCredentials(
    payload.username,
    payload.password,
    accessConfiguration(),
  );
  if (!lane) {
    return NextResponse.json(
      { ok: false, error: "invalid_credentials" },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }
  const access = createBasicAccessSession(lane, accessConfiguration());
  if (!access) {
    return NextResponse.json(
      { ok: false, error: "access_unavailable" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
  const response = NextResponse.json(
    { ok: true, unlocked: true },
    { headers: { "cache-control": "no-store" } },
  );
  clearAdminToken(response);
  clearDemoSessionCookie(response);
  clearOwnerSessionCookie(response);
  clearAccessLockCookie(response);
  setBasicAccessCookie(response, access.token);
  return response;
}

export async function GET(request: Request) {
  if (request.headers.get(TRUSTED_ACCESS_LOCK_HEADER) === "1") return lockedResponse();
  const lane = request.headers.get(TRUSTED_ACCESS_LANE_HEADER);
  if (lane === "owner") return getOwnerSession(request);
  if (lane === "demo") return getDemoSession(request);
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

export async function DELETE(request: Request) {
  if (request.headers.get(TRUSTED_ACCESS_LOCK_HEADER) === "1") return lockedResponse();
  const lane = request.headers.get(TRUSTED_ACCESS_LANE_HEADER);
  if (lane === "owner") return deleteOwnerSession(request);
  if (lane === "demo") return deleteDemoSession();
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  return unlockAccess(request);
}
