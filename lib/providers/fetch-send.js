import { storageErrorMessage } from "../db/storage-error.js";
import { senderConfig, SENDER_COUNTRIES } from "../config/sender-countries.js";
import { isCurrencyPairSupported } from "../config/currency-pairs.js";
import { sendStore } from "../db/send-store.js";
import { getCurrencySettings } from "../config/currencies.js";
import { SEND_COUNTRIES } from "../config/send-countries.js";
import { fixedBudgetQuote } from "./revolut-plans.js";
import { quoteConfigurationUnavailable } from "../api/configuration-error.js";
import { parseQuoteRequest } from "./quote-request.js";

export function wiseSendQuotes(data, currency, sourceCurrency = "GBP") {
  const quote =
    Array.isArray(data) &&
    data.find(
      (q) =>
        q.payInMethod === "BALANCE" &&
        q.payOutMethod === "BANK_TRANSFER" &&
        q.sourceCcy === sourceCurrency &&
        q.targetCcy === currency,
    );
  if (
    !quote ||
    ![quote.midRate, quote.total, quote.sourceAmount, quote.targetAmount].every(
      Number.isFinite,
    )
  )
    throw new Error("Balance-to-bank quote unavailable");
  return [
    {
      provider: "Wise",
      option: "Balance to bank account",
      rate: quote.midRate,
      feeGbp: quote.total,
      costGbp: quote.sourceAmount,
      receivedAmount: quote.targetAmount,
    },
  ];
}

export function revolutSendQuotes(
  data,
  currency,
  amount,
  sourceCurrency = "GBP",
) {
  const route = data.routes?.find((route) => route.id === "BANK");
  if (
    !route?.plans?.length ||
    data.rate?.from !== sourceCurrency ||
    data.rate?.to !== currency ||
    !Number.isFinite(data.rate.rate)
  )
    throw new Error("Bank-transfer quote unavailable");
  const decimals = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).resolvedOptions().maximumFractionDigits;
  return route.plans.map((plan) => {
    if (
      plan.fees?.currency !== sourceCurrency ||
      !Number.isFinite(plan.fees.total)
    )
      throw new Error("Transfer fee details unavailable");
    const feeGbp = plan.fees.total / 100;
    return {
      provider: "Revolut",
      planId: plan.id,
      option: plan.name,
      calculated: true,
      rate: data.rate.rate,
      feeGbp,
      ...fixedBudgetQuote(amount, feeGbp, data.rate.rate, decimals),
      routeId: route.id,
      transferType: route.transferType ?? null,
      intermediaryFees: route.intermediaryFees ?? false,
      transferFeeGbp: Number.isFinite(plan.fees.transfer)
        ? plan.fees.transfer / 100
        : null,
      exchangeFeeGbp: Number.isFinite(plan.fees.fx) ? plan.fees.fx / 100 : null,
    };
  });
}

export async function fetchAndStoreSend(
  request,
  settingsProvider = getCurrencySettings,
) {
  let settings;
  try {
    settings = await settingsProvider();
  } catch (error) {
    return quoteConfigurationUnavailable("Send quote", error);
  }
  const params = new URL(request.url).searchParams;
  const senderCountry = (params.get("senderCountry") ?? "GB").toUpperCase();
  if (!Object.hasOwn(SENDER_COUNTRIES, senderCountry))
    return Response.json(
      { error: "Unsupported sending country" },
      { status: 400 },
    );
  const { amount, currency, sourceCurrency } = parseQuoteRequest(
    params,
    senderConfig(senderCountry).currency,
    settings,
  );
  const recipientCountry = SEND_COUNTRIES[currency];
  if (
    !settings.amounts.includes(amount) ||
    !sourceCurrency ||
    !isCurrencyPairSupported(
      sourceCurrency,
      currency,
      settings.currencyPairs,
    ) ||
    !recipientCountry
  ) {
    return Response.json(
      { error: "Unsupported sending amount, currency or destination country." },
      { status: 400 },
    );
  }
  return Response.json(
    await updateSend({
      amount,
      currency,
      senderCountry,
      sourceCurrency,
      settings,
    }),
    { headers: { "Cache-Control": "no-store" } },
  );
}

// Internal batch calls use objects directly, avoiding HTTP/JSON round trips.
export async function updateSend({
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
  const recipientCountry = SEND_COUNTRIES[currency];
  async function get(url) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "locale-code": "en-GB",
        localeCode: "en-GB",
        "Accept-Language": "en-GB",
        "User-Agent": "Mozilla/5.0",
      },
      signal: AbortSignal.timeout(25000),
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error(`Quote unavailable (HTTP ${response.status})`);
    const data = await response.json();
    if (data.message) throw new Error(data.message);
    return data;
  }
  const wiseParams = new URLSearchParams({
    sourceAmount: String(amount),
    sourceCurrency,
    targetCurrency: currency,
    profileType: "PERSONAL",
    profileCountry: senderCountry,
    markers: "FCF_PRICING",
  });
  const revolutParams = new URLSearchParams({
    amount: String(Math.round(amount * 100)),
    isRecipientAmount: "false",
    recipientCountry,
    recipientCurrency: currency,
    senderCountry,
    senderCurrency: sourceCurrency,
    localeCode: "en",
    locale: "en-GB",
  });
  const results = await Promise.allSettled([
    get(`https://wise.com/gateway/v1/price?${wiseParams}`).then((data) =>
      wiseSendQuotes(data, currency, sourceCurrency),
    ),
    get(`https://www.revolut.com/api/remittance/routes?${revolutParams}`).then(
      (data) => revolutSendQuotes(data, currency, amount, sourceCurrency),
    ),
  ]);
  const result = {
    amount,
    currency,
    senderCountry,
    sourceCurrency,
    recipientCountry,
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
    const id = await sendStore.save(result);
    return { ...result, storage: { saved: true, id } };
  } catch (error) {
    return {
      ...result,
      storage: { saved: false, error: storageErrorMessage(error) },
    };
  }
}
