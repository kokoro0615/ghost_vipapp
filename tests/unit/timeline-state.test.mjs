import assert from "node:assert/strict";
import test from "node:test";

import {
  ARRIVAL_SOON_MINUTES,
  CLOSING_SOON_MINUTES,
  getClosingWindowPercent,
  getTimelinePhase,
  TIMELINE_PHASE_META,
  TIMELINE_PHASE_ORDER,
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
      signal: "low",
      acknowledged: false,
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
      label: "延長確認 15分",
      description: "利用終了まで残り15分です。延長の要否を確認してください",
      signal: "medium",
      acknowledged: false,
    },
  );
  assert.equal(getClosingWindowPercent(startAt, endAt), 12.5);
});

test("timeline distinguishes a missing arrival, release overtime and terminal records", () => {
  assert.equal(phaseAt("2026-07-31T13:01:00.000Z").key, "arrival_overdue");
  assert.equal(phaseAt("2026-07-31T15:01:00.000Z", "seated").key, "overdue");
  assert.equal(phaseAt("2026-07-31T14:00:00.000Z", "completed").key, "resolved");
});

test("a party that never arrives remains an arrival exception after the booked end", () => {
  const stillMissing = phaseAt("2026-07-31T15:30:00.000Z", "expected");
  assert.equal(stillMissing.key, "arrival_overdue");
  assert.equal(stillMissing.label, "未着150分");
  assert.match(stillMissing.description, /到着を確認/u);

  const recordedDelay = phaseAt("2026-07-31T15:30:00.000Z", "no_contact");
  assert.equal(recordedDelay.key, "arrival_overdue");
  assert.equal(recordedDelay.acknowledged, true);
  assert.equal(phaseAt("2026-07-31T15:30:00.000Z", "no_show").key, "resolved");
});

test("the exact boundaries do not claim a minute has elapsed", () => {
  assert.deepEqual(
    phaseAt("2026-07-31T13:00:00.000Z"),
    {
      key: "arrival_overdue",
      label: "到着確認",
      description: "予約開始時刻です。到着を確認してください",
      signal: "high",
      acknowledged: false,
    },
  );
  assert.deepEqual(
    phaseAt("2026-07-31T15:00:00.000Z", "seated"),
    {
      key: "overdue",
      label: "終了時刻",
      description: "利用終了時刻です。延長または退店を確認してください",
      signal: "high",
      acknowledged: false,
    },
  );
  assert.equal(phaseAt("2026-07-31T13:00:00.001Z").label, "未着1分");
  assert.equal(phaseAt("2026-07-31T15:00:00.001Z", "seated").label, "解放超過1分");
});

/*
 * The alarm ladder. Urgency is carried by which tier a band is in, so the tiers
 * have to stay pinned to the phases rather than drifting into the stylesheet.
 */
test("only time-critical phases raise one of the three signal tiers", () => {
  assert.deepEqual(
    TIMELINE_PHASE_ORDER.map((phase) => TIMELINE_PHASE_META[phase].signal),
    ["none", "low", "high", "none", "medium", "high", "none"],
  );
  assert.equal(phaseAt("2026-07-31T12:50:00.000Z").signal, "low");
  assert.equal(phaseAt("2026-07-31T14:50:00.000Z", "seated").signal, "medium");
  assert.equal(phaseAt("2026-07-31T15:10:00.000Z", "seated").signal, "high");
  assert.equal(phaseAt("2026-07-31T12:00:00.000Z").signal, "none");
  assert.equal(phaseAt("2026-07-31T14:00:00.000Z", "seated").signal, "none");
  assert.equal(phaseAt("2026-07-31T14:00:00.000Z", "completed").signal, "none");
});

/*
 * A band that keeps blinking after the floor has answered it is how operators
 * learn to ignore blinking. Acknowledgement stops the motion and nothing else:
 * the phase, the tier and the countdown all stay exactly where they were.
 */
test("the arrival alarm stops once anyone from the party is in the room", () => {
  const beforeArrival = phaseAt("2026-07-31T12:50:00.000Z", "expected");
  assert.equal(beforeArrival.acknowledged, false);

  for (const status of ["arrived", "partial_arrival", "seated", "bottle_served"]) {
    const acknowledged = phaseAt("2026-07-31T12:50:00.000Z", status);
    assert.equal(acknowledged.key, "arrival_soon", status);
    assert.equal(acknowledged.signal, "low", status);
    assert.equal(acknowledged.acknowledged, true, status);
    assert.match(acknowledged.description, /対応済み/u, status);
  }

  for (const status of ["expected", "late", "no_contact"]) {
    assert.equal(phaseAt("2026-07-31T12:50:00.000Z", status).acknowledged, false, status);
  }
});

/*
 * The backend releases a seat assignment on `completed` and `no_show` only, so
 * a paid party is still occupying the table and can still advance to
 * `resetting`. Muting it to 完了 would hide an occupied table from the one view
 * whose job is turnover.
 */
test("a paid table is settled, not finished, and keeps its countdown", () => {
  const paidPastEnd = phaseAt("2026-07-31T15:20:00.000Z", "paid");
  assert.equal(paidPastEnd.key, "overdue");
  assert.equal(paidPastEnd.label, "解放超過20分");
  assert.equal(paidPastEnd.signal, "high");
  assert.equal(paidPastEnd.acknowledged, true);

  assert.equal(phaseAt("2026-07-31T14:50:00.000Z", "paid").key, "closing_soon");
  assert.equal(phaseAt("2026-07-31T14:00:00.000Z", "paid").key, "active");

  for (const status of ["completed", "no_show"]) {
    assert.equal(phaseAt("2026-07-31T15:20:00.000Z", status).key, "resolved", status);
    assert.equal(phaseAt("2026-07-31T15:20:00.000Z", status).signal, "none", status);
  }
});

test("the closing and overtime alarms stop once settlement has started", () => {
  for (const status of ["bill_requested", "resetting", "paid"]) {
    assert.equal(phaseAt("2026-07-31T14:50:00.000Z", status).acknowledged, true, status);
    assert.equal(phaseAt("2026-07-31T15:20:00.000Z", status).acknowledged, true, status);
  }
  for (const status of ["seated", "bottle_pending", "bottle_served"]) {
    assert.equal(phaseAt("2026-07-31T14:50:00.000Z", status).acknowledged, false, status);
    assert.equal(phaseAt("2026-07-31T15:20:00.000Z", status).acknowledged, false, status);
  }
});

test("a table sitting past its start stops blinking once the delay is recorded", () => {
  assert.equal(phaseAt("2026-07-31T13:30:00.000Z", "expected").acknowledged, false);
  for (const status of ["late", "no_contact"]) {
    const recorded = phaseAt("2026-07-31T13:30:00.000Z", status);
    assert.equal(recorded.key, "arrival_overdue", status);
    assert.equal(recorded.label, "未着30分", status);
    assert.equal(recorded.acknowledged, true, status);
  }
});

test("a missing service status never counts as handled", () => {
  for (const status of [null, undefined, ""]) {
    assert.equal(phaseAt("2026-07-31T12:50:00.000Z", status).acknowledged, false);
    assert.equal(phaseAt("2026-07-31T13:30:00.000Z", status).key, "arrival_overdue");
    assert.equal(phaseAt("2026-07-31T13:30:00.000Z", status).acknowledged, false);
  }
});

/*
 * A seat extension moves the release time without touching the booked end, so
 * the countdown has to follow the extended end or it raises the last-fifteen
 * alarm while the table is still legitimately occupied.
 */
test("the closing window follows an extended release time", () => {
  const extendedEnd = "2026-07-31T16:00:00.000Z";
  const extended = (now) => getTimelinePhase({
    nowMs: at(now),
    startAt,
    endAt: extendedEnd,
    serviceStatus: "seated",
  });

  assert.equal(phaseAt("2026-07-31T14:50:00.000Z", "seated").key, "closing_soon");
  assert.equal(extended("2026-07-31T14:50:00.000Z").key, "active");
  assert.equal(extended("2026-07-31T15:46:00.000Z").key, "closing_soon");
  /* Three hours of table, so the same fifteen minutes is a narrower slice. */
  assert.equal(Math.round(getClosingWindowPercent(startAt, extendedEnd) * 100) / 100, 8.33);
});
