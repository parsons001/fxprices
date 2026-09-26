const CURRENCY_FRACTION_DIGITS = {
  BHD: 3,
  BIF: 0,
  CLP: 0,
  DJF: 0,
  GNF: 0,
  ISK: 0,
  JOD: 3,
  JPY: 0,
  KMF: 0,
  KRW: 0,
  KWD: 3,
  OMR: 3,
  PKR: 2,
  PYG: 0,
  RWF: 0,
  TND: 3,
  UGX: 0,
  VND: 0,
  VUV: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0,
};

export const money = (value, currency) => {
  if (!Number.isFinite(value)) return "—";
  const digits = CURRENCY_FRACTION_DIGITS[currency] ?? 2;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
};
export const formatRate = (value) =>
  Number.isFinite(value)
    ? value.toLocaleString("en-GB", {
        minimumFractionDigits: 4,
        maximumFractionDigits: 6,
      })
    : "—";
export const formatPct = (value) =>
  Number.isFinite(value) ? `${value > 0 ? "+" : ""}${value.toFixed(2)}%` : "—";
export const quoteLabel = (quote) => {
  const option = quote.provider === "Wise" ? "" : ` - ${quote.option}`;
  return `${quote.provider}${option}`;
};
export function markupFor(quote, midMarketRate) {
  const benchmark = quote.costGbp * midMarketRate;
  return Number.isFinite(benchmark) && benchmark > 0
    ? (quote.receivedAmount / benchmark - 1) * 100
    : null;
}
