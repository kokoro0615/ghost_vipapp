import assert from "node:assert/strict";
import test from "node:test";
import { readVipBusinessDate, vipBusinessTimeLabel, vipScheduleLabels } from "../../src/lib/vipBusinessTime.ts";

test("the reported Sunday midnight instant is displayed as Saturday business hours", () => {
  const result = vipScheduleLabels("2026-10-03", "2026-10-03T15:00:00Z", "2026-10-03T17:00:00Z");
  assert.equal(result.dateLabel, "2026/10/03(土)（営業日）");
  assert.equal(result.timeLabel, "24:00〜26:00");
  assert.equal(result.actualLabel, "実際：2026/10/04(日) 00:00〜02:00（日本時間）");
});

for (const [day, start, end, expected, actualDate] of [
  ["2026-10-03", "2026-10-03T22:00:00+09:00", "2026-10-03T23:45:00+09:00", "22:00〜23:45", null],
  ["2026-10-03", "2026-10-03T23:30:00+09:00", "2026-10-04T01:30:00+09:00", "23:30〜25:30", "2026/10/04(日)"],
  ["2026-10-03", "2026-10-04T03:00:00+09:00", "2026-10-04T05:00:00+09:00", "27:00〜29:00", "2026/10/04(日)"],
  ["2026-10-31", "2026-11-01T00:15:00+09:00", "2026-11-01T02:15:00+09:00", "24:15〜26:15", "2026/11/01(日)"],
  ["2026-12-31", "2027-01-01T00:00:00+09:00", "2027-01-01T02:00:00+09:00", "24:00〜26:00", "2027/01/01(金)"],
  ["2028-02-29", "2028-03-01T00:00:00+09:00", "2028-03-01T02:00:00+09:00", "24:00〜26:00", "2028/03/01(水)"],
]) {
  test(`business-night boundaries: ${start}`, () => {
    const result = vipScheduleLabels(day, start, end);
    assert.equal(result.timeLabel, expected);
    if (actualDate) assert.ok(result.actualLabel.includes(actualDate));
    else assert.equal(result.actualLabel, null);
  });
}

test("equivalent UTC and JST instants and local selector values produce identical labels", () => {
  assert.equal(vipBusinessTimeLabel("2026-10-03T15:00:00Z", "2026-10-03"), "24:00");
  assert.equal(vipBusinessTimeLabel("2026-10-04T00:00:00+09:00", "2026-10-03"), "24:00");
  assert.equal(vipBusinessTimeLabel("2026-10-04T00:00", "2026-10-03"), "24:00");
});

test("authoritative business dates are validated and never guessed from an hour cutoff", () => {
  for (const invalid of [undefined, null, "2026-02-29", "2026-13-01", "2026-10-03extra"]) assert.equal(readVipBusinessDate(invalid), null);
  assert.equal(readVipBusinessDate("2028-02-29"), "2028-02-29");
  const missing = vipScheduleLabels(null, "2026-10-03T15:00:00Z", "2026-10-03T17:00:00Z");
  assert.equal(missing.dateLabel, "2026/10/04(日)");
  assert.equal(missing.timeLabel, "00:00〜02:00");
  assert.equal(missing.actualLabel, null);
  assert.equal(vipBusinessTimeLabel("2026-10-03T00:00:00+09:00", "2026-10-03"), "2026-10-03 00:00");
  assert.equal(vipBusinessTimeLabel("2026-10-02T23:00:00+09:00", "2026-10-03"), "2026-10-02 23:00");
  assert.equal(vipBusinessTimeLabel("2026-10-05T00:00:00+09:00", "2026-10-03"), "2026-10-05 00:00");
});

test("out-of-window instants retain calendar timestamps rather than 40-hour labels", () => {
  const result = vipScheduleLabels("2026-10-03", "2026-10-04T16:00:00+09:00", "2026-10-04T18:00:00+09:00");
  assert.equal(result.timeLabel, "2026-10-04 16:00〜2026-10-04 18:00");
  assert.ok(result.actualLabel.includes("2026/10/04(日)"));
  assert.equal(vipBusinessTimeLabel("2026-10-04T05:15:00+09:00", "2026-10-03"), "2026-10-04 05:15");
});

test("missing or reversed endpoints never create a false time range", () => {
  assert.equal(vipScheduleLabels("2026-10-03", null, null).text, "未設定");
  assert.equal(vipScheduleLabels("2026-10-03", "bad", null).timeLabel, "未設定");
  assert.equal(vipScheduleLabels("2026-10-03", "2026-10-04T00:00", "2026-10-03T23:00").timeLabel, "24:00");
  assert.equal(vipScheduleLabels("2026-10-03", "2026-10-04T00:00", null).timeLabel, "24:00");
});

for (const [locale, business, actual] of [["en", "Business day", "Actual date/time"], ["pt", "Dia de funcionamento", "Data/horário real"], ["ko", "영업일", "실제 날짜/시간"]]) {
  test(`extended hours retain actual-date guidance in ${locale}`, () => {
    const result = vipScheduleLabels("2026-10-03", "2026-10-04T00:00", "2026-10-04T02:00", locale);
    assert.ok(result.dateLabel.includes(business));
    assert.equal(result.timeLabel, "24:00〜26:00");
    assert.ok(result.actualLabel.includes(actual));
    assert.ok(result.actualLabel.includes("2026"));
    assert.ok(result.actualLabel.includes("00:00〜02:00"));
  });
}
