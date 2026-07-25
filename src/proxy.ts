import { timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function parseBasicAuthorization(value: string | null) {
  if (!value?.startsWith("Basic ")) return null;

  try {
    const decoded = Buffer.from(value.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;
    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const expectedUsername = process.env.VIPAPP_BASIC_USER;
  const expectedPassword = process.env.VIPAPP_BASIC_PASSWORD;
  const credentials = parseBasicAuthorization(request.headers.get("authorization"));

  const authenticated =
    Boolean(expectedUsername && expectedPassword && credentials) &&
    safeEqual(credentials?.username ?? "", expectedUsername ?? "") &&
    safeEqual(credentials?.password ?? "", expectedPassword ?? "");

  if (authenticated) return NextResponse.next();

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

