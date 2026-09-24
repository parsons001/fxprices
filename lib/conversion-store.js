export function countryMatch(senderCountry) {
  return senderCountry === "GB" ? { $or: [{ senderCountry: "GB" }, { senderCountry: { $exists: false }, sourceCurrency: "GBP" }] } : { senderCountry };
}

import { getDatabase } from "./mongodb.js";
import { markupFor } from "./format.js";

export function conversionDocument(result) {
  const midMarketRate =
    result.quotes.find((quote) => quote.provider === "Wise")?.rate ?? null;
  return {
    schemaVersion: 1,
    ...(result.recipientCountry ? { recipientCountry: result.recipientCountry } : {}),
    senderCountry: result.senderCountry ?? "GB",
    sourceCurrency: result.sourceCurrency ?? "GBP",
    currency: result.currency,
    amount: result.amount,
    fetchedAt: new Date(result.fetchedAt),
    midMarketRate,
    quotes: result.quotes.map((quote) => ({
      ...quote,
      markupPct: markupFor(quote, midMarketRate),
    })),
    errors: result.errors,
  };
}

export function createQuoteStore(collectionName) { return {
  async latest({ senderCountry = "GB" } = {}) {
    const db = await getDatabase();
    const documents = await db
      .collection(collectionName)
      .aggregate([
        { $match: countryMatch(senderCountry) },
        { $sort: { fetchedAt: -1, _id: -1 } },
        {
          $group: {
            _id: { currency: "$currency", amount: "$amount" },
            snapshot: { $first: "$$ROOT" },
          },
        },
        { $replaceRoot: { newRoot: "$snapshot" } },
        { $sort: { currency: 1, amount: 1 } },
      ])
      .toArray();
    return documents.map(({ _id, fetchedAt, ...document }) => ({
      ...document,
      id: _id.toString(),
      fetchedAt: fetchedAt.toISOString(),
    }));
  },
  async history({ days = 30, currency = null, amount = null, senderCountry = "GB" } = {}) {
    const db = await getDatabase();
    const since = new Date(
      Date.now() - (Number(days) || 30) * 24 * 60 * 60 * 1000,
    );
    const match = { ...countryMatch(senderCountry), fetchedAt: { $gte: since } };
    if (currency) match.currency = currency;
    if (amount !== null && amount !== "") match.amount = Number(amount);
    const documents = await db
      .collection(collectionName)
      .find(match)
      .sort({ fetchedAt: 1, _id: 1 })
      .toArray();
    return documents.map(({ _id, fetchedAt, ...document }) => ({
      ...document,
      id: _id.toString(),
      fetchedAt: fetchedAt.toISOString(),
    }));
  },
  async save(result) {
    const db = await getDatabase();
    const saved = await db
      .collection(collectionName)
      .insertOne(conversionDocument(result));
    return saved.insertedId.toString();
  },
}; }

export const conversionStore = createQuoteStore("conversion_snapshots");
