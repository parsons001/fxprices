import { test } from "node:test";
import assert from "node:assert/strict";
import {
  estimatePaidPlans,
  fixedBudgetQuote,
  liveRevolutQuote,
} from "../lib/providers/revolut-plans.js";
const quote = (amountGbp, weekend = false, usedAllowanceGbp = 0) =>
  estimatePaidPlans({
    amountGbp,
    weekend,
    usedAllowanceGbp,
    rate: 1.16,
    receivedAmount: amountGbp * 1.16,
  });
test("Plus charges only above its allowance for all app amounts", () => {
  for (const [amount, weekday, weekend] of [
    [100, 0, 0.5],
    [500, 0, 2.5],
    [1000, 0, 5],
    [5000, 10, 35],
    [10000, 35, 85],
  ]) {
    assert.equal(quote(amount)[0].feeGbp, weekday);
    assert.equal(quote(amount, true)[0].feeGbp, weekend);
  }
  assert.equal(quote(3000)[0].feeGbp, 0);
  assert.equal(quote(3002)[0].feeGbp, 0.01);
});
test("Prior usage reduces the remaining allowance without charging past usage again", () => {
  assert.equal(quote(1000, false, 2500)[0].feeGbp, 2.5);
  assert.equal(quote(1000, false, 5000)[0].feeGbp, 5);
});
test("Fees reduce the amount converted while total budget and rate remain fixed", () => {
  const plus = quote(5000, true)[0];
  assert.equal(plus.costGbp, 5000);
  assert.equal(plus.receivedAmount, 5759.4);
  assert.equal(plus.rate, 1.16);
  assert.equal(plus.estimated, true);
});
test("Premium, Metal and Ultra have no additional conversion fees even on weekends above allowance", () => {
  const plans = quote(10000, true, 50000).slice(1);
  assert.deepEqual(
    plans.map((p) => p.option),
    ["Premium", "Metal", "Ultra"],
  );
  for (const p of plans) {
    assert.equal(p.feeGbp, 0);
    assert.equal(p.costGbp, 10000);
  }
});

test("Standard fee normalization and zero-decimal currencies keep a fixed budget", () => {
  assert.deepEqual(fixedBudgetQuote(100, 1, 1.16), {
    costGbp: 100,
    receivedAmount: 114.84,
  });
  assert.deepEqual(fixedBudgetQuote(100, 1, 195.123, 0), {
    costGbp: 100,
    receivedAmount: 19317,
  });
  for (const amount of [100, 500, 1000, 5000, 10000]) {
    for (const plan of quote(amount, true)) assert.equal(plan.costGbp, amount);
  }
});

test("Live fees are deducted from the sending budget before conversion", () => {
  const plan = {
    id: "STANDARD",
    name: "Standard",
    fees: {
      total: { currency: "GBP", amount: 100 },
      cost: { currency: "GBP", amount: 10100 },
    },
  };
  const quote = {
    rate: { rate: 1.16 },
    recipient: { currency: "EUR", amount: 11537 },
  };
  const result = liveRevolutQuote(quote, plan, "EUR", 100);
  assert.equal(result.receivedAmount, 114.84);
  assert.equal(result.costGbp, 100);
  assert.equal(result.feeGbp, 1);
  assert.equal(result.estimated, false);
  assert.equal(
    liveRevolutQuote(
      {
        ...quote,
        rate: { rate: 195.123 },
        recipient: { currency: "JPY", amount: 19512 },
      },
      plan,
      "JPY",
      100,
      0,
    ).receivedAmount,
    19317,
  );
  assert.throws(() => liveRevolutQuote(quote, plan, "JPY", 100, 0));
});

test("EUR paid-plan estimates apply the €3,000 allowance and weekend fee", () => {
  const estimate = (amountGbp, weekend) =>
    estimatePaidPlans({
      sourceCurrency: "EUR",
      amountGbp,
      rate: 0.85,
      weekend,
    });
  assert.equal(estimate(3000, false)[0].feeGbp, 0);
  assert.equal(estimate(5000, false)[0].feeGbp, 10);
  const plans = estimate(5000, true);
  assert.equal(plans[0].feeGbp, 35);
  assert.equal(plans[0].receivedAmount, 4220.25);
  assert.ok(
    plans.every((plan) => plan.sourceCurrency === "EUR" && plan.estimated),
  );
  assert.ok(plans.slice(1).every((plan) => plan.feeGbp === 0));
});
