import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SELECTED_PROVIDERS,
  isQuoteProviderSelected,
  resolveQuoteFilters,
  resolveQuoteDate,
  resolveSelectedProviders,
} from "../lib/quotes/quote-filters.js";
import { attachConversionFees } from "../lib/quotes/additional-fees.js";

test("shared page filters preserve country defaults and reject invalid selections", () => {
  const uk = resolveQuoteFilters();
  assert.equal(uk.selectedCurrency, "EUR");
  assert.equal(uk.sourceCurrency, "GBP");
  assert.deepEqual(uk.selectedProviders, DEFAULT_SELECTED_PROVIDERS);
  const ireland = resolveQuoteFilters({
    senderCountry: "IE",
    currency: "usd",
    gbpAmount: "500",
    days: "7",
    providers: "Revolut",
  });
  assert.equal(ireland.sourceCurrency, "EUR");
  assert.equal(ireland.selectedCurrency, "USD");
  assert.equal(ireland.selectedAmount, "500");
  assert.equal(ireland.selectedDays, 7);
  assert.equal(ireland.selectedProviders[0], "Revolut:STANDARD");
  assert.equal(ireland.selectedProviders.length, 5);
  assert.deepEqual(
    resolveQuoteFilters({ providers: "invalid" }).selectedProviders,
    DEFAULT_SELECTED_PROVIDERS,
  );
  assert.deepEqual(
    resolveQuoteFilters({ providers: "Revolut:PLUS" }).selectedProviders,
    ["Revolut:PLUS"],
  );
  assert.equal(
    isQuoteProviderSelected({ provider: "Revolut", planId: "PLUS" }, [
      "Revolut:PLUS",
    ]),
    true,
  );
  assert.equal(
    isQuoteProviderSelected({ provider: "Revolut", planId: "STANDARD" }, [
      "Revolut:PLUS",
    ]),
    false,
  );
  const invalid = resolveQuoteFilters({
    senderCountry: "ES",
    currency: "INVALID",
    gbpAmount: "-1",
    days: "999",
  });
  assert.deepEqual(invalid, uk);
});

test("quote date selection stays nearest to the requested timestamp across filters", () => {
  const quoteDates = [
    "2026-10-16T12:00:00.000Z",
    "2026-10-15T12:00:00.000Z",
    "2026-10-14T12:00:00.000Z",
  ];
  assert.equal(
    resolveQuoteDate("2026-10-15T12:00:00.000Z", quoteDates),
    "2026-10-15T12:00:00.000Z",
  );
  assert.equal(
    resolveQuoteDate("2026-10-15T11:59:00.000Z", quoteDates),
    "2026-10-15T12:00:00.000Z",
  );
  assert.equal(resolveQuoteDate(null, quoteDates), quoteDates[0]);
});

test("provider filter resolution supports plan and provider selections", () => {
  assert.deepEqual(
    resolveSelectedProviders({ providers: "Revolut:PLUS,Wise" }),
    ["Wise", "Revolut:PLUS"],
  );
  assert.deepEqual(
    resolveSelectedProviders({ providers: "Revolut" }),
    DEFAULT_SELECTED_PROVIDERS.filter((provider) =>
      provider.startsWith("Revolut:"),
    ),
  );
  assert.deepEqual(
    resolveSelectedProviders({ providers: "invalid" }),
    DEFAULT_SELECTED_PROVIDERS,
  );
});

test("Send fee enrichment matches the nearest historical conversion and preserves missing comparisons", () => {
  const quote = { provider: "Revolut", planId: "PLUS", feeGbp: 1 };
  const snapshot = {
    currency: "EUR",
    amount: 100,
    fetchedAt: "2026-09-25T00:00:01Z",
    quotes: [quote],
  };
  const conversions = [
    {
      ...snapshot,
      fetchedAt: "2026-09-25T00:00:00Z",
      quotes: [{ ...quote, feeGbp: 2, estimated: true }],
    },
    {
      ...snapshot,
      fetchedAt: "2026-09-25T01:00:00Z",
      quotes: [{ ...quote, feeGbp: 0.5 }],
    },
  ];
  const [result] = attachConversionFees([snapshot], conversions);
  assert.equal(result.quotes[0].additionalFeeGbp, 0);
  assert.equal(result.quotes[0].convertFeeEstimated, true);
  assert.equal(result.quotes[0].convertFeeDate, conversions[0].fetchedAt);
  assert.equal(snapshot.quotes[0].additionalFeeGbp, undefined);
  assert.equal(
    attachConversionFees(
      [snapshot],
      [{ ...conversions[0], amount: 500, fetchedAt: snapshot.fetchedAt }],
    )[0].quotes[0].additionalFeeGbp,
    null,
  );
  assert.equal(
    attachConversionFees(
      [snapshot],
      [{ ...conversions[0], fetchedAt: "2026-09-25T00:10:00Z" }],
    )[0].quotes[0].additionalFeeGbp,
    null,
  );
});
