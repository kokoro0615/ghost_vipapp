import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  DEMO_SESSION_COOKIE,
  OWNER_SESSION_COOKIE,
  resolveBasicAccessLane,
  TRUSTED_ACCESS_LANE_HEADER,
  type AccessLane,
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

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(TRUSTED_ACCESS_LANE_HEADER);
  const lane = resolveBasicAccessLane(request.headers.get("authorization"), {
    ownerUsername: process.env.VIPAPP_BASIC_USER,
    ownerPassword: process.env.VIPAPP_BASIC_PASSWORD,
    demoEnabled: process.env.VIPAPP_DEMO_ENABLED === "true",
    demoUsername: process.env.VIPAPP_DEMO_BASIC_USER,
    demoPassword: process.env.VIPAPP_DEMO_BASIC_PASSWORD,
  });

  if (lane) {
    requestHeaders.set(TRUSTED_ACCESS_LANE_HEADER, lane);
    const oppositeCookie = lane === "owner" ? DEMO_SESSION_COOKIE : OWNER_SESSION_COOKIE;
    const sanitizedCookie = withoutCookie(requestHeaders.get("cookie"), oppositeCookie);
    if (sanitizedCookie) requestHeaders.set("cookie", sanitizedCookie);
    else requestHeaders.delete("cookie");

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    expireOppositeSessionCookie(response, lane);
    return response;
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "WWW-Authenticate": 'Basic realm="GHOST VIP Floor", charset="UTF-8"',
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|media/|icon.svg).*)"],
};
