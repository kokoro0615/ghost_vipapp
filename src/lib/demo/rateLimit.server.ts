import { createHmac, randomBytes } from "node:crypto";
import "server-only";

const WINDOW_MS = 5 * 60_000;
const MAX_ATTEMPTS = 8;
const SUBJECT_KEY = randomBytes(32);

type AttemptWindow = {
  count: number;
  resetsAt: number;
};

const attempts = new Map<string, AttemptWindow>();

function rateLimitSubject(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const subject = forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
  return createHmac("sha256", SUBJECT_KEY).update(subject, "utf8").digest("hex");
}

export function consumeDemoPinAttempt(request: Request, now = Date.now()) {
  const key = rateLimitSubject(request);
  const existing = attempts.get(key);
  const current = !existing || existing.resetsAt <= now
    ? { count: 0, resetsAt: now + WINDOW_MS }
    : existing;
  current.count += 1;
  attempts.set(key, current);

  for (const [entryKey, value] of attempts) {
    if (value.resetsAt <= now) attempts.delete(entryKey);
  }

  return {
    allowed: current.count <= MAX_ATTEMPTS,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetsAt - now) / 1000)),
  };
}

export function clearDemoPinAttempts(request: Request) {
  attempts.delete(rateLimitSubject(request));
}

