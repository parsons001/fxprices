import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeQuoteUpdate } from "../lib/quote-update-result.js";
const context = { mode: "send", senderCountry: "GB", sourceCurrency: "GBP", currency: "EUR", amount: 1000 };
const quotes = [{ provider: "Wise" }, { provider: "Revolut" }, { provider: "Revolut" }];
test("update summary counts saved provider quotes without returning quote data", () => {
  assert.deepEqual(summarizeQuoteUpdate(context, { quotes, storage: { saved: true } }), {
    quotes: { Wise: 1, Revolut: 2 }, failures: [],
  });
});
test("partial provider failures retain the affected market and reason", () => {
  const result = summarizeQuoteUpdate(context, { quotes: quotes.slice(1), storage: { saved: true }, errors: [{ provider: "Wise", message: "Quote unavailable (HTTP 503)" }] });
  assert.deepEqual(result.quotes, { Wise: 0, Revolut: 2 });
  const failure = result.failures[0];
  assert.equal(failure.provider, "Wise");
  assert.equal(failure.amount, 1000);
  assert.match(failure.message, /bank-transfer quotes for 1000 GBP → EUR/);
  assert.match(failure.message, /service was unavailable/);
  assert.match(failure.message, /2 quotes were saved/);
});
test("storage failures do not count unsaved quotes", () => {
  const result = summarizeQuoteUpdate(context, { quotes, storage: { saved: false, error: "Could not save to MongoDB" } });
  assert.deepEqual(result.quotes, { Wise: 0, Revolut: 0 });
  assert.equal(result.failures[0].stage, "storage");
  assert.match(result.failures[0].message, /Could not save to MongoDB/);
  assert.match(result.failures[0].message, /0 quotes were saved/);
});
test("unexpected failures retain context and bound error size", () => {
  const result = summarizeQuoteUpdate(context, { error: "x".repeat(2000) });
  assert.equal(result.failures[0].stage, "update");
  assert.equal(result.failures[0].senderCountry, "GB");
  assert.ok(result.failures[0].message.length <= 1000);
  assert.match(result.failures[0].message, /storage could not be confirmed/);
});

test("response size stays bounded for large batches, Unicode and JSON escaping", async () => {
  const { serializeUpdateResponse, MAX_UPDATE_RESPONSE_BYTES } = await import("../lib/quote-update-result.js");
  for (const message of ["x".repeat(1000), "😀".repeat(1000), "\u0000\n\"".repeat(1000)]) {
    const failures = Array.from({ length: 10000 }, () => ({ ...context, message }));
    const serialized = serializeUpdateResponse({ Wise: 0, Revolut: 0 }, failures);
    assert.ok(Buffer.byteLength(serialized, "utf8") <= MAX_UPDATE_RESPONSE_BYTES);
    const body = JSON.parse(serialized);
    assert.equal(body.success, false);
    assert.equal(body.failureCount, failures.length);
    assert.equal(body.failures.length + body.omittedFailureCount, failures.length);
    assert.ok(body.omittedFailureCount > 0);
  }
});

test("small responses retain all details and success stays minimal", async () => {
  const { serializeUpdateResponse } = await import("../lib/quote-update-result.js");
  const counts = { Wise: 420, Revolut: 2100 };
  assert.deepEqual(JSON.parse(serializeUpdateResponse(counts, [])), { success: true, quotes: counts });
  const failures = [{ ...context, message: "Provider unavailable" }];
  const body = JSON.parse(serializeUpdateResponse(counts, failures));
  assert.deepEqual(body.failures, failures);
  assert.equal(body.omittedFailureCount, 0);
});
