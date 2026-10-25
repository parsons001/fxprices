import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";
import { getDatabase } from "../db/mongodb.js";
import { SENDER_COUNTRIES } from "../config/sender-countries.js";
import { getCurrencySettings } from "../config/currencies.js";
import { isCurrencyPairSupported } from "../config/currency-pairs.js";

const COLLECTIONS = {
  conversions: "conversion_snapshots",
  sends: "send_snapshots",
};
const SNAPSHOT_PROJECTION = {
  _id: 1,
  schemaVersion: 1,
  recipientCountry: 1,
  senderCountry: 1,
  sourceCurrency: 1,
  currency: 1,
  amount: 1,
  fetchedAt: 1,
  midMarketRate: 1,
  quotes: 1,
  errors: 1,
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

function serializeSnapshot({ _id, fetchedAt, ...snapshot }) {
  return {
    ...snapshot,
    id: _id.toString(),
    fetchedAt: fetchedAt.toISOString(),
  };
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
  const { sourceCurrencies } = settings;
  if (senderCountry && !Object.hasOwn(SENDER_COUNTRIES, senderCountry)) {
    throw new Error("Unsupported sender country.");
  }
  if (sourceCurrency && !sourceCurrencies.includes(sourceCurrency)) {
    throw new Error("Unsupported source currency.");
  }
  if (
    sourceCurrency &&
    currency &&
    !isCurrencyPairSupported(sourceCurrency, currency, settings.currencyPairs)
  ) {
    throw new Error("Unsupported source and target currency pair.");
  }
  if (
    currency &&
    !settings.currencyPairs.some((pair) => pair.currency === currency)
  ) {
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
        "Read snapshot counts, date ranges and available sender/currency/amount combinations from both saved quote collections.",
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
      title: "List saved quote snapshots",
      description:
        "Read pages of full saved Wise/Revolut conversion or bank-transfer snapshots. Select conversions, sends or both. When both are selected, page and pageSize apply independently to each collection. Use overview to inspect available markets first. since is inclusive and until is exclusive.",
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
        const db = await databaseProvider();
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
            const cursor = db
              .collection(name)
              .find(filter, { projection: SNAPSHOT_PROJECTION })
              .sort({ fetchedAt: 1, _id: 1 })
              .skip((page - 1) * pageSize)
              .limit(pageSize);
            const [total, snapshots] = await Promise.all([
              db.collection(name).countDocuments(filter),
              cursor.toArray(),
            ]);
            return {
              collection: name,
              total,
              page,
              pageSize,
              hasMore: page * pageSize < total,
              snapshots: snapshots.map(serializeSnapshot),
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
