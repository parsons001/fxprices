import {
  conversionStore,
  conversionDocument,
} from "../lib/db/conversion-store.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchAndStoreConversion as GET } from "../lib/providers/fetch-conversion.js";
import { GET as metadata } from "../app/api/convert/meta/route.js";
import { markupFor, formatPct } from "../lib/utils/format.js";

test("Conversion metadata and validation remain compatible", async () => {
  const meta = await metadata().json();
  assert.equal(meta.currencies.length, 14);
  assert.equal(meta.amountsGbp.length, 5);
  const response = await GET(
    new Request("http://localhost/api/convert?currency=INVALID"),
  );
  assert.equal(response.status, 400);
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
  const data = await (await GET(request())).json();
  const standard = data.quotes.find((quote) => quote.planId === "STANDARD");
  assert.equal(standard.costGbp, 100);
  assert.equal(standard.receivedAmount, 118.8);
  assert.equal(standard.feeGbp, 1);
  assert.equal(formatPct(markupFor(standard, 1.2)), "-1.00%");
  assert.equal(data.quotes.length, 6);
  assert.equal(data.storage.saved, true);
  assert.equal(
    saved[0].quotes.find((q) => q.planId === "STANDARD").markupPct.toFixed(2),
    "-1.00",
  );
  assert.ok(saved[0].fetchedAt instanceof Date);
  wiseUnavailable = true;
  const partial = await (await GET(request())).json();
  assert.equal(partial.quotes.length, 5);
  assert.equal(saved[1].midMarketRate, null);
  assert.equal(saved[1].quotes[0].markupPct, null);
  t.mock.method(conversionStore, "save", async () => {
    throw new Error("private connection details");
  });
  const unsaved = await (await GET(request())).json();
  assert.equal(unsaved.storage.saved, false);
  assert.equal(unsaved.quotes.length, 5);
  assert.ok(!JSON.stringify(unsaved).includes("private connection details"));
  assert.equal(partial.errors[0].provider, "Wise");
  assert.equal(markupFor(standard, undefined), null);
});
