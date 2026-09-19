import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeSnapshots } from "../lib/snapshot.js";
import { money } from "../lib/format.js";
import { conversionStore } from "../lib/conversion-store.js";
import { GET } from "../app/api/convert/route.js";

test("Public route only reads saved snapshots and filters them", async (t) => {
  t.mock.method(globalThis, "fetch", () => {
    throw new Error("Must not fetch new quotes");
  });
  t.mock.method(conversionStore, "save", () => {
    throw new Error("Must not write");
  });
  t.mock.method(conversionStore, "latest", async () => [
    { currency: "EUR", amount: 100 },
    { currency: "USD", amount: 100 },
    { currency: "EUR", amount: 500 },
  ]);
  const response = await GET(
    new Request("http://localhost/api/convert?currency=EUR&gbpAmount=100"),
  );
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).snapshots, [
    { currency: "EUR", amount: 100 },
  ]);
  assert.equal(response.headers.get("cache-control"), "no-store");
  t.mock.method(conversionStore, "latest", async () => {
    throw new Error("Private details");
  });
  const failed = await GET(new Request("http://localhost/api/convert"));
  assert.equal(failed.status, 503);
  assert.ok(!(await failed.text()).includes("Private details"));
});

test("Saved snapshots are normalized for incomplete data", () => {
  const normalized = normalizeSnapshots([
    {
      currency: "EUR",
      amount: 100,
      fetchedAt: "2024-01-02T03:04:05.000Z",
    },
  ]);
  assert.deepEqual(normalized[0].quotes, []);
  assert.deepEqual(normalized[0].errors, []);
  assert.deepEqual(normalized[0].storage, {});
});

test("Currency formatting stays stable across runtimes", () => {
  assert.equal(money(36913.62, "PKR"), "PKR 36,913.62");
  assert.equal(money(10000, "JPY"), "JP¥10,000");
});
