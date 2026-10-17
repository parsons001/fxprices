import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const directory = process.argv[2] ?? "/tmp/fx-api-results";
const read = async (name) => JSON.parse(await readFile(join(directory, name), "utf8"));
const revolut = await read("ireland-revolut-oneoff.json");
const wise = await read("ireland-wise-oneoff.json");
const benchmarks = new Map(wise.results.map((row) => [`${row.currency}:${row.amount}`, row]));

// Express the rate disadvantage on the net converted budget in source EUR.
// Signed values retain rates that are better than Wise's benchmark.
function costs(quote, amount, midRate) {
  if (!quote || !Number.isFinite(midRate) || midRate <= 0) return {};
  const rateMarkupPct = (1 - quote.rate / midRate) * 100;
  const rateMarkupEur = (amount - quote.feeGbp) * rateMarkupPct / 100;
  return { rateMarkupPct, rateMarkupEur, totalCostEur: quote.feeGbp + rateMarkupEur };
}

const rows = [];
for (const sample of revolut.results) {
  const benchmark = benchmarks.get(`${sample.currency}:${sample.amount}`);
  const midRate = benchmark?.convertQuote?.rate ?? benchmark?.sendQuote?.rate;
  for (const comparison of sample.comparison.length ? sample.comparison : [{}]) {
    const send = sample.sendQuotes?.find((q) => q.planId === comparison.planId);
    const convert = sample.convertQuotes?.find((q) => q.planId === comparison.planId);
    const sendCosts = costs(send, sample.amount, midRate);
    const convertCosts = costs(convert, sample.amount, midRate);
    rows.push({
      currency: sample.currency, amountEur: sample.amount, plan: comparison.plan,
      wiseMidMarketRate: midRate, wiseFetchedAt: benchmark?.fetchedAt,
      revolutFetchedAt: sample.fetchedAt,
      sendRate: send?.rate, convertRate: convert?.rate,
      sendExplicitFeeEur: send?.feeGbp, convertExplicitFeeEur: convert?.feeGbp,
      sendRateMarkupPct: sendCosts.rateMarkupPct, sendRateMarkupEur: sendCosts.rateMarkupEur,
      convertRateMarkupPct: convertCosts.rateMarkupPct, convertRateMarkupEur: convertCosts.rateMarkupEur,
      sendTotalCostEur: sendCosts.totalCostEur, convertTotalCostEur: convertCosts.totalCostEur,
      additionalTotalCostEur: Number.isFinite(sendCosts.totalCostEur) && Number.isFinite(convertCosts.totalCostEur)
        ? sendCosts.totalCostEur - convertCosts.totalCostEur : null,
      convertEstimated: comparison.convertEstimated,
      errors: sample.errors.map((e) => `${e.mode}: ${e.message}`).join("; "),
    });
  }
}
const headers = Object.keys(rows[0]);
const cell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const csv = [headers, ...rows.map((row) => headers.map((key) => {
  const value = row[key];
  return typeof value === "number" && !key.endsWith("Rate") ? value.toFixed(2) : value;
}))].map((row) => row.map(cell).join(",")).join("\r\n");
await writeFile(join(directory, "ireland-revolut-with-markup.csv"), "\uFEFF" + csv);
await writeFile(join(directory, "ireland-revolut-with-markup.json"), JSON.stringify({
  note: "Comparison of existing captures, not simultaneous quotes. Positive markup means a cost; negative means a better rate. Total costs exclude received-amount rounding and subscription costs.",
  revolutRunId: revolut.runId, wiseRunId: wise.runId, rows,
}, null, 2));
console.log(JSON.stringify({ rows: rows.length, revolutRunId: revolut.runId, wiseRunId: wise.runId, example: rows[0] }, null, 2));
