import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";
import { getDatabase } from "../db/mongodb.js";
import { SENDER_COUNTRIES } from "../config/sender-countries.js";
import { getCurrencySettings } from "../config/currencies.js";
import {
  currencyPairsForCountry,
  isCurrencyPairSupported,
  sourceCurrenciesForCountry,
} from "../config/currency-pairs.js";

const COLLECTIONS = {
  conversions: "conversion_snapshots",
  sends: "send_snapshots",
};
const collectionSchema = z
  .enum(["conversions", "sends", "both"])
  .default("both");
const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

function selectedCollections(selection) {
  return selection === "both"
    ? Object.values(COLLECTIONS)
    : [COLLECTIONS[selection]];
}

function buildDailyAveragePipeline(filter, page, pageSize) {
  return [
    { $match: filter },
    { $unwind: "$quotes" },
    {
      $group: {
        _id: {
          date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$fetchedAt",
              timezone: "UTC",
            },
          },
          senderCountry: { $ifNull: ["$senderCountry", "GB"] },
          sourceCurrency: { $ifNull: ["$sourceCurrency", "GBP"] },
          currency: "$currency",
          amount: "$amount",
          provider: "$quotes.provider",
          planId: { $ifNull: ["$quotes.planId", null] },
          option: { $ifNull: ["$quotes.option", null] },
        },
        averageRate: { $avg: "$quotes.rate" },
        averageFeeGbp: { $avg: "$quotes.feeGbp" },
        averageReceivedAmount: { $avg: "$quotes.receivedAmount" },
        sampleCount: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: {
          date: "$_id.date",
          senderCountry: "$_id.senderCountry",
          sourceCurrency: "$_id.sourceCurrency",
          currency: "$_id.currency",
          amount: "$_id.amount",
        },
        quotes: {
          $push: {
            provider: "$_id.provider",
            planId: "$_id.planId",
            option: "$_id.option",
            averageRate: "$averageRate",
            averageFeeGbp: "$averageFeeGbp",
            averageReceivedAmount: "$averageReceivedAmount",
            sampleCount: "$sampleCount",
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        date: "$_id.date",
        senderCountry: "$_id.senderCountry",
        sourceCurrency: "$_id.sourceCurrency",
        currency: "$_id.currency",
        amount: "$_id.amount",
        quotes: 1,
      },
    },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        dailyAverages: [
          {
            $sort: {
              date: 1,
              senderCountry: 1,
              sourceCurrency: 1,
              currency: 1,
              amount: 1,
            },
          },
          { $skip: (page - 1) * pageSize },
          { $limit: pageSize },
        ],
      },
    },
  ];
}

async function queryDailyAverages(
  databaseProvider,
  collection,
  filter,
  page,
  pageSize,
) {
  const db = await databaseProvider();
  const [result = { metadata: [], dailyAverages: [] }] = await db
    .collection(collection)
    .aggregate(buildDailyAveragePipeline(filter, page, pageSize))
    .toArray();
  return {
    total: result.metadata[0]?.total ?? 0,
    dailyAverages: result.dailyAverages,
  };
}

let dailyAverageCache;
function getDailyAverageCache() {
  dailyAverageCache ??= import("next/cache.js").then(({ unstable_cache }) =>
    unstable_cache(
      (collection, filter, page, pageSize) =>
        queryDailyAverages(getDatabase, collection, filter, page, pageSize),
      ["mcp-daily-quote-averages-v1"],
      { revalidate: 3600 },
    ),
  );
  return dailyAverageCache;
}

async function getCachedDailyAverages(collection, filter, page, pageSize) {
  const cachedQuery = await getDailyAverageCache();
  return cachedQuery(collection, filter, page, pageSize);
}

function buildSnapshotFilter({
  senderCountry,
  sourceCurrency,
  currency,
  amount,
  since,
  until,
}) {
  const filter = {};
  if (senderCountry === "GB") {
    filter.$or = [
      { senderCountry: "GB" },
      { senderCountry: { $exists: false }, sourceCurrency: "GBP" },
    ];
  } else if (senderCountry) {
    filter.senderCountry = senderCountry;
  }
  if (sourceCurrency === "GBP" && senderCountry === "GB") {
    const countryFilter = { $or: filter.$or };
    delete filter.$or;
    filter.$and = [
      countryFilter,
      {
        $or: [
          { sourceCurrency: "GBP" },
          { sourceCurrency: { $exists: false } },
        ],
      },
    ];
  } else if (sourceCurrency) {
    filter.sourceCurrency = sourceCurrency;
  }
  if (currency) filter.currency = currency;
  if (amount !== undefined) filter.amount = amount;
  if (since || until) {
    filter.fetchedAt = {
      ...(since ? { $gte: new Date(since) } : {}),
      ...(until ? { $lt: new Date(until) } : {}),
    };
  }
  return filter;
}

function validateFilters(
  { senderCountry, sourceCurrency, currency, amount, since, until },
  settings,
) {
  if (senderCountry && !Object.hasOwn(SENDER_COUNTRIES, senderCountry)) {
    throw new Error("Unsupported sender country.");
  }
  const currencyPairs = currencyPairsForCountry(settings, senderCountry);
  const sourceCurrencies = sourceCurrenciesForCountry(settings, senderCountry);
  if (sourceCurrency && !sourceCurrencies.includes(sourceCurrency)) {
    throw new Error("Unsupported source currency.");
  }
  if (
    sourceCurrency &&
    currency &&
    !isCurrencyPairSupported(sourceCurrency, currency, currencyPairs)
  ) {
    throw new Error("Unsupported source and target currency pair.");
  }
  if (currency && !currencyPairs.some((pair) => pair.currency === currency)) {
    throw new Error("Unsupported destination currency.");
  }
  if (amount !== undefined && !settings.amounts.includes(amount)) {
    throw new Error("Unsupported source amount.");
  }
  if (since && until && new Date(since) >= new Date(until)) {
    throw new Error("since must be earlier than until.");
  }
}

function inputError(message) {
  return {
    isError: true,
    content: [{ type: "text", text: message }],
  };
}

function databaseError(error) {
  console.error("MCP quote database read failed", error);
  return {
    isError: true,
    content: [{ type: "text", text: "Unable to read saved quote data." }],
  };
}

export function createFxMcpServer(
  databaseProvider = getDatabase,
  settingsProvider = getCurrencySettings,
) {
  const server = new McpServer({
    name: "fx-prices-readonly",
    version: "1.0.0",
  });

  server.registerTool(
    "get_quote_database_overview",
    {
      title: "Get quote database overview",
      description:
        "Read raw saved snapshot counts, date ranges and available sender/currency/amount combinations from both quote collections. Counts reflect the underlying observations; list_quote_snapshots returns daily averages.",
      inputSchema: {
        collection: collectionSchema,
      },
      annotations: readOnlyAnnotations,
    },
    async ({ collection }) => {
      try {
        const db = await databaseProvider();
        const collections = await Promise.all(
          selectedCollections(collection).map(async (name) => {
            const [snapshotCount, markets] = await Promise.all([
              db.collection(name).countDocuments({}),
              db
                .collection(name)
                .aggregate([
                  {
                    $group: {
                      _id: {
                        senderCountry: {
                          $ifNull: ["$senderCountry", "GB"],
                        },
                        sourceCurrency: {
                          $ifNull: ["$sourceCurrency", "GBP"],
                        },
                        currency: "$currency",
                        amount: "$amount",
                      },
                      snapshots: { $sum: 1 },
                      firstFetchedAt: { $min: "$fetchedAt" },
                      lastFetchedAt: { $max: "$fetchedAt" },
                    },
                  },
                  {
                    $sort: {
                      "_id.senderCountry": 1,
                      "_id.currency": 1,
                      "_id.amount": 1,
                    },
                  },
                ])
                .toArray(),
            ]);
            return {
              collection: name,
              snapshotCount,
              markets: markets.map((market) => ({
                ...market._id,
                snapshots: market.snapshots,
                firstFetchedAt: market.firstFetchedAt?.toISOString() ?? null,
                lastFetchedAt: market.lastFetchedAt?.toISOString() ?? null,
              })),
            };
          }),
        );
        const result = { collections };
        return {
          structuredContent: result,
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      } catch (error) {
        return databaseError(error);
      }
    },
  );

  server.registerTool(
    "list_quote_snapshots",
    {
      title: "List daily average quote rates",
      description:
        "Read pages of daily UTC average Wise/Revolut conversion or bank-transfer rates, grouped by market and provider. Each quote includes average rate, fee, recipient amount, and sample count for that day. Select conversions, sends or both. When both are selected, page and pageSize apply independently to each collection. Use overview to inspect available markets first. since is inclusive and until is exclusive.",
      inputSchema: {
        collection: collectionSchema,
        senderCountry: z.enum(["GB", "IE"]).optional(),
        sourceCurrency: z.string().length(3).optional(),
        currency: z.string().length(3).optional(),
        amount: z.number().positive().optional(),
        since: z.iso.datetime({ offset: true }).optional(),
        until: z.iso.datetime({ offset: true }).optional(),
        page: z.number().int().min(1).max(10_000).default(1),
        pageSize: z.number().int().min(1).max(100).default(50),
      },
      annotations: readOnlyAnnotations,
    },
    async ({
      collection,
      senderCountry,
      sourceCurrency,
      currency,
      amount,
      since,
      until,
      page,
      pageSize,
    }) => {
      let settings;
      try {
        settings = await settingsProvider();
      } catch (error) {
        console.error("MCP quote configuration could not be loaded", error);
        return inputError("Quote settings are temporarily unavailable.");
      }
      try {
        validateFilters(
          {
            senderCountry,
            sourceCurrency,
            currency,
            amount,
            since,
            until,
          },
          settings,
        );
      } catch (error) {
        return inputError(error.message);
      }
      try {
        const filter = buildSnapshotFilter({
          senderCountry,
          sourceCurrency,
          currency,
          amount,
          since,
          until,
        });
        const collections = await Promise.all(
          selectedCollections(collection).map(async (name) => {
            const { total, dailyAverages } =
              databaseProvider === getDatabase
                ? await getCachedDailyAverages(name, filter, page, pageSize)
                : await queryDailyAverages(
                    databaseProvider,
                    name,
                    filter,
                    page,
                    pageSize,
                  );
            return {
              collection: name,
              total,
              page,
              pageSize,
              hasMore: page * pageSize < total,
              dailyAverages,
            };
          }),
        );
        const result = {
          filters: {
            senderCountry,
            sourceCurrency,
            currency,
            amount,
            since,
            until,
          },
          collections,
        };
        return {
          structuredContent: result,
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      } catch (error) {
        return databaseError(error);
      }
    },
  );

  return server;
}
