"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { formatPct, formatRate, money, trueCost } from "../../lib/utils/format";
import { resolveQuoteDate } from "../../lib/quotes/date-filters";
import { Card, CardContent } from "../ui/card";
import { Table } from "../ui/table";
import { SelectField } from "../ui/select-field";
import { SelectItem } from "../ui/select";
import { useBrowserDateFormatter } from "./use-browser-date-formatter";

const TABLE_HEADERS = [
  "Budget (GBP)",
  "Provider",
  "Received",
  "Exchange rate",
  "Wise mid-market",
  "Displayed fees (GBP)",
  "Markup (%)",
  "True cost (GBP)",
];

export default function QuoteTable({
  heading,
  currency,
  pairs,
  mode = "convert",
  sourceCurrency = "GBP",
}) {
  const isSend = mode === "send";
  const displayHeaders = TABLE_HEADERS.map((label) =>
    label.replaceAll("GBP", sourceCurrency),
  );
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const formatDate = useBrowserDateFormatter();
  const selectedDate = searchParams.get("quoteDate");
  const dates = [...new Set(pairs.map(({ pair }) => pair.fetchedAt))]
    .sort()
    .reverse();
  const quoteDate = resolveQuoteDate(selectedDate, dates);
  const selectedPairs = pairs.filter(
    ({ pair }) => pair.fetchedAt === quoteDate,
  );

  function updateQuoteDate(value) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("quoteDate", value);
    window.history.replaceState(null, "", `${pathname}?${next}`);
  }

  return (
    <section className="mt-4" aria-labelledby={`${heading}-table-heading`}>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b px-5 py-4 sm:px-6">
          <div className="flex flex-col space-y-1.5">
            <h3 id={`${heading}-table-heading`} className="font-semibold">
              Provider quotes
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              {quoteDate ? formatDate(quoteDate) : "No quote selected"} · Fees
              included in the budget
            </p>
          </div>
          {dates.length ? (
            <div className="w-full sm:w-64">
              <SelectField
                label="Quote date"
                name="quoteDate"
                value={quoteDate}
                onValueChange={updateQuoteDate}
              >
                {dates.map((date) => (
                  <SelectItem key={date} value={date}>
                    {formatDate(date, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </SelectItem>
                ))}
              </SelectField>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No saved quote dates available.
            </p>
          )}
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
        <p className="border-t bg-muted/20 px-5 py-4 text-xs leading-5 text-muted-foreground">
          True cost is the displayed markup as a {sourceCurrency} amount (markup
          percentage × budget). Markup is calculated from the amount received,
          so it already reflects provider fees; displayed fees are shown
          separately and are not added again.
          {isSend && (
            <>
              {" "}
              International payment fee = max(0, Send fee − nearest matching
              Convert fee from the same time). Values are in {sourceCurrency}; —
              means no nearby matching fee is available.
            </>
          )}
        </p>
      </Card>
    </section>
  );
}

function PairRows({ rows, pair, currency, isSend, sourceCurrency }) {
  return (
    <>
      {pair.storage?.saved === false && (
        <tr>
          <td>{money(pair.amount, sourceCurrency)}</td>
          <td colSpan={isSend ? 9 : 8} role="alert">
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
          <td>
            {money(row.feeGbp, sourceCurrency)}
            {isSend && (
              <span
                className="block text-xs text-muted-foreground"
                title={
                  row.convertFeeDate
                    ? `Send fee minus nearest saved Convert fee (${row.convertFeeDate})${row.convertFeeEstimated ? "; estimated Convert fee" : ""}`
                    : "Nearby matching Convert fee unavailable"
                }
              >
                International payment fee: {row.additionalFeeGbp > 0 ? "+" : ""}
                {money(row.additionalFeeGbp, sourceCurrency)}
              </span>
            )}
          </td>
          <td className={getMarkupClass(row.markup)}>
            {formatPct(row.markup)}
          </td>
          <td>{money(trueCost(row.markup, row.costGbp), sourceCurrency)}</td>
        </tr>
      ))}
      {pair.errors.map((error, index) => (
        <tr key={`error-${index}`}>
          <td>{money(pair.amount, sourceCurrency)}</td>
          <td colSpan={isSend ? 9 : 8}>
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
