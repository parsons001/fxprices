import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchAndStoreConversion } from "../lib/providers/fetch-conversion.js";
import { fetchAndStoreSend } from "../lib/providers/fetch-send.js";
import {
  conversionStore,
  conversionDocument,
  countryMatch,
} from "../lib/db/conversion-store.js";
import { sendStore } from "../lib/db/send-store.js";
import { targetCurrencies } from "../lib/config/sender-countries.js";

test("Country storage separates EUR markets while retaining legacy UK snapshots", () => {
  assert.deepEqual(countryMatch("IE"), { senderCountry: "IE" });
  assert.equal(countryMatch("GB").$or[1].sourceCurrency, "GBP");
  assert.deepEqual(targetCurrencies(["EUR", "USD"], "IE"), ["USD", "GBP"]);
  const doc = conversionDocument({
    senderCountry: "IE",
    sourceCurrency: "EUR",
    currency: "GBP",
    amount: 100,
    fetchedAt: new Date().toISOString(),
    quotes: [],
    errors: [],
  });
  assert.equal(doc.senderCountry, "IE");
  assert.equal(doc.sourceCurrency, "EUR");
});
test("Ireland requests EUR quotes with correct account country and EUR paid-plan estimates", async (t) => {
  t.mock.method(conversionStore, "save", async () => "id");
  t.mock.method(sendStore, "save", async () => "id");
  for (const country of ["IE"]) {
    t.mock.method(globalThis, "fetch", async (url) => {
      const u = new URL(url);
      if (u.hostname === "wise.com") {
        assert.equal(u.searchParams.get("sourceCurrency"), "EUR");
        assert.equal(u.searchParams.get("profileCountry"), country);
        return Response.json(
          ["BALANCE", "BANK_TRANSFER"].map((payOutMethod) => ({
            payInMethod: "BALANCE",
            payOutMethod,
            sourceCcy: "EUR",
            targetCcy: "GBP",
            midRate: 0.85,
            total: 1,
            sourceAmount: 100,
            targetAmount: 84.15,
          })),
        );
      }
      if (u.pathname.includes("remittance")) {
        assert.equal(u.searchParams.get("senderCountry"), country);
        assert.equal(u.searchParams.get("senderCurrency"), "EUR");
        assert.equal(u.searchParams.get("recipientCountry"), "GB");
        return Response.json({
          rate: { from: "EUR", to: "GBP", rate: 0.85 },
          routes: [
            {
              id: "BANK",
              plans: [
                {
                  id: "STANDARD",
                  name: "Standard",
                  fees: { currency: "EUR", total: 100 },
                },
              ],
            },
          ],
        });
      }
      assert.equal(u.searchParams.get("country"), country);
      assert.equal(u.searchParams.get("fromCurrency"), "EUR");
      return Response.json({
        rate: { rate: 0.85 },
        recipient: { currency: "GBP", amount: 8500 },
        plans: [
          {
            id: "STANDARD",
            name: "Standard",
            fees: {
              total: { currency: "EUR", amount: 100 },
              cost: { currency: "EUR", amount: 10100 },
            },
          },
        ],
      });
    });
    for (const update of [fetchAndStoreConversion, fetchAndStoreSend]) {
      const result = await (
        await update(
          new Request(
            `http://localhost/?senderCountry=${country}&currency=GBP&amount=100`,
          ),
        )
      ).json();
      assert.deepEqual(result.errors, []);
      assert.equal(
        result.quotes.length,
        update === fetchAndStoreConversion ? 6 : 2,
      );
      assert.equal(result.quotes[1].receivedAmount, 84.15);
      assert.equal(result.sourceCurrency, "EUR");
    }
  }
});

test("Spain profiles are rejected before fetching or saving quotes", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Must not fetch");
  });
  for (const update of [fetchAndStoreConversion, fetchAndStoreSend]) {
    const response = await update(
      new Request("http://localhost/?senderCountry=ES&currency=GBP&amount=100"),
    );
    assert.equal(response.status, 400);
  }
  assert.equal(globalThis.fetch.mock.callCount(), 0);
});
