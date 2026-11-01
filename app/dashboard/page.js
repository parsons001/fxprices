import { unstable_cache } from "next/cache";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Building2,
  Clock3,
  Database,
  Layers3,
  Minus,
} from "lucide-react";
import { conversionStore } from "../../lib/db/conversion-store.js";
import { sendStore } from "../../lib/db/send-store.js";
import { getCurrencySettings } from "../../lib/config/currencies.js";
import { senderConfig } from "../../lib/config/sender-countries.js";
import { resolveQuoteFilters } from "../../lib/quotes/quote-filters.js";
import { attachConversionFees } from "../../lib/quotes/additional-fees.js";
import { formatRate, money, quoteLabel } from "../../lib/utils/format.js";
import { requireSignedInUser } from "../../lib/auth-session.js";
import PageHeading from "../../components/layout/page-heading.js";
import RelativeTime from "../../components/layout/relative-time.js";

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

const getPreviousHourSnapshots = unstable_cache(
  async (senderCountry, sourceCurrency) => {
    const target = new Date(Date.now() - 60 * 60 * 1000);
    return Promise.all([
      conversionStore.nearestSnapshot({
        target,
        senderCountry,
        sourceCurrency,
      }),
      sendStore.nearestSnapshot({ target, senderCountry, sourceCurrency }),
    ]);
  },
  ["dashboard-market-overview-previous-hour-v1"],
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
    [previousConversionSnapshots, previousSendSnapshots],
    [conversionAllTimeDataPoints, sendAllTimeDataPoints],
  ] = await Promise.all([
    getLatestMarketSnapshots(senderCountry, sourceCurrency),
    getPreviousHourSnapshots(senderCountry, sourceCurrency),
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
    <>
      <PageHeading
        breadcrumb="Overview"
        title="Market overview"
        description={`Latest saved quote comparisons for ${profile.name}`}
      />
      <main className="mx-auto max-w-[1440px] px-4 pb-10 sm:px-6 lg:px-8">
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
              latestFetchedAt ? (
                <RelativeTime value={latestFetchedAt} />
              ) : (
                "No saved quotes"
              )
            }
            detail={
              latestFetchedAt ? "Latest quotes update" : "No saved quotes yet"
            }
            Icon={Clock3}
          />
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <MarketSection
            title="Conversion rates"
            description={`Best provider by amount received for a ${money(Number(selectedAmount), sourceCurrency)} amount.`}
            snapshots={snapshots}
            previousSnapshots={previousConversionSnapshots}
            sourceCurrency={sourceCurrency}
          />
          <MarketSection
            title="Transfer rates"
            description={`Best provider by amount received for a ${money(Number(selectedAmount), sourceCurrency)} amount.`}
            snapshots={sendMarkets}
            previousSnapshots={previousSendSnapshots}
            sourceCurrency={sourceCurrency}
          />
        </div>
      </main>
    </>
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

function MarketSection({
  title,
  description,
  snapshots,
  previousSnapshots,
  sourceCurrency,
}) {
  const previousBestQuotes = new Map(
    previousSnapshots.map((snapshot) => [
      `${snapshot.currency}-${snapshot.amount}`,
      bestDashboardQuote(snapshot),
    ]),
  );
  const available = snapshots
    .map((snapshot) => ({
      ...snapshot,
      bestQuote: bestDashboardQuote(snapshot),
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
                    <span className="inline-flex items-center justify-end gap-1.5">
                      {money(
                        snapshot.bestQuote.receivedAmount,
                        snapshot.currency,
                      )}
                      <ReceivedTrend
                        current={snapshot.bestQuote.receivedAmount}
                        previous={
                          previousBestQuotes.get(
                            `${snapshot.currency}-${snapshot.amount}`,
                          )?.receivedAmount
                        }
                        currency={snapshot.currency}
                      />
                    </span>
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

function bestDashboardQuote(snapshot) {
  return snapshot.quotes
    .filter(
      (quote) =>
        isDashboardQuote(quote) && Number.isFinite(quote.receivedAmount),
    )
    .sort((a, b) => b.receivedAmount - a.receivedAmount)[0];
}

function ReceivedTrend({ current, previous, currency }) {
  if (!Number.isFinite(previous)) return null;

  const fractionDigits = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).resolvedOptions().maximumFractionDigits;
  const scale = 10 ** fractionDigits;
  const difference = Math.round(current * scale) - Math.round(previous * scale);
  const Icon = difference > 0 ? ArrowUp : difference < 0 ? ArrowDown : Minus;
  const label =
    difference > 0 ? "Increased" : difference < 0 ? "Decreased" : "Unchanged";
  const color =
    difference > 0
      ? "text-emerald-700"
      : difference < 0
        ? "text-red-700"
        : "text-muted-foreground";

  return (
    <span
      title={`${label} compared with the closest quote from about one hour ago`}
      className={color}
    >
      <Icon className="size-4" aria-hidden="true" />
      <span className="sr-only">
        {label} compared with the closest quote from about one hour ago
      </span>
    </span>
  );
}

function isDashboardQuote(quote) {
  return (
    quote.provider === "Wise" ||
    (quote.provider === "Revolut" && quote.planId === "STANDARD")
  );
}
