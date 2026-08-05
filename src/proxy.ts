import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  ACCESS_LOCK_COOKIE,
  BASIC_ACCESS_COOKIE,
  BASIC_ACCESS_MAX_AGE_SECONDS,
  createBasicAccessSession,
  DEMO_SESSION_COOKIE,
  OWNER_SESSION_COOKIE,
  resolveBasicAccessRequest,
  TRUSTED_ACCESS_LOCK_HEADER,
  TRUSTED_ACCESS_LANE_HEADER,
  type AccessLane,
  type BasicAccessConfiguration,
} from "@/lib/demo/accessContract";

function withoutCookie(cookieHeader: string | null, cookieName: string) {
  if (!cookieHeader) return null;
  const retained = cookieHeader
    .split(";")
    .map((value) => value.trim())
    .filter((value) => value && !value.startsWith(`${cookieName}=`));
  return retained.length > 0 ? retained.join("; ") : null;
}

function expireOppositeSessionCookie(response: NextResponse, lane: AccessLane) {
  const cookieName = lane === "owner" ? DEMO_SESSION_COOKIE : OWNER_SESSION_COOKIE;
  response.cookies.set(cookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api",
    maxAge: 0,
  });
}

function setBasicAccessCookie(
  response: NextResponse,
  token: string,
) {
  response.cookies.set(BASIC_ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: BASIC_ACCESS_MAX_AGE_SECONDS,
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

function forwardLockedRequest(requestHeaders: Headers) {
  requestHeaders.set(TRUSTED_ACCESS_LOCK_HEADER, "1");
  for (const cookieName of [BASIC_ACCESS_COOKIE, OWNER_SESSION_COOKIE, DEMO_SESSION_COOKIE]) {
    const sanitizedCookie = withoutCookie(requestHeaders.get("cookie"), cookieName);
    if (sanitizedCookie) requestHeaders.set("cookie", sanitizedCookie);
    else requestHeaders.delete("cookie");
  }
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  clearBasicAccessCookie(response);
  expireSessionCookie(response, OWNER_SESSION_COOKIE);
  expireSessionCookie(response, DEMO_SESSION_COOKIE);
  return response;
}

function expireSessionCookie(response: NextResponse, cookieName: string) {
  response.cookies.set(cookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api",
    maxAge: 0,
  });
}

function authenticationRequired() {
  const response = new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "WWW-Authenticate": 'Basic realm="GHOST VIP Floor", charset="UTF-8"',
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
  clearBasicAccessCookie(response);
  return response;
}

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(TRUSTED_ACCESS_LANE_HEADER);
  requestHeaders.delete(TRUSTED_ACCESS_LOCK_HEADER);
  if (request.cookies.get(ACCESS_LOCK_COOKIE)?.value) {
    return forwardLockedRequest(requestHeaders);
  }
  const configuration: BasicAccessConfiguration = {
    ownerUsername: process.env.VIPAPP_BASIC_USER,
    ownerPassword: process.env.VIPAPP_BASIC_PASSWORD,
    demoEnabled: process.env.VIPAPP_DEMO_ENABLED === "true",
    demoUsername: process.env.VIPAPP_DEMO_BASIC_USER,
    demoPassword: process.env.VIPAPP_DEMO_BASIC_PASSWORD,
  };
  const access = resolveBasicAccessRequest(
    request.headers.get("authorization"),
    request.cookies.get(BASIC_ACCESS_COOKIE)?.value ?? null,
    configuration,
    Date.now(),
    false,
  );

  if (access) {
    const { lane } = access;
    requestHeaders.set(TRUSTED_ACCESS_LANE_HEADER, lane);
    const oppositeCookie = lane === "owner" ? DEMO_SESSION_COOKIE : OWNER_SESSION_COOKIE;
    const sanitizedCookie = withoutCookie(requestHeaders.get("cookie"), oppositeCookie);
    if (sanitizedCookie) requestHeaders.set("cookie", sanitizedCookie);
    else requestHeaders.delete("cookie");

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    if (access.source === "authorization") {
      const session = createBasicAccessSession(lane, configuration);
      if (!session) return authenticationRequired();
      setBasicAccessCookie(response, session.token);
    }
    expireOppositeSessionCookie(response, lane);
    return response;
  }

  return authenticationRequired();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|media/|icon.svg).*)"],
};
