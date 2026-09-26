import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveQuoteFilters } from "../lib/quotes/quote-filters.js";
import { attachConversionFees } from "../lib/quotes/additional-fees.js";

test("shared page filters preserve country defaults and reject invalid selections", () => {
  const uk = resolveQuoteFilters();
  assert.equal(uk.selectedCurrency, "EUR");
  assert.equal(uk.sourceCurrency, "GBP");
  const ireland = resolveQuoteFilters({
    senderCountry: "IE",
    currency: "usd",
    gbpAmount: "500",
    days: "7",
  });
  assert.equal(ireland.sourceCurrency, "EUR");
  assert.equal(ireland.selectedCurrency, "USD");
  assert.equal(ireland.selectedAmount, "500");
  assert.equal(ireland.selectedDays, 7);
  const invalid = resolveQuoteFilters({
    senderCountry: "ES",
    currency: "INVALID",
    gbpAmount: "-1",
    days: "999",
  });
  assert.deepEqual(invalid, uk);
});

test("shared Send fee enrichment matches plans and preserves missing comparisons", () => {
  const quote = { provider: "Revolut", planId: "PLUS", feeGbp: 1 };
  const snapshot = { currency: "EUR", amount: 100, quotes: [quote] };
  const conversions = [
    {
      ...snapshot,
      fetchedAt: "2026-09-25T00:00:00Z",
      quotes: [{ ...quote, feeGbp: 2, estimated: true }],
    },
  ];
  const [result] = attachConversionFees([snapshot], conversions);
  assert.equal(result.quotes[0].additionalFeeGbp, -1);
  assert.equal(result.quotes[0].convertFeeEstimated, true);
  assert.equal(result.quotes[0].convertFeeDate, conversions[0].fetchedAt);
  assert.equal(snapshot.quotes[0].additionalFeeGbp, undefined);
  assert.equal(
    attachConversionFees([snapshot], [{ ...conversions[0], amount: 500 }])[0]
      .quotes[0].additionalFeeGbp,
    null,
  );
});
