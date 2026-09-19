export function normalizeSnapshots(snapshots = []) {
  return snapshots.map((snapshot) => {
    const safeSnapshot = snapshot ?? {};
    return {
      ...safeSnapshot,
      quotes: Array.isArray(safeSnapshot.quotes) ? safeSnapshot.quotes : [],
      errors: Array.isArray(safeSnapshot.errors) ? safeSnapshot.errors : [],
      storage: safeSnapshot.storage ?? {},
      fetchedAt: safeSnapshot.fetchedAt ?? new Date(0).toISOString(),
    };
  });
}
