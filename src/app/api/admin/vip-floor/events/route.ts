import {
  copyJson,
  ghostAdminFetch,
  readAdminSession,
  readAdminToken,
} from "@/lib/server/ghostAdminProxy";

export const runtime = "nodejs";
export const maxDuration = 30;

const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

export async function GET(request: Request) {
  const token = readAdminToken(request);

  if (!token) {
    return new Response("missing_admin_session", { status: 401 });
  }

  const session = await readAdminSession(token);

  if (!session.ok) {
    return new Response("invalid_admin_session", { status: session.status || 401 });
  }

  const url = new URL(request.url);
  const businessDate = url.searchParams.get("date");
  const since = Number(url.searchParams.get("since"));

  if (
    !businessDate
    || !BUSINESS_DATE_PATTERN.test(businessDate)
    || !Number.isSafeInteger(since)
    || since < 0
    || [...url.searchParams.keys()].some((key) => key !== "date" && key !== "since")
  ) {
    return new Response("invalid_revision_stream_query", { status: 400 });
  }

  const encoder = new TextEncoder();
  let lastRevision = since;
  let closed = false;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;
  let lifetimeTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const close = () => {
        if (closed) return;
        closed = true;
        if (pollTimer) clearTimeout(pollTimer);
        if (lifetimeTimer) clearTimeout(lifetimeTimer);
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        controller.close();
      };

      const poll = async () => {
        if (closed || request.signal.aborted) {
          close();
          return;
        }

        try {
          const response = await ghostAdminFetch(
            `/api/admin/v2/vip-floor?businessDate=${encodeURIComponent(businessDate)}`,
            {},
            token,
          );
          const payload = await copyJson(response) as Record<string, unknown>;
          const revision = payload.boardRevision;

          if (!response.ok) {
            controller.enqueue(encoder.encode(
              `event: unavailable\ndata: ${JSON.stringify({ status: response.status })}\n\n`,
            ));
            close();
            return;
          }

          if (typeof revision === "number" && Number.isSafeInteger(revision) && revision > lastRevision) {
            lastRevision = revision;
            controller.enqueue(encoder.encode(
              `event: revision\ndata: ${JSON.stringify({
                businessDate,
                revision,
                observedAt: new Date().toISOString(),
              })}\n\n`,
            ));
          }
        } catch {
          controller.enqueue(encoder.encode(
            `event: unavailable\ndata: ${JSON.stringify({ status: 503 })}\n\n`,
          ));
          close();
          return;
        }

        pollTimer = setTimeout(poll, 1_500);
      };

      heartbeatTimer = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 10_000);
      request.signal.addEventListener("abort", close, { once: true });
      void poll();
      lifetimeTimer = setTimeout(close, 25_000);
    },
    cancel() {
      closed = true;
      if (pollTimer) clearTimeout(pollTimer);
      if (lifetimeTimer) clearTimeout(lifetimeTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "cache-control": "no-cache, no-store",
      "content-type": "text/event-stream; charset=utf-8",
      "x-accel-buffering": "no",
      "x-content-type-options": "nosniff",
    },
  });
}
