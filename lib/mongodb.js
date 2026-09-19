import { MongoClient } from "mongodb";

// Reuse one connection pool, including across development hot reloads.
const state = (globalThis.fxMongo ??= { connection: null });
export async function getDatabase() {
  if (!process.env.MONGODB_URI) throw new Error("MongoDB is not configured");
  if (!state.connection) {
    const client = new MongoClient(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      timeoutMS: 7000,
    });
    state.connection = client.connect().catch(async () => {
      state.connection = null;
      await client.close().catch(() => {});
      throw new Error("MongoDB connection unavailable");
    });
  }
  return (await state.connection).db(process.env.MONGODB_DB || "fxprices_app");
}
