import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseQuoteExclusions,
  isQuoteExcluded,
} from "../lib/config/quote-exclusions.js";
import { updateSend } from "../lib/providers/fetch-send.js";

const context = {
  provider: "Revolut",
  amount: 100,
  sourceCurrency: "JPY",
  currency: "JPY",
};

test("exclusions match every field and can be disabled or replaced", () => {
  assert.deepEqual(parseQuoteExclusions(), []);
  assert.equal(isQuoteExcluded({}, context), false);
  const configured = { quoteExclusions: parseQuoteExclusions([context]) };
  assert.equal(isQuoteExcluded(configured, context), true);
  for (const senderCountry of ["GB", "IE"]) {
    for (const mode of ["send", "convert"]) {
      assert.equal(
        isQuoteExcluded(configured, { ...context, senderCountry, mode }),
        true,
      );
    }
  }
  for (const [field, value] of Object.entries({
    provider: "Wise",
    amount: 1000,
    sourceCurrency: "GBP",
    currency: "EUR",
  })) {
    assert.equal(
      isQuoteExcluded(configured, { ...context, [field]: value }),
      false,
    );
  }
  assert.equal(
    isQuoteExcluded({ quoteExclusions: parseQuoteExclusions([]) }, context),
    false,
  );
  const custom = { ...context, amount: 500 };
  const settings = { quoteExclusions: parseQuoteExclusions([custom]) };
  assert.equal(isQuoteExcluded(settings, custom), true);
  assert.equal(isQuoteExcluded(settings, context), false);
});

test("invalid exclusion rules fail configuration validation", () => {
  for (const value of [
    null,
    {},
    [null],
    [{}],
    [{ ...context, amount: "100" }],
    [{ ...context, mode: "send" }],
    [{ ...context, typo: true }],
    [{ ...context, senderCountry: "GB" }],
  ]) {
    assert.throws(() => parseQuoteExclusions(value), /FX_QUOTE_EXCLUSIONS/);
  }
});

test("excluded Revolut send makes no request or error while Wise still runs", async (t) => {
  const urls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    urls.push(String(url));
    return {
      ok: true,
      json: async () => [
        {
          payInMethod: "BALANCE",
          payOutMethod: "BANK_TRANSFER",
          sourceCcy: "JPY",
          targetCcy: "JPY",
          sourceAmount: 100,
          targetAmount: 99,
          total: 1,
          midRate: 1,
        },
      ],
    };
  });
  const result = await updateSend({
    amount: 100,
    sourceCurrency: "JPY",
    currency: "JPY",
    senderCountry: "GB",
    persist: false,
    settings: {
      quoteExclusions: parseQuoteExclusions([context]),
      amounts: [100],
      currencyPairs: { GB: [{ sourceCurrency: "JPY", currency: "JPY" }] },
    },
  });
  assert.equal(urls.length, 1);
  assert.ok(urls[0].startsWith("https://wise.com/"));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(
    result.providerResults.map((p) => p.provider),
    ["Wise"],
  );
  assert.equal(result.quotes.length, 1);
});
