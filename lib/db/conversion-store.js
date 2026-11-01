import { getDatabase } from "./mongodb.js";
import { markupFor } from "../utils/format.js";
import { createWriteQueue } from "./write-queue.js";
import { senderConfig } from "../config/sender-countries.js";

const queueWrite = (globalThis.fxQuoteWriteQueue ??= createWriteQueue(5));
const dataPointCountInitializations =
  (globalThis.fxDataPointCountInitializations ??= new Map());
const METRICS_COLLECTION = "quote_metrics";

export function countryMatch(senderCountry) {
  if (senderCountry !== "GB") return { senderCountry };
  return {
    $or: [
      { senderCountry: "GB" },
      { senderCountry: { $exists: false }, sourceCurrency: "GBP" },
    ],
  };
}

function marketMatch(senderCountry, sourceCurrency) {
  const countryFilter = countryMatch(senderCountry);
  const sourceFilter =
    senderCountry === "GB" && sourceCurrency === "GBP"
      ? {
          $or: [
            { sourceCurrency: "GBP" },
            { sourceCurrency: { $exists: false } },
          ],
        }
      : { sourceCurrency };
  return { $and: [countryFilter, sourceFilter] };
}

function serializeSnapshot({ _id, fetchedAt, ...document }) {
  return {
    ...document,
    quotes: document.quotes.map(normalizeQuoteAmount),
    id: _id.toString(),
    fetchedAt: fetchedAt.toISOString(),
  };
}

function normalizeQuoteAmount(quote) {
  const { costGbp, ...normalizedQuote } = quote;
  return {
    ...normalizedQuote,
    sourceAmount: quote.sourceAmount ?? costGbp,
  };
}

export function conversionDocument(result) {
  const midMarketRate =
    result.quotes.find((quote) => quote.provider === "Wise")?.rate ?? null;
  return {
    schemaVersion: 1,
    ...(result.recipientCountry
      ? { recipientCountry: result.recipientCountry }
      : {}),
    senderCountry: result.senderCountry ?? "GB",
    sourceCurrency: result.sourceCurrency ?? "GBP",
    currency: result.currency,
    amount: result.amount,
    fetchedAt: new Date(result.fetchedAt),
    midMarketRate,
    quotes: result.quotes.map((quote) => {
      const normalizedQuote = normalizeQuoteAmount(quote);
      return {
        ...normalizedQuote,
        markupPct: markupFor(normalizedQuote, midMarketRate),
      };
    }),
    errors: result.errors,
  };
}

async function initializeDataPointCount(collectionName, db) {
  const metrics = db.collection(METRICS_COLLECTION);
  const metricId = `${collectionName}:dataPoints`;
  const cached = await metrics.findOne({ _id: metricId });
  if (cached) return cached.dataPoints;

  const snapshots = await db
    .collection(collectionName)
    .aggregate(
      [
        {
          $group: {
            _id: null,
            dataPoints: {
              $sum: { $size: { $ifNull: ["$quotes", []] } },
            },
          },
        },
      ],
      { maxTimeMS: 3000 },
    )
    .toArray();
  await metrics.updateOne(
    { _id: metricId },
    {
      $setOnInsert: {
        dataPoints: snapshots[0]?.dataPoints ?? 0,
      },
    },
    { upsert: true },
  );
  const initialized = await metrics.findOne({ _id: metricId });
  return initialized.dataPoints;
}

async function getAllTimeDataPoints(collectionName, db) {
  if (!dataPointCountInitializations.has(collectionName)) {
    const initialization = initializeDataPointCount(collectionName, db).catch(
      (error) => {
        dataPointCountInitializations.delete(collectionName);
        throw error;
      },
    );
    dataPointCountInitializations.set(collectionName, initialization);
  }
  return dataPointCountInitializations.get(collectionName);
}

export function createQuoteStore(collectionName) {
  return {
    async allTimeDataPoints() {
      const db = await getDatabase();
      return getAllTimeDataPoints(collectionName, db);
    },
    async latest({
      senderCountry = "GB",
      sourceCurrency = senderConfig(senderCountry).currency,
    } = {}) {
      const db = await getDatabase();
      const documents = await db
        .collection(collectionName)
        .aggregate([
          {
            $match: marketMatch(senderCountry, sourceCurrency),
          },
          { $sort: { fetchedAt: -1, _id: -1 } },
          {
            $group: {
              _id: {
                sourceCurrency: "$sourceCurrency",
                currency: "$currency",
                amount: "$amount",
              },
              snapshot: { $first: "$$ROOT" },
            },
          },
          { $replaceRoot: { newRoot: "$snapshot" } },
          { $sort: { currency: 1, amount: 1 } },
        ])
        .toArray();
      return documents.map(serializeSnapshot);
    },
    async history({
      days = 30,
      currency = null,
      amount = null,
      senderCountry = "GB",
      sourceCurrency = senderConfig(senderCountry).currency,
    } = {}) {
      const db = await getDatabase();
      const since = new Date(
        Date.now() - (Number(days) || 30) * 24 * 60 * 60 * 1000,
      );
      const match = {
        ...marketMatch(senderCountry, sourceCurrency),
        fetchedAt: { $gte: since },
      };
      if (currency) match.currency = currency;
      if (amount !== null && amount !== "") match.amount = Number(amount);
      const documents = await db
        .collection(collectionName)
        .find(match)
        .sort({ fetchedAt: 1, _id: 1 })
        .toArray();
      return documents.map(serializeSnapshot);
    },
    async save(result) {
      return queueWrite(async () => {
        const db = await getDatabase();
        await getAllTimeDataPoints(collectionName, db);
        const saved = await db
          .collection(collectionName)
          .insertOne(conversionDocument(result));
        await db
          .collection(METRICS_COLLECTION)
          .updateOne(
            { _id: `${collectionName}:dataPoints` },
            { $inc: { dataPoints: result.quotes.length } },
          );
        return saved.insertedId.toString();
      });
    },
  };
}

export const conversionStore = createQuoteStore("conversion_snapshots");
