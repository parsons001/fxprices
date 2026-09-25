import { summarizeQuoteUpdate, serializeUpdateResponse } from "../../../../lib/quote-update-result.js";
import { SENDER_COUNTRIES, targetCurrencies } from "../../../../lib/sender-countries.js";
import { fetchAndStoreSend } from "../../../../lib/fetch-send.js";
import { fetchAndStoreConversion } from "../../../../lib/fetch-conversion.js";
import { CURRENCIES, AMOUNTS_GBP } from "../../../../lib/currencies.js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";
const UPDATE_COUNTRIES = ["GB", "IE"];

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  return Boolean(secret && authorization === `Bearer ${secret}`);
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const selectedCountry = new URL(request.url).searchParams.get("senderCountry");
  if (selectedCountry && !UPDATE_COUNTRIES.includes(selectedCountry)) return Response.json({ error: "Quote updates are supported only for GB and IE profiles." }, { status: 400 });
  const countries = selectedCountry ? [selectedCountry] : UPDATE_COUNTRIES;
  const jobs = [["convert", fetchAndStoreConversion], ["send", fetchAndStoreSend]].flatMap(([mode, update]) => countries.flatMap((senderCountry) => targetCurrencies(CURRENCIES, senderCountry).flatMap((currency) =>
    AMOUNTS_GBP.map(async (amount) => {
      const context = { mode, senderCountry, sourceCurrency: SENDER_COUNTRIES[senderCountry].currency, currency, amount };
      try {
        const response = await update(
          new Request(`https://internal/api/${mode}?currency=${currency}&gbpAmount=${amount}&senderCountry=${senderCountry}`),
        );
        return summarizeQuoteUpdate(context, await response.json(), response.status);
      } catch (error) {
        return summarizeQuoteUpdate(context, { error: error?.message ?? "Unexpected update failure" });
      }
    }),
  )));
  const results = await Promise.all(jobs);
  const quotes = { Wise: 0, Revolut: 0 };
  for (const result of results) {
    for (const provider of Object.keys(quotes)) quotes[provider] += result.quotes[provider];
  }
  const failures = results.flatMap((result) => result.failures);
  return new Response(serializeUpdateResponse(quotes, failures), {
    status: failures.length ? 207 : 200,
    headers: { "Cache-Control": "no-store", "Content-Type": "application/json" },
  });
}
