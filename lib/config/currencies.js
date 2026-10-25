import { getAll } from "@vercel/global-config";
import { parseCurrencyPairs } from "./currency-pairs.js";
import { SENDER_COUNTRIES } from "./sender-countries.js";

export function defaultQuoteAmount(amounts) {
  return amounts.includes(1000) ? 1000 : amounts[0];
}

export function parseGlobalCurrencySettings(values = {}) {
  const configuredPairs = values.FX_CURRENCY_PAIRS;
  if (configuredPairs === undefined)
    throw new Error('Global Config key "FX_CURRENCY_PAIRS" is required.');
  if (
    !configuredPairs ||
    typeof configuredPairs !== "object" ||
    Array.isArray(configuredPairs)
  )
    throw new Error(
      'Global Config "FX_CURRENCY_PAIRS" must be an object keyed by profile country.',
    );
  const unsupportedCountries = Object.keys(configuredPairs).filter(
    (country) => !Object.hasOwn(SENDER_COUNTRIES, country),
  );
  if (unsupportedCountries.length)
    throw new Error(
      `Global Config "FX_CURRENCY_PAIRS" contains unsupported profile country "${unsupportedCountries[0]}".`,
    );
  const currencyPairs = Object.fromEntries(
    Object.keys(SENDER_COUNTRIES).map((country) => {
      const pairs = configuredPairs[country];
      if (!Array.isArray(pairs) || !pairs.length)
        throw new Error(
          `Global Config "FX_CURRENCY_PAIRS.${country}" must be a non-empty array of SOURCE:TARGET strings.`,
        );
      return [country, parseCurrencyPairs(pairs)];
    }),
  );
  const amounts = values.FX_AMOUNTS;
  if (amounts === undefined)
    throw new Error('Global Config key "FX_AMOUNTS" is required.');
  if (!Array.isArray(amounts))
    throw new Error(
      'Global Config "FX_AMOUNTS" must be an array of positive numbers.',
    );
  if (!amounts.length)
    throw new Error('Global Config key "FX_AMOUNTS" is required.');

  const parsedAmounts = [...new Set(amounts)];
  if (
    parsedAmounts.some(
      (amount) =>
        typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0,
    )
  ) {
    throw new Error(
      'Global Config "FX_AMOUNTS" must contain only positive finite numbers.',
    );
  }

  return {
    amounts: parsedAmounts,
    currencyPairs,
  };
}

export async function getCurrencySettings() {
  const values = await getAll(["FX_CURRENCY_PAIRS", "FX_AMOUNTS"]);
  return parseGlobalCurrencySettings(values);
}
