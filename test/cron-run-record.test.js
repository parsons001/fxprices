import { test } from "node:test";
import assert from "node:assert/strict";
import { createCronRunRecord } from "../lib/quotes/cron-run-record.js";

test("cron run records retain aggregate results without storing job arrays", () => {
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
  assert.equal(Object.hasOwn(run, "jobs"), false);
  assert.deepEqual(run.providers, [
    {
      provider: "Wise",
      requests: 1,
      successes: 0,
      errors: 1,
      totalDurationMs: 120,
      maxDurationMs: 120,
      averageDurationMs: 120,
      elapsedDurationMs: null,
    },
    {
      provider: "Revolut",
      requests: 1,
      successes: 1,
      errors: 0,
      totalDurationMs: 250,
      maxDurationMs: 250,
      averageDurationMs: 250,
      elapsedDurationMs: null,
    },
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
  assert.equal(Object.hasOwn(run, "jobs"), false);
});

test("provider elapsed time spans overlapping and queued jobs including failures", () => {
  const results = [
    {
      provider: "Wise",
      status: "success",
      startedAtMs: 100,
      completedAtMs: 20100,
      durationMs: 20000,
    },
    {
      provider: "Wise",
      status: "failed",
      startedAtMs: 10100,
      completedAtMs: 30100,
      durationMs: 20000,
    },
    {
      provider: "Wise",
      status: "success",
      startedAtMs: 31100,
      completedAtMs: 32100,
      durationMs: 1000,
    },
    {
      provider: "Revolut",
      status: "success",
      startedAtMs: 200,
      completedAtMs: 5200,
      durationMs: 5000,
    },
  ];
  const run = createCronRunRecord({
    updates: results
      .reverse()
      .map((result) => ({ result: { providerResults: [result] } })),
  });
  const wise = run.providers.find((p) => p.provider === "Wise");
  assert.equal(wise.elapsedDurationMs, 32000);
  assert.equal(wise.totalDurationMs, 41000);
  assert.equal(wise.errors, 1);
  assert.equal(
    run.providers.find((p) => p.provider === "Revolut").elapsedDurationMs,
    5000,
  );
  assert.equal(Object.hasOwn(run, "jobs"), false);
});
