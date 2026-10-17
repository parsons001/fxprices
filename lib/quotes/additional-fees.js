export function matchingQuote(quotes = [], quote) {
  return quotes.find(
    (candidate) =>
      candidate.provider === quote.provider &&
      (quote.provider === "Wise" ||
        (quote.planId && candidate.planId === quote.planId)),
  );
}

export function feeDifference(sendFee, convertFee) {
  if (!Number.isFinite(sendFee) || !Number.isFinite(convertFee)) return null;
  return Math.max(0, Math.round((sendFee - convertFee) * 100) / 100);
}

const MAX_CONVERSION_SNAPSHOT_GAP_MS = 5 * 60 * 1000;

function nearestConversion(conversions, snapshot) {
  const market = conversions.get(`${snapshot.currency}:${snapshot.amount}`);
  const timestamp = new Date(snapshot.fetchedAt).getTime();
  if (!market || !Number.isFinite(timestamp)) return null;

  let low = 0;
  let high = market.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (new Date(market[middle].fetchedAt).getTime() < timestamp)
      low = middle + 1;
    else high = middle;
  }

  const before = market[low - 1];
  const after = market[low];
  const candidates = [before, after].filter(Boolean);
  const nearest = candidates.reduce((best, candidate) => {
    const gap = Math.abs(new Date(candidate.fetchedAt).getTime() - timestamp);
    return !best || gap < best.gap ? { candidate, gap } : best;
  }, null);

  return nearest?.gap <= MAX_CONVERSION_SNAPSHOT_GAP_MS
    ? nearest.candidate
    : null;
}

export function attachConversionFees(snapshots, conversions) {
  const conversionsByMarket = new Map();
  for (const conversion of conversions) {
    const key = `${conversion.currency}:${conversion.amount}`;
    const market = conversionsByMarket.get(key) ?? [];
    market.push(conversion);
    conversionsByMarket.set(key, market);
  }
  for (const market of conversionsByMarket.values()) {
    market.sort(
      (a, b) =>
        new Date(a.fetchedAt).getTime() - new Date(b.fetchedAt).getTime(),
    );
  }

  return snapshots.map((snapshot) => {
    const convert = nearestConversion(conversionsByMarket, snapshot);
    return {
      ...snapshot,
      quotes: (snapshot.quotes ?? []).map((quote) => {
        const match = matchingQuote(convert?.quotes, quote);
        return {
          ...quote,
          additionalFeeGbp: feeDifference(quote.feeGbp, match?.feeGbp),
          convertFeeDate: match ? convert.fetchedAt : null,
          convertFeeEstimated: Boolean(match?.estimated),
        };
      }),
    };
  });
}

export function additionalFeeRows(sendSnapshots, convertSnapshots) {
  const conversions = new Map(
    convertSnapshots.map((snapshot) => [
      `${snapshot.currency}:${snapshot.amount}`,
      snapshot,
    ]),
  );
  return sendSnapshots
    .flatMap((send) => {
      const convert = conversions.get(`${send.currency}:${send.amount}`);
      return (send.quotes ?? []).map((quote) => {
        const match = matchingQuote(convert?.quotes, quote);
        const sendFee = Number.isFinite(quote.feeGbp) ? quote.feeGbp : null;
        const convertFee = Number.isFinite(match?.feeGbp) ? match.feeGbp : null;
        return {
          currency: send.currency,
          amount: send.amount,
          provider: quote.provider,
          plan: quote.provider === "Wise" ? "Balance" : quote.option,
          sendFee,
          convertFee,
          additionalFee: feeDifference(sendFee, convertFee),
          estimated: Boolean(quote.estimated || match?.estimated),
          sendDate: send.fetchedAt,
          convertDate: match ? convert.fetchedAt : null,
        };
      });
    })
    .sort(
      (a, b) =>
        a.currency.localeCompare(b.currency) ||
        a.amount - b.amount ||
        a.provider.localeCompare(b.provider) ||
        a.plan.localeCompare(b.plan),
    );
}
