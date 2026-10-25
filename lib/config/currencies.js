import { getAll } from "@vercel/global-config";
import {
  parseCurrencyPairs,
  sourceCurrenciesForPairs,
} from "./currency-pairs.js";

export function defaultQuoteAmount(amounts) {
  return amounts.includes(1000) ? 1000 : amounts[0];
}

export function parseGlobalCurrencySettings(values = {}) {
  const currencyPairs = values.FX_CURRENCY_PAIRS;
  if (currencyPairs === undefined)
    throw new Error('Global Config key "FX_CURRENCY_PAIRS" is required.');
  if (!Array.isArray(currencyPairs))
    throw new Error(
      'Global Config "FX_CURRENCY_PAIRS" must be an array of SOURCE:TARGET strings.',
    );
  if (!currencyPairs.length)
    throw new Error('Global Config key "FX_CURRENCY_PAIRS" is required.');
  const amounts = values.FX_AMOUNTS_GBP;
  if (amounts === undefined)
    throw new Error('Global Config key "FX_AMOUNTS_GBP" is required.');
  if (!Array.isArray(amounts))
    throw new Error(
      'Global Config "FX_AMOUNTS_GBP" must be an array of positive numbers.',
    );
  if (!amounts.length)
    throw new Error('Global Config key "FX_AMOUNTS_GBP" is required.');

  const parsedCurrencyPairs = parseCurrencyPairs(currencyPairs);
  const parsedAmounts = [...new Set(amounts)];
  if (
    parsedAmounts.some(
      (amount) =>
        typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0,
    )
  ) {
    throw new Error(
      'Global Config "FX_AMOUNTS_GBP" must contain only positive finite numbers.',
    );
  }

  return {
    amounts: parsedAmounts,
    currencyPairs: parsedCurrencyPairs,
    sourceCurrencies: sourceCurrenciesForPairs(parsedCurrencyPairs),
  };
}

export async function getCurrencySettings() {
  const values = await getAll(["FX_CURRENCY_PAIRS", "FX_AMOUNTS_GBP"]);
  return parseGlobalCurrencySettings(values);
}
