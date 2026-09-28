import test from 'node:test';
import assert from 'node:assert/strict';
import { alertBusinessDate, reservationAlerts } from '../../src/components/admin/vip-floor-v2/alerts/reservationAlerts.ts';
const start = '2026-09-28T22:00:00+09:00', end = '2026-09-29T00:00:00+09:00';
const row = { id: 'r1', lifecycleStatus: 'confirmed', serviceStatus: 'expected', completedAt: null,
  sourceChannel: 'phone', scheduledStartAt: start, scheduledEndAt: end, expectedReleaseAt: end };
const board = (...rows) => ({businessDay:{businessDate:'2026-09-28'},reservations:rows});
const at = value => Date.parse(value);
test('Tokyo business night rolls at 05:00, including month/year boundaries', () => {
  assert.equal(alertBusinessDate(at('2027-01-01T04:59:59+09:00')), '2026-12-31');
  assert.equal(alertBusinessDate(at('2027-01-01T05:00:00+09:00')), '2027-01-01');
});
test('arrival appears at exactly 15 minutes and catches a missed threshold on reconnect', () => {
  assert.equal(reservationAlerts(board(row), at('2026-09-28T21:44:59.999+09:00')).length, 0);
  const [alert] = reservationAlerts(board(row), at('2026-09-28T21:45:00+09:00'));
  assert.equal(alert.kind,'arrival');
  assert.equal(reservationAlerts(board(row), at('2026-09-28T22:20:00+09:00'))[0].key, alert.key);
  assert.equal(reservationAlerts(board(row), at('2026-09-29T05:00:00+09:00')).length, 0);
});
test('release threshold uses the extended end; changing target creates a new notification', () => {
  const seated = {...row,serviceStatus:'seated'};
  assert.equal(reservationAlerts(board(seated),at('2026-09-28T23:44:59.999+09:00')).length,0);
  const [original]=reservationAlerts(board(seated),at('2026-09-28T23:45:00+09:00'));
  assert.equal(original.kind,'extension');
  const extended={...seated,expectedReleaseAt:'2026-09-29T01:00:00+09:00'};
  assert.equal(reservationAlerts(board(extended),at('2026-09-28T23:45:00+09:00')).length,0);
  const [next]=reservationAlerts(board(extended),at('2026-09-29T00:45:00+09:00'));
  assert.notEqual(next.key,original.key);
});
test('cancelled, terminal and settled reservations never raise a new reminder', () => {
  for(const serviceStatus of ['completed','no_show','bill_requested','paid','resetting']) {
    assert.equal(reservationAlerts(board({...row,serviceStatus}),at('2026-09-29T00:00:00+09:00')).length,0);
  }
  for(const lifecycleStatus of ['cancelled','pending','expired']) {
    assert.equal(reservationAlerts(board({...row,lifecycleStatus}),at('2026-09-29T00:00:00+09:00')).length,0);
  }
  assert.equal(reservationAlerts(board({...row,completedAt:end}),at(end)).length,0);
  assert.equal(reservationAlerts(board({...row,sourceChannel:'walk_in'}),at(start)).length,0);
});
test('arrival acknowledgement is independent of release; absent guests never become extension reminders', () => {
  assert.equal(reservationAlerts(board({...row,serviceStatus:'arrived'}),at('2026-09-28T21:45:00+09:00')).length,0);
  assert.equal(reservationAlerts(board(row),at(end))[0].kind,'arrival');
  assert.equal(reservationAlerts(board({...row,serviceStatus:'seated'}),at(end))[0].kind,'extension');
});
test('simultaneous events stay distinct, keys ignore ordinary version/name changes', () => {
  const due=reservationAlerts(board(row,{...row,id:'r2'}),at(start));
  assert.equal(due.length,2);assert.notEqual(due[0].key,due[1].key);
  assert.equal(reservationAlerts(board({...row,version:99,customer:{displayLabel:'new'}}),at(start))[0].key,due[0].key);
  assert.equal(reservationAlerts(board({...row,scheduledStartAt:'broken'}),at(start)).length,0);
});
