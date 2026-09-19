import { conversionStore } from "../../lib/conversion-store";
import { RANGE_OPTIONS } from "../../lib/chart-history";
import FilterControls from "../../components/filter-controls";
import Converter from "../../components/converter";
import { CURRENCIES, AMOUNTS_GBP } from "../../lib/currencies";
import { sendStore } from "../../lib/send-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";


export default async function Page({ searchParams = {} }) {
  const params = await searchParams;
  let snapshots = [];
  let selectedCurrency = CURRENCIES.includes("EUR") ? "EUR" : CURRENCIES[0];
  let selectedAmount = String(
    AMOUNTS_GBP.includes(1000) ? 1000 : AMOUNTS_GBP[0],
  );
  let selectedDays = 30;

  const rawCurrency =
    typeof params.currency === "string" ? params.currency.toUpperCase() : "";
  const rawAmount =
    typeof params.gbpAmount === "string" ? Number(params.gbpAmount) : null;
  const rawDays = Number(params.days ?? "30");

  if (rawCurrency && CURRENCIES.includes(rawCurrency)) {
    selectedCurrency = rawCurrency;
  }
  if (rawAmount !== null && AMOUNTS_GBP.includes(rawAmount)) {
    selectedAmount = String(rawAmount);
  }
  if (RANGE_OPTIONS.includes(rawDays)) {
    selectedDays = rawDays;
  }

  try {
    snapshots = await sendStore.history({
      days: selectedDays,
      currency: selectedCurrency || null,
      amount: selectedAmount || null,
    });
  } catch {
    snapshots = [];
  }

  const latestConvert = await conversionStore.latest().catch(() => []);
  snapshots = snapshots.map((snapshot) => {
    const convert = latestConvert.find((item) => item.currency === snapshot.currency && item.amount === snapshot.amount);
    return { ...snapshot, quotes: (snapshot.quotes ?? []).map((quote) => {
      const match = convert?.quotes?.find((item) => item.provider === quote.provider &&
        (quote.provider === "Wise" || (quote.planId && item.planId === quote.planId)));
      return { ...quote,
        additionalFeeGbp: Number.isFinite(quote.feeGbp) && Number.isFinite(match?.feeGbp)
          ? Math.round((quote.feeGbp - match.feeGbp) * 100) / 100 : null,
        convertFeeDate: match ? convert.fetchedAt : null,
        convertFeeEstimated: Boolean(match?.estimated),
      };
    }) };
  });

  const quoteDates = [...new Set(snapshots.map((snapshot) => new Date(snapshot.fetchedAt).toISOString()))].sort().reverse();
  return <>
    <FilterControls amounts={AMOUNTS_GBP} currencies={CURRENCIES} quoteDates={quoteDates} />
    <Converter snapshots={snapshots} selectedDays={selectedDays} mode="send" />
  </>;
}
