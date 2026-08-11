import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import {
  readVipCanaryRuntimeAuthority,
} from "@/lib/server/ticketCanaryRuntimeGuard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "cache-control": "private, no-store, max-age=0",
  "content-type": "application/json; charset=utf-8",
};

export async function GET(request: Request) {
  const authority = readVipCanaryRuntimeAuthority();
  if (!authority.enabled) return json({ ok: false, error: "not_found" }, 404);
  if (!authorized(request.headers.get("authorization"), process.env.WORKER_RUN_SECRET)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  return json({
    ok: true,
    runId: authority.runId,
    observedAt: new Date().toISOString(),
    environment: "test",
    backendOrigin: authority.websiteOrigin,
    egressEvidenceAuthority: "source_attested_runtime_authority",
  });
}

function authorized(header: string | null, expected: string | undefined) {
  const prefix = "Bearer ";
  if (!expected || expected.length < 32 || !header?.startsWith(prefix)) return false;
  const supplied = Buffer.from(header.slice(prefix.length), "utf8");
  const target = Buffer.from(expected, "utf8");
  return supplied.length === target.length && timingSafeEqual(supplied, target);
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}
