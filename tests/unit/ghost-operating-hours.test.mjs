import assert from "node:assert/strict";
import test from "node:test";

import {
  formatGhostTimeRange,
  getGhostOperatingWindow,
  getGhostTimeOptions,
  isGhostOperatingInterval,
  isGhostOperatingTimestamp,
  normalizeGhostBusinessDay,
  resolveGhostEndTime,
} from "../../src/lib/ghostOperatingHours.ts";

test("GHOST operating window is the business date 22:00 through next-day 05:00", () => {
  assert.deepEqual(getGhostOperatingWindow("2026-07-30"), {
    businessDate: "2026-07-30",
    startAt: "2026-07-30T22:00:00+09:00",
    endAt: "2026-07-31T05:00:00+09:00",
    startLocal: "2026-07-30T22:00",
    endLocal: "2026-07-31T05:00",
  });
});

test("time selector exposes only 29 quarter-hour boundaries across midnight", () => {
  const options = getGhostTimeOptions("2026-07-30");
  assert.equal(options.length, 29);
  assert.deepEqual(options[0], { value: "2026-07-30T22:00", label: "22:00" });
  assert.deepEqual(options[8], { value: "2026-07-31T00:00", label: "翌 00:00" });
  assert.deepEqual(options.at(-1), { value: "2026-07-31T05:00", label: "翌 05:00" });
  assert.equal(options.some((option) => option.label.includes("12:00")), false);
});

test("operating interval accepts the overnight boundary and rejects daytime or overrun", () => {
  assert.equal(
    isGhostOperatingInterval(
      "2026-07-30T22:00",
      "2026-07-31T05:00",
      "2026-07-30",
    ),
    true,
  );
  assert.equal(
    isGhostOperatingInterval(
      "2026-07-30T12:00",
      "2026-07-30T14:00",
      "2026-07-30",
    ),
    false,
  );
  assert.equal(
    isGhostOperatingInterval(
      "2026-07-31T04:45:00+09:00",
      "2026-07-31T05:15:00+09:00",
    ),
    false,
  );
  assert.equal(isGhostOperatingTimestamp("2026-07-31T04:45:00+09:00"), true);
  assert.equal(isGhostOperatingTimestamp("2026-07-31T05:00:00+09:00"), false);
  assert.equal(isGhostOperatingTimestamp("2026-07-30T22:07:00+09:00"), false);
  assert.equal(
    isGhostOperatingInterval(
      "2026-07-30T22:07:00+09:00",
      "2026-07-31T00:07:00+09:00",
    ),
    false,
  );
});

test("start changes preserve a valid end or clamp a two-hour stay to close", () => {
  assert.equal(
    resolveGhostEndTime(
      "2026-07-30",
      "2026-07-31T04:30",
      "2026-07-31T04:00",
    ),
    "2026-07-31T05:00",
  );
  assert.equal(
    resolveGhostEndTime(
      "2026-07-30",
      "2026-07-30T22:30",
      "2026-07-31T01:00",
    ),
    "2026-07-31T01:00",
  );
  assert.equal(
    formatGhostTimeRange(
      "2026-07-30T23:30",
      "2026-07-31T01:30",
      "2026-07-30",
    ),
    "23:30–翌 01:30",
  );
});

test("VIP Manager does not treat event-day sales opening at noon as floor opening", () => {
  assert.deepEqual(
    normalizeGhostBusinessDay({
      id: "event-day",
      businessDate: "2026-07-30",
      operatingStartAt: "2026-07-30T12:00:00+09:00",
      operatingEndAt: "2026-07-31T05:00:00+09:00",
    }),
    {
      id: "event-day",
      businessDate: "2026-07-30",
      operatingStartAt: "2026-07-30T22:00:00+09:00",
      operatingEndAt: "2026-07-31T05:00:00+09:00",
    },
  );
});
