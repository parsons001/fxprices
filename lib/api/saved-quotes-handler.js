import { SENDER_COUNTRIES, senderConfig } from "../config/sender-countries.js";
import { getCurrencySettings } from "../config/currencies.js";
import {
  isCurrencyPairSupported,
  resolveSourceCurrency,
} from "../config/currency-pairs.js";
import { quoteConfigurationUnavailable } from "./configuration-error.js";

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
    const { sourceCurrencies } = settings;
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
      settings.currencyPairs,
    );
    const amount = query.has("gbpAmount")
      ? Number(query.get("gbpAmount"))
      : null;
    if (
      (currency &&
        !isCurrencyPairSupported(
          sourceCurrency,
          currency,
          settings.currencyPairs,
        )) ||
      (amount !== null && !settings.amounts.includes(amount))
    ) {
      return Response.json(
        { error: "Choose a supported currency pair and amount." },
        { status: 400 },
      );
    }
    try {
      const snapshots = (
        await store.latest({ senderCountry, sourceCurrency })
      ).filter(
        (row) =>
          (!currency || row.currency === currency) &&
          (amount === null || row.amount === amount),
      );
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
