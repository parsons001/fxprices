import { test } from "node:test";
import assert from "node:assert/strict";
import {
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

test("provider run series averages timings per provider and preserves chronology", () => {
  const runs = [
    {
      startedAt: new Date("2026-11-15T10:00:00.000Z"),
      jobs: [
        {
          providers: [
            { provider: "Wise", durationMs: 100 },
            { provider: "Revolut", durationMs: 300 },
          ],
        },
        { providers: [{ provider: "Wise", durationMs: 200 }] },
      ],
    },
    {
      startedAt: new Date("2026-11-14T10:00:00.000Z"),
      jobs: [{ providers: [{ provider: "Wise", durationMs: 400 }] }],
    },
  ];

  assert.deepEqual(providerRunSeries(runs), [
    {
      runAt: "2026-11-14T10:00:00.000Z",
      Wise: 400,
    },
    {
      runAt: "2026-11-15T10:00:00.000Z",
      Wise: 150,
      Revolut: 300,
    },
  ]);
});
