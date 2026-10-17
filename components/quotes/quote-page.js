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
    selectedProviders,
  } = resolveQuoteFilters(await searchParams);
  let snapshots = [];
  let conversionFeesUnavailable = false;
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
    let conversions = [];
    try {
      conversions = await conversionStore.history({
        senderCountry,
        days: selectedDays,
        currency: selectedCurrency || null,
        amount: selectedAmount || null,
      });
    } catch {
      conversionFeesUnavailable = true;
    }
    snapshots = attachConversionFees(snapshots, conversions);
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
        selectedProviders={selectedProviders}
      />
      {conversionFeesUnavailable && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-950"
        >
          Conversion fees could not be loaded. International payment fees are
          temporarily unavailable and appear as —. Try refreshing the page.
        </div>
      )}
      <Converter
        mode={mode}
        senderCountry={senderCountry}
        sourceCurrency={sourceCurrency}
        snapshots={snapshots}
        selectedDays={selectedDays}
        selectedProviders={selectedProviders}
      />
    </>
  );
}
