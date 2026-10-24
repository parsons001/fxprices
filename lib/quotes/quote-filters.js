import {
  SENDER_COUNTRIES,
  senderConfig,
  targetCurrencies,
} from "../config/sender-countries.js";
import { RANGE_OPTIONS } from "../charts/chart-history.js";
import { CURRENCIES, AMOUNTS_GBP } from "../config/currencies.js";

export const QUOTE_FILTER_OPTIONS = [
  { value: "Wise", label: "Wise", provider: "Wise" },
  {
    value: "Revolut:STANDARD",
    label: "Revolut Standard",
    provider: "Revolut",
    planId: "STANDARD",
  },
  {
    value: "Revolut:PLUS",
    label: "Revolut Plus",
    provider: "Revolut",
    planId: "PLUS",
  },
  {
    value: "Revolut:PREMIUM",
    label: "Revolut Premium",
    provider: "Revolut",
    planId: "PREMIUM",
  },
  {
    value: "Revolut:METAL",
    label: "Revolut Metal",
    provider: "Revolut",
    planId: "METAL",
  },
  {
    value: "Revolut:ULTRA",
    label: "Revolut Ultra",
    provider: "Revolut",
    planId: "ULTRA",
  },
];
export const DEFAULT_SELECTED_PROVIDERS = QUOTE_FILTER_OPTIONS.map(
  ({ value }) => value,
);

export function isQuoteProviderSelected(quote, selectedProviders) {
  return (
    selectedProviders.includes(quote.provider) ||
    selectedProviders.includes(`${quote.provider}:${quote.planId}`)
  );
}

export function resolveSelectedProviders(params = {}) {
  const rawProviders =
    typeof params.providers === "string"
      ? params.providers.split(",")
      : Array.isArray(params.providers)
        ? params.providers.flatMap((value) => value.split(","))
        : [];
  const expandedProviders = rawProviders.flatMap((provider) =>
    provider === "Revolut"
      ? QUOTE_FILTER_OPTIONS.filter(
          (option) => option.provider === "Revolut",
        ).map(({ value }) => value)
      : [provider],
  );
  const requestedProviders = DEFAULT_SELECTED_PROVIDERS.filter((provider) =>
    expandedProviders.includes(provider),
  );
  return requestedProviders.length
    ? requestedProviders
    : DEFAULT_SELECTED_PROVIDERS;
}

export function resolveQuoteDate(requestedDate, quoteDates) {
  if (!quoteDates.length) return "";
  if (quoteDates.includes(requestedDate)) return requestedDate;
  if (typeof requestedDate !== "string" || !requestedDate) return quoteDates[0];

  const requestedTime = new Date(requestedDate).getTime();
  if (!Number.isFinite(requestedTime)) return quoteDates[0];

  return quoteDates.reduce((nearest, candidate) =>
    Math.abs(new Date(candidate).getTime() - requestedTime) <
    Math.abs(new Date(nearest).getTime() - requestedTime)
      ? candidate
      : nearest,
  );
}

export function resolveQuoteFilters(params = {}) {
  const senderCountry = Object.hasOwn(SENDER_COUNTRIES, params.senderCountry)
    ? params.senderCountry
    : "GB";
  const sourceCurrency = senderConfig(senderCountry).currency;
  const currencies = targetCurrencies(CURRENCIES, senderCountry);
  let selectedCurrency = currencies.includes("EUR")
    ? "EUR"
    : currencies.includes("GBP")
      ? "GBP"
      : currencies[0];
  let selectedAmount = String(
    AMOUNTS_GBP.includes(1000) ? 1000 : AMOUNTS_GBP[0],
  );
  let selectedDays = 30;

  const rawCurrency =
    typeof params.currency === "string" ? params.currency.toUpperCase() : "";
  const rawAmount =
    typeof params.gbpAmount === "string" ? Number(params.gbpAmount) : null;
  const rawDays = Number(params.days ?? "30");

  if (rawCurrency && currencies.includes(rawCurrency)) {
    selectedCurrency = rawCurrency;
  }
  if (rawAmount !== null && AMOUNTS_GBP.includes(rawAmount)) {
    selectedAmount = String(rawAmount);
  }
  if (RANGE_OPTIONS.includes(rawDays)) {
    selectedDays = rawDays;
  }
  const selectedProviders = resolveSelectedProviders(params);

  return {
    senderCountry,
    sourceCurrency,
    currencies,
    selectedCurrency,
    selectedAmount,
    selectedDays,
    selectedProviders,
  };
}
