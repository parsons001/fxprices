import { getCurrencySettings } from "../../../../lib/config/currencies.js";
import { runQuoteUpdates } from "../../../../lib/quotes/run-quote-updates.js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

const UPDATE_COUNTRIES = ["GB", "IE"];

export async function getLiveQuotes(
  request,
  settingsProvider = getCurrencySettings,
) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
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

  let settings;
  try {
    settings = await settingsProvider();
  } catch (error) {
    console.error("Live quote configuration could not be loaded", error);
    return Response.json(
      { success: false, error: "Quote configuration is unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  let updates;
  try {
    const countries = selectedCountry ? [selectedCountry] : UPDATE_COUNTRIES;
    updates = await runQuoteUpdates(countries, settings, false);
  } catch {
    return Response.json(
      { success: false, error: "Live quote request failed unexpectedly." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const failureCount = updates.reduce(
    (count, { result, error }) =>
      count + (error ? 1 : (result?.errors?.length ?? 0)),
    0,
  );
  return Response.json(
    {
      success: failureCount === 0,
      failureCount,
      results: updates.map(({ context, result, error }) => ({
        ...context,
        ...(result ?? { error }),
      })),
    },
    {
      status: failureCount ? 207 : 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export async function GET(request) {
  return getLiveQuotes(request);
}
