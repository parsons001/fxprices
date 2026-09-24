import SendNotes from "./send-notes";
import { SEND_COUNTRIES } from "../lib/send-countries";
import QuoteNotes from "./quote-notes";
import MarkupChart from "./markup-chart";
import QuoteTable from "./quote-table";
import { ViewPanel } from "./view-tabs";
import { CURRENCIES } from "../lib/currencies";
import { quoteLabel, markupFor } from "../lib/format";
import { normalizeSnapshots } from "../lib/snapshot";

export default function Converter({ snapshots, selectedDays = 30, mode = "convert", sourceCurrency = "GBP", senderCountry = "GB" }) {
  const safeSnapshots = normalizeSnapshots(snapshots);
  const groups = groupSnapshots(safeSnapshots);

  return (
    <main className="min-w-0">
      {!safeSnapshots.length && <p role="status" className="my-6 text-muted-foreground">No saved quotes available for this selection.</p>}
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
          />
        ))}
      </div>
      <footer className="mt-10 border-t pt-6">
        {senderCountry === "GB" ? (mode === "send" ? <SendNotes /> : <QuoteNotes />) : <p className="text-sm text-muted-foreground">Quotes for {senderCountry} accounts use EUR budgets including fees. Revolut received amounts deduct quoted fees before conversion. Convert fills missing paid plans with EUR estimates: Plus charges 0.5% above €3,000 and an additional 0.5% on the full budget when weekend fees apply; Premium, Metal and Ultra have no additional exchange fees. Estimates assume the full allowance is available. Send uses API-returned transfer-plan fees. Subscription and intermediary-bank fees are excluded.</p>}
      </footer>
    </main>
  );
}

function CurrencySection({ currency, pairs, days = 30, mode = "convert", sourceCurrency = "GBP", senderCountry = "GB" }) {
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
        {sourceCurrency} → {currency}{mode === "send" ? ` (${SEND_COUNTRIES[currency] ?? "Unsupported destination"})` : ""}
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
          sourceCurrency={sourceCurrency}
          senderCountry={senderCountry}
          mode={mode}
        />
      </ViewPanel>
      <ViewPanel view="table">
        <QuoteTable heading={heading} currency={currency} pairs={preparedPairs} sourceCurrency={sourceCurrency} mode={mode} />
      </ViewPanel>
    </section>
  );
}

function groupSnapshots(snapshots) {
  return Object.fromEntries(
    [...new Set(snapshots.map((snapshot) => snapshot.currency))].map((code) => [
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

