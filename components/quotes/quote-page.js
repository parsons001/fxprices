import { attachConversionFees } from "../../lib/quotes/additional-fees.js";
import { resolveQuoteFilters } from "../../lib/quotes/quote-filters.js";
import { conversionStore } from "../../lib/db/conversion-store.js";
import { sendStore } from "../../lib/db/send-store.js";
import { AMOUNTS_GBP } from "../../lib/config/currencies.js";
import FilterControls from "./filter-controls";
import Converter from "./converter";

export default async function QuotePage({
  searchParams = {},
  mode = "convert",
}) {
  const {
    senderCountry,
    sourceCurrency,
    currencies,
    selectedCurrency,
    selectedAmount,
    selectedDays,
  } = resolveQuoteFilters(await searchParams);
  let snapshots = [];
  const store = mode === "send" ? sendStore : conversionStore;
  try {
    snapshots = await store.history({
      senderCountry,
      days: selectedDays,
      currency: selectedCurrency || null,
      amount: selectedAmount || null,
    });
  } catch {
    snapshots = [];
  }

  if (mode === "send") {
    const latestConvert = await conversionStore
      .latest({ senderCountry })
      .catch(() => []);
    snapshots = attachConversionFees(snapshots, latestConvert);
  }

  const quoteDates = [
    ...new Set(
      snapshots.map((snapshot) => new Date(snapshot.fetchedAt).toISOString()),
    ),
  ]
    .sort()
    .reverse();
  return (
    <>
      <FilterControls
        amounts={AMOUNTS_GBP}
        currencies={currencies}
        senderCountry={senderCountry}
        sourceCurrency={sourceCurrency}
        quoteDates={quoteDates}
      />
      <Converter
        mode={mode}
        senderCountry={senderCountry}
        sourceCurrency={sourceCurrency}
        snapshots={snapshots}
        selectedDays={selectedDays}
      />
    </>
  );
}
