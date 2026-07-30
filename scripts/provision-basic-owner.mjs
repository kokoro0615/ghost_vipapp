import { createHash, createHmac, randomUUID } from "node:crypto";

const BASIC_OWNER_PIN_CONTEXT = "ghost-vipapp-basic-owner-pin-v1";
const BASIC_OWNER_EMAIL_CONTEXT = "ghost-vipapp-basic-owner-v1";

if (process.env.VERCEL_ENV !== "production") {
  console.log("Basic owner provisioning skipped outside Vercel Production.");
  process.exit(0);
}

const password = process.env.VIPAPP_BASIC_PASSWORD;
const supabaseUrl = process.env.VIPAPP_SUPABASE_URL;
const serviceRoleKey = process.env.VIPAPP_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.log("Basic owner provisioning already sealed; temporary bootstrap credentials are absent.");
  process.exit(0);
}

if (!password) {
  throw new Error("VIPAPP_BASIC_PASSWORD is required for Basic owner provisioning.");
}

const digest = createHmac("sha256", BASIC_OWNER_PIN_CONTEXT)
  .update(password, "utf8")
  .digest();
const pin = String(digest.readUInt32BE(0) % 100_000_000).padStart(8, "0");
const emailHash = createHash("sha256")
  .update(BASIC_OWNER_EMAIL_CONTEXT, "utf8")
  .digest("hex");
const endpoint = new URL("/rest/v1/rpc/set_admin_pin_v7", supabaseUrl);
const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    "content-type": "application/json",
  },
  body: JSON.stringify({
    p_email_hash: emailHash,
    p_display_name: "VIP Manager Owner",
    p_role: "owner",
    p_pin: pin,
    p_request_id: `vipapp-basic-owner-${randomUUID()}`,
  }),
});

if (!response.ok) {
  throw new Error(`Basic owner provisioning failed with HTTP ${response.status}.`);
}

console.log("Basic owner credential provisioned for the Production access bridge.");
