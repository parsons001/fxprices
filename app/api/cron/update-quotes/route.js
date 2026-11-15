import {
  summarizeQuoteUpdate,
  serializeUpdateResponse,
} from "../../../../lib/quotes/quote-update-result.js";
import { getCurrencySettings } from "../../../../lib/config/currencies.js";
import { runQuoteUpdates } from "../../../../lib/quotes/run-quote-updates.js";
import { cronRunStore } from "../../../../lib/db/cron-run-store.js";
import { createCronRunRecord } from "../../../../lib/quotes/cron-run-record.js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";
const UPDATE_COUNTRIES = ["GB", "IE"];

function loggedJsonResponse(body, status) {
  const serialized = typeof body === "string" ? body : JSON.stringify(body);
  console.info(serialized);
  return new Response(serialized, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    },
  });
}

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  return Boolean(secret && authorization === `Bearer ${secret}`);
}

async function saveCronRun(run) {
  try {
    await cronRunStore.save(run);
  } catch (error) {
    console.error("Cron run analytics could not be saved", error);
  }
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date();
  const startedAtMs = Date.now();
  const selectedCountry = new URL(request.url).searchParams.get(
    "senderCountry",
  );
  if (selectedCountry && !UPDATE_COUNTRIES.includes(selectedCountry))
    return Response.json(
      { error: "Quote updates are supported only for GB and IE profiles." },
      { status: 400 },
    );
  const countries = selectedCountry ? [selectedCountry] : UPDATE_COUNTRIES;
  let settings;
  try {
    settings = await getCurrencySettings();
  } catch (error) {
    console.error("Quote update configuration could not be loaded", error);
    await saveCronRun(
      createCronRunRecord({
        startedAt,
        completedAt: new Date(),
        durationMs: Date.now() - startedAtMs,
        countries,
        status: "failed",
        error: "Quote update configuration is unavailable.",
      }),
    );
    return loggedJsonResponse(
      { success: false, error: "Quote update configuration is unavailable." },
      503,
    );
  }
  let results;
  try {
    results = await runQuoteUpdates(countries, settings);
  } catch (error) {
    console.error("Quote update failed unexpectedly", error);
    await saveCronRun(
      createCronRunRecord({
        startedAt,
        completedAt: new Date(),
        durationMs: Date.now() - startedAtMs,
        countries,
        status: "failed",
        error: "Quote update failed unexpectedly.",
        settings: {
          amountCount: settings.amounts.length,
          pairCount: countries.reduce(
            (total, country) => total + settings.currencyPairs[country].length,
            0,
          ),
        },
      }),
    );
    return loggedJsonResponse(
      { success: false, error: "Quote update failed unexpectedly." },
      500,
    );
  }
  results = results.map((update) => ({
    ...update,
    summary: summarizeQuoteUpdate(
      update.context,
      update.result ?? { error: update.error },
    ),
  }));
  const quotes = { Wise: 0, Revolut: 0 };
  for (const update of results) {
    for (const provider of Object.keys(quotes))
      quotes[provider] += update.summary.quotes[provider];
  }
  const failures = results.flatMap((update) => update.summary.failures);
  await saveCronRun(
    createCronRunRecord({
      startedAt,
      completedAt: new Date(),
      durationMs: Date.now() - startedAtMs,
      countries,
      status: failures.length ? "partial" : "success",
      updates: results,
      quoteCounts: quotes,
      failures,
      settings: {
        amountCount: settings.amounts.length,
        pairCount: countries.reduce(
          (total, country) => total + settings.currencyPairs[country].length,
          0,
        ),
      },
    }),
  );
  return loggedJsonResponse(
    serializeUpdateResponse(quotes, failures),
    failures.length ? 207 : 200,
  );
}
