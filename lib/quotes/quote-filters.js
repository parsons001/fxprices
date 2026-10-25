import { SENDER_COUNTRIES, senderConfig } from "../config/sender-countries.js";
import {
  resolveSourceCurrency,
  sourceCurrenciesForPairs,
  targetCurrenciesForSource,
} from "../config/currency-pairs.js";
import { defaultQuoteAmount } from "../config/currencies.js";
import { RANGE_OPTIONS } from "../charts/chart-history.js";
import {
  DEFAULT_SELECTED_PROVIDERS,
  resolveSelectedProviders,
} from "./provider-filters.js";

export {
  DEFAULT_SELECTED_PROVIDERS,
  isQuoteProviderSelected,
  QUOTE_FILTER_OPTIONS,
  resolveSelectedProviders,
} from "./provider-filters.js";
export { resolveQuoteDate } from "./date-filters.js";

export function resolveQuoteFilters(
  params = {},
  { amounts, currencyPairs, sourceCurrencies: configuredSourceCurrencies } = {},
) {
  if (!Array.isArray(amounts) || !amounts.length)
    throw new Error("Quote filter settings require configured amounts.");
  if (!Array.isArray(currencyPairs) || !currencyPairs.length)
    throw new Error("Quote filter settings require configured currency pairs.");
  const senderCountry = Object.hasOwn(SENDER_COUNTRIES, params.senderCountry)
    ? params.senderCountry
    : "GB";
  const sourceCurrencies =
    configuredSourceCurrencies ?? sourceCurrenciesForPairs(currencyPairs);
  const rawCurrency =
    typeof params.currency === "string" ? params.currency.toUpperCase() : "";
  const rawSourceCurrency =
    typeof params.sourceCurrency === "string"
      ? params.sourceCurrency.toUpperCase()
      : "";
  const sourceCurrency = resolveSourceCurrency(
    rawSourceCurrency,
    senderConfig(senderCountry).currency,
    rawCurrency,
    currencyPairs,
  );
  const currencies = targetCurrenciesForSource(sourceCurrency, currencyPairs);
  let selectedCurrency = currencies.includes("EUR")
    ? "EUR"
    : currencies.includes("GBP")
      ? "GBP"
      : currencies[0];
  let selectedAmount = String(defaultQuoteAmount(amounts));
  let selectedDays = 30;

  const rawAmount =
    typeof params.gbpAmount === "string" ? Number(params.gbpAmount) : null;
  const rawDays = Number(params.days ?? "30");

  if (rawCurrency && currencies.includes(rawCurrency)) {
    selectedCurrency = rawCurrency;
  }
  if (rawAmount !== null && amounts.includes(rawAmount)) {
    selectedAmount = String(rawAmount);
  }
  if (RANGE_OPTIONS.includes(rawDays)) {
    selectedDays = rawDays;
  }
  const selectedProviders = resolveSelectedProviders(params);

  return {
    senderCountry,
    sourceCurrency,
    sourceCurrencies,
    currencies,
    selectedCurrency,
    selectedAmount,
    selectedDays,
    selectedProviders,
    amounts,
  };
}
