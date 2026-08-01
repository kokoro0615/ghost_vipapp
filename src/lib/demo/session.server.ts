import {
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import "server-only";

import type { NextResponse } from "next/server";

import { DEMO_SESSION_COOKIE } from "@/lib/demo/accessContract";

export const DEMO_TIME_ZONE = "Asia/Tokyo";
export const DEMO_STARTS_AT = "2026-07-27T00:00:00+09:00";
export const DEMO_EXPIRES_AT = "2026-08-27T23:59:59+09:00";
export const DEMO_LEASE_INTERVAL_MS = 60_000;

const DEMO_STARTS_AT_MS = Date.parse(DEMO_STARTS_AT);
const DEMO_EXPIRES_AT_MS = Date.parse(DEMO_EXPIRES_AT);

export type DemoSessionClaim = {
  mode: "demo";
  role: "owner-compatible-demo";
  workspaceId: string;
  iat: number;
  exp: number;
  jti: string;
};

export type DemoPublicConfiguration = {
  mode: "demo";
  timeZone: typeof DEMO_TIME_ZONE;
  startsAt: typeof DEMO_STARTS_AT;
  expiresAt: typeof DEMO_EXPIRES_AT;
  workspaceId: string;
  dataVersion: string;
  leaseIntervalMs: typeof DEMO_LEASE_INTERVAL_MS;
};

type DemoConfiguration = DemoPublicConfiguration & {
  enabled: boolean;
  hmacSecret: string;
  valid: boolean;
};

export type DemoAccessState =
  | { status: "active"; config: DemoConfiguration; now: number }
  | { status: "disabled" | "invalid" | "not_started" | "expired"; config: DemoConfiguration; now: number };

export type DemoSessionVerification =
  | { ok: true; claim: DemoSessionClaim; config: DemoConfiguration }
  | { ok: false; reason: "disabled" | "invalid_config" | "invalid_session" | "not_started" | "expired" };

function readDemoConfiguration(): DemoConfiguration {
  const configuredStartsAt = process.env.VIPAPP_DEMO_STARTS_AT ?? DEMO_STARTS_AT;
  const configuredExpiresAt = process.env.VIPAPP_DEMO_EXPIRES_AT ?? DEMO_EXPIRES_AT;
  const workspaceId = process.env.VIPAPP_DEMO_WORKSPACE_ID ?? "";
  const dataVersion = process.env.VIPAPP_DEMO_DATA_VERSION ?? "";
  const hmacSecret = process.env.VIPAPP_DEMO_SESSION_HMAC_SECRET ?? "";

  const valid =
    configuredStartsAt === DEMO_STARTS_AT
    && configuredExpiresAt === DEMO_EXPIRES_AT
    && Boolean(workspaceId && dataVersion && hmacSecret.length >= 32);

  return {
    enabled: process.env.VIPAPP_DEMO_ENABLED === "true",
    valid,
    mode: "demo",
    timeZone: DEMO_TIME_ZONE,
    startsAt: DEMO_STARTS_AT,
    expiresAt: DEMO_EXPIRES_AT,
    workspaceId,
    dataVersion,
    leaseIntervalMs: DEMO_LEASE_INTERVAL_MS,
    hmacSecret,
  };
}

export function getDemoAccessState(now = Date.now()): DemoAccessState {
  const config = readDemoConfiguration();
  if (!config.enabled) return { status: "disabled", config, now };
  if (!config.valid) return { status: "invalid", config, now };
  if (now < DEMO_STARTS_AT_MS) return { status: "not_started", config, now };
  if (now > DEMO_EXPIRES_AT_MS) return { status: "expired", config, now };
  return { status: "active", config, now };
}

export function getDemoPublicConfiguration(config: DemoConfiguration): DemoPublicConfiguration {
  return {
    mode: "demo",
    timeZone: config.timeZone,
    startsAt: config.startsAt,
    expiresAt: config.expiresAt,
    workspaceId: config.workspaceId,
    dataVersion: config.dataVersion,
    leaseIntervalMs: DEMO_LEASE_INTERVAL_MS,
  };
}

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload, "utf8").digest();
}

export function createDemoSession(now = Date.now()) {
  const state = getDemoAccessState(now);
  if (state.status !== "active") return null;

  const claim: DemoSessionClaim = {
    mode: "demo",
    role: "owner-compatible-demo",
    workspaceId: state.config.workspaceId,
    iat: Math.floor(now / 1000),
    exp: Math.floor(DEMO_EXPIRES_AT_MS / 1000),
    jti: randomUUID(),
  };
  const payload = base64UrlEncode(JSON.stringify(claim));
  const signature = base64UrlEncode(signPayload(payload, state.config.hmacSecret));
  return {
    token: `${payload}.${signature}`,
    claim,
    config: state.config,
  };
}

function isDemoSessionClaim(value: unknown): value is DemoSessionClaim {
  if (!value || typeof value !== "object") return false;
  const claim = value as Partial<DemoSessionClaim>;
  return (
    claim.mode === "demo"
    && claim.role === "owner-compatible-demo"
    && typeof claim.workspaceId === "string"
    && Number.isInteger(claim.iat)
    && Number.isInteger(claim.exp)
    && typeof claim.jti === "string"
    && claim.jti.length > 0
  );
}

export function verifyDemoSession(token: string | null, now = Date.now()): DemoSessionVerification {
  const state = getDemoAccessState(now);
  if (state.status === "disabled") return { ok: false, reason: "disabled" };
  if (state.status === "invalid") return { ok: false, reason: "invalid_config" };
  if (state.status === "not_started") return { ok: false, reason: "not_started" };
  if (state.status === "expired") return { ok: false, reason: "expired" };
  if (!token || token.length > 4096) return { ok: false, reason: "invalid_session" };

  const [payload, encodedSignature, extra] = token.split(".");
  if (!payload || !encodedSignature || extra) return { ok: false, reason: "invalid_session" };

  try {
    const receivedSignature = Buffer.from(encodedSignature, "base64url");
    const expectedSignature = signPayload(payload, state.config.hmacSecret);
    if (
      receivedSignature.length !== expectedSignature.length
      || !timingSafeEqual(receivedSignature, expectedSignature)
    ) {
      return { ok: false, reason: "invalid_session" };
    }

    const claim = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as unknown;
    if (!isDemoSessionClaim(claim)) return { ok: false, reason: "invalid_session" };
    const nowSeconds = Math.floor(now / 1000);
    const exactExpirySeconds = Math.floor(DEMO_EXPIRES_AT_MS / 1000);
    if (
      claim.workspaceId !== state.config.workspaceId
      || claim.iat > nowSeconds + 30
      || claim.exp !== exactExpirySeconds
    ) {
      return { ok: false, reason: "invalid_session" };
    }
    if (claim.exp < nowSeconds) return { ok: false, reason: "expired" };
    return { ok: true, claim, config: state.config };
  } catch {
    return { ok: false, reason: "invalid_session" };
  }
}

export function readDemoSessionCookie(request: Request) {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${DEMO_SESSION_COOKIE}=`));
  if (!cookie) return null;
  try {
    return decodeURIComponent(cookie.slice(DEMO_SESSION_COOKIE.length + 1));
  } catch {
    return null;
  }
}

export function setDemoSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(DEMO_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api",
    expires: new Date(DEMO_EXPIRES_AT_MS),
  });
}

export function clearDemoSessionCookie(response: NextResponse) {
  response.cookies.set(DEMO_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api",
    maxAge: 0,
  });
}
