import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { normalizeVipAdminRole, type VipAdminRole } from "@/lib/adminPermissions";

const SESSION_COOKIE = "ghost_vipapp_admin_session";
const BACKEND_ORIGIN = (process.env.GHOST_ADMIN_API_ORIGIN ?? "https://ghost-ruby-one.vercel.app").replace(/\/$/u, "");

export type AdminSessionPayload = {
  ok?: boolean;
  role?: string;
  displayName?: string | null;
};

export type AdminSessionActor = {
  role: VipAdminRole;
  displayName: string | null;
};

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

export async function readAdminSession(token: string) {
  const response = await ghostAdminFetch("/api/admin/session", {}, token);
  const payload = (await copyJson(response)) as AdminSessionPayload;
  const role = normalizeVipAdminRole(payload.role);
  if (!response.ok || payload?.ok !== true || !role) {
    return {
      ok: false as const,
      status: response.status,
      payload,
    };
  }

  return {
    ok: true as const,
    status: response.status,
    payload,
    actor: {
      role,
      displayName: typeof payload.displayName === "string" ? payload.displayName : null,
    } as AdminSessionActor,
  };
}
