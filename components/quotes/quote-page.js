import { attachConversionFees } from "../../lib/quotes/additional-fees.js";
import { resolveQuoteFilters } from "../../lib/quotes/quote-filters.js";
import { conversionStore } from "../../lib/db/conversion-store.js";
import { sendStore } from "../../lib/db/send-store.js";
import { getCurrencySettings } from "../../lib/config/currencies.js";
import QuoteContent from "./quote-content";

export default async function QuotePage({
  searchParams = {},
  mode = "convert",
}) {
  const settings = await getCurrencySettings();
  const {
    senderCountry,
    sourceCurrency,
    sourceCurrencies,
    currencies,
    selectedCurrency,
    selectedAmount,
    selectedDays,
  } = resolveQuoteFilters(await searchParams, settings);
  let snapshots = [];
  let conversionFeesUnavailable = false;
  const store = mode === "send" ? sendStore : conversionStore;
  try {
    snapshots = await store.history({
      senderCountry,
      sourceCurrency,
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
        sourceCurrency,
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
      amounts={settings.amounts}
      currencies={currencies}
      senderCountry={senderCountry}
      sourceCurrency={sourceCurrency}
      sourceCurrencies={sourceCurrencies}
      currencyPairsByCountry={settings.currencyPairs}
      selectedCurrency={selectedCurrency}
      selectedAmount={selectedAmount}
      conversionFeesUnavailable={conversionFeesUnavailable}
      mode={mode}
      snapshots={snapshots}
      selectedDays={selectedDays}
    />
  );
}
