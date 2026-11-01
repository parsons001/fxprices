import { unstable_cache } from "next/cache";
import { Activity, Building2, Clock3, Database, Layers3 } from "lucide-react";
import { conversionStore } from "../../lib/db/conversion-store.js";
import { sendStore } from "../../lib/db/send-store.js";
import { getCurrencySettings } from "../../lib/config/currencies.js";
import { senderConfig } from "../../lib/config/sender-countries.js";
import { resolveQuoteFilters } from "../../lib/quotes/quote-filters.js";
import { attachConversionFees } from "../../lib/quotes/additional-fees.js";
import { formatRate, money, quoteLabel } from "../../lib/utils/format.js";
import { requireSignedInUser } from "../../lib/auth-session.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = { title: "Market overview" };

const getLatestMarketSnapshots = unstable_cache(
  async (senderCountry, sourceCurrency) =>
    Promise.all([
      conversionStore.latest({ senderCountry, sourceCurrency }),
      sendStore.latest({ senderCountry, sourceCurrency }),
    ]),
  ["dashboard-market-overview-latest-v1"],
  { revalidate: 60 },
);

export default async function DashboardPage({ searchParams = {} }) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (Array.isArray(value))
      value.forEach((entry) => query.append(key, entry));
    else if (value !== undefined) query.set(key, value);
  }
  await requireSignedInUser(
    `/dashboard${query.size ? `?${query.toString()}` : ""}`,
  );

  const settings = await getCurrencySettings();
  const { senderCountry, sourceCurrency, selectedAmount } = resolveQuoteFilters(
    params,
    settings,
  );
  const [
    [conversionSnapshots, sendSnapshots],
    [conversionAllTimeDataPoints, sendAllTimeDataPoints],
  ] = await Promise.all([
    getLatestMarketSnapshots(senderCountry, sourceCurrency),
    Promise.all([
      conversionStore.allTimeDataPoints(),
      sendStore.allTimeDataPoints(),
    ]),
  ]);
  const snapshots = conversionSnapshots.filter(
    (snapshot) => snapshot.amount === Number(selectedAmount),
  );
  const sendMarkets = attachConversionFees(
    sendSnapshots.filter(
      (snapshot) => snapshot.amount === Number(selectedAmount),
    ),
    conversionSnapshots,
  );
  const allLatestSnapshots = [...conversionSnapshots, ...sendSnapshots];
  const currencyPairs = new Set(
    allLatestSnapshots.map((snapshot) => snapshot.currency),
  );
  const providers = new Set(
    allLatestSnapshots.flatMap((snapshot) =>
      snapshot.quotes.map((quote) => quote.provider),
    ),
  );
  const dataPoints = allLatestSnapshots.reduce(
    (total, snapshot) => total + snapshot.quotes.length,
    0,
  );
  const latestFetchedAt = allLatestSnapshots
    .map((snapshot) => snapshot.fetchedAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  const profile = senderConfig(senderCountry);

  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-10 sm:px-6 lg:px-8">
      <header className="flex h-16 items-center gap-2 border-b text-sm">
        <span className="text-muted-foreground">Dashboard</span>
        <span aria-hidden="true" className="text-muted-foreground">
          /
        </span>
        <span className="font-medium">Market overview</span>
      </header>

      <div className="pb-6 pt-7">
        <h1 className="text-2xl font-semibold tracking-tight">
          Market overview
        </h1>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
          Latest saved quote comparisons for {profile.name} · {sourceCurrency}{" "}
          {money(Number(selectedAmount), sourceCurrency)} budget
        </p>
      </div>

      <section
        aria-label="Market summary"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
      >
        <SummaryCard
          label="Currency pairs stored"
          value={String(currencyPairs.size)}
          detail={`${sourceCurrency} pairs across Convert and Send`}
          Icon={Layers3}
        />
        <SummaryCard
          label="Data points"
          value={dataPoints.toLocaleString("en-GB")}
          detail="Provider quotes in latest saved snapshots"
          Icon={Database}
        />
        <SummaryCard
          label="All-time data points"
          value={(
            conversionAllTimeDataPoints + sendAllTimeDataPoints
          ).toLocaleString("en-GB")}
          detail="Provider quotes saved across all history"
          Icon={Activity}
        />
        <SummaryCard
          label="Providers"
          value={String(providers.size)}
          detail={[...providers].sort().join(", ") || "No saved providers"}
          Icon={Building2}
        />
        <SummaryCard
          label="Last updated"
          value={
            latestFetchedAt
              ? new Date(latestFetchedAt).toLocaleString("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "UTC",
                })
              : "No saved quotes"
          }
          detail={
            latestFetchedAt ? "Latest saved quote · UTC" : "No saved quotes yet"
          }
          Icon={Clock3}
        />
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <MarketSection
          title="Conversion rates"
          description={`Best provider by amount received for a ${money(Number(selectedAmount), sourceCurrency)} amount.`}
          snapshots={snapshots}
          sourceCurrency={sourceCurrency}
        />
        <MarketSection
          title="Transfer rates"
          description={`Best provider by amount received for a ${money(Number(selectedAmount), sourceCurrency)} amount.`}
          snapshots={sendMarkets}
          sourceCurrency={sourceCurrency}
        />
      </div>
    </main>
  );
}

function SummaryCard({ label, value, detail, Icon }) {
  return (
    <article className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
        {Icon && <Icon className="size-4 text-muted-foreground" aria-hidden />}
      </div>
      <p className="mt-3 truncate text-xl font-semibold tracking-tight">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </article>
  );
}

function MarketSection({ title, description, snapshots, sourceCurrency }) {
  const available = snapshots
    .map((snapshot) => ({
      ...snapshot,
      bestQuote: snapshot.quotes
        .filter(
          (quote) =>
            isDashboardQuote(quote) && Number.isFinite(quote.receivedAmount),
        )
        .sort((a, b) => b.receivedAmount - a.receivedAmount)[0],
    }))
    .filter((snapshot) => snapshot.bestQuote);

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {available.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                <th scope="col" className="px-5 py-3 font-medium">
                  Pair
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Best provider
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  Rate
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  Recipient gets
                </th>
              </tr>
            </thead>
            <tbody>
              {available.map((snapshot) => (
                <tr
                  key={`${snapshot.currency}-${snapshot.amount}`}
                  className="border-b last:border-0"
                >
                  <th
                    scope="row"
                    className="whitespace-nowrap px-5 py-3.5 font-medium"
                  >
                    {sourceCurrency}:{snapshot.currency}
                  </th>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    {quoteLabel(snapshot.bestQuote)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums">
                    {formatRate(snapshot.bestQuote.rate)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium tabular-nums">
                    {money(
                      snapshot.bestQuote.receivedAmount,
                      snapshot.currency,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          Quote data does not exist.
        </p>
      )}
    </section>
  );
}

function isDashboardQuote(quote) {
  return (
    quote.provider === "Wise" ||
    (quote.provider === "Revolut" && quote.planId === "STANDARD")
  );
}
