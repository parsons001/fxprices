import { defaultQuoteAmount } from "../config/currencies.js";
import { sourceCurrenciesForCountry } from "../config/currency-pairs.js";

export function parseQuoteRequest(
  params,
  profileCurrency,
  senderCountry,
  settings,
) {
  const requestedSourceCurrency = (
    params.get("sourceCurrency") ?? profileCurrency
  ).toUpperCase();

  return {
    amount: Number(
      params.get("amount") ??
        params.get("gbpAmount") ??
        defaultQuoteAmount(settings.amounts),
    ),
    currency: (params.get("currency") ?? "EUR").toUpperCase(),
    sourceCurrency: sourceCurrenciesForCountry(
      settings,
      senderCountry,
    ).includes(requestedSourceCurrency)
      ? requestedSourceCurrency
      : "",
  };
}
