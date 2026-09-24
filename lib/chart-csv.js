function cell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function chartCsv({ chartData, series, currency, amount, mode, hourly, sourceCurrency = "GBP", senderCountry = "GB" }) {
  const rows = [["Page", "Sending country", "Currency", `${sourceCurrency} amount`, "Interval", "Date (UTC)", ...series.map((entry) => `${entry.label} markup (%)`)]];
  for (const point of chartData) {
    rows.push([mode, senderCountry, currency, amount, hourly ? "Hourly" : "Daily average", point.dateKey,
      ...series.map((entry) => Number.isFinite(point[entry.key]) ? point[entry.key].toFixed(2) : "")]);
  }
  return '\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
