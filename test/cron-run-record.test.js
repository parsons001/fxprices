import { test } from "node:test";
import assert from "node:assert/strict";
import { createCronRunRecord } from "../lib/quotes/cron-run-record.js";

test("cron run records retain aggregate results and per-job diagnostics", () => {
  const startedAt = new Date("2026-11-15T10:00:00.000Z");
  const completedAt = new Date("2026-11-15T10:00:12.000Z");
  const run = createCronRunRecord({
    startedAt,
    completedAt,
    durationMs: 12000,
    countries: ["GB"],
    status: "partial",
    updates: [
      {
        context: {
          mode: "convert",
          senderCountry: "GB",
          sourceCurrency: "GBP",
          currency: "EUR",
          amount: 100,
        },
        result: {
          errors: [{ provider: "Wise", message: "Quote unavailable" }],
          providerResults: [
            {
              provider: "Wise",
              status: "failed",
              durationMs: 120,
              error: "Quote unavailable",
            },
            { provider: "Revolut", status: "success", durationMs: 250 },
          ],
          storage: { saved: true },
        },
        durationMs: 250,
        summary: {
          quotes: { Wise: 0, Revolut: 4 },
          failures: [
            {
              stage: "provider",
              provider: "Wise",
              message: "Wise unavailable",
            },
          ],
        },
      },
    ],
    quoteCounts: { Wise: 0, Revolut: 4 },
    failures: [{ stage: "provider", provider: "Wise" }],
    settings: { amountCount: 2, pairCount: 1 },
  });

  assert.equal(run.status, "partial");
  assert.deepEqual(run.totals, {
    jobs: 1,
    quotes: { Wise: 0, Revolut: 4 },
    failures: 1,
  });
  assert.equal(run.jobs[0].durationMs, 250);
  assert.equal(run.jobs[0].status, "partial");
  assert.deepEqual(run.jobs[0].providerErrors, [
    { provider: "Wise", message: "Quote unavailable" },
  ]);
  assert.deepEqual(run.jobs[0].providers, [
    {
      provider: "Wise",
      status: "failed",
      durationMs: 120,
      error: "Quote unavailable",
    },
    { provider: "Revolut", status: "success", durationMs: 250 },
  ]);
});

test("cron run records support failures before quote jobs start", () => {
  const run = createCronRunRecord({
    startedAt: new Date(),
    completedAt: new Date(),
    durationMs: 12,
    countries: ["GB", "IE"],
    status: "failed",
    error: "Configuration unavailable",
  });

  assert.equal(run.status, "failed");
  assert.equal(run.error, "Configuration unavailable");
  assert.equal(run.totals.jobs, 0);
  assert.deepEqual(run.jobs, []);
});
