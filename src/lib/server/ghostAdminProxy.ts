import { createHmac, randomUUID } from "node:crypto";
import "server-only";

import { NextResponse } from "next/server";

import { normalizeVipAdminRole, type VipAdminRole } from "@/lib/adminPermissions";
import { readTrustedAccessLane } from "@/lib/demo/accessContract";

const SESSION_COOKIE = "ghost_vipapp_admin_session";
const BASIC_OWNER_PIN_CONTEXT = "ghost-vipapp-basic-owner-pin-v1";
const BACKEND_ORIGIN = (process.env.GHOST_ADMIN_API_ORIGIN ?? "https://ghost-ruby-one.vercel.app").replace(/\/$/u, "");
const PRODUCTION_WEBSITE_ORIGINS = new Set(["https://ghost-ruby-one.vercel.app"]);

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
  if (readTrustedAccessLane(request) !== "owner") return null;
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

  const backendUrl = new URL(path, BACKEND_ORIGIN);
  const configuredOrigin = new URL(BACKEND_ORIGIN).origin;
  if (backendUrl.origin !== configuredOrigin) {
    throw new Error("ghost_admin_origin_mismatch");
  }
  const bypass = process.env.GHOST_BACKEND_PROTECTION_BYPASS;
  if (bypass && backendUrl.origin === configuredOrigin && !PRODUCTION_WEBSITE_ORIGINS.has(backendUrl.origin)) {
    headers.set("x-vercel-protection-bypass", bypass);
  }

  return fetch(backendUrl, { ...init, headers, cache: "no-store", redirect: "error" });
}

export function copyJson(response: Response) {
  return response.json().catch(() => ({}));
}

export function loginAdminPin(body: string) {
  return ghostAdminFetch("/api/admin/session/pin", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

export function deriveBasicOwnerPin(password = process.env.VIPAPP_BASIC_PASSWORD) {
  if (!password) return null;
  const digest = createHmac("sha256", BASIC_OWNER_PIN_CONTEXT)
    .update(password, "utf8")
    .digest();
  return String(digest.readUInt32BE(0) % 100_000_000).padStart(8, "0");
}

export function loginBasicOwnerSession() {
  const pin = deriveBasicOwnerPin();
  if (!pin) return null;
  return loginAdminPin(JSON.stringify({ pin }));
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
