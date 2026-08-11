import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("canonical workspace mounts one capability-gated ticket operations module", async () => {
  const [page, workspace, panel] = await Promise.all([
    read("src/app/page.tsx"),
    read("src/components/admin/vip-floor-v2/VipFloorWorkspace.tsx"),
    read("src/components/admin/vip-floor-v2/ticket-operations/TicketOperationsPanel.tsx"),
  ]);

  assert.match(page, /readVipTicketOperationsDisplayCapabilities/u);
  assert.match(page, /ticketOperationsCapabilities=/u);
  assert.match(workspace, /\.\/ticket-operations\/TicketOperationsPanel/u);
  assert.match(workspace, /チケット対応/u);
  assert.match(workspace, /ticketOperationsAvailable\s*=\s*isOwner\s*&&/u);
  assert.match(workspace, /ticketOperationsCapabilities\.managerOperationsEnabled\s*\|\|\s*ticketOperationsCapabilities\.refundReviewEnabled/u);
  assert.match(panel, /data-ticket-operations-root/u);
  assert.doesNotMatch(workspace, /VipFloorDashboard/u);
});

test("ticket operations has focused real-viewport QA for every required recovery state", async () => {
  const [qa, demo, manifest] = await Promise.all([
    read("scripts/a11y-visual.mjs"),
    read("src/components/admin/vip-floor-v2/ticket-operations/demo.ts"),
    read("scripts/light-ui-qa-manifest.mjs"),
  ]);

  for (const state of [
    "ticket-operations-queue",
    "ticket-operations-search-empty",
    "ticket-operations-inspector",
    "ticket-operations-override-confirm",
    "ticket-operations-resolve-confirm",
    "ticket-operations-admitted-exception-confirm",
    "ticket-operations-offline",
    "ticket-operations-version-conflict",
    "ticket-operations-legacy-incomplete",
  ]) {
    assert.match(qa, new RegExp(state, "u"));
  }
  assert.match(manifest, /"ticket-operations-legacy-incomplete"/u);
  assert.match(qa, /保存済みの観測履歴が不完全なため、この画面では終端解決できません/u);
  assert.match(qa, /legacy incomplete must not render refund allocation controls/u);
  assert.match(qa, /legacy incomplete must not render refund resolution controls/u);
  assert.match(qa, /legacy incomplete must not render a refund confirmation/u);
  assert.match(qa, /data-least-destructive/u);
  assert.match(qa, /currentVersion:\s*8/u);
  assert.match(demo, /\{ length: 20 \}/u);
  assert.match(demo, /"admitted" as const/u);
  assert.match(demo, /"void" as const/u);
});

test("capabilities are read first and disabled or refund-only modes do not poll recovery", async () => {
  const api = await read("src/components/admin/vip-floor-v2/ticket-operations/api.ts");
  const hook = await read("src/components/admin/vip-floor-v2/ticket-operations/useTicketOperations.ts");

  assert.match(hook, /loadCapabilities/u);
  assert.match(hook, /capabilitiesReady/u);
  assert.match(hook, /if \(!open \|\| !capabilitiesReady\)/u);
  assert.match(hook, /scope:\s*capabilities\.managerOperationsEnabled\s*\?\s*"all"\s*:\s*"refund"/u);
  assert.match(api, /\/api\/admin\/vip-floor\/tickets\/capabilities/u);
  assert.match(api, /mode === "demo"/u);
  assert.doesNotMatch(api, /ghost-ruby-one|GHOST_ADMIN_API_ORIGIN|supabase/iu);
});

test("operator UI covers queue, scoped inspector, status rails and PII-safe recovery", async () => {
  const components = await Promise.all([
    read("src/components/admin/vip-floor-v2/ticket-operations/TicketOperationsPanel.tsx"),
    read("src/components/admin/vip-floor-v2/ticket-operations/TicketOperationsQueue.tsx"),
    read("src/components/admin/vip-floor-v2/ticket-operations/TicketOperationsInspector.tsx"),
  ]);
  const plane = components.join("\n");

  for (const marker of [
    "チケット対応",
    "入場枠",
    "最近の入場",
    "maskedEmail",
    "OTP",
    "Wallet",
    "返金確認",
    "Checkout確認",
    "Stripe Checkout / Payment の証跡を確認",
    "生のメールアドレスを入力・収集しない",
    "対応キューに残ります",
    "送信状態",
    "監査履歴",
    "safeRecoveryInstruction",
    "LIVE",
    "TEST",
  ]) {
    assert.match(plane, new RegExp(marker, "u"));
  }
  assert.doesNotMatch(plane, /admissionCode|rawEmail|sessionToken|otpCode/u);
  assert.doesNotMatch(plane, /unadmit|入場取消|Stripe返金を作成/u);
  assert.match(plane, /expectedVersion:\s*session\.expectedVersion/u);
  assert.match(plane, /selectedRefundAdmissionIds/u);
  assert.match(plane, /refundEligibleAdmissions/u);
  assert.match(plane, /allocationRequired\s*=\s*refundResolution === "apply_and_void"[\s\S]*"record_admitted_exception"/u);
  assert.match(plane, /allocations:\s*allocationRequired\s*\?\s*allocations\s*:\s*\[\]/u);
  assert.match(plane, /item\.kind === "checkout_review"/u);
  assert.match(plane, /review\.authorityResolvable/u);
  assert.match(plane, /review\.observationHistoryState === "legacy_incomplete"/u);
  assert.match(plane, /observationVersion:\s*review\.observationVersion/u);
  assert.match(plane, /observationHash:\s*review\.observationHash/u);
  assert.match(plane, /保存済みの観測履歴が不完全/u);
  assert.match(plane, /Stripeの権威ある決済・返金履歴/u);
  assert.match(plane, /forward fix/u);
  assert.doesNotMatch(plane, /action:\s*"checkout_review"/u);
});

test("every consequential action uses safe confirmation, reason, version and UUID idempotency", async () => {
  const [dialog, hook] = await Promise.all([
    read("src/components/admin/vip-floor-v2/ticket-operations/TicketOperationConfirmDialog.tsx"),
    read("src/components/admin/vip-floor-v2/ticket-operations/useTicketOperations.ts"),
  ]);
  const plane = `${dialog}\n${hook}`;

  for (const action of ["session_revoke", "assisted_admission", "refund_resolve", "email_retry"]) {
    assert.match(plane, new RegExp(action, "u"));
  }
  assert.match(dialog, /data-least-destructive/u);
  assert.match(dialog, /reason/u);
  assert.match(dialog, /submittedReason/u);
  assert.match(dialog, /readOnly=\{pending \|\| submittedReason !== null\}/u);
  assert.match(hook, /expectedVersion/u);
  assert.match(hook, /crypto\.randomUUID\(\)/u);
  assert.match(hook, /idempotencyKey/u);
  assert.match(plane, /version_conflict|currentVersion/u);
});

test("dedicated CSS preserves Operations Paper across desk, iPad portrait and phone", async () => {
  const css = await read("src/components/admin/vip-floor-v2/ticket-operations/TicketOperations.module.css");
  const workspaceCss = await read("src/components/admin/vip-floor-v2/VipFloorWorkspace.module.css");

  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*[^)]+\)\s+minmax\(0,\s*1fr\)/u);
  assert.match(css, /@media \(max-width: 1023px\)/u);
  assert.match(css, /@media \(max-width: 767px\)/u);
  assert.match(css, /@media \(min-width: 1024px\) and \(max-width: 1194px\)[\s\S]*?\.queueFilters\s*\{[\s\S]*?flex-wrap:\s*wrap/u);
  assert.match(css, /min-height:\s*var\(--h-control\)/u);
  assert.match(css, /font-size:\s*var\(--t-field\)/u);
  assert.match(css, /:focus-visible/u);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}|backdrop-filter|linear-gradient|border-radius:\s*(?:1[2-9]|[2-9]\d)px/iu);
  assert.doesNotMatch(workspaceCss, /ticketOperations|ticket-operations/u);
});

test("demo ticket operations are synthetic and browser-local with no Production request path", async () => {
  const [demo, api] = await Promise.all([
    read("src/components/admin/vip-floor-v2/ticket-operations/demo.ts"),
    read("src/components/admin/vip-floor-v2/ticket-operations/api.ts"),
  ]);

  assert.match(demo, /@example\.invalid/u);
  assert.match(demo, /DEMO-TICKET/u);
  assert.match(demo, /applyDemoTicketOperation/u);
  assert.doesNotMatch(demo, /fetch\(|\/api\/|ghost-ruby-one|stripe|resend/iu);
  assert.match(api, /if \((?:context\.)?mode === "demo"\)/u);
  assert.match(api, /return demo/u);
});
