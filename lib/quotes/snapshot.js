const PROVIDER_ORDER = { Wise: 0, Revolut: 1 };
const REVOLUT_PLAN_ORDER = {
  STANDARD: 0,
  PLUS: 1,
  PREMIUM: 2,
  METAL: 3,
  ULTRA: 4,
};

export function sortQuotesForDisplay(quotes) {
  return [...quotes].sort((a, b) => {
    const providerOrder =
      (PROVIDER_ORDER[a.provider] ?? Number.MAX_SAFE_INTEGER) -
      (PROVIDER_ORDER[b.provider] ?? Number.MAX_SAFE_INTEGER);
    if (providerOrder) return providerOrder;

    const planOrder =
      (REVOLUT_PLAN_ORDER[a.planId] ?? Number.MAX_SAFE_INTEGER) -
      (REVOLUT_PLAN_ORDER[b.planId] ?? Number.MAX_SAFE_INTEGER);
    if (planOrder) return planOrder;

    return (a.planId ?? a.option ?? "").localeCompare(
      b.planId ?? b.option ?? "",
    );
  });
}

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
