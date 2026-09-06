import { randomUUID } from "node:crypto";
import "server-only";

import { NextResponse } from "next/server";

import { normalizeVipAdminRole, type VipAdminRole } from "@/lib/adminPermissions";
import { readTrustedAccessLane } from "@/lib/demo/accessContract";
import { resolveAdminOperationAccess } from "./adminOperationAccess";
import { assertVipCanaryBackendUrl } from "./ticketCanaryRuntimeGuard";

const SESSION_COOKIE = "ghost_vipapp_admin_session";
const BACKEND_ORIGIN = (process.env.GHOST_ADMIN_API_ORIGIN ?? "https://ghost-ruby-one.vercel.app").replace(/\/$/u, "");
const PRODUCTION_WEBSITE_ORIGINS = new Set(["https://ghost-ruby-one.vercel.app"]);
const BACKEND_READ_TIMEOUT_MS = 10_000;
const BACKEND_MUTATION_TIMEOUT_MS = 20_000;

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
  const canaryAuthority = assertVipCanaryBackendUrl(backendUrl);
  const configuredOrigin = new URL(BACKEND_ORIGIN).origin;
  if (backendUrl.origin !== configuredOrigin) {
    throw new Error("ghost_admin_origin_mismatch");
  }
  const bypass = process.env.GHOST_BACKEND_PROTECTION_BYPASS;
  if (bypass && backendUrl.origin === configuredOrigin && !PRODUCTION_WEBSITE_ORIGINS.has(backendUrl.origin)) {
    headers.set("x-vercel-protection-bypass", bypass);
  }
  if (canaryAuthority.runId) {
    headers.set("x-ghost-ticket-canary-run-id", canaryAuthority.runId);
  }

  const method = (init.method ?? "GET").toUpperCase();
  // Keep the deadline active through response-body consumption. A mutation
  // timeout is an unknown outcome; callers retain their idempotency key and
  // this transport never retries the command.
  const deadline = AbortSignal.timeout(
    method === "GET" || method === "HEAD"
      ? BACKEND_READ_TIMEOUT_MS
      : BACKEND_MUTATION_TIMEOUT_MS,
  );
  const signal = init.signal ? AbortSignal.any([init.signal, deadline]) : deadline;
  return fetch(backendUrl, { ...init, headers, signal, cache: "no-store", redirect: "error" });
}

export function copyJson(response: Response) {
  return response.json().catch((error: unknown) => {
    // An interrupted successful response must not become an empty success.
    if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
      throw error;
    }
    return {};
  });
}

export function loginBasicOwnerSession() {
  const secret = process.env.GHOST_BASIC_OWNER_SESSION_SECRET;
  if (!secret || secret.length < 32) return null;
  return ghostAdminFetch("/api/admin/session/basic-owner", {
    method: "POST",
    headers: { "x-ghost-vipapp-owner-session-secret": secret },
  });
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

export async function requireAdminOperation(
  request: Request,
  options: { ownerOnly?: boolean } = {},
) {
  const access = await resolveAdminOperationAccess(request, {
    readToken: readAdminToken,
    readSession: readAdminSession,
  }, options);

  if (!access.ok) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: access.error },
        { status: access.status },
      ),
    };
  }

  return access;
}
