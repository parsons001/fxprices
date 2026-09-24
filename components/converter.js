import SendNotes from "./send-notes";
import { SEND_COUNTRIES } from "../lib/send-countries";
import QuoteNotes from "./quote-notes";
import MarkupChart from "./markup-chart";
import QuoteTable from "./quote-table";
import { ViewPanel } from "./view-tabs";
import { SENDER_COUNTRIES } from "../lib/sender-countries";
import { quoteLabel, markupFor, money } from "../lib/format";
import { normalizeSnapshots } from "../lib/snapshot";

export default function Converter({ snapshots, selectedDays = 30, mode = "convert", sourceCurrency = "GBP", senderCountry = "GB" }) {
  const safeSnapshots = normalizeSnapshots(snapshots);
  const groups = groupSnapshots(safeSnapshots);

  return (
    <main className="min-w-0">
      {!safeSnapshots.length && <div role="status" className="my-6 rounded-xl border border-dashed bg-card p-8 text-center"><h2 className="font-semibold">No saved quotes</h2><p className="mt-2 text-sm text-muted-foreground">Try another currency, amount or date range.</p></div>}
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
      <footer className="mt-8 rounded-xl border bg-card"><details><summary className="px-5 py-4 text-sm font-semibold sm:px-6">Sources and calculation notes</summary><div className="space-y-4 border-t px-5 py-5 leading-6 sm:px-6">
        {senderCountry === "GB" ? (mode === "send" ? <SendNotes /> : <QuoteNotes />) : <p className="text-sm text-muted-foreground">Quotes for {senderCountry} accounts use EUR budgets including fees. Revolut received amounts deduct quoted fees before conversion. Convert fills missing paid plans with EUR estimates: Plus charges 0.5% above €3,000 and an additional 0.5% on the full budget when weekend fees apply; Premium, Metal and Ultra have no additional exchange fees. Estimates assume the full allowance is available. Send uses API-returned transfer-plan fees. Subscription and intermediary-bank fees are excluded.</p>}
      </div></details></footer>
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
    <section className="mt-6" aria-labelledby={heading}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4 border-b pb-4">
        <div><p className="mb-1 text-xs font-medium text-muted-foreground">{mode === "send" ? "Transfer comparison" : "Conversion comparison"}</p>
          <h2 id={heading} className="text-xl font-semibold tracking-tight">{sourceCurrency} → {currency}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{SENDER_COUNTRIES[senderCountry]?.name} · {money(pairs[0]?.amount, sourceCurrency)} budget{mode === "send" ? ` · Destination: ${SEND_COUNTRIES[currency] ?? currency}` : ""}</p>
        </div>
        <div className="text-xs leading-5 text-muted-foreground"><span className="block font-medium">Latest saved quote</span><time dateTime={lastFetched}>{formatFetchedAt(lastFetched)}</time></div>
      </div>
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
