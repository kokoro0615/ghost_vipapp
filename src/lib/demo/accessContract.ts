import { createHash, timingSafeEqual } from "node:crypto";

export const TRUSTED_ACCESS_LANE_HEADER = "x-ghost-vip-trusted-access-lane";
export const OWNER_SESSION_COOKIE = "ghost_vipapp_admin_session";
export const DEMO_SESSION_COOKIE = "ghost_vipapp_demo_session";

export type AccessLane = "owner" | "demo";

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

export function resolveBasicAccessLane(
  authorization: string | null,
  configuration: BasicAccessConfiguration,
): AccessLane | null {
  const credentials = parseBasicAuthorization(authorization);
  const ownerConfigured = Boolean(configuration.ownerUsername && configuration.ownerPassword);
  const demoConfigured = Boolean(
    configuration.demoEnabled
      && configuration.demoUsername
      && configuration.demoPassword,
  );

  // Always evaluate both lanes so a failed username or a disabled lane does not
  // change which credential comparisons run.
  const ownerUsernameMatches = constantTimeCredentialEqual(
    credentials.username,
    configuration.ownerUsername,
  );
  const ownerPasswordMatches = constantTimeCredentialEqual(
    credentials.password,
    configuration.ownerPassword,
  );
  const demoUsernameMatches = constantTimeCredentialEqual(
    credentials.username,
    configuration.demoUsername,
  );
  const demoPasswordMatches = constantTimeCredentialEqual(
    credentials.password,
    configuration.demoPassword,
  );
  const ownerMatches = ownerUsernameMatches && ownerPasswordMatches;
  const demoMatches = demoUsernameMatches && demoPasswordMatches;

  const owner = credentials.valid && ownerConfigured && ownerMatches;
  const demo = credentials.valid && demoConfigured && demoMatches;
  if (owner === demo) return null;
  return owner ? "owner" : "demo";
}

export function readTrustedAccessLane(request: Request): AccessLane | null {
  const lane = request.headers.get(TRUSTED_ACCESS_LANE_HEADER);
  return lane === "owner" || lane === "demo" ? lane : null;
}
