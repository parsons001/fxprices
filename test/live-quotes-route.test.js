import { test } from "node:test";
import assert from "node:assert/strict";
import { getLiveQuotes } from "../app/api/quotes/live/route.js";
import { conversionStore } from "../lib/db/conversion-store.js";
import { sendStore } from "../lib/db/send-store.js";

test("Live quote endpoint requires the cron authorization token", async () => {
  const response = await getLiveQuotes(
    new Request("http://localhost/api/quotes/live"),
    async () => {
      throw new Error("Settings should not be loaded");
    },
  );
  assert.equal(response.status, 401);
});

test("Live quote endpoint returns both quote types without saving them", async (t) => {
  const previousSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "test-token";
  t.after(() => {
    if (previousSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousSecret;
  });
  const conversionSave = t.mock.method(conversionStore, "save");
  const sendSave = t.mock.method(sendStore, "save");
  t.mock.method(globalThis, "fetch", async (url) => {
    const parsed = new URL(url);
    if (parsed.hostname === "wise.com")
      return Response.json([
        {
          payInMethod: "BALANCE",
          payOutMethod: "BALANCE",
          sourceCcy: "GBP",
          targetCcy: "EUR",
          midRate: 1.2,
          targetAmount: 120,
          total: 0,
          sourceAmount: 100,
        },
        {
          payInMethod: "BALANCE",
          payOutMethod: "BANK_TRANSFER",
          sourceCcy: "GBP",
          targetCcy: "EUR",
          midRate: 1.2,
          targetAmount: 120,
          total: 0,
          sourceAmount: 100,
        },
      ]);
    if (parsed.pathname.includes("exchange/quote"))
      return Response.json({
        rate: { rate: 1.2, weekend: false },
        recipient: { currency: "EUR", amount: 12000 },
        plans: [
          {
            id: "STANDARD",
            name: "Standard",
            fees: {
              total: { currency: "GBP", amount: 0 },
              cost: { currency: "GBP", amount: 10000 },
            },
          },
        ],
      });
    return Response.json({
      rate: { from: "GBP", to: "EUR", rate: 1.2 },
      routes: [
        {
          id: "BANK",
          plans: [
            {
              id: "STANDARD",
              name: "Standard",
              fees: { currency: "GBP", total: 0 },
            },
          ],
        },
      ],
    });
  });

  const response = await getLiveQuotes(
    new Request("http://localhost/api/quotes/live?senderCountry=GB", {
      headers: { authorization: "Bearer test-token" },
    }),
    async () => ({
      amounts: [100],
      currencyPairs: [{ sourceCurrency: "GBP", currency: "EUR" }],
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.results.length, 2);
  assert.ok(body.results.some((result) => result.mode === "convert"));
  assert.ok(body.results.some((result) => result.mode === "send"));
  assert.ok(body.results.every((result) => result.quotes.length >= 2));
  assert.ok(body.results.every((result) => !("storage" in result)));
  assert.equal(conversionSave.mock.calls.length, 0);
  assert.equal(sendSave.mock.calls.length, 0);
});
