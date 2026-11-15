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

export function minutesUntilNextHourlyUpdate(now = Date.now()) {
  if (!Number.isFinite(now)) throw new Error("Current time must be finite");
  const hourMs = 60 * 60 * 1000;
  return Math.ceil((hourMs - (now % hourMs)) / (60 * 1000));
}

export function providerMetricsForRun(run) {
  if (Array.isArray(run.providers)) return run.providers;

  const metrics = new Map();
  for (const job of run.jobs ?? []) {
    for (const result of job.providers ?? []) {
      const metric = metrics.get(result.provider) ?? {
        provider: result.provider,
        requests: 0,
        successes: 0,
        errors: 0,
        totalDurationMs: 0,
        maxDurationMs: 0,
      };
      metric.requests++;
      if (result.status === "success") metric.successes++;
      if (result.status === "failed" || result.error) metric.errors++;
      if (Number.isFinite(result.durationMs)) {
        metric.totalDurationMs += result.durationMs;
        metric.maxDurationMs = Math.max(
          metric.maxDurationMs,
          result.durationMs,
        );
      }
      metrics.set(result.provider, metric);
    }
  }
  return [...metrics.values()].map((metric) => ({
    ...metric,
    averageDurationMs: metric.requests
      ? metric.totalDurationMs / metric.requests
      : null,
  }));
}

export function providerMetricsAcrossRuns(runs) {
  const metrics = new Map();
  for (const run of runs) {
    for (const providerResult of providerMetricsForRun(run)) {
      const metric = metrics.get(providerResult.provider) ?? {
        provider: providerResult.provider,
        requests: 0,
        successes: 0,
        errors: 0,
        totalDurationMs: 0,
        elapsedDurationMs: 0,
        maxDurationMs: 0,
        errorDetails: [],
      };
      metric.requests += providerResult.requests;
      metric.successes += providerResult.successes;
      metric.errors += providerResult.errors;
      metric.totalDurationMs += providerResult.totalDurationMs;
      metric.elapsedDurationMs =
        Number.isFinite(metric.elapsedDurationMs) &&
        Number.isFinite(providerResult.elapsedDurationMs)
          ? metric.elapsedDurationMs + providerResult.elapsedDurationMs
          : null;
      metric.maxDurationMs = Math.max(
        metric.maxDurationMs,
        providerResult.maxDurationMs,
      );
      for (const failure of (run.failures ?? []).filter(
        (entry) => entry.provider === providerResult.provider,
      )) {
        metric.errorDetails.push({ run, failure });
      }
      metrics.set(providerResult.provider, metric);
    }
  }
  return [...metrics.values()].sort((a, b) =>
    a.provider.localeCompare(b.provider),
  );
}

export function providerRunSeries(runs) {
  return [...runs]
    .reverse()
    .map((run) => {
      return {
        runAt:
          run.startedAt instanceof Date ? run.startedAt.toISOString() : null,
        runDurationMs: Number.isFinite(run.durationMs) ? run.durationMs : null,
        ...Object.fromEntries(
          providerMetricsForRun(run).map((provider) => [
            provider.provider,
            Number.isFinite(provider.elapsedDurationMs)
              ? provider.elapsedDurationMs
              : null,
          ]),
        ),
      };
    })
    .filter((run) => run.runAt);
}
