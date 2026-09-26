// GBP/EUR paid-plan estimates. EUR rules checked 2026-09-24:
// https://help.revolut.com/en-ES/help/card-payments-withdrawals/getting-started-with-card-payments/can-i-pay-in-a-specific-currency/
// https://help.revolut.com/en-IE/help/card-payments-withdrawals/getting-started-with-card-payments/can-i-pay-in-a-specific-currency/
// Legacy *Gbp fields are amounts in sourceCurrency.
// https://www.revolut.com/our-pricing-plans/
// https://help.revolut.com/help/wealth/exchanging-money/how-much-does-it-cost-to-make-an-exchange/will-i-be-charged-for-exchanging-foreign-currencies/
export function fixedBudgetQuote(amountGbp, feeGbp, rate, targetDecimals = 2) {
  if (
    ![amountGbp, feeGbp, rate].every(Number.isFinite) ||
    amountGbp <= 0 ||
    feeGbp < 0 ||
    feeGbp > amountGbp ||
    rate <= 0
  ) {
    throw new Error("Invalid fixed-budget quote");
  }
  const scale = 10 ** targetDecimals;
  return {
    costGbp: amountGbp,
    receivedAmount: Math.round((amountGbp - feeGbp) * rate * scale) / scale,
  };
}

export function estimatePaidPlans({
  sourceCurrency = "GBP",
  amountGbp,
  rate,
  weekend,
  usedAllowanceGbp = 0,
  targetDecimals = 2,
}) {
  if (
    !["GBP", "EUR"].includes(sourceCurrency) ||
    ![amountGbp, rate, usedAllowanceGbp].every(Number.isFinite) ||
    amountGbp <= 0 ||
    rate <= 0 ||
    usedAllowanceGbp < 0 ||
    typeof weekend !== "boolean"
  ) {
    throw new Error("Invalid plan estimate inputs");
  }
  const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
  return ["Plus", "Premium", "Metal", "Ultra"].map((name) => {
    const remainingAllowance = Math.max(0, 3000 - usedAllowanceGbp);
    const fairUsageFeeGbp =
      name === "Plus"
        ? round(Math.max(0, amountGbp - remainingAllowance) * 0.005)
        : 0;
    const weekendFeeGbp =
      name === "Plus" && weekend ? round(amountGbp * 0.005) : 0;
    const feeGbp = round(fairUsageFeeGbp + weekendFeeGbp);
    return {
      provider: "Revolut",
      planId: name.toUpperCase(),
      option: name,
      estimated: true,
      sourceCurrency,
      rate,
      feeGbp,
      ...fixedBudgetQuote(amountGbp, feeGbp, rate, targetDecimals),
      fairUsageFeeGbp,
      weekendFeeGbp,
      weekend,
      usedAllowanceGbp,
    };
  });
}

// Deduct the API fee from the budget before applying the quoted rate.
export function liveRevolutQuote(
  quote,
  plan,
  currency,
  amountGbp,
  targetDecimals = 2,
  sourceCurrency = "GBP",
) {
  if (
    quote.recipient?.currency !== currency ||
    plan.fees?.total?.currency !== sourceCurrency ||
    plan.fees?.cost?.currency !== sourceCurrency ||
    ![
      quote.recipient.amount,
      quote.rate?.rate,
      plan.fees.total.amount,
      plan.fees.cost.amount,
    ].every(Number.isFinite)
  ) {
    throw new Error("Conversion amount or currency unavailable");
  }
  return {
    provider: "Revolut",
    planId: plan.id,
    option: plan.name,
    estimated: false,
    calculated: true,
    rate: quote.rate.rate,
    feeGbp: plan.fees.total.amount / 100,
    ...fixedBudgetQuote(
      amountGbp,
      plan.fees.total.amount / 100,
      quote.rate.rate,
      targetDecimals,
    ),
  };
}
