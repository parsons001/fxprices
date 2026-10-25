export function resolveQuoteDate(requestedDate, quoteDates) {
  if (!quoteDates.length) return "";
  if (quoteDates.includes(requestedDate)) return requestedDate;
  if (typeof requestedDate !== "string" || !requestedDate) return quoteDates[0];

  const requestedTime = new Date(requestedDate).getTime();
  if (!Number.isFinite(requestedTime)) return quoteDates[0];

  return quoteDates.reduce((nearest, candidate) =>
    Math.abs(new Date(candidate).getTime() - requestedTime) <
    Math.abs(new Date(nearest).getTime() - requestedTime)
      ? candidate
      : nearest,
  );
}
