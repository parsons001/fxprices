import { attachConversionFees } from "../../lib/quotes/additional-fees.js";
import { resolveQuoteFilters } from "../../lib/quotes/quote-filters.js";
import { conversionStore } from "../../lib/db/conversion-store.js";
import { sendStore } from "../../lib/db/send-store.js";
import { AMOUNTS_GBP } from "../../lib/config/currencies.js";
import QuoteContent from "./quote-content";

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

  return (
    <QuoteContent
      amounts={AMOUNTS_GBP}
      currencies={currencies}
      senderCountry={senderCountry}
      sourceCurrency={sourceCurrency}
      selectedProviders={selectedProviders}
      conversionFeesUnavailable={conversionFeesUnavailable}
      mode={mode}
      snapshots={snapshots}
      selectedDays={selectedDays}
    />
  );
}
