// Keep results in input order while limiting active jobs and their working data.
export async function mapConcurrent(jobs, concurrency) {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("Concurrency must be a positive integer");
  }
  const results = new Array(jobs.length);
  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      const index = next++;
      results[index] = await jobs[index]();
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, jobs.length) }, worker),
  );
  return results;
}
