export function additionalFeeRows(sendSnapshots, convertSnapshots) {
  const conversions = new Map(convertSnapshots.map((snapshot) => [`${snapshot.currency}:${snapshot.amount}`, snapshot]));
  return sendSnapshots.flatMap((send) => {
    const convert = conversions.get(`${send.currency}:${send.amount}`);
    return (send.quotes ?? []).map((quote) => {
      const match = (convert?.quotes ?? []).find((candidate) =>
        candidate.provider === quote.provider &&
        (quote.provider === "Wise" || (quote.planId && candidate.planId === quote.planId)));
      const sendFee = Number.isFinite(quote.feeGbp) ? quote.feeGbp : null;
      const convertFee = Number.isFinite(match?.feeGbp) ? match.feeGbp : null;
      return {
        currency: send.currency, amount: send.amount,
        provider: quote.provider, plan: quote.provider === "Wise" ? "Balance" : quote.option,
        sendFee, convertFee,
        additionalFee: sendFee !== null && convertFee !== null ? Math.round((sendFee - convertFee) * 100) / 100 : null,
        estimated: Boolean(quote.estimated || match?.estimated),
        sendDate: send.fetchedAt, convertDate: match ? convert.fetchedAt : null,
      };
    });
  }).sort((a,b) => a.currency.localeCompare(b.currency) || a.amount - b.amount || a.provider.localeCompare(b.provider) || a.plan.localeCompare(b.plan));
}
