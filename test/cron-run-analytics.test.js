import { test } from "node:test";
import assert from "node:assert/strict";
import {
  minutesUntilNextHourlyUpdate,
  providerMetricsAcrossRuns,
  providerRunSeries,
  summarizeCronRuns,
} from "../lib/quotes/cron-run-analytics.js";

test("cron overview summarizes average and last-run duration and quotes", () => {
  const runs = [
    {
      startedAt: new Date("2026-11-15T10:00:00.000Z"),
      durationMs: 12000,
      totals: { quotes: { Wise: 4, Revolut: 6 } },
    },
    {
      startedAt: new Date("2026-11-14T10:00:00.000Z"),
      durationMs: 8000,
      totals: { quotes: { Wise: 2, Revolut: 4 } },
    },
  ];

  assert.deepEqual(summarizeCronRuns(runs), {
    runCount: 2,
    averageDurationMs: 10000,
    lastDurationMs: 12000,
    averageQuotes: 8,
    lastQuotes: 10,
    lastRunAt: "2026-11-15T10:00:00.000Z",
  });
});

test("hourly provider update ETA counts up to the next hour", () => {
  assert.equal(minutesUntilNextHourlyUpdate(Date.UTC(2026, 10, 15, 11, 0)), 60);
  assert.equal(
    minutesUntilNextHourlyUpdate(Date.UTC(2026, 10, 15, 11, 35, 1)),
    25,
  );
  assert.equal(
    minutesUntilNextHourlyUpdate(Date.UTC(2026, 10, 15, 11, 59, 59)),
    1,
  );
  assert.throws(() => minutesUntilNextHourlyUpdate(Number.NaN));
});

test("provider run series leaves legacy elapsed timings unknown and preserves chronology", () => {
  const runs = [
    {
      startedAt: new Date("2026-11-15T10:00:00.000Z"),
      providers: [
        {
          provider: "Wise",
          requests: 2,
          successes: 2,
          errors: 0,
          totalDurationMs: 300,
          maxDurationMs: 200,
        },
        {
          provider: "Revolut",
          requests: 1,
          successes: 1,
          errors: 0,
          totalDurationMs: 300,
          maxDurationMs: 300,
        },
      ],
    },
    {
      startedAt: new Date("2026-11-14T10:00:00.000Z"),
      providers: [
        {
          provider: "Wise",
          requests: 1,
          successes: 1,
          errors: 0,
          totalDurationMs: 400,
          maxDurationMs: 400,
        },
      ],
    },
  ];

  assert.deepEqual(providerRunSeries(runs), [
    {
      runAt: "2026-11-14T10:00:00.000Z",
      runDurationMs: null,
      Wise: null,
    },
    {
      runAt: "2026-11-15T10:00:00.000Z",
      runDurationMs: null,
      Wise: null,
      Revolut: null,
    },
  ]);
});

test("provider total time sums every request across all runs", () => {
  const runs = [
    {
      providers: [
        {
          provider: "Wise",
          requests: 1,
          successes: 1,
          errors: 0,
          totalDurationMs: 100,
          maxDurationMs: 100,
        },
      ],
    },
    {
      providers: [
        {
          provider: "Wise",
          requests: 3,
          successes: 2,
          errors: 1,
          totalDurationMs: 900,
          maxDurationMs: 500,
        },
      ],
      failures: [{ provider: "Wise", message: "Request failed" }],
    },
  ];

  assert.deepEqual(providerMetricsAcrossRuns(runs), [
    {
      provider: "Wise",
      requests: 4,
      successes: 3,
      errors: 1,
      totalDurationMs: 1000,
      elapsedDurationMs: null,
      maxDurationMs: 500,
      errorDetails: [
        {
          run: runs[1],
          failure: { provider: "Wise", message: "Request failed" },
        },
      ],
    },
  ]);
});

test("concurrent request totals remain distinct from a 33-second elapsed run", () => {
  const [point] = providerRunSeries([
    {
      startedAt: new Date("2026-11-15T10:00:00.000Z"),
      durationMs: 33000,
      providers: [
        { provider: "Wise", totalDurationMs: 240000, elapsedDurationMs: 32000 },
        {
          provider: "Revolut",
          totalDurationMs: 180000,
          elapsedDurationMs: 30000,
        },
      ],
    },
  ]);
  assert.equal(point.runDurationMs, 33000);
  assert.equal(point.Wise, 32000);
  assert.equal(point.Revolut, 30000);
});

test("provider elapsed totals sum run spans and do not substitute legacy request sums", () => {
  const provider = {
    provider: "Wise",
    requests: 2,
    successes: 2,
    errors: 0,
    totalDurationMs: 60000,
    maxDurationMs: 30000,
    elapsedDurationMs: 33000,
  };
  assert.equal(
    providerMetricsAcrossRuns([
      { providers: [provider] },
      { providers: [provider] },
    ])[0].elapsedDurationMs,
    66000,
  );
  assert.equal(
    providerMetricsAcrossRuns([
      { providers: [provider] },
      { providers: [{ ...provider, elapsedDurationMs: undefined }] },
    ])[0].elapsedDurationMs,
    null,
  );
});
