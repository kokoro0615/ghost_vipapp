import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

const PATHS = Object.freeze({
  contract: "src/lib/demo/contract.ts",
  fixtures: "src/lib/demo/fixtures.ts",
  validation: "src/lib/demo/validation.ts",
  repository: "src/lib/demo/repository.ts",
  transport: "src/lib/demo/transport.ts",
});

async function readRequired(relativePath) {
  try {
    return await readFile(path.join(root, relativePath), "utf8");
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      assert.fail(`planned source missing: ${relativePath}`);
    }
    throw error;
  }
}

function assertContainsAll(source, markers, label) {
  for (const marker of markers) {
    assert.match(source, marker, `${label} missing contract marker ${marker}`);
  }
}

test("demo contract fixes the exact JST access/date window and versioned local envelope", async () => {
  const contract = await readRequired(PATHS.contract);

  assertContainsAll(contract, [
    /2026-07-27T00:00:00\+09:00/u,
    /2026-08-27T23:59:59\+09:00/u,
    /2026-07-27/u,
    /2026-08-27/u,
    /Asia\/Tokyo/u,
    /\bschemaVersion\b/u,
    /\bdataVersion\b/u,
    /\bworkspaceId\b/u,
    /\bbusinessDate\b/u,
    /\bseededAt\b/u,
    /\bexpiresAt\b/u,
    /\bboardRevision\b/u,
    /\btables\b/u,
    /\breservations\b/u,
    /\bassignments\b/u,
    /\bblocks\b/u,
    /\bnotes\b/u,
    /\bwaitlist\b/u,
    /\bstaff\b/u,
    /\bcustomers\b/u,
    /\bauditHistory\b/u,
  ], PATHS.contract);
  assert.match(contract, /ghost-vip-demo:/u);
  assert.doesNotMatch(contract, /rolling|30\s*\*\s*24\s*\*\s*60/iu);
});

test("fixtures are deterministic, synthetic-only, and use exactly GHOST VIP-1 through VIP-8", async () => {
  const fixtures = await readRequired(PATHS.fixtures);

  for (let table = 1; table <= 8; table += 1) {
    assert.match(fixtures, new RegExp(`VIP-${table}(?!\\\\d)`, "u"), `missing VIP-${table}`);
  }
  assert.doesNotMatch(fixtures, /\bT[1-8]\b|Trial|canary|control table/iu);
  assertContainsAll(fixtures, [
    /デモゲスト(?:001|0*1)/u,
    /DEMO-/u,
    /@example\.invalid/u,
    /デモスタッフA/u,
    /2026-07-27/u,
    /2026-07-28/u,
    /2026-08-01/u,
    /2026-08-08/u,
    /2026-08-27/u,
    /deterministic|seed/iu,
  ], PATHS.fixtures);
  assert.doesNotMatch(fixtures, /Math\.random\(\)/u, "fixture generation must be deterministic");
  assert.doesNotMatch(fixtures, /phone\s*:\s*["'][^"']/iu, "fixture phone must remain empty");
});

test("shared demo validation rejects outside dates, PII-like values, and secret-like values", async () => {
  const validation = await readRequired(PATHS.validation);

  assertContainsAll(validation, [
    /2026-07-27/u,
    /2026-08-27/u,
    /example\.invalid/u,
    /phone|電話/iu,
    /email|メール/iu,
    /DEMO|デモ/u,
    /secret|token|bearer|authorization/iu,
    /reject|invalid|throw|error/iu,
  ], PATHS.validation);
  assert.match(
    validation,
    /@example\\?\.invalid|endsWith\(\s*["']@example\.invalid["']\s*\)/u,
    "only example.invalid email addresses may be stored",
  );
  assert.match(
    validation,
    /(?:\+?81|0\d|\\d\{|phone-like|PHONE)/iu,
    "phone-like digit sequences need an explicit rejection rule",
  );
  assert.doesNotMatch(validation, /GHOST_ADMIN_API_ORIGIN|ghost-ruby-one/u);
});

test("local repository performs one-envelope atomic writes with version, revision, idempotency, conflicts and audit", async () => {
  const repository = await readRequired(PATHS.repository);

  assertContainsAll(repository, [
    /localStorage/u,
    /ghost-vip-demo:/u,
    /structuredClone|JSON\.parse\(JSON\.stringify/u,
    /\bexpectedVersion\b/u,
    /\bboardRevision\b/u,
    /idempotency/iu,
    /\b409\b|conflict/iu,
    /table[A-Za-z]*conflict|TABLE_CONFLICT/iu,
    /block[A-Za-z]*conflict|BLOCK_CONFLICT/iu,
    /invalid[A-Za-z]*transition|INVALID_STATE_TRANSITION/iu,
    /auditHistory/u,
    /setItem/u,
  ], PATHS.repository);
  assert.match(
    repository,
    /boardRevision\s*(?:\+=\s*1|=\s*[^;\n]+\+\s*1|\+\+)/u,
    "successful mutations must advance boardRevision",
  );
  assert.match(
    repository,
    /version\s*(?:\+=\s*1|=\s*[^;\n]+\+\s*1|\+\+)/u,
    "successful entity mutations must advance version",
  );
  assert.doesNotMatch(repository, /sessionStorage|indexedDB|document\.cookie/iu);
  assert.doesNotMatch(repository, /authorization|bearer|hmac|PIN_SCRYPT|BASIC_PASSWORD/iu);
});

test("repository safely resets dataVersion mismatches, purges expiry and synchronizes revision gaps", async () => {
  const repository = await readRequired(PATHS.repository);

  assertContainsAll(repository, [
    /dataVersion/u,
    /reset|reseed/iu,
    /expiresAt/u,
    /removeItem/u,
    /BroadcastChannel/u,
    /revision/u,
    /gap/u,
    /reload|hydrate|read/iu,
  ], PATHS.repository);
  assert.match(
    repository,
    /dataVersion\s*!==|!={1,2}\s*[^;\n]*dataVersion/u,
    "dataVersion mismatch must be explicitly detected",
  );
  assert.match(repository, /Date\.now\(\)|new Date\(\)/u, "expiry purge must use current time");
  assert.match(repository, /confirm|reset/iu, "an explicit reset operation must exist");
  assert.match(repository, /auditHistory/u, "reset must remain auditable");
});

test("demo transport cannot call Production APIs, origins, tokens, providers or delivery endpoints", async () => {
  const [contract, fixtures, validation, repository, transport] = await Promise.all([
    readRequired(PATHS.contract),
    readRequired(PATHS.fixtures),
    readRequired(PATHS.validation),
    readRequired(PATHS.repository),
    readRequired(PATHS.transport),
  ]);
  const demoClientPlane = `${contract}\n${fixtures}\n${validation}\n${repository}\n${transport}`;

  assert.doesNotMatch(demoClientPlane, /ghostAdminFetch/u);
  assert.doesNotMatch(demoClientPlane, /\/api\/admin\/vip-floor/u);
  assert.doesNotMatch(
    demoClientPlane,
    /GHOST_ADMIN_API_ORIGIN|ghost-ruby-one|cpfsrwctjymhmwvsbwdi/u,
  );
  assert.doesNotMatch(
    demoClientPlane,
    /authorization\s*:|bearer\s+|productionToken|adminToken/iu,
  );
  assert.doesNotMatch(
    demoClientPlane,
    /stripe|refund|sendgrid|twilio|line[_-]?(?:notify|message)|sendEmail|sendSms/iu,
  );
  assert.doesNotMatch(
    demoClientPlane,
    /webhookProcessingEnabled\s*:\s*true|webhook(?:Url|Endpoint|Delivery)|sendWebhook/iu,
  );
  assert.match(transport, /mode\s*[:=]\s*["']demo["']|DemoTransport/u);
  assert.match(transport, /repository|local/iu);
  assert.match(transport, /\/api\/admin\/demo\/lease/u, "lease is the only expected demo server request");
  assert.doesNotMatch(
    transport,
    /fallback[\s\S]{0,180}(?:production|owner)|catch[\s\S]{0,180}(?:production|owner)/iu,
    "demo errors must never fall back to Production transport",
  );
});

test("all permitted demo reservation, arrival and operations commands are represented", async () => {
  const [contract, repository, transport] = await Promise.all([
    readRequired(PATHS.contract),
    readRequired(PATHS.repository),
    readRequired(PATHS.transport),
  ]);
  const operationPlane = `${contract}\n${repository}\n${transport}`;
  const operationMarkers = [
    "reservation_create",
    "reservation_update",
    "check_in",
    "arrival_time",
    "service_status",
    "assignment",
    "seat_extension",
    "note",
    "walk_in",
    "waitlist_create",
    "waitlist_call",
    "waitlist_expire",
    "waitlist_cancel",
    "waitlist_seat",
    "block_create",
    "block_update",
    "block_cancel",
    "block_repeat",
    "staff_create",
    "staff_update",
    "staff_assignment",
    "customer_update",
    "customer_attributes",
    "customer_unlink",
    "customer_relink",
    "reset",
  ];

  for (const operation of operationMarkers) {
    assert.match(
      operationPlane,
      new RegExp(operation, "u"),
      `demo operation contract missing: ${operation}`,
    );
  }
});

test("demo transport retains owner-compatible version/revision result shapes without external delivery", async () => {
  const [contract, transport] = await Promise.all([
    readRequired(PATHS.contract),
    readRequired(PATHS.transport),
  ]);
  const plane = `${contract}\n${transport}`;

  assertContainsAll(plane, [
    /\bentityVersion\b|\bversion\b/u,
    /\bboardRevision\b/u,
    /\bauditLogId\b|\bauditHistory\b/u,
    /idempotency/iu,
    /optimistic/iu,
    /rollback/iu,
    /read[_-]?only/iu,
  ], "demo transport result contract");
  assert.match(plane, /notification[\s\S]{0,180}(?:false|none|local)|実送信なし/iu);
  assert.doesNotMatch(plane, /notificationPreference\s*:\s*["']email["']/u);
});
