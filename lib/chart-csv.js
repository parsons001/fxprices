function cell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function chartCsv({ chartData, series, currency, amount, mode, hourly }) {
  const rows = [["Page", "Currency", "GBP amount", "Interval", "Date (UTC)", ...series.map((entry) => `${entry.label} markup (%)`)]];
  for (const point of chartData) {
    rows.push([mode, currency, amount, hourly ? "Hourly" : "Daily average", point.dateKey,
      ...series.map((entry) => Number.isFinite(point[entry.key]) ? point[entry.key].toFixed(2) : "")]);
  }
  return '\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
