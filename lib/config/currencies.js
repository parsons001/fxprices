const DEFAULT_CURRENCIES = [
  "AED",
  "AUD",
  "CAD",
  "EUR",
  "USD",
  "PLN",
  "RON",
  "CHF",
  "ZAR",
  "INR",
  "PHP",
  "BDT",
  "PKR",
  "JPY",
];

const DEFAULT_AMOUNTS_GBP = [100, 500, 1000, 5000, 10000];

function readList(name, fallback, transform = (value) => value) {
  const raw = process.env[name];
  if (!raw) return fallback;

  const values = raw
    .split(",")
    .map((value) => transform(value.trim()))
    .filter((value) => value !== null && value !== undefined && value !== "");

  return values.length ? [...new Set(values)] : fallback;
}

export const CURRENCIES = readList(
  "FX_CURRENCIES",
  DEFAULT_CURRENCIES,
  (value) => value.toUpperCase(),
);

const configuredAmounts = readList(
  "FX_AMOUNTS_GBP",
  DEFAULT_AMOUNTS_GBP,
  (value) => Number(value),
).filter(Number.isFinite);

export const AMOUNTS_GBP = configuredAmounts.length
  ? configuredAmounts
  : DEFAULT_AMOUNTS_GBP;
