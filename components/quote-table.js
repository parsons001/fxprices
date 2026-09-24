"use client";

import { useSearchParams } from "next/navigation";

import { formatPct, formatRate, money } from "../lib/format";
import { Card, CardContent } from "./ui/card";
import { Table } from "./ui/table";

const TABLE_HEADERS = [
  "From amount (GBP)",
  "Provider",
  "To amount",
  "Exchange rate",
  "Mid-market rate (Wise)",
  "Fees (GBP)",
  "To amount markup vs mid-market (%)",
];

export default function QuoteTable({ heading, currency, pairs, mode = "convert", sourceCurrency = "GBP" }) {
  const isSend = mode === "send";
  const headers = isSend ? [...TABLE_HEADERS.slice(0, 6), "Additional fee vs Convert (GBP)", ...TABLE_HEADERS.slice(6)] : TABLE_HEADERS;
  const displayHeaders = headers.map((label) => label.replaceAll("GBP", sourceCurrency));
  const selectedDate = useSearchParams().get("quoteDate");
  const dates = [...new Set(pairs.map(({ pair }) => pair.fetchedAt))].sort().reverse();
  const quoteDate = dates.includes(selectedDate) ? selectedDate : dates[0];
  const selectedPairs = pairs.filter(({ pair }) => pair.fetchedAt === quoteDate);

  return <>
    {isSend && <p className="mb-3 text-sm text-muted-foreground">Additional fee compares this Send quote with the latest saved Convert fee for the same amount and plan. Negative values mean lower Send fees; — means unavailable.</p>}
    <Card className="overflow-hidden">
    <CardContent className="p-0"><Table>
        <thead aria-labelledby={heading}>
          <tr className="bg-muted/50">
            {headers.map((label) => <th scope="col" key={label}>{label}</th>)}
          </tr>
        </thead>
        <tbody>
          {selectedPairs.map(({ pair, rows }) => <PairRows key={`${pair.amount}-${pair.fetchedAt}`} rows={rows} pair={pair} currency={currency} isSend={isSend} sourceCurrency={sourceCurrency} />)}
        </tbody>
      </Table></CardContent>
  </Card></>;
}

function PairRows({ rows, pair, currency, isSend, sourceCurrency }) {
  return <>
    {pair.storage?.saved === false && <tr><td>{money(pair.amount, sourceCurrency)}</td><td colSpan={isSend ? 7 : 6} role="alert">{pair.storage.error}</td></tr>}
    {rows.map((row, index) => <tr key={index}>
      <td>{money(row.costGbp, sourceCurrency)}</td>
      <td>{row.label}</td>
      <td>{money(row.receivedAmount, currency)}</td>
      <td>{formatRate(row.rate)}</td>
      <td>{formatRate(row.midMarketRate)}</td>
      <td>{money(row.feeGbp, sourceCurrency)}</td>
      {isSend && <td title={row.convertFeeDate ? `Send fee minus latest saved Convert fee (${row.convertFeeDate})${row.convertFeeEstimated ? "; estimated Convert fee" : ""}` : "Matching Convert fee unavailable"}>
        {row.additionalFeeGbp > 0 ? "+" : ""}{money(row.additionalFeeGbp, sourceCurrency)}
      </td>}
      <td className={getMarkupClass(row.markup)}>{formatPct(row.markup)}</td>
    </tr>)}
    {pair.errors.map((error, index) => <tr key={`error-${index}`}>
      <td>{money(pair.amount, sourceCurrency)}</td>
      <td colSpan={isSend ? 7 : 6}>{error.provider ? `${error.provider}: ` : ""}{error.message}</td>
    </tr>)}
  </>;
}

function getMarkupClass(markup) {
  if (markup > 0) return "text-emerald-700";
  if (markup < 0) return "text-red-700";
  return "";
}
