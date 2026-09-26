import { test } from "node:test";
import assert from "node:assert/strict";
import { storageErrorMessage } from "../lib/db/storage-error.js";
import { createWriteQueue } from "../lib/db/write-queue.js";

test("storage diagnostics classify errors without exposing private driver details", () => {
  for (const [error, pattern] of [
    [{ code: 18 }, /authentication/],
    [{ code: 13 }, /permission/],
    [{ code: 11000 }, /duplicate/],
    [{ code: 121 }, /validation/],
    [{ name: "MongoOperationTimeoutError" }, /timed out/],
    [{ name: "MongoNetworkError" }, /network/],
    [{}, /could not be classified/],
  ]) {
    const message = storageErrorMessage({
      ...error,
      message: "private credentials",
    });
    assert.match(message, pattern);
    assert.ok(!message.includes("private credentials"));
  }
});

test("write queue limits concurrency and continues after failed writes", async () => {
  const run = createWriteQueue(3);
  let active = 0,
    peak = 0;
  const results = await Promise.allSettled(
    Array.from({ length: 30 }, (_, i) =>
      run(async () => {
        active++;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 1));
        active--;
        if (i === 2) throw new Error("write failed");
        return i;
      }),
    ),
  );
  assert.equal(peak, 3);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 29);
  assert.equal(await run(async () => "still working"), "still working");
});
