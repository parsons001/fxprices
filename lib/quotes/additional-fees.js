export function matchingQuote(quotes = [], quote) {
  return quotes.find(
    (candidate) =>
      candidate.provider === quote.provider &&
      (quote.provider === "Wise" ||
        (quote.planId && candidate.planId === quote.planId)),
  );
}

export function feeDifference(sendFee, convertFee) {
  return Number.isFinite(sendFee) && Number.isFinite(convertFee)
    ? Math.round((sendFee - convertFee) * 100) / 100
    : null;
}

export function attachConversionFees(snapshots, conversions) {
  return snapshots.map((snapshot) => {
    const convert = conversions.find(
      (item) =>
        item.currency === snapshot.currency && item.amount === snapshot.amount,
    );
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
