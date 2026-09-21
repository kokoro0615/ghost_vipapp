import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const HOOK = "src/components/admin/vip-floor-v2/state/useVipFloorWorkspace.ts";

async function readHook() {
  return readFile(path.join(root, HOOK), "utf8");
}

test("every workspace request carries a deadline", async () => {
  const source = await readHook();
  // All awaited JSON reads and writes must use the body-aware helper. The
  // telemetry POST is fire-and-forget and never gates operator interaction.
  const bare = [...source.matchAll(/(?<![\w.])fetch\(/gu)].length;
  const metrics = [...source.matchAll(/await fetch\("\/api\/admin\/vip-floor\/observability", \{/gu)].length;
  assert.equal(metrics, 1);
  assert.equal(bare, metrics, "an awaited request bypasses the JSON deadline");
  assert.match(source, /import \{ fetchJsonWithDeadline \} from/u);
  assert.doesNotMatch(source, /response\.json\(/u);
  assert.match(source, /const READ_DEADLINE_MS = \d[\d_]*;/u);
  assert.match(source, /const WRITE_DEADLINE_MS = \d[\d_]*;/u);
});

test("the board load cannot be overwritten by a superseded attempt", async () => {
  const source = await readHook();
  const loadBoard = source.slice(
    source.indexOf("const loadBoard"),
    source.indexOf("useEffect(() =>", source.indexOf("const loadBoard")),
  );
  assert.match(loadBoard, /loadSequenceRef\.current = sequence;/u);
  assert.match(loadBoard, /const superseded = \(\) => loadSequenceRef\.current !== sequence;/u);
  // The recovered board must survive the abandoned load reaching its deadline.
  assert.ok(
    loadBoard.split("if (superseded()) return false;").length - 1 >= 3,
    "each resumption point in loadBoard must yield to a newer load",
  );
});

test("a woken tablet re-resolves the board instead of waiting for `online`", async () => {
  const source = await readHook();
  assert.match(source, /document\.addEventListener\("visibilitychange", resume\);/u);
  assert.match(source, /window\.addEventListener\("pageshow", resumeFromCache\);/u);
  assert.match(source, /window\.addEventListener\("focus", resume\);/u);

  const resume = source.slice(
    source.indexOf("const resume = () => {"),
    source.indexOf("const resumeFromCache"),
  );
  // iPadOS can deliver `offline` without ever delivering `online`, so the flag
  // that disables 新規受付 is cleared by the page becoming usable again.
  assert.match(resume, /setOffline\(false\);/u);
  assert.match(resume, /RESUMABLE_STATES\.has\(globalStateRef\.current\)/u);
  assert.match(resume, /void loadBoard\(businessDate\);/u);
  assert.match(source, /const RESUMABLE_STATES = new Set\(\["loading", "stale", "reconnecting", "error"\]\);/u);
});

test("operator entry stays blocked only while the board is genuinely unreadable", async () => {
  const workspace = await readFile(
    path.join(root, "src/components/admin/vip-floor-v2/VipFloorWorkspace.tsx"),
    "utf8",
  );
  // The disabled intake button and the skeleton-only view frame are the two
  // symptoms a latched `loading` produced on the venue iPad. They remain
  // correct behaviour; the deadline is what guarantees the state is temporary.
  assert.match(workspace, /const operationEntryBlocked = offline\s*\n\s*\|\| \["loading", "error"\]\.includes\(state\.globalState\)/u);
  assert.match(workspace, /state\.globalState === "loading" \? <WorkspaceSkeleton/u);
});
