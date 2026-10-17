import { test } from "node:test";
import assert from "node:assert/strict";
import { mapConcurrent } from "../lib/utils/map-concurrent.js";

test("batch workers bound concurrency and preserve input order", async () => {
  let active = 0,
    peak = 0;
  const jobs = Array.from({ length: 60 }, (_, index) => async () => {
    active++;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, index % 3));
    active--;
    return index;
  });
  assert.deepEqual(
    await mapConcurrent(jobs, 8),
    Array.from({ length: 60 }, (_, i) => i),
  );
  assert.equal(peak, 8);
  assert.deepEqual(await mapConcurrent([], 8), []);
  await assert.rejects(mapConcurrent(jobs, 0));
});
