import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchProviderQuotes } from "../lib/providers/fetch-provider-quotes.js";

test("provider timings cover successful quote fetching", async () => {
  const result = await fetchProviderQuotes("Wise", async () => {
    await new Promise((resolve) => setTimeout(resolve, 5));
    return [{ rate: 1.2 }];
  });

  assert.equal(result.provider, "Wise");
  assert.equal(result.status, "success");
  assert.ok(result.completedAtMs >= result.startedAtMs);
  assert.ok(result.durationMs >= 1);
  assert.deepEqual(result.quotes, [{ rate: 1.2 }]);
});

test("provider failures return timed error details without rejecting", async () => {
  const result = await fetchProviderQuotes("Revolut", async () => {
    throw new Error("Quote unavailable (HTTP 503)");
  });

  assert.equal(result.provider, "Revolut");
  assert.equal(result.status, "failed");
  assert.ok(result.completedAtMs >= result.startedAtMs);
  assert.ok(result.durationMs >= 0);
  assert.equal(result.error, "Quote unavailable (HTTP 503)");
  assert.deepEqual(result.quotes, []);
});
