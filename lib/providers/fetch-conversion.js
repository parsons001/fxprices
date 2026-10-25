import { storageErrorMessage } from "../db/storage-error.js";
import { senderConfig, SENDER_COUNTRIES } from "../config/sender-countries.js";
import { isCurrencyPairSupported } from "../config/currency-pairs.js";
import { conversionStore } from "../db/conversion-store.js";
import { estimatePaidPlans, liveRevolutQuote } from "./revolut-plans.js";
import { getCurrencySettings } from "../config/currencies.js";
import { quoteConfigurationUnavailable } from "../api/configuration-error.js";
import { parseQuoteRequest } from "./quote-request.js";

const CURRENCY_DECIMALS = {
  BHD: 3,
  BIF: 0,
  CLP: 0,
  DJF: 0,
  GNF: 0,
  ISK: 0,
  JOD: 3,
  JPY: 0,
  KMF: 0,
  KRW: 0,
  KWD: 3,
  OMR: 3,
  PYG: 0,
  RWF: 0,
  TND: 3,
  UGX: 0,
  VND: 0,
  VUV: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0,
};

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-GB",
};

function majorToMinor(amount, currency) {
  const decimals = CURRENCY_DECIMALS[currency] ?? 2;
  return Math.round(amount * 10 ** decimals);
}

export async function fetchAndStoreConversion(
  request,
  settingsProvider = getCurrencySettings,
) {
  let settings;
  try {
    settings = await settingsProvider();
  } catch (error) {
    return quoteConfigurationUnavailable("Conversion quote", error);
  }
  const query = new URL(request.url).searchParams;
  const senderCountry = (query.get("senderCountry") ?? "GB").toUpperCase();
  if (!Object.hasOwn(SENDER_COUNTRIES, senderCountry))
    return Response.json(
      { error: "Unsupported sending country" },
      { status: 400 },
    );
  const { amount, currency, sourceCurrency } = parseQuoteRequest(
    query,
    senderConfig(senderCountry).currency,
    settings,
  );
  if (
    !settings.amounts.includes(amount) ||
    !sourceCurrency ||
    !isCurrencyPairSupported(sourceCurrency, currency, settings.currencyPairs)
  ) {
    return Response.json(
      {
        error: "Choose a configured currency pair and supported source amount.",
      },
      { status: 400 },
    );
  }
  return Response.json(
    await updateConversion({
      amount,
      currency,
      senderCountry,
      sourceCurrency,
      settings,
    }),
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}

// Internal batch calls use objects directly, avoiding HTTP/JSON round trips.
export async function updateConversion({
  amount,
  currency,
  senderCountry,
  sourceCurrency = senderConfig(senderCountry).currency,
  settings,
  persist = true,
}) {
  settings ??= await getCurrencySettings();
  if (
    !isCurrencyPairSupported(sourceCurrency, currency, settings.currencyPairs)
  )
    throw new Error("Unsupported source and target currency pair");
  const get = async (url) => {
    const response = await fetch(url, {
      headers: {
        ...BROWSER_HEADERS,
        Accept: "application/json",
        localeCode: "en-GB",
        "locale-code": "en-GB",
      },
      signal: AbortSignal.timeout(25000),
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error(`Quote unavailable (HTTP ${response.status})`);
    const data = await response.json();
    if (data.message) throw new Error(data.message);
    return data;
  };
  const wiseParams = new URLSearchParams({
    sourceAmount: String(amount),
    sourceCurrency,
    targetCurrency: currency,
    profileType: "PERSONAL",
    profileCountry: senderCountry,
    markers: "FCF_PRICING",
  });
  const revParams = new URLSearchParams({
    amount: String(majorToMinor(amount, sourceCurrency)),
    country: senderCountry,
    fromCurrency: sourceCurrency,
    isRecipientAmount: "false",
    toCurrency: currency,
  });
  const results = await Promise.allSettled([
    get(`https://wise.com/gateway/v1/price?${wiseParams}`).then((data) => {
      const q =
        Array.isArray(data) &&
        data.find(
          (q) =>
            q.payInMethod === "BALANCE" &&
            q.payOutMethod === "BALANCE" &&
            q.sourceCcy === sourceCurrency &&
            q.targetCcy === currency,
        );
      if (
        !q ||
        ![q.midRate, q.targetAmount, q.total, q.sourceAmount].every(
          Number.isFinite,
        )
      )
        throw new Error("Balance conversion quote unavailable");
      return [
        {
          provider: "Wise",
          option: "Balance to balance",
          rate: q.midRate,
          feeGbp: q.total,
          costGbp: q.sourceAmount,
          receivedAmount: q.targetAmount,
        },
      ];
    }),
    get(`https://www.revolut.com/api/exchange/quote?${revParams}`).then((q) => {
      if (
        !Number.isFinite(q.rate?.rate) ||
        !Number.isFinite(q.recipient?.amount) ||
        !q.plans?.length
      )
        throw new Error("Conversion quote unavailable");
      const liveQuotes = q.plans.map((plan) => {
        if (
          plan.fees?.total?.currency !== sourceCurrency ||
          plan.fees?.cost?.currency !== sourceCurrency ||
          ![plan.fees.total.amount, plan.fees.cost.amount].every(
            Number.isFinite,
          )
        )
          throw new Error("Conversion fee details unavailable");
        return liveRevolutQuote(
          q,
          plan,
          currency,
          amount,
          CURRENCY_DECIMALS[currency] ?? 2,
          sourceCurrency,
        );
      });
      const standard = q.plans.find((plan) => plan.id === "STANDARD");
      if (!standard)
        throw new Error("Standard quote unavailable for plan estimates");
      // The live quote supplies the weekend surcharge; avoid using the server's local day.
      const weekend =
        typeof q.rate.weekend === "boolean"
          ? q.rate.weekend
          : standard.fees.fxWeekend != null;
      const estimates = ["GBP", "EUR"].includes(sourceCurrency)
        ? estimatePaidPlans({
            sourceCurrency,
            amountGbp: amount,
            rate: q.rate.rate,
            targetDecimals: CURRENCY_DECIMALS[currency] ?? 2,
            weekend,
          })
        : [];
      return [
        ...liveQuotes,
        ...estimates.filter(
          (estimate) =>
            !liveQuotes.some((quote) => quote.planId === estimate.planId),
        ),
      ];
    }),
  ]);
  const result = {
    amount,
    senderCountry,
    sourceCurrency,
    currency,
    fetchedAt: new Date().toISOString(),
    quotes: results.flatMap((r) => (r.status === "fulfilled" ? r.value : [])),
    errors: results.flatMap((r, i) =>
      r.status === "rejected"
        ? [
            {
              provider: i === 0 ? "Wise" : "Revolut",
              message: r.reason.message,
            },
          ]
        : [],
    ),
  };
  if (!persist) return result;
  try {
    const id = await conversionStore.save(result);
    return { ...result, storage: { saved: true, id } };
  } catch (error) {
    return {
      ...result,
      storage: { saved: false, error: storageErrorMessage(error) },
    };
  }
}
