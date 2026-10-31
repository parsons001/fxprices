import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeSnapshots,
  sortQuotesForDisplay,
} from "../lib/quotes/snapshot.js";
import { money } from "../lib/utils/format.js";
import { conversionStore } from "../lib/db/conversion-store.js";
import { createSavedQuotesHandler } from "../lib/api/saved-quotes-handler.js";
import { getTestCurrencySettings } from "./currency-settings-fixture.js";

const GET = createSavedQuotesHandler(conversionStore, getTestCurrencySettings);

test("Saved quote API returns service unavailable when settings fail", async () => {
  const handler = createSavedQuotesHandler(conversionStore, async () => {
    throw new Error("Private Global Config detail");
  });
  const response = await handler(new Request("http://localhost/api/convert"));
  assert.equal(response.status, 503);
  assert.equal(
    (await response.json()).error,
    "Quote configuration is unavailable.",
  );
});

test("Public route only reads saved snapshots and filters them", async (t) => {
  t.mock.method(globalThis, "fetch", () => {
    throw new Error("Must not fetch new quotes");
  });
  t.mock.method(conversionStore, "save", () => {
    throw new Error("Must not write");
  });
  t.mock.method(conversionStore, "latest", async () => [
    { currency: "EUR", amount: 100 },
    { currency: "USD", amount: 100 },
    { currency: "EUR", amount: 500 },
  ]);
  const response = await GET(
    new Request("http://localhost/api/convert?currency=EUR&gbpAmount=100"),
  );
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).snapshots, [
    { currency: "EUR", amount: 100 },
  ]);
  assert.equal(response.headers.get("cache-control"), "no-store");
  t.mock.method(conversionStore, "latest", async () => {
    throw new Error("Private details");
  });
  const failed = await GET(new Request("http://localhost/api/convert"));
  assert.equal(failed.status, 503);
  assert.ok(!(await failed.text()).includes("Private details"));
});

test("Saved quote API can return the selected range of history", async (t) => {
  let historyOptions;
  t.mock.method(conversionStore, "history", async (options) => {
    historyOptions = options;
    return [{ currency: "EUR", amount: 500 }];
  });
  const response = await GET(
    new Request(
      "http://localhost/api/convert?currency=EUR&gbpAmount=500&days=7&senderCountry=GB&sourceCurrency=GBP",
    ),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(historyOptions, {
    senderCountry: "GB",
    sourceCurrency: "GBP",
    days: 7,
    currency: "EUR",
    amount: 500,
  });
  assert.deepEqual((await response.json()).snapshots, [
    { currency: "EUR", amount: 500 },
  ]);
});

test("Saved quote API rejects unsupported history ranges", async () => {
  const response = await GET(
    new Request("http://localhost/api/convert?currency=EUR&days=2"),
  );
  assert.equal(response.status, 400);
});

test("Saved snapshots are normalized for incomplete data", () => {
  const normalized = normalizeSnapshots([
    {
      currency: "EUR",
      amount: 100,
      fetchedAt: "2024-01-02T03:04:05.000Z",
    },
  ]);
  assert.deepEqual(normalized[0].quotes, []);
  assert.deepEqual(normalized[0].errors, []);
  assert.deepEqual(normalized[0].storage, {});
});

test("Convert and Send quotes use the same provider and plan order", () => {
  const convertQuotes = [
    { provider: "Revolut", planId: "ULTRA" },
    { provider: "Wise" },
    { provider: "Revolut", planId: "PLUS" },
    { provider: "Revolut", planId: "STANDARD" },
  ];
  const sendQuotes = [
    { provider: "Revolut", planId: "STANDARD" },
    { provider: "Revolut", planId: "PLUS" },
    { provider: "Wise" },
    { provider: "Revolut", planId: "ULTRA" },
  ];
  const order = (quotes) =>
    sortQuotesForDisplay(quotes).map(
      (quote) => `${quote.provider}:${quote.planId ?? ""}`,
    );
  assert.deepEqual(order(convertQuotes), order(sendQuotes));
  assert.deepEqual(order(convertQuotes), [
    "Wise:",
    "Revolut:STANDARD",
    "Revolut:PLUS",
    "Revolut:ULTRA",
  ]);
});

test("Currency formatting stays stable across runtimes", () => {
  assert.equal(money(36913.62, "PKR"), "PKR 36,913.62");
  assert.equal(money(10000, "JPY"), "JP¥10,000");
});
