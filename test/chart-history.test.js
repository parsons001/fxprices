import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateHistory } from '../lib/chart-history.js';
const points = [
 { label: 'Wise', markup: 1, fetchedAt: '2026-09-19T10:05:00Z' },
 { label: 'Wise', markup: 3, fetchedAt: '2026-09-19T10:55:00Z' },
 { label: 'Wise', markup: 8, fetchedAt: '2026-09-19T12:05:00Z' },
 { label: 'Revolut', markup: 4, fetchedAt: '2026-09-19T10:15:00Z' },
 { label: 'Wise', markup: null, fetchedAt: '2026-09-19T11:05:00Z' },
];
test('Short ranges show hourly means independently per provider, preserving gaps', () => {
 for (const days of [1,7]) {
  const { chartData, hourly } = aggregateHistory(points, days);
  assert.equal(hourly,true);
  assert.deepEqual(chartData.map(r=>r.provider0),[2,null,8]);
  assert.deepEqual(chartData.map(r=>r.provider1),[4,null,null]);
 }
});
test('Long ranges average every valid daily sample rather than choosing the first', () => {
 for (const days of [30,60,90,180]) {
  const { chartData, hourly } = aggregateHistory(points, days);
  assert.equal(hourly,false);
  assert.equal(chartData[0].provider0,4);
  assert.equal(chartData[0].provider1,4);
  assert.equal(chartData[0].dateKey,'2026-09-19T00:00:00.000Z');
 }
 assert.deepEqual(aggregateHistory([],30).chartData,[]);
});
