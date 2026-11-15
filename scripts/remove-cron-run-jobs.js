import { MongoClient } from "mongodb";
import { providerMetricsForRun } from "../lib/quotes/cron-run-analytics.js";

if (!process.env.MONGODB_URI) throw new Error("MongoDB is not configured");
const client = new MongoClient(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
});

try {
  await client.connect();
  const collection = client
    .db(process.env.MONGODB_DB || "fxprices_app")
    .collection("cron_runs");
  let modified = 0;
  for await (const run of collection.find(
    { jobs: { $exists: true } },
    { projection: { jobs: 1, providers: 1 } },
  )) {
    // Preserve provider aggregates in older records before removing their jobs.
    const update = { $unset: { jobs: "" } };
    if (!Array.isArray(run.providers)) {
      update.$set = { providers: providerMetricsForRun(run) };
    }
    const result = await collection.updateOne({ _id: run._id }, update);
    modified += result.modifiedCount;
  }
  const remaining = await collection.countDocuments({
    jobs: { $exists: true },
  });
  console.log(JSON.stringify({ modified, remaining }));
  if (remaining) process.exitCode = 1;
} catch (error) {
  console.error("Cron run cleanup failed:", error.name, error.code ?? "");
  process.exitCode = 1;
} finally {
  await client.close();
}
