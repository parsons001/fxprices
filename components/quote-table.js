"use client";

import { formatPct, formatRate, money } from "../lib/format";
import { Card, CardContent } from "./ui/card";
import { Table } from "./ui/table";
import { useTableDate } from "./table-date";

const TABLE_HEADERS = [
  "From amount (GBP)",
  "Provider",
  "To amount",
  "Exchange rate",
  "Mid-market rate (Wise)",
  "Fees (GBP)",
  "To amount markup vs mid-market (%)",
];

export default function QuoteTable({ heading, currency, pairs }) {
  const { selectedDate } = useTableDate();
  const visiblePairs = pairs.filter(({ pair }) => getDateKey(pair.fetchedAt) === selectedDate);

  return <Card className="overflow-hidden">
    <CardContent className="p-0"><Table>
        <thead aria-labelledby={heading}>
          <tr className="bg-muted/50">
            {TABLE_HEADERS.map((label) => <th scope="col" key={label}>{label}</th>)}
          </tr>
        </thead>
        <tbody>
          {visiblePairs.map(({ pair, rows }) => <PairRows key={`${pair.amount}-${pair.fetchedAt}`} rows={rows} pair={pair} currency={currency} />)}
        </tbody>
      </Table></CardContent>
  </Card>;
}

function PairRows({ rows, pair, currency }) {
  return <>
    {pair.storage?.saved === false && <tr><td>{money(pair.amount, "GBP")}</td><td colSpan={6} role="alert">{pair.storage.error}</td></tr>}
    {rows.map((row, index) => <tr key={index}>
      <td>{money(row.costGbp, "GBP")}</td>
      <td>{row.label}</td>
      <td>{money(row.receivedAmount, currency)}</td>
      <td>{formatRate(row.rate)}</td>
      <td>{formatRate(row.midMarketRate)}</td>
      <td>{money(row.feeGbp, "GBP")}</td>
      <td className={getMarkupClass(row.markup)}>{formatPct(row.markup)}</td>
    </tr>)}
    {pair.errors.map((error, index) => <tr key={`error-${index}`}>
      <td>{money(pair.amount, "GBP")}</td>
      <td colSpan={6}>{error.provider ? `${error.provider}: ` : ""}{error.message}</td>
    </tr>)}
  </>;
}

function getDateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function getMarkupClass(markup) {
  if (markup > 0) return "text-emerald-700";
  if (markup < 0) return "text-red-700";
  return "";
}
