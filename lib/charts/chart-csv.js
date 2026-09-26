function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function chartCsv({
  chartData,
  series,
  currency,
  amount,
  mode,
  hourly,
  sourceCurrency = "GBP",
  senderCountry = "GB",
}) {
  const headers = [
    "Page",
    "Sending country",
    "Currency",
    `${sourceCurrency} amount`,
    "Interval",
    "Date (UTC)",
    ...series.map((entry) => `${entry.label} markup (%)`),
  ];
  const rows = chartData.map((point) => [
    mode,
    senderCountry,
    currency,
    amount,
    hourly ? "Hourly" : "Daily average",
    point.dateKey,
    ...series.map(({ key }) =>
      Number.isFinite(point[key]) ? point[key].toFixed(2) : "",
    ),
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");

  // BOM and CRLF keep spreadsheet imports compatible.
  return `\uFEFF${csv}\r\n`;
}
