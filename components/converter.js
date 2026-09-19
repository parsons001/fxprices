import QuoteNotes from "./quote-notes";
import MarkupChart from "./markup-chart";
import QuoteTable from "./quote-table";
import { ViewPanel } from "./view-tabs";
import { CURRENCIES } from "../lib/currencies";
import { quoteLabel, markupFor } from "../lib/format";
import { normalizeSnapshots } from "../lib/snapshot";

export default function Converter({ snapshots, selectedDays = 30 }) {
  const safeSnapshots = normalizeSnapshots(snapshots);
  const groups = groupSnapshots(safeSnapshots);

  return (
    <main className="min-w-0">
      <div className="min-w-0">
        {Object.entries(groups).map(([code, pairs]) => (
          <CurrencySection
            key={code}
            currency={code}
            pairs={pairs}
            days={selectedDays}
          />
        ))}
      </div>
      <footer className="mt-10 border-t pt-6">
        <QuoteNotes />
      </footer>
    </main>
  );
}

function CurrencySection({ currency, pairs, days = 30 }) {
  const preparedPairs = pairs.map(preparePair);
  const rows = preparedPairs.flatMap(({ rows: pairRows }) => pairRows);
  const lastFetched = preparedPairs
    .map(({ pair }) => pair.fetchedAt)
    .sort()
    .at(-1);
  const heading = `currency-${currency}`;
  return (
    <section className="mt-8" aria-labelledby={heading}>
      <h2 id={heading} className="mb-3 text-xl font-semibold tracking-tight">
        GBP → {currency}
      </h2>
      <p className="mb-4 text-sm leading-6 text-muted-foreground">
        Last fetched: {formatFetchedAt(lastFetched)}
      </p>
      <ViewPanel view="graph">
        <MarkupChart
          currency={currency}
          points={rows}
          loading={!preparedPairs.length}
          days={days}
        />
      </ViewPanel>
      <ViewPanel view="table">
        <QuoteTable heading={heading} currency={currency} pairs={preparedPairs} />
      </ViewPanel>
    </section>
  );
}

function groupSnapshots(snapshots) {
  return Object.fromEntries(
    CURRENCIES.map((code) => [
      code,
      snapshots.filter((pair) => pair.currency === code),
    ]).filter(([, pairs]) => pairs.length),
  );
}

function preparePair(pair) {
  const normalizedPair = {
    ...pair,
    quotes: Array.isArray(pair.quotes) ? pair.quotes : [],
    errors: Array.isArray(pair.errors) ? pair.errors : [],
    storage: pair.storage ?? {},
  };
  const midMarketRate = normalizedPair.quotes.find(
    (quote) => quote.provider === "Wise",
  )?.rate;
  const rows = normalizedPair.quotes.map((quote) => {
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

function formatFetchedAt(value) {
  const formatted = new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
  return `${formatted} UTC`;
}

