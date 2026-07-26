import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

test("trial mode utility remains server-only while the production shell is permanently cue-free", async () => {
  const [mode, layout, cue] = await Promise.all([
    read("src/lib/server/trialMode.ts"),
    read("src/app/layout.tsx"),
    read("src/components/admin/vip-floor-v2/TrialMode.tsx"),
  ]);

  assert.match(mode, /import "server-only"/u);
  assert.match(mode, /process\.env\.GHOST_VIP_TRIAL_MODE === "true"/u);
  assert.match(layout, /generateMetadata/u);
  assert.doesNotMatch(layout, /GHOST_VIP_TRIAL_MODE|TrialModeProvider|TRIAL \/ 仮データ専用/u);
  assert.match(layout, /colorScheme: "light"/u);
  assert.match(cue, /実在する顧客・スタッフ・電話・メール・決済情報を入力しない/u);
  assert.doesNotMatch(cue, /process\.env/u);
});

test("production workspace and every dialog family contain no Trial cue", async () => {
  const paths = [
    "src/components/admin/vip-floor-v2/VipFloorWorkspace.tsx",
    "src/components/admin/vip-floor-v2/commands/CommandCenter.tsx",
    "src/components/admin/vip-floor-v2/operations/OperationCenter.tsx",
    "src/components/admin/vip-floor-v2/customers/CustomerPanel.tsx",
    "src/components/admin/vip-floor-v2/observability/ObservabilityPanel.tsx",
    "src/components/admin/vip-floor-v2/staff/StaffPanel.tsx",
    "src/components/admin/vip-floor-v2/waitlist/WaitlistPanel.tsx",
  ];
  const sources = await Promise.all(paths.map(read));

  for (const source of sources) {
    assert.doesNotMatch(source, /TrialModeCue|TRIAL \/ 仮データ専用/u);
  }
});

test("trial form constraints disable phone capture and limit generated email domains", async () => {
  const [wizard, waitlist] = await Promise.all([
    read("src/components/admin/vip-floor-v2/operations/ReservationWizard.tsx"),
    read("src/components/admin/vip-floor-v2/waitlist/WaitlistPanel.tsx"),
  ]);

  assert.match(wizard, /disabled=\{trialMode\}/u);
  assert.match(wizard, /@example\\\\\.com/u);
  assert.match(waitlist, /@example\\\\\.com/u);
  assert.match(wizard, /TRIALでは電話番号は入力できません/u);
});

test("backend bypass remains server-only, origin-bound, and cannot target the production website", async () => {
  const source = await read("src/lib/server/ghostAdminProxy.ts");
  const clientSources = await Promise.all([
    read("src/components/admin/vip-floor-v2/VipFloorWorkspace.tsx"),
    read("src/components/admin/vip-floor-v2/state/useVipFloorWorkspace.ts"),
    read("src/app/page.tsx"),
  ]);

  assert.match(source, /import "server-only"/u);
  assert.match(source, /GHOST_BACKEND_PROTECTION_BYPASS/u);
  assert.match(source, /x-vercel-protection-bypass/u);
  assert.match(source, /PRODUCTION_WEBSITE_ORIGINS/u);
  assert.match(source, /https:\/\/ghost-ruby-one\.vercel\.app/u);
  assert.match(source, /backendUrl\.origin !== configuredOrigin/u);
  assert.match(source, /!PRODUCTION_WEBSITE_ORIGINS\.has\(backendUrl\.origin\)/u);
  assert.doesNotMatch(source, /console\.(?:log|error|warn)/u);
  for (const clientSource of clientSources) {
    assert.doesNotMatch(clientSource, /GHOST_BACKEND_PROTECTION_BYPASS|x-vercel-protection-bypass/u);
  }
});
