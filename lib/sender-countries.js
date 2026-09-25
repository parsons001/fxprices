export const SENDER_COUNTRIES = {
  GB: { name: "United Kingdom", currency: "GBP" },
  IE: { name: "Ireland", currency: "EUR" },
};
export function senderConfig(country = "GB") {
  if (!Object.hasOwn(SENDER_COUNTRIES, country)) throw new Error("Unsupported sending country");
  return SENDER_COUNTRIES[country];
}
export function targetCurrencies(currencies, country) {
  return [...new Set([...currencies, "GBP"])].filter((currency) => currency !== senderConfig(country).currency);
}
