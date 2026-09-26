"use client";

import { useSearchParams } from "next/navigation";

import { formatPct, formatRate, money } from "../../lib/utils/format";
import { Card, CardContent } from "../ui/card";
import { Table } from "../ui/table";

const TABLE_HEADERS = [
  "Budget (GBP)",
  "Provider",
  "Received",
  "Exchange rate",
  "Wise mid-market",
  "Fees (GBP)",
  "Markup (%)",
];

export default function QuoteTable({
  heading,
  currency,
  pairs,
  mode = "convert",
  sourceCurrency = "GBP",
}) {
  const isSend = mode === "send";
  const headers = isSend
    ? [
        ...TABLE_HEADERS.slice(0, 6),
        "International payment fee",
        ...TABLE_HEADERS.slice(6),
      ]
    : TABLE_HEADERS;
  const displayHeaders = headers.map((label) =>
    label.replaceAll("GBP", sourceCurrency),
  );
  const selectedDate = useSearchParams().get("quoteDate");
  const dates = [...new Set(pairs.map(({ pair }) => pair.fetchedAt))]
    .sort()
    .reverse();
  const quoteDate = dates.includes(selectedDate) ? selectedDate : dates[0];
  const selectedPairs = pairs.filter(
    ({ pair }) => pair.fetchedAt === quoteDate,
  );

  return (
    <>
      <Card className="overflow-hidden">
        <div className="border-b px-5 py-4 sm:px-6">
          <h3 className="text-sm font-semibold">Provider quotes</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {quoteDate
              ? new Date(quoteDate).toLocaleString("en-GB", {
                  timeZone: "UTC",
                }) + " UTC"
              : "No quote selected"}{" "}
            · Fees included in the budget
          </p>
        </div>
        <CardContent className="p-0">
          <Table>
            <thead aria-labelledby={heading}>
              <tr className="bg-muted/50">
                {displayHeaders.map((label) => (
                  <th scope="col" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selectedPairs.map(({ pair, rows }) => (
                <PairRows
                  key={`${pair.amount}-${pair.fetchedAt}`}
                  rows={rows}
                  pair={pair}
                  currency={currency}
                  isSend={isSend}
                  sourceCurrency={sourceCurrency}
                />
              ))}
            </tbody>
          </Table>
        </CardContent>
        {isSend && (
          <p className="border-t bg-muted/20 px-5 py-4 text-xs leading-5 text-muted-foreground">
            International payment fee = Send fee − latest matching Convert fee.
            Values are in {sourceCurrency}. Negative values mean lower Send
            fees; — means no matching fee is available.
          </p>
        )}
      </Card>
    </>
  );
}

function PairRows({ rows, pair, currency, isSend, sourceCurrency }) {
  return (
    <>
      {pair.storage?.saved === false && (
        <tr>
          <td>{money(pair.amount, sourceCurrency)}</td>
          <td colSpan={isSend ? 7 : 6} role="alert">
            {pair.storage.error}
          </td>
        </tr>
      )}
      {rows.map((row, index) => (
        <tr key={index}>
          <td>{money(row.costGbp, sourceCurrency)}</td>
          <td>{row.label}</td>
          <td>{money(row.receivedAmount, currency)}</td>
          <td>{formatRate(row.rate)}</td>
          <td>{formatRate(row.midMarketRate)}</td>
          <td>{money(row.feeGbp, sourceCurrency)}</td>
          {isSend && (
            <td
              title={
                row.convertFeeDate
                  ? `Send fee minus latest saved Convert fee (${row.convertFeeDate})${row.convertFeeEstimated ? "; estimated Convert fee" : ""}`
                  : "Matching Convert fee unavailable"
              }
            >
              {row.additionalFeeGbp > 0 ? "+" : ""}
              {money(row.additionalFeeGbp, sourceCurrency)}
            </td>
          )}
          <td className={getMarkupClass(row.markup)}>
            {formatPct(row.markup)}
          </td>
        </tr>
      ))}
      {pair.errors.map((error, index) => (
        <tr key={`error-${index}`}>
          <td>{money(pair.amount, sourceCurrency)}</td>
          <td colSpan={isSend ? 7 : 6}>
            {error.provider ? `${error.provider}: ` : ""}
            {error.message}
          </td>
        </tr>
      ))}
    </>
  );
}

function getMarkupClass(markup) {
  if (markup > 0) return "text-emerald-700";
  if (markup < 0) return "text-red-700";
  return "";
}
