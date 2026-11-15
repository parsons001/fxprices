export function createCronRunRecord({
  startedAt,
  completedAt,
  durationMs,
  countries,
  status,
  updates = [],
  quoteCounts = { Wise: 0, Revolut: 0 },
  failures = [],
  error = null,
  settings = null,
}) {
  const providerMetrics = new Map();
  for (const { result } of updates) {
    for (const providerResult of result?.providerResults ?? []) {
      const metric = providerMetrics.get(providerResult.provider) ?? {
        provider: providerResult.provider,
        requests: 0,
        successes: 0,
        errors: 0,
        totalDurationMs: 0,
        maxDurationMs: 0,
        firstStartedAtMs: Infinity,
        lastCompletedAtMs: -Infinity,
        timedRequests: 0,
      };
      if (
        Number.isFinite(providerResult.startedAtMs) &&
        Number.isFinite(providerResult.completedAtMs) &&
        providerResult.completedAtMs >= providerResult.startedAtMs
      ) {
        metric.firstStartedAtMs = Math.min(
          metric.firstStartedAtMs,
          providerResult.startedAtMs,
        );
        metric.lastCompletedAtMs = Math.max(
          metric.lastCompletedAtMs,
          providerResult.completedAtMs,
        );
        metric.timedRequests++;
      }
      metric.requests++;
      if (providerResult.status === "success") metric.successes++;
      if (providerResult.status === "failed" || providerResult.error)
        metric.errors++;
      if (Number.isFinite(providerResult.durationMs)) {
        metric.totalDurationMs += providerResult.durationMs;
        metric.maxDurationMs = Math.max(
          metric.maxDurationMs,
          providerResult.durationMs,
        );
      }
      providerMetrics.set(providerResult.provider, metric);
    }
  }
  const providers = [...providerMetrics.values()].map(
    ({ firstStartedAtMs, lastCompletedAtMs, timedRequests, ...metric }) => ({
      ...metric,
      elapsedDurationMs:
        timedRequests === metric.requests
          ? lastCompletedAtMs - firstStartedAtMs
          : null,
      averageDurationMs: metric.requests
        ? metric.totalDurationMs / metric.requests
        : null,
    }),
  );

  return {
    startedAt,
    completedAt,
    durationMs,
    countries,
    status,
    settings,
    totals: {
      jobs: updates.length,
      quotes: { ...quoteCounts },
      failures: failures.length,
    },
    providers,
    failures,
    ...(error ? { error } : {}),
  };
}
