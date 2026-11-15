import { getDatabase } from "./mongodb.js";

const COLLECTION = "cron_runs";

export const cronRunStore = {
  async save(run) {
    const database = await getDatabase();
    const result = await database.collection(COLLECTION).insertOne(run);
    return result.insertedId.toString();
  },

  async latest(limit = 30) {
    const database = await getDatabase();
    return database
      .collection(COLLECTION)
      .find({})
      .sort({ _id: -1 })
      .limit(limit)
      .toArray();
  },
};
