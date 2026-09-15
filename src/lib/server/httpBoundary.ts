/**
 * Shared HTTP request boundary helpers for the VIP floor operator API.
 *
 * Mirrors the website repo's `src/lib/server/httpBoundary.ts` contract:
 * bounded body reads with a hard byte ceiling, strict UTF-8 decoding, and a
 * same-origin fetch-metadata gate for browser mutations. The helpers only read
 * the Fetch-standard `Request` object; canonical-origin decisions never trust
 * request-derived headers (`Host`, `X-Forwarded-Host`, request `Origin`).
 */

/** Sanity ceiling for a syntactically valid `Content-Length` declaration. */
const MAX_DECLARED_LENGTH_BYTES = 64 * 1024 * 1024;

export type HttpBodyErrorCode =
  | "body_too_large"
  | "declared_length_too_large"
  | "invalid_content_length"
  | "invalid_utf8"
  | "invalid_json";

export class HttpBodyError extends Error {
  readonly code: HttpBodyErrorCode;

  constructor(code: HttpBodyErrorCode, message: string) {
    super(message);
    this.name = "HttpBodyError";
    this.code = code;
  }
}

export function isHttpBodyError(error: unknown): error is HttpBodyError {
  return error instanceof HttpBodyError;
}

/**
 * Reads a request body with a hard byte ceiling. When `Content-Length` is
 * declared it must be a sane non-negative integer and within `maxBytes`;
 * chunked/streamed bodies are counted while reading.
 */
export async function readBoundedRawBody(
  request: Request,
  maxBytes: number,
): Promise<Uint8Array> {
  const declared = request.headers.get("content-length");

  if (declared !== null) {
    if (!/^\d{1,15}$/.test(declared.trim())) {
      throw new HttpBodyError("invalid_content_length", "Invalid Content-Length");
    }
    const declaredBytes = Number.parseInt(declared, 10);
    if (!Number.isSafeInteger(declaredBytes) || declaredBytes > MAX_DECLARED_LENGTH_BYTES) {
      throw new HttpBodyError("invalid_content_length", "Invalid Content-Length");
    }
    if (declaredBytes > maxBytes) {
      throw new HttpBodyError("declared_length_too_large", "Request body too large");
    }
  }

  if (!request.body) {
    return new Uint8Array(0);
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new HttpBodyError("body_too_large", "Request body too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

/** Reads a bounded raw body and decodes it as strict UTF-8. */
export async function readBoundedText(
  request: Request,
  maxBytes: number,
): Promise<string> {
  const raw = await readBoundedRawBody(request, maxBytes);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(raw);
  } catch {
    throw new HttpBodyError("invalid_utf8", "Request body is not valid UTF-8");
  }
}

/** Reads a bounded JSON object body with fatal UTF-8 decoding. */
export async function readBoundedJsonObject(
  request: Request,
  maxBytes: number,
): Promise<Record<string, unknown>> {
  const text = await readBoundedText(request, maxBytes);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new HttpBodyError("invalid_json", "Request body is not valid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new HttpBodyError("invalid_json", "Request body must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

export type BrowserMutationBoundaryError =
  | "origin_required"
  | "origin_mismatch"
  | "cross_site_blocked"
  | "unsupported_content_type";

export type BrowserMutationBoundary =
  | { ok: true }
  | { ok: false; status: number; error: BrowserMutationBoundaryError };

/**
 * Same-origin boundary for operator API routes.
 *
 * The admin session cookie is `SameSite=strict` and proxy mutations already
 * require non-safelisted headers (`idempotency-key`, bearer credentials), so a
 * cross-site browser request cannot reach these handlers. This gate is the
 * documented defense-in-depth layer for the residual same-site/null-Origin
 * context (RR-09 F2):
 * - `Origin`, when present, must equal the request's own routed origin or an
 *   explicitly allow-listed origin. `Origin: null` never matches.
 * - `Sec-Fetch-Site`, when present, must be `same-origin` or `none`;
 *   `cross-site` and `same-site` sibling contexts are rejected.
 * - `Content-Type` must be `application/json` when `requireJsonBody` is set,
 *   which keeps browser mutations non-simple (preflight required) and blocks
 *   `text/plain`/form smuggling.
 * - A request with neither `Origin` nor `Sec-Fetch-Site` is a non-browser
 *   client (curl, server-side proxy) and is allowed; CSRF requires a victim
 *   browser and browsers cannot omit both headers.
 */
export function assertSameOriginJsonMutation(
  request: Request,
  options: {
    allowedOrigins?: ReadonlySet<string>;
    requireOrigin?: boolean;
    requireJsonBody?: boolean;
  } = {},
): BrowserMutationBoundary {
  const selfOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");

  if (!origin && options.requireOrigin) {
    return { ok: false, status: 403, error: "origin_required" };
  }

  if (origin && origin !== selfOrigin && !(options.allowedOrigins?.has(origin) ?? false)) {
    return { ok: false, status: 403, error: "origin_mismatch" };
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite !== null && fetchSite !== "same-origin" && fetchSite !== "none") {
    return { ok: false, status: 403, error: "cross_site_blocked" };
  }

  if (options.requireJsonBody !== false) {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("application/json")) {
      return { ok: false, status: 415, error: "unsupported_content_type" };
    }
  }

  return { ok: true };
}

/**
 * Operator-session boundary for this app's API routes. The operator UI only
 * ever calls these handlers from the app's own origin, so the boundary is the
 * strict same-origin check with no configured sibling allowlist.
 */
export function assertOperatorMutation(
  request: Request,
  options: { requireJsonBody?: boolean } = {},
): BrowserMutationBoundary {
  return assertSameOriginJsonMutation(request, { requireJsonBody: options.requireJsonBody });
}
