import { performance } from "node:perf_hooks";

export async function fetchProviderQuotes(provider, fetchQuotes) {
  const startedAt = performance.now();
  try {
    const quotes = await fetchQuotes();
    return {
      provider,
      status: "success",
      durationMs: performance.now() - startedAt,
      quotes,
    };
  } catch (error) {
    return {
      provider,
      status: "failed",
      durationMs: performance.now() - startedAt,
      quotes: [],
      error: error?.message ?? String(error),
    };
  }
}
