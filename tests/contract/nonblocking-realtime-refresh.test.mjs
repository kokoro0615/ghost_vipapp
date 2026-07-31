import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("healthy cached-board refresh never enters mutation pending", async () => {
  const source = await readFile(
    path.join(root, "src/components/admin/vip-floor-v2/state/useVipFloorWorkspace.ts"),
    "utf8",
  );
  const loadBoardStart = source.indexOf("const loadBoard");
  const sessionStart = source.indexOf("useEffect(() =>", loadBoardStart);
  const loadBoard = source.slice(loadBoardStart, sessionStart);

  assert.ok(loadBoardStart >= 0, "loadBoard missing");
  assert.doesNotMatch(
    loadBoard,
    /type:\s*"pending"/u,
    "passive board refresh must not disable operational controls",
  );
  assert.match(loadBoard, /mode === "initial"/u);
});

test("normal EventSource reconnect refreshes without declaring a global block", async () => {
  const source = await readFile(
    path.join(root, "src/components/admin/vip-floor-v2/state/useVipFloorWorkspace.ts"),
    "utf8",
  );
  const eventSourceStart = source.indexOf("const events = new EventSource");
  const eventSourceEnd = source.indexOf("return () =>", eventSourceStart);
  const eventSource = source.slice(eventSourceStart, eventSourceEnd);
  const openHandler = eventSource.slice(
    eventSource.indexOf('events.addEventListener("open"'),
    eventSource.indexOf('events.addEventListener("revision"'),
  );

  assert.match(openHandler, /void loadBoard\(businessDate\)/u);
  assert.doesNotMatch(openHandler, /type:\s*"globalState"/u);
  assert.match(eventSource, /STREAM_RECONNECT_GRACE_MS/u);
});
