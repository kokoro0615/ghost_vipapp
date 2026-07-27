import { timingSafeEqual } from "node:crypto";

const PRODUCTION_HOSTS = new Set([
  "ghost-vipapp.vercel.app",
]);

export function assert(condition, code) {
  if (!condition) {
    throw new Error(code);
  }
}

export function constantTimeEqual(actual, expected) {
  const actualBuffer = Buffer.from(String(actual));
  const expectedBuffer = Buffer.from(String(expected));
  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function asTokyoDate(date) {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(date);
}

export function isLoopbackHostname(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function assertStagingOrigin(rawOrigin, {
  allowInsecureLocalhost = false,
  allowedHosts = [],
  productionHosts = [],
} = {}) {
  let origin;
  try {
    origin = new URL(rawOrigin);
  } catch {
    throw new Error("invalid_staging_origin");
  }

  assert(!origin.username && !origin.password, "staging_origin_must_not_contain_credentials");
  assert(origin.pathname === "/" && !origin.search && !origin.hash, "staging_origin_must_not_contain_path");

  const hostname = origin.hostname.toLowerCase();
  const deniedHosts = new Set([
    ...PRODUCTION_HOSTS,
    ...productionHosts.map((value) => value.trim().toLowerCase()).filter(Boolean),
  ]);
  assert(!deniedHosts.has(hostname), "production_origin_rejected");

  const loopback = isLoopbackHostname(hostname);
  if (loopback) {
    assert(allowInsecureLocalhost, "localhost_staging_requires_test_override");
  } else {
    assert(origin.protocol === "https:", "staging_origin_requires_https");
    const exactAllowlist = new Set(allowedHosts.map((value) => value.trim().toLowerCase()).filter(Boolean));
    assert(
      exactAllowlist.has(hostname) || /(?:^|[-.])(staging|preview)(?:[-.]|$)/u.test(hostname),
      "staging_hostname_not_allowlisted",
    );
  }

  return origin;
}

export class CookieJar {
  #cookies = new Map();

  absorb(headers) {
    const setCookies = typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : [headers.get("set-cookie")].filter(Boolean);

    for (const setCookie of setCookies) {
      const [pair, ...attributes] = setCookie.split(";");
      const separator = pair.indexOf("=");
      if (separator <= 0) continue;
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      const shouldDelete = !value
        || attributes.some((attribute) => /^max-age\s*=\s*0$/iu.test(attribute.trim()));
      if (shouldDelete) {
        this.#cookies.delete(name);
      } else {
        this.#cookies.set(name, value);
      }
    }
  }

  header() {
    return [...this.#cookies.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  clear() {
    this.#cookies.clear();
  }

  value(name) {
    return this.#cookies.get(name) ?? null;
  }

  get size() {
    return this.#cookies.size;
  }
}

export class SafeHttpClient {
  constructor({
    origin,
    basicUser,
    basicPassword,
    rules,
    defaultHeaders,
    fetchImpl = fetch,
  }) {
    this.origin = new URL(origin);
    this.basicUser = basicUser;
    this.basicPassword = basicPassword;
    this.rules = rules;
    this.defaultHeaders = new Headers(defaultHeaders);
    this.fetchImpl = fetchImpl;
    this.jar = new CookieJar();
    this.ledger = [];
  }

  #assertAllowed(method, pathname) {
    const allowed = this.rules.some((rule) => (
      rule.method === method
      && (typeof rule.path === "string" ? rule.path === pathname : rule.path.test(pathname))
    ));
    assert(allowed, `network_request_not_allowlisted:${method}:${pathname}`);
  }

  async request(path, {
    method = "GET",
    basic = true,
    json,
    headers: inputHeaders,
  } = {}) {
    const url = new URL(path, this.origin);
    assert(url.origin === this.origin.origin, "cross_origin_request_rejected");
    const normalizedMethod = method.toUpperCase();
    this.#assertAllowed(normalizedMethod, url.pathname);

    const headers = new Headers(this.defaultHeaders);
    for (const [key, value] of new Headers(inputHeaders).entries()) headers.set(key, value);
    if (basic) {
      assert(this.basicUser && this.basicPassword, "basic_auth_missing");
      headers.set(
        "Authorization",
        `Basic ${Buffer.from(`${this.basicUser}:${this.basicPassword}`).toString("base64")}`,
      );
    }
    const cookie = this.jar.header();
    if (cookie) headers.set("Cookie", cookie);
    if (json !== undefined) headers.set("Content-Type", "application/json");

    this.ledger.push({ method: normalizedMethod, pathname: url.pathname });
    const response = await this.fetchImpl(url, {
      method: normalizedMethod,
      headers,
      body: json === undefined ? undefined : JSON.stringify(json),
      cache: "no-store",
      redirect: "error",
    });
    this.jar.absorb(response.headers);
    return response;
  }

  async requestJson(path, init) {
    const response = await this.request(path, init);
    const payload = await response.json().catch(() => ({}));
    return { response, payload };
  }
}

export function emit(stage, details = {}) {
  process.stdout.write(`${JSON.stringify({ stage, ...details })}\n`);
}

export function safeErrorCode(error) {
  if (!(error instanceof Error)) return "unknown_failure";
  const message = error.message.replace(/[^A-Za-z0-9_:-]/gu, "_").slice(0, 160);
  return message || "unknown_failure";
}
