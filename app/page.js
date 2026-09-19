import FilterControls from "../components/filter-controls";
import Converter from "../components/converter";
import { CURRENCIES, AMOUNTS_GBP } from "../lib/currencies";
import { conversionStore } from "../lib/conversion-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RANGE_OPTIONS = [30, 60, 90, 180];

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
    snapshots = await conversionStore.history({
      days: selectedDays,
      currency: selectedCurrency || null,
      amount: selectedAmount || null,
    });
  } catch {
    snapshots = [];
  }

  const quoteDates = [...new Set(snapshots.map((snapshot) => new Date(snapshot.fetchedAt).toISOString()))].sort().reverse();
  return <>
    <FilterControls amounts={AMOUNTS_GBP} currencies={CURRENCIES} quoteDates={quoteDates} />
    <Converter snapshots={snapshots} selectedDays={selectedDays} />
  </>;
}
