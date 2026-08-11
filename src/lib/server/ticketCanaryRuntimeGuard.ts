const PRODUCTION_WEBSITE_ORIGIN = "https://ghost-ruby-one.vercel.app";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

type RuntimeEnvironment = Readonly<Record<string, string | undefined>>;
export type VipCanaryRuntimeAuthority = Readonly<{
  enabled: true;
  runId: string;
  websiteOrigin: string;
}> | Readonly<{ enabled: false }>;

export function readVipCanaryRuntimeAuthority(
  environment: RuntimeEnvironment = process.env,
): VipCanaryRuntimeAuthority {
  const runId = environment.GHOST_TICKET_CANARY_RUN_ID?.trim() ?? "";
  if (!runId) return Object.freeze({ enabled: false });
  const websiteOrigin = canonicalAliaslessOrigin(
    environment.GHOST_TICKET_CANARY_WEBSITE_ORIGIN,
  );
  const backendOrigin = canonicalAliaslessOrigin(environment.GHOST_ADMIN_API_ORIGIN);
  if (
    !UUID_PATTERN.test(runId)
    || websiteOrigin === null
    || backendOrigin === null
    || websiteOrigin !== backendOrigin
    || websiteOrigin === PRODUCTION_WEBSITE_ORIGIN
  ) {
    throw new Error("vip_canary_runtime_authority_invalid");
  }
  return Object.freeze({ enabled: true, runId, websiteOrigin });
}

export function assertVipCanaryBackendUrl(
  value: string | URL,
  environment: RuntimeEnvironment = process.env,
) {
  const authority = readVipCanaryRuntimeAuthority(environment);
  let url: URL;
  try {
    url = value instanceof URL ? new URL(value) : new URL(value);
  } catch {
    throw new Error("vip_canary_backend_url_invalid");
  }
  if (authority.enabled && url.origin === PRODUCTION_WEBSITE_ORIGIN) {
    throw new Error("vip_canary_production_authority_rejected");
  }
  if (authority.enabled && url.origin !== authority.websiteOrigin) {
    throw new Error("vip_canary_backend_authority_mismatch");
  }
  return Object.freeze({ url, runId: authority.enabled ? authority.runId : null });
}

function canonicalAliaslessOrigin(value: string | undefined) {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && !url.username
      && !url.password
      && !url.port
      && url.pathname === "/"
      && !url.search
      && !url.hash
      && url.hostname.endsWith(".vercel.app")
      ? url.origin
      : null;
  } catch {
    return null;
  }
}
