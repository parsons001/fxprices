import {
  parseCurrencyPairs,
  sourceCurrenciesForPairs,
} from "../lib/config/currency-pairs.js";

const currencyPairs = parseCurrencyPairs([
  "GBP:AED",
  "GBP:AUD",
  "GBP:CAD",
  "GBP:EUR",
  "GBP:USD",
  "GBP:PLN",
  "GBP:RON",
  "GBP:CHF",
  "GBP:ZAR",
  "GBP:INR",
  "GBP:PHP",
  "GBP:BDT",
  "GBP:PKR",
  "GBP:JPY",
  "EUR:AED",
  "EUR:AUD",
  "EUR:CAD",
  "EUR:USD",
  "EUR:PLN",
  "EUR:RON",
  "EUR:CHF",
  "EUR:ZAR",
  "EUR:INR",
  "EUR:PHP",
  "EUR:BDT",
  "EUR:PKR",
  "EUR:JPY",
  "EUR:GBP",
]);

export async function getTestCurrencySettings() {
  return {
    amounts: [100, 500, 1000, 5000, 10000],
    currencyPairs,
    sourceCurrencies: sourceCurrenciesForPairs(currencyPairs),
  };
}
