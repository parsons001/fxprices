import {
  SENDER_COUNTRIES,
  senderConfig,
  targetCurrencies,
} from "../config/sender-countries.js";
import { RANGE_OPTIONS } from "../charts/chart-history.js";
import { CURRENCIES, AMOUNTS_GBP } from "../config/currencies.js";

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

  return {
    senderCountry,
    sourceCurrency,
    currencies,
    selectedCurrency,
    selectedAmount,
    selectedDays,
  };
}
