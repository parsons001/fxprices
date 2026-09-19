import { conversionStore } from "../../../lib/conversion-store.js";
import { CURRENCIES, AMOUNTS_GBP } from "../../../lib/currencies.js";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  const query = new URL(request.url).searchParams;
  const currency = query.get("currency")?.toUpperCase();
  const amount = query.has("gbpAmount") ? Number(query.get("gbpAmount")) : null;
  if (
    (currency && !CURRENCIES.includes(currency)) ||
    (amount !== null && !AMOUNTS_GBP.includes(amount))
  ) {
    return Response.json(
      { error: "Choose a supported currency and GBP amount." },
      { status: 400 },
    );
  }
  try {
    const snapshots = (await conversionStore.latest()).filter(
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
