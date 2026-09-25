import { storageErrorMessage } from "./storage-error.js";
import { senderConfig, SENDER_COUNTRIES, targetCurrencies } from "./sender-countries.js";
import { conversionStore } from "./conversion-store.js";
import { estimatePaidPlans, liveRevolutQuote } from "../revolut-plans.js";
import { CURRENCIES, AMOUNTS_GBP } from "./currencies.js";

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

export async function fetchAndStoreConversion(request) {
  const query = new URL(request.url).searchParams;
  const senderCountry = (query.get("senderCountry") ?? "GB").toUpperCase();
  if (!Object.hasOwn(SENDER_COUNTRIES, senderCountry)) return Response.json({ error: "Unsupported sending country" }, { status: 400 });
  const sourceCurrency = senderConfig(senderCountry).currency;
  const amount = Number(query.get("amount") ?? query.get("gbpAmount") ?? 100);
  const currency = String(query.get("currency") ?? "EUR").toUpperCase();
  if (!AMOUNTS_GBP.includes(amount) || !targetCurrencies(CURRENCIES, senderCountry).includes(currency)) {
    return Response.json(
      {
        error:
          "Choose a supported currency and GBP amount: 100, 500, 1000, 5000 or 10000.",
      },
      { status: 400 },
    );
  }
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
      const estimates = estimatePaidPlans({
        sourceCurrency,
        amountGbp: amount,
        rate: q.rate.rate,
        targetDecimals: CURRENCY_DECIMALS[currency] ?? 2,
        weekend,
      });
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
    senderCountry, sourceCurrency,
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
  try {
    const id = await conversionStore.save(result);
    return Response.json(
      { ...result, storage: { saved: true, id } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    // Never expose connection strings or driver errors in an API response.
    return Response.json(
      {
        ...result,
        storage: {
          saved: false,
          error: storageErrorMessage(error),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
