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
  const jobs = updates.map(
    ({
      context,
      result,
      error: jobError,
      durationMs: jobDurationMs,
      summary,
    }) => ({
      ...context,
      durationMs: jobDurationMs,
      status: jobError
        ? "failed"
        : summary.failures.length
          ? "partial"
          : "success",
      quotes: summary.quotes,
      failures: summary.failures,
      providers: result?.providerResults ?? [],
      providerErrors: (result?.errors ?? []).map(({ provider, message }) => ({
        provider,
        message,
      })),
      storage: result?.storage
        ? {
            saved: result.storage.saved === true,
            error: result.storage.error ?? null,
          }
        : null,
      ...(jobError ? { error: jobError } : {}),
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
      jobs: jobs.length,
      quotes: { ...quoteCounts },
      failures: failures.length,
    },
    jobs,
    failures,
    ...(error ? { error } : {}),
  };
}
