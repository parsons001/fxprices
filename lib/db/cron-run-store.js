import { getDatabase } from "./mongodb.js";

const COLLECTION = "cron_runs";

export const cronRunStore = {
  async save(run) {
    const database = await getDatabase();
    const { jobs, ...record } = run;
    const result = await database.collection(COLLECTION).insertOne(record);
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
