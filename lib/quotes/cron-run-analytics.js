export function summarizeCronRuns(runs) {
  const durations = runs.map((run) => run.durationMs).filter(Number.isFinite);
  const quotesPerRun = runs.map((run) =>
    Object.values(run.totals?.quotes ?? {}).reduce(
      (total, count) => total + count,
      0,
    ),
  );
  const lastRun = runs[0] ?? null;

  return {
    runCount: runs.length,
    averageDurationMs: durations.length
      ? durations.reduce((total, duration) => total + duration, 0) /
        durations.length
      : null,
    lastDurationMs: Number.isFinite(lastRun?.durationMs)
      ? lastRun.durationMs
      : null,
    averageQuotes: quotesPerRun.length
      ? quotesPerRun.reduce((total, count) => total + count, 0) /
        quotesPerRun.length
      : null,
    lastQuotes: quotesPerRun[0] ?? null,
    lastRunAt:
      lastRun?.startedAt instanceof Date
        ? lastRun.startedAt.toISOString()
        : null,
  };
}

export function providerRunSeries(runs) {
  return [...runs]
    .reverse()
    .map((run) => {
      const providers = new Map();
      for (const job of run.jobs ?? []) {
        for (const result of job.providers ?? []) {
          if (!Number.isFinite(result.durationMs)) continue;
          const entries = providers.get(result.provider) ?? [];
          entries.push(result.durationMs);
          providers.set(result.provider, entries);
        }
      }

      return {
        runAt:
          run.startedAt instanceof Date ? run.startedAt.toISOString() : null,
        ...Object.fromEntries(
          [...providers].map(([provider, durations]) => [
            provider,
            durations.reduce((total, duration) => total + duration, 0) /
              durations.length,
          ]),
        ),
      };
    })
    .filter((run) => run.runAt);
}
