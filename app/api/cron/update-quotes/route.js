import { mapConcurrent } from "../../../../lib/utils/map-concurrent.js";
import {
  summarizeQuoteUpdate,
  serializeUpdateResponse,
} from "../../../../lib/quotes/quote-update-result.js";
import {
  SENDER_COUNTRIES,
  targetCurrencies,
} from "../../../../lib/config/sender-countries.js";
import { updateSend } from "../../../../lib/providers/fetch-send.js";
import { updateConversion } from "../../../../lib/providers/fetch-conversion.js";
import { CURRENCIES, AMOUNTS_GBP } from "../../../../lib/config/currencies.js";

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

  const selectedCountry = new URL(request.url).searchParams.get(
    "senderCountry",
  );
  if (selectedCountry && !UPDATE_COUNTRIES.includes(selectedCountry))
    return Response.json(
      { error: "Quote updates are supported only for GB and IE profiles." },
      { status: 400 },
    );
  const countries = selectedCountry ? [selectedCountry] : UPDATE_COUNTRIES;
  const jobs = [
    ["convert", updateConversion],
    ["send", updateSend],
  ].flatMap(([mode, update]) =>
    countries.flatMap((senderCountry) =>
      targetCurrencies(CURRENCIES, senderCountry).flatMap((currency) =>
        AMOUNTS_GBP.map((amount) => async () => {
          const context = {
            mode,
            senderCountry,
            sourceCurrency: SENDER_COUNTRIES[senderCountry].currency,
            currency,
            amount,
          };
          try {
            const result = await update({ amount, currency, senderCountry });
            return summarizeQuoteUpdate(context, result);
          } catch (error) {
            return summarizeQuoteUpdate(context, {
              error: error?.message ?? "Unexpected update failure",
            });
          }
        }),
      ),
    ),
  );
  let results;
  try {
    results = await mapConcurrent(jobs, 32);
  } catch {
    return Response.json(
      { success: false, error: "Quote update failed unexpectedly." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
  const quotes = { Wise: 0, Revolut: 0 };
  for (const result of results) {
    for (const provider of Object.keys(quotes))
      quotes[provider] += result.quotes[provider];
  }
  const failures = results.flatMap((result) => result.failures);
  return new Response(serializeUpdateResponse(quotes, failures), {
    status: failures.length ? 207 : 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    },
  });
}
