import { SENDER_COUNTRIES, targetCurrencies } from "../../../../lib/sender-countries.js";
import { fetchAndStoreSend } from "../../../../lib/fetch-send.js";
import { fetchAndStoreConversion } from "../../../../lib/fetch-conversion.js";
import { CURRENCIES, AMOUNTS_GBP } from "../../../../lib/currencies.js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

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
  if (selectedCountry && !Object.hasOwn(SENDER_COUNTRIES, selectedCountry)) return Response.json({ error: "Unsupported sending country" }, { status: 400 });
  const countries = selectedCountry ? [selectedCountry] : Object.keys(SENDER_COUNTRIES);
  const jobs = [["convert", fetchAndStoreConversion], ["send", fetchAndStoreSend]].flatMap(([mode, update]) => countries.flatMap((senderCountry) => targetCurrencies(CURRENCIES, senderCountry).flatMap((currency) =>
    AMOUNTS_GBP.map(async (amount) => {
      const response = await update(
        new Request(
          `https://internal/api/convert?currency=${currency}&gbpAmount=${amount}&senderCountry=${senderCountry}`,
        ),
      );
      const result = await response.json();
      return {
        mode,
        senderCountry,
        currency,
        amount,
        saved: result.storage?.saved === true,
        providerErrors: result.errors ?? [],
        error: result.storage?.error ?? result.error ?? null,
      };
    }),
  )));
  const results = await Promise.allSettled(jobs);
  const completed = results.filter((result) => result.status === "fulfilled").map((result) => result.value);
  const failed = results.filter((result) => result.status === "rejected").map((result) => ({ error: result.reason?.message ?? "Update failed" }));

  return Response.json({
    updatedAt: new Date().toISOString(),
    total: results.length,
    completed,
    failed,
  }, { status: failed.length ? 207 : 200, headers: { "Cache-Control": "no-store" } });
}
