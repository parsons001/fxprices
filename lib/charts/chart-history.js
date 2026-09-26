export const RANGE_OPTIONS = [1, 7, 30, 60, 90, 180];
export const rangeLabel = (days) =>
  days === 1 ? "Last 24 hours" : `Last ${days} days`;

// Average each provider independently within UTC hour/day buckets.
export function aggregateHistory(points, days) {
  const hourly = days === 1 || days === 7;
  const interval = (hourly ? 1 : 24) * 60 * 60 * 1000;
  const valid = points.filter(
    (point) =>
      Number.isFinite(point.markup) &&
      Number.isFinite(Date.parse(point.fetchedAt)),
  );
  const labels = [...new Set(valid.map((point) => point.label))];
  const series = labels.map((label, index) => ({
    key: `provider${index}`,
    label,
  }));
  const buckets = new Map();
  for (const point of valid) {
    const timestamp =
      Math.floor(Date.parse(point.fetchedAt) / interval) * interval;
    if (!buckets.has(timestamp)) buckets.set(timestamp, new Map());
    const bucket = buckets.get(timestamp);
    const stats = bucket.get(point.label) ?? { sum: 0, count: 0 };
    stats.sum += point.markup;
    stats.count++;
    bucket.set(point.label, stats);
  }
  const times = [...buckets.keys()].sort((a, b) => a - b);
  const chartData = [];
  for (
    let timestamp = times[0];
    timestamp <= times.at(-1);
    timestamp += interval
  ) {
    const row = { dateKey: new Date(timestamp).toISOString() };
    for (const entry of series) {
      const stats = buckets.get(timestamp)?.get(entry.label);
      row[entry.key] = stats ? stats.sum / stats.count : null;
    }
    chartData.push(row);
  }
  return { hourly, series, chartData };
}
