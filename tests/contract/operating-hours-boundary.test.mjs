import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("timeline, options, board and mutations share the 22:00-next-day-05:00 contract", async () => {
  const [
    chart,
    wizard,
    operationCenter,
    timeFields,
    boardRoute,
    optionsRoute,
    operationsRoute,
    commandRoute,
    clientErrors,
  ] = await Promise.all([
    read("src/components/admin/vip-floor-v2/chart/ChartView.tsx"),
    read("src/components/admin/vip-floor-v2/operations/ReservationWizard.tsx"),
    read("src/components/admin/vip-floor-v2/operations/OperationCenter.tsx"),
    read("src/components/admin/vip-floor-v2/operations/BusinessTimeFields.tsx"),
    read("src/app/api/admin/vip-floor/route.ts"),
    read("src/app/api/admin/vip-floor/options/route.ts"),
    read("src/app/api/admin/vip-floor/operations/route.ts"),
    read("src/app/api/admin/vip-floor/commands/route.ts"),
    read("src/lib/vipFloorClientErrors.ts"),
  ]);

  assert.match(chart, /getGhostOperatingWindow\(board\.businessDay\.businessDate\)/u);
  assert.doesNotMatch(wizard, /type="datetime-local"/u);
  assert.doesNotMatch(operationCenter, /type="datetime-local"/u);
  assert.match(timeFields, /getGhostTimeOptions\(businessDate\)/u);
  assert.match(timeFields, /22:00〜翌05:00/u);
  assert.match(timeFields, /15分単位/u);
  assert.match(boardRoute, /normalizeGhostBusinessDay\(businessDay\)/u);
  assert.match(optionsRoute, /normalizeGhostBusinessDay\(businessDay\)/u);
  assert.match(operationsRoute, /isGhostOperatingInterval/u);
  assert.match(commandRoute, /isGhostOperatingTimestamp\(occurredAt\)/u);
  assert.match(clientErrors, /code === "outside_operating_hours"/u);
});
