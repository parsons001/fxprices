import { SENDER_COUNTRIES, targetCurrencies } from "../../../lib/sender-countries.js";
import { sendStore } from "../../../lib/send-store.js";
import { CURRENCIES, AMOUNTS_GBP } from "../../../lib/currencies.js";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  const query = new URL(request.url).searchParams;
  const senderCountry = (query.get("senderCountry") ?? "GB").toUpperCase();
  if (!Object.hasOwn(SENDER_COUNTRIES, senderCountry)) return Response.json({ error: "Unsupported sending country" }, { status: 400 });
  const currency = query.get("currency")?.toUpperCase();
  const amount = query.has("gbpAmount") ? Number(query.get("gbpAmount")) : null;
  if (
    (currency && !targetCurrencies(CURRENCIES, senderCountry).includes(currency)) ||
    (amount !== null && !AMOUNTS_GBP.includes(amount))
  ) {
    return Response.json(
      { error: "Choose a supported currency and GBP amount." },
      { status: 400 },
    );
  }
  try {
    const snapshots = (await sendStore.latest({ senderCountry })).filter(
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
}
