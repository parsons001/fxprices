export default function SendNotes() {
  return (
    <p className="text-sm leading-6 text-muted-foreground">
      Wise: personal account, balance to bank account. Revolut: bank-transfer
      route from GB to the destination country shown above (EUR uses Spain).
      Each row uses the selected GBP budget including fees. Wise received
      amounts come from its API; Revolut received amounts are calculated as
      (budget − quoted total fee) × quoted rate. Revolut transfer and exchange
      fees come from the remittance API for each plan; conversion-plan estimates
      are not used. Markup includes fees and uses the saved Wise mid-market
      benchmark. The International payment fee is the nonnegative difference
      between a Send fee and the nearest matching Convert fee from the same
      time. Subscription costs and any additional intermediary-bank fees are
      excluded.
    </p>
  );
}
