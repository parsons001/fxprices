import { SENDER_COUNTRIES, senderConfig } from "../config/sender-countries.js";
import { getCurrencySettings } from "../config/currencies.js";
import {
  currencyPairsForCountry,
  isCurrencyPairSupported,
  resolveSourceCurrency,
  sourceCurrenciesForCountry,
} from "../config/currency-pairs.js";
import { quoteConfigurationUnavailable } from "./configuration-error.js";
import { RANGE_OPTIONS } from "../charts/chart-history.js";

// Both public quote endpoints only read saved snapshots.
export function createSavedQuotesHandler(
  store,
  settingsProvider = getCurrencySettings,
) {
  return async function GET(request) {
    let settings;
    try {
      settings = await settingsProvider();
    } catch (error) {
      return quoteConfigurationUnavailable("Saved quote", error);
    }
    const query = new URL(request.url).searchParams;
    const senderCountry = (query.get("senderCountry") ?? "GB").toUpperCase();
    if (!Object.hasOwn(SENDER_COUNTRIES, senderCountry)) {
      return Response.json(
        { error: "Unsupported sending country" },
        { status: 400 },
      );
    }
    const currency = query.get("currency")?.toUpperCase();
    const requestedSourceCurrency = query.get("sourceCurrency")?.toUpperCase();
    const currencyPairs = currencyPairsForCountry(settings, senderCountry);
    const sourceCurrencies = sourceCurrenciesForCountry(
      settings,
      senderCountry,
    );
    if (
      requestedSourceCurrency &&
      !sourceCurrencies.includes(requestedSourceCurrency)
    ) {
      return Response.json(
        { error: "Choose a supported source currency." },
        { status: 400 },
      );
    }
    const sourceCurrency = resolveSourceCurrency(
      requestedSourceCurrency,
      senderConfig(senderCountry).currency,
      currency,
      currencyPairs,
    );
    const amount = query.has("gbpAmount")
      ? Number(query.get("gbpAmount"))
      : null;
    const days = query.has("days") ? Number(query.get("days")) : null;
    if (
      (currency &&
        !isCurrencyPairSupported(sourceCurrency, currency, currencyPairs)) ||
      (amount !== null && !settings.amounts.includes(amount)) ||
      (days !== null && !RANGE_OPTIONS.includes(days))
    ) {
      return Response.json(
        { error: "Choose a supported currency pair, amount and date range." },
        { status: 400 },
      );
    }
    try {
      const snapshots =
        days === null
          ? (await store.latest({ senderCountry, sourceCurrency })).filter(
              (row) =>
                (!currency || row.currency === currency) &&
                (amount === null || row.amount === amount),
            )
          : await store.history({
              senderCountry,
              sourceCurrency,
              days,
              currency,
              amount,
            });
      return Response.json(
        { snapshots },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch {
      return Response.json(
        { error: "Saved quotes could not be loaded from MongoDB." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
  };
}
