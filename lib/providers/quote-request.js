import { defaultQuoteAmount } from "../config/currencies.js";

export function parseQuoteRequest(params, profileCurrency, settings) {
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
    sourceCurrency: settings.sourceCurrencies.includes(requestedSourceCurrency)
      ? requestedSourceCurrency
      : "",
  };
}
