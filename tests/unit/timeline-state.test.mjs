import assert from "node:assert/strict";
import test from "node:test";

import {
  ARRIVAL_SOON_MINUTES,
  CLOSING_SOON_MINUTES,
  getClosingWindowPercent,
  getTimelinePhase,
} from "../../src/components/admin/vip-floor-v2/chart/timelineState.ts";

const startAt = "2026-07-31T13:00:00.000Z";
const endAt = "2026-07-31T15:00:00.000Z";
const at = (value) => new Date(value).getTime();
const phaseAt = (now, serviceStatus = "expected") => getTimelinePhase({
  nowMs: at(now),
  startAt,
  endAt,
  serviceStatus,
});

test("arrival band changes exactly fifteen minutes before the reservation", () => {
  assert.equal(ARRIVAL_SOON_MINUTES, 15);
  assert.equal(phaseAt("2026-07-31T12:44:59.999Z").key, "scheduled");
  assert.deepEqual(
    phaseAt("2026-07-31T12:45:00.000Z"),
    {
      key: "arrival_soon",
      label: "来店まで15分",
      description: "予約開始まで残り15分です",
    },
  );
});

test("two-hour band changes exactly fifteen minutes before release", () => {
  assert.equal(CLOSING_SOON_MINUTES, 15);
  assert.equal(phaseAt("2026-07-31T14:44:59.999Z", "seated").key, "active");
  assert.deepEqual(
    phaseAt("2026-07-31T14:45:00.000Z", "seated"),
    {
      key: "closing_soon",
      label: "残り15分",
      description: "予約終了まで残り15分です",
    },
  );
  assert.equal(getClosingWindowPercent(startAt, endAt), 12.5);
});

test("timeline distinguishes start delay, overtime and terminal records", () => {
  assert.equal(phaseAt("2026-07-31T13:01:00.000Z").key, "overdue");
  assert.equal(phaseAt("2026-07-31T15:01:00.000Z", "seated").key, "overdue");
  assert.equal(phaseAt("2026-07-31T14:00:00.000Z", "completed").key, "resolved");
});
