import {
  conversionStore,
  conversionDocument,
} from "../lib/db/conversion-store.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchAndStoreConversion } from "../lib/providers/fetch-conversion.js";
import { quoteMetadata } from "../lib/api/quote-metadata.js";
import { markupFor, formatPct, trueCost } from "../lib/utils/format.js";
import { getTestCurrencySettings } from "./currency-settings-fixture.js";

test("Conversion metadata and validation remain compatible", async () => {
  const meta = await (
    await quoteMetadata(undefined, getTestCurrencySettings)
  ).json();
  assert.equal(meta.currencies.length, 14);
  assert.equal(meta.amountsGbp.length, 5);
  const euroSourceMeta = await (
    await quoteMetadata(
      new Request(
        "http://localhost/api/convert/meta?senderCountry=GB&sourceCurrency=EUR",
      ),
      getTestCurrencySettings,
    )
  ).json();
  assert.equal(euroSourceMeta.sourceCurrency, "EUR");
  assert.ok(euroSourceMeta.currencies.includes("GBP"));
  assert.ok(euroSourceMeta.sourceCurrencies.includes("GBP"));
  const response = await fetchAndStoreConversion(
    new Request("http://localhost/api/convert?currency=INVALID"),
    getTestCurrencySettings,
  );
  assert.equal(response.status, 400);
});

test("Metadata and quote ingestion return service unavailable when settings fail", async () => {
  const unavailable = async () => {
    throw new Error("Private Global Config detail");
  };
  const metadata = await quoteMetadata(undefined, unavailable);
  assert.equal(metadata.status, 503);
  assert.equal(
    (await metadata.json()).error,
    "Quote configuration is unavailable.",
  );

  const response = await fetchAndStoreConversion(
    new Request("http://localhost/api/convert"),
    unavailable,
  );
  assert.equal(response.status, 503);
  assert.equal(
    (await response.json()).error,
    "Quote configuration is unavailable.",
  );
});

test("Conversion ingestion defaults to an amount from Global Config", async (t) => {
  t.mock.method(conversionStore, "save", async () => "snapshot-id");
  t.mock.method(globalThis, "fetch", async (url) => {
    const parsed = new URL(url);
    if (parsed.hostname === "wise.com") {
      assert.equal(parsed.searchParams.get("sourceAmount"), "250");
      return Response.json([
        {
          payInMethod: "BALANCE",
          payOutMethod: "BALANCE",
          sourceCcy: "GBP",
          targetCcy: "EUR",
          midRate: 1.2,
          targetAmount: 300,
          total: 0,
          sourceAmount: 250,
        },
      ]);
    }
    return Response.json({}, { status: 503 });
  });
  const settings = await getTestCurrencySettings();
  const response = await fetchAndStoreConversion(
    new Request("http://localhost/api/convert?currency=EUR"),
    async () => ({ ...settings, amounts: [250, 500] }),
  );
  const result = await response.json();
  assert.equal(result.amount, 250);
  assert.equal(result.quotes[0].provider, "Wise");
});

test("Route preserves fixed-budget calculations and partial provider failures", async (t) => {
  const saved = [];
  t.mock.method(conversionStore, "save", async (result) => {
    saved.push(conversionDocument(result));
    return "snapshot-id";
  });
  let wiseUnavailable = false;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(options.cache, "no-store");
    if (url.includes("wise.com")) {
      if (wiseUnavailable) return Response.json({}, { status: 503 });
      return Response.json([
        {
          payInMethod: "BALANCE",
          payOutMethod: "BALANCE",
          sourceCcy: "GBP",
          targetCcy: "EUR",
          midRate: 1.2,
          targetAmount: 118.8,
          total: 1,
          sourceAmount: 100,
        },
      ]);
    }
    return Response.json({
      rate: { rate: 1.2, weekend: false },
      recipient: { currency: "EUR", amount: 12000 },
      plans: [
        {
          id: "STANDARD",
          name: "Standard",
          fees: {
            total: { currency: "GBP", amount: 100 },
            cost: { currency: "GBP", amount: 10100 },
          },
        },
      ],
    });
  });
  const request = () =>
    new Request("http://localhost/api/convert?gbpAmount=100&currency=EUR");
  const data = await (
    await fetchAndStoreConversion(request(), getTestCurrencySettings)
  ).json();
  const standard = data.quotes.find((quote) => quote.planId === "STANDARD");
  assert.equal(standard.costGbp, 100);
  assert.equal(standard.receivedAmount, 118.8);
  assert.equal(standard.feeGbp, 1);
  assert.equal(formatPct(markupFor(standard, 1.2)), "-1.0000%");
  assert.equal(trueCost(1, 100), 1);
  assert.equal(trueCost(-1, 100), 1);
  assert.equal(trueCost(null, 100), null);
  assert.equal(data.quotes.length, 6);
  assert.equal(data.storage.saved, true);
  assert.equal(
    saved[0].quotes.find((q) => q.planId === "STANDARD").markupPct.toFixed(2),
    "-1.00",
  );
  assert.ok(saved[0].fetchedAt instanceof Date);
  wiseUnavailable = true;
  const partial = await (
    await fetchAndStoreConversion(request(), getTestCurrencySettings)
  ).json();
  assert.equal(partial.quotes.length, 5);
  assert.equal(saved[1].midMarketRate, null);
  assert.equal(saved[1].quotes[0].markupPct, null);
  t.mock.method(conversionStore, "save", async () => {
    throw new Error("private connection details");
  });
  const unsaved = await (
    await fetchAndStoreConversion(request(), getTestCurrencySettings)
  ).json();
  assert.equal(unsaved.storage.saved, false);
  assert.equal(unsaved.quotes.length, 5);
  assert.ok(!JSON.stringify(unsaved).includes("private connection details"));
  assert.equal(partial.errors[0].provider, "Wise");
  assert.equal(markupFor(standard, undefined), null);
});
