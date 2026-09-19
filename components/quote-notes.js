export default function QuoteNotes() {
  return (
    <>
      <p className="text-sm leading-6 text-muted-foreground">
        Wise: personal GB account, balance to balance. Revolut fees are deducted
        from the selected GBP budget: a £100 budget with a £1 fee converts £99.
        Received amounts are calculated as (budget − fee) × quoted rate; live
        rows use the API fee and rate. From amount shows the total GBP paid,
        including fees. To amount shows the currency received. Exchange rate is
        the quoted rate before fees. Mid-market rate shows the Wise benchmark
        for each currency and amount. Fees are shown in GBP and are already
        included in the from amount; paid-plan estimates exclude subscription
        costs. To amount markup = (to amount ÷ (from amount × Wise mid-market
        rate) − 1) × 100. Negative percentages mean less received than
        mid-market; a dash means the benchmark is unavailable.
      </p>
      <p className="text-sm leading-6 text-muted-foreground">
        Paid plans missing from the API are labelled estimated and use
        calculated received amounts based on the quoted Revolut exchange rate.
        Each amount is a separate scenario with the full monthly allowance
        available. Plus charges 0.5% only above £3,000, plus 0.5% of the full
        amount when the live quote indicates a weekend surcharge. Premium, Metal
        and Ultra have no additional conversion fees. Subscription costs are
        excluded.{" "}
        <a
          className="underline underline-offset-4"
          href="https://www.revolut.com/our-pricing-plans/"
          target="_blank"
          rel="noreferrer"
        >
          UK plan rules
        </a>
        .
      </p>
    </>
  );
}
