import { getCurrencySettings } from "../config/currencies.js";
import {
  currencyPairsForCountry,
  resolveSourceCurrency,
  sourceCurrenciesForCountry,
  targetCurrenciesForSource,
} from "../config/currency-pairs.js";
import { SENDER_COUNTRIES, senderConfig } from "../config/sender-countries.js";
import { quoteConfigurationUnavailable } from "./configuration-error.js";

export async function quoteMetadata(
  request,
  settingsProvider = getCurrencySettings,
) {
  let settings;
  try {
    settings = await settingsProvider();
  } catch (error) {
    return quoteConfigurationUnavailable("Quote metadata", error);
  }
  const query = request
    ? new URL(request.url).searchParams
    : new URLSearchParams();
  const country = (query.get("senderCountry") ?? "GB").toUpperCase();
  if (!Object.hasOwn(SENDER_COUNTRIES, country))
    return Response.json(
      { error: "Unsupported sending country" },
      { status: 400 },
    );

  const currencyPairs = currencyPairsForCountry(settings, country);
  const sourceCurrencies = sourceCurrenciesForCountry(settings, country);
  const requestedSourceCurrency = query.get("sourceCurrency")?.toUpperCase();
  const requestedCurrency = query.get("currency")?.toUpperCase();
  if (
    requestedSourceCurrency &&
    !sourceCurrencies.includes(requestedSourceCurrency)
  ) {
    return Response.json(
      { error: "Unsupported source currency" },
      { status: 400 },
    );
  }
  const sourceCurrency = resolveSourceCurrency(
    requestedSourceCurrency,
    senderConfig(country).currency,
    requestedCurrency,
    currencyPairs,
  );
  return Response.json({
    senderCountry: country,
    sourceCurrency,
    sourceCurrencies,
    currencyPairs,
    currencies: targetCurrenciesForSource(sourceCurrency, currencyPairs),
    amountsGbp: settings.amounts,
    amounts: settings.amounts,
  });
}
