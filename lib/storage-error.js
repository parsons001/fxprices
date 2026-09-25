// Report actionable categories without exposing driver messages or credentials.
export function storageErrorMessage(error) {
  const name = error?.name ?? "";
  if (error?.code === 18) return "MongoDB authentication failed. Check the database username and password.";
  if (error?.code === 13) return "MongoDB denied the write. Check that the database user has write permission.";
  if (error?.code === 11000) return "MongoDB rejected a duplicate record because of a unique index.";
  if (error?.code === 121) return "MongoDB rejected the quote document because it failed collection validation.";
  if (/Timeout|WaitQueue/i.test(name)) return "MongoDB timed out waiting for a connection or completing the write. Check database load and connectivity.";
  if (/Network|ServerSelection/i.test(name)) return "MongoDB could not be reached reliably. Check network access rules and cluster availability.";
  if (error?.message === "MongoDB is not configured") return "MONGODB_URI is missing from the server environment.";
  if (error?.message === "MongoDB connection unavailable") return "MongoDB connection failed. Check credentials, network access rules and cluster availability.";
  return "MongoDB could not save the quote document. The database error could not be classified safely.";
}
