import SendNotes from "./send-notes";
import { SEND_COUNTRIES } from "../../lib/config/send-countries";
import QuoteNotes from "./quote-notes";
import MarkupChart from "../charts/markup-chart";
import QuoteTable from "./quote-table";
import { SENDER_COUNTRIES } from "../../lib/config/sender-countries";
import { quoteLabel, markupFor, money } from "../../lib/utils/format";
import QuoteLoadingState from "./quote-loading-state";
import { useBrowserDateFormatter } from "./use-browser-date-formatter";
import {
  normalizeSnapshots,
  sortQuotesForDisplay,
} from "../../lib/quotes/snapshot";
import {
  DEFAULT_SELECTED_PROVIDERS,
  isQuoteProviderSelected,
} from "../../lib/quotes/provider-filters";

export default function Converter({
  snapshots,
  selectedDays = 30,
  mode = "convert",
  sourceCurrency = "GBP",
  senderCountry = "GB",
  selectedProviders = DEFAULT_SELECTED_PROVIDERS,
  isLoading = false,
  emptyMessage = "No saved quotes",
}) {
  const formatDate = useBrowserDateFormatter();
  const safeSnapshots = normalizeSnapshots(snapshots);
  const groups = groupSnapshots(safeSnapshots);

  return (
    <main className="min-w-0">
      {isLoading ? (
        <QuoteLoadingState />
      ) : !safeSnapshots.length ? (
        <div
          role="status"
          className="my-6 rounded-xl border border-dashed bg-card p-8 text-center"
        >
          <h2 className="font-semibold">{emptyMessage}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Try another currency, amount or date range.
          </p>
        </div>
      ) : (
        <div className="min-w-0">
          {Object.entries(groups).map(([code, pairs]) => (
            <CurrencySection
              key={code}
              currency={code}
              pairs={pairs}
              days={selectedDays}
              mode={mode}
              sourceCurrency={sourceCurrency}
              senderCountry={senderCountry}
              selectedProviders={selectedProviders}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
      <footer className="mt-8 rounded-xl border bg-card">
        <details>
          <summary className="px-5 py-4 text-sm font-semibold sm:px-6">
            Sources and calculation notes
          </summary>
          <div className="space-y-4 border-t px-5 py-5 leading-6 sm:px-6">
            {senderCountry === "GB" ? (
              mode === "send" ? (
                <SendNotes />
              ) : (
                <QuoteNotes />
              )
            ) : (
              <p className="text-sm text-muted-foreground">
                Quotes for {senderCountry} accounts use EUR budgets including
                fees. Revolut received amounts deduct quoted fees before
                conversion. Convert fills missing paid plans with EUR estimates:
                Plus charges 0.5% above €3,000 and an additional 0.5% on the
                full budget when weekend fees apply; Premium, Metal and Ultra
                have no additional exchange fees. Estimates assume the full
                allowance is available. Send uses API-returned transfer-plan
                fees. Subscription and intermediary-bank fees are excluded.
              </p>
            )}
          </div>
        </details>
      </footer>
    </main>
  );
}

function CurrencySection({
  currency,
  pairs,
  days = 30,
  mode = "convert",
  sourceCurrency = "GBP",
  senderCountry = "GB",
  selectedProviders = DEFAULT_SELECTED_PROVIDERS,
  formatDate,
}) {
  const preparedPairs = pairs.map((pair) =>
    preparePair(pair, selectedProviders),
  );
  const rows = preparedPairs.flatMap(({ rows: pairRows }) => pairRows);
  const lastFetched = preparedPairs
    .map(({ pair }) => pair.fetchedAt)
    .sort()
    .at(-1);
  const heading = `currency-${currency}`;
  return (
    <section className="mt-6" aria-labelledby={heading}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4 border-b pb-4">
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            {mode === "send" ? "Transfer comparison" : "Conversion comparison"}
          </p>
          <h2 id={heading} className="text-xl font-semibold tracking-tight">
            {sourceCurrency} → {currency}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {SENDER_COUNTRIES[senderCountry]?.name} ·{" "}
            {money(pairs[0]?.amount, sourceCurrency)} budget
            {mode === "send"
              ? ` · Destination: ${SEND_COUNTRIES[currency] ?? currency}`
              : ""}
          </p>
        </div>
        <div className="text-xs leading-5 text-muted-foreground">
          <span className="block font-medium">Latest saved quote</span>
          <time dateTime={lastFetched}>
            {formatDate(lastFetched, {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
        </div>
      </div>
      <MarkupChart
        currency={currency}
        points={rows}
        loading={!preparedPairs.length}
        days={days}
        sourceCurrency={sourceCurrency}
        senderCountry={senderCountry}
        mode={mode}
      />
      <QuoteTable
        heading={heading}
        currency={currency}
        pairs={preparedPairs}
        sourceCurrency={sourceCurrency}
        mode={mode}
      />
    </section>
  );
}

function groupSnapshots(snapshots) {
  return snapshots.reduce((groups, snapshot) => {
    (groups[snapshot.currency] ??= []).push(snapshot);
    return groups;
  }, {});
}

function preparePair(pair, selectedProviders) {
  const normalizedPair = {
    ...pair,
    quotes: Array.isArray(pair.quotes) ? pair.quotes : [],
    errors: Array.isArray(pair.errors) ? pair.errors : [],
    storage: pair.storage ?? {},
  };
  const midMarketRate = normalizedPair.quotes.find(
    (quote) => quote.provider === "Wise",
  )?.rate;
  const rows = sortQuotesForDisplay(normalizedPair.quotes)
    .filter((quote) => isQuoteProviderSelected(quote, selectedProviders))
    .map((quote) => {
      const markup = markupFor(quote, midMarketRate);
      return {
        ...quote,
        amount: normalizedPair.amount,
        midMarketRate,
        markup: Number.isFinite(markup) ? Math.abs(markup) : markup,
        label: quoteLabel(quote),
        fetchedAt: normalizedPair.fetchedAt,
      };
    });
  return { pair: normalizedPair, rows };
}
