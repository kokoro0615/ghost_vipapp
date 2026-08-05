import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const TRUSTED_ACCESS_LANE_HEADER = "x-ghost-vip-trusted-access-lane";
export const OWNER_SESSION_COOKIE = "ghost_vipapp_admin_session";
export const DEMO_SESSION_COOKIE = "ghost_vipapp_demo_session";
export const BASIC_ACCESS_COOKIE = "ghost_vipapp_basic_access";
export const ACCESS_LOCK_COOKIE = "ghost_vipapp_access_locked";
export const TRUSTED_ACCESS_LOCK_HEADER = "x-ghost-vipapp-access-locked";
export const BASIC_ACCESS_MAX_AGE_SECONDS = 8 * 60 * 60;

export type AccessLane = "owner" | "demo";
export type BasicAccessSource = "authorization" | "cookie";

export type BasicAccessConfiguration = {
  ownerUsername: string | undefined;
  ownerPassword: string | undefined;
  demoEnabled: boolean;
  demoUsername: string | undefined;
  demoPassword: string | undefined;
};

function parseBasicAuthorization(value: string | null) {
  const match = value?.match(/^Basic\s+([A-Za-z0-9+/=]+)$/iu);
  if (!match) return { username: "", password: "", valid: false };

  try {
    const decoded = Buffer.from(match[1], "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) return { username: "", password: "", valid: false };
    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
      valid: true,
    };
  } catch {
    return { username: "", password: "", valid: false };
  }
}

function hashCredential(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

function constantTimeCredentialEqual(received: string, expected: string | undefined) {
  const receivedDigest = hashCredential(received);
  const expectedDigest = hashCredential(expected ?? "");
  return timingSafeEqual(receivedDigest, expectedDigest);
}

function configuredCredentialKey(
  lane: AccessLane,
  configuration: BasicAccessConfiguration,
) {
  const username = lane === "owner"
    ? configuration.ownerUsername
    : configuration.demoUsername;
  const password = lane === "owner"
    ? configuration.ownerPassword
    : configuration.demoPassword;
  const enabled = lane === "owner" || configuration.demoEnabled;
  if (!enabled || !username || !password) return null;

  return createHash("sha256")
    .update("ghost-vipapp-basic-access-v1", "utf8")
    .update("\0", "utf8")
    .update(lane, "utf8")
    .update("\0", "utf8")
    .update(username, "utf8")
    .update("\0", "utf8")
    .update(password, "utf8")
    .digest();
}

function signBasicAccessPayload(payload: string, key: Buffer) {
  return createHmac("sha256", key).update(payload, "utf8").digest();
}

export function createBasicAccessSession(
  lane: AccessLane,
  configuration: BasicAccessConfiguration,
  now = Date.now(),
) {
  const key = configuredCredentialKey(lane, configuration);
  if (!key || !Number.isFinite(now)) return null;

  const expiresAtSeconds = Math.floor(now / 1000) + BASIC_ACCESS_MAX_AGE_SECONDS;
  const payload = `v1.${lane}.${expiresAtSeconds}`;
  const signature = signBasicAccessPayload(payload, key).toString("base64url");
  return {
    token: `${payload}.${signature}`,
    expiresAt: expiresAtSeconds * 1000,
  };
}

function resolveBasicAccessSession(
  token: string | null,
  configuration: BasicAccessConfiguration,
  now = Date.now(),
): AccessLane | null {
  if (!token || token.length > 512 || !Number.isFinite(now)) return null;
  const [version, candidateLane, encodedExpiresAt, encodedSignature, extra] = token.split(".");
  if (
    version !== "v1"
    || (candidateLane !== "owner" && candidateLane !== "demo")
    || !/^\d{10,12}$/u.test(encodedExpiresAt ?? "")
    || !encodedSignature
    || extra
  ) {
    return null;
  }

  const lane: AccessLane = candidateLane;
  const expiresAtSeconds = Number(encodedExpiresAt);
  if (!Number.isSafeInteger(expiresAtSeconds) || expiresAtSeconds <= Math.floor(now / 1000)) {
    return null;
  }

  const key = configuredCredentialKey(lane, configuration);
  if (!key) return null;
  const payload = `${version}.${lane}.${encodedExpiresAt}`;
  const expectedSignature = signBasicAccessPayload(payload, key);
  let receivedSignature: Buffer;
  try {
    receivedSignature = Buffer.from(encodedSignature, "base64url");
  } catch {
    return null;
  }
  if (
    receivedSignature.length !== expectedSignature.length
    || !timingSafeEqual(receivedSignature, expectedSignature)
  ) {
    return null;
  }
  return lane;
}

export function resolveBasicAccessLane(
  authorization: string | null,
  configuration: BasicAccessConfiguration,
): AccessLane | null {
  const credentials = parseBasicAuthorization(authorization);
  return resolveAccessCredentials(
    credentials.username,
    credentials.password,
    credentials.valid,
    configuration,
  );
}

function resolveAccessCredentials(
  username: string,
  password: string,
  valid: boolean,
  configuration: BasicAccessConfiguration,
): AccessLane | null {
  const ownerConfigured = Boolean(configuration.ownerUsername && configuration.ownerPassword);
  const demoConfigured = Boolean(
    configuration.demoEnabled
      && configuration.demoUsername
      && configuration.demoPassword,
  );

  // Always evaluate both lanes so a failed username or a disabled lane does not
  // change which credential comparisons run.
  const ownerUsernameMatches = constantTimeCredentialEqual(
    username,
    configuration.ownerUsername,
  );
  const ownerPasswordMatches = constantTimeCredentialEqual(
    password,
    configuration.ownerPassword,
  );
  const demoUsernameMatches = constantTimeCredentialEqual(
    username,
    configuration.demoUsername,
  );
  const demoPasswordMatches = constantTimeCredentialEqual(
    password,
    configuration.demoPassword,
  );
  const ownerMatches = ownerUsernameMatches && ownerPasswordMatches;
  const demoMatches = demoUsernameMatches && demoPasswordMatches;

  const owner = valid && ownerConfigured && ownerMatches;
  const demo = valid && demoConfigured && demoMatches;
  if (owner === demo) return null;
  return owner ? "owner" : "demo";
}

export function resolveExplicitAccessCredentials(
  username: string,
  password: string,
  configuration: BasicAccessConfiguration,
): AccessLane | null {
  const valid = username.length > 0
    && password.length > 0
    && username.length <= 256
    && password.length <= 1024;
  return resolveAccessCredentials(username, password, valid, configuration);
}

export function resolveBasicAccessRequest(
  authorization: string | null,
  accessCookie: string | null,
  configuration: BasicAccessConfiguration,
  now = Date.now(),
  accessLocked = false,
): { lane: AccessLane; source: BasicAccessSource } | null {
  if (accessLocked) return null;
  if (authorization !== null) {
    const lane = resolveBasicAccessLane(authorization, configuration);
    return lane ? { lane, source: "authorization" } : null;
  }

  const lane = resolveBasicAccessSession(accessCookie, configuration, now);
  return lane ? { lane, source: "cookie" } : null;
}

export function readTrustedAccessLane(request: Request): AccessLane | null {
  const lane = request.headers.get(TRUSTED_ACCESS_LANE_HEADER);
  return lane === "owner" || lane === "demo" ? lane : null;
}
