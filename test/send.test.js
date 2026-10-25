import { test } from "node:test";
import assert from "node:assert/strict";
import {
  wiseSendQuotes,
  revolutSendQuotes,
  fetchAndStoreSend,
} from "../lib/providers/fetch-send.js";
import { sendStore } from "../lib/db/send-store.js";
import { conversionDocument } from "../lib/db/conversion-store.js";
import { getTestCurrencySettings } from "./currency-settings-fixture.js";

const wise = [
  {
    payInMethod: "BALANCE",
    payOutMethod: "BANK_TRANSFER",
    sourceCcy: "GBP",
    targetCcy: "EUR",
    sourceAmount: 100,
    targetAmount: 118.8,
    total: 1,
    midRate: 1.2,
  },
];
const revolut = {
  rate: { from: "GBP", to: "EUR", rate: 1.2 },
  routes: [
    { id: "INTERNAL", plans: [] },
    {
      id: "BANK",
      plans: [
        {
          id: "STANDARD",
          name: "Standard",
          fees: { currency: "GBP", total: 100, transfer: 50, fx: 50 },
        },
      ],
    },
  ],
};
test("Send selects balance-to-bank and bank route, deducting quoted fees once", () => {
  assert.equal(wiseSendQuotes(wise, "EUR")[0].receivedAmount, 118.8);
  const q = revolutSendQuotes(revolut, "EUR", 100)[0];
  assert.equal(q.receivedAmount, 118.8);
  assert.equal(q.feeGbp, 1);
  assert.equal(q.costGbp, 100);
  assert.equal(q.transferFeeGbp, 0.5);
  assert.equal(q.calculated, true);
  assert.throws(() =>
    wiseSendQuotes([{ ...wise[0], payOutMethod: "BALANCE" }], "EUR"),
  );
  assert.throws(() => revolutSendQuotes(revolut, "JPY", 100));
});
test("Send uses separate storage, country routing, amount units and provider errors", async (t) => {
  const saved = [];
  t.mock.method(sendStore, "save", async (result) => {
    saved.push(conversionDocument(result));
    return "send-id";
  });
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(options.cache, "no-store");
    const u = new URL(url);
    if (u.hostname === "wise.com") {
      assert.equal(u.searchParams.get("sourceAmount"), "100");
      return Response.json(wise);
    }
    assert.equal(u.searchParams.get("amount"), "10000");
    assert.equal(u.searchParams.get("recipientCountry"), "ES");
    assert.equal(options.headers["locale-code"], "en-GB");
    return Response.json(revolut);
  });
  const request = () =>
    new Request("http://localhost/api/send?currency=EUR&gbpAmount=100");
  const result = await (
    await fetchAndStoreSend(request(), getTestCurrencySettings)
  ).json();
  assert.equal(result.quotes.length, 2);
  assert.equal(result.storage.saved, true);
  assert.equal(saved[0].recipientCountry, "ES");
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({}, { status: 503 }),
  );
  const failed = await (
    await fetchAndStoreSend(request(), getTestCurrencySettings)
  ).json();
  assert.equal(failed.errors.length, 2);
  assert.equal(failed.storage.saved, true);
});

test("Send quote ingestion returns service unavailable when settings fail", async () => {
  const response = await fetchAndStoreSend(
    new Request("http://localhost/api/send"),
    async () => {
      throw new Error("Private Global Config detail");
    },
  );
  assert.equal(response.status, 503);
  assert.equal(
    (await response.json()).error,
    "Quote configuration is unavailable.",
  );
});

test("Send ingestion defaults to an amount from Global Config", async (t) => {
  t.mock.method(sendStore, "save", async () => "send-id");
  t.mock.method(globalThis, "fetch", async (url) => {
    const parsed = new URL(url);
    if (parsed.hostname === "wise.com") {
      assert.equal(parsed.searchParams.get("sourceAmount"), "250");
      return Response.json([
        {
          payInMethod: "BALANCE",
          payOutMethod: "BANK_TRANSFER",
          sourceCcy: "GBP",
          targetCcy: "EUR",
          midRate: 1.2,
          total: 0,
          sourceAmount: 250,
          targetAmount: 300,
        },
      ]);
    }
    return Response.json({}, { status: 503 });
  });
  const settings = await getTestCurrencySettings();
  const response = await fetchAndStoreSend(
    new Request("http://localhost/api/send?currency=EUR"),
    async () => ({ ...settings, amounts: [250, 500] }),
  );
  const result = await response.json();
  assert.equal(result.amount, 250);
  assert.equal(result.quotes[0].provider, "Wise");
});
