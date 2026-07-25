import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

const SESSION_COOKIE = "ghost_vipapp_admin_session";
const BACKEND_ORIGIN = (process.env.GHOST_ADMIN_API_ORIGIN ?? "https://ghost-ruby-one.vercel.app").replace(/\/$/u, "");

export function readAdminToken(request: Request) {
  const value = request.headers.get("cookie")?.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${SESSION_COOKIE}=`));
  return value ? decodeURIComponent(value.slice(SESSION_COOKIE.length + 1)) : null;
}

export function setAdminToken(response: NextResponse, token: string, expiresAt?: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api",
    expires: expiresAt ? new Date(expiresAt) : undefined,
  });
}

export function clearAdminToken(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api", maxAge: 0 });
}

export async function ghostAdminFetch(path: string, init: RequestInit = {}, token?: string | null) {
  const headers = new Headers(init.headers);
  headers.set("x-request-id", headers.get("x-request-id") ?? randomUUID());
  if (token) headers.set("authorization", `Bearer ${token}`);
  return fetch(`${BACKEND_ORIGIN}${path}`, { ...init, headers, cache: "no-store", redirect: "error" });
}

export function copyJson(response: Response) {
  return response.json().catch(() => ({}));
}
