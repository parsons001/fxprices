export const SENDER_COUNTRIES = {
  GB: { name: "United Kingdom", currency: "GBP" },
  IE: { name: "Ireland", currency: "EUR" },
};
export function senderConfig(country = "GB") {
  if (!Object.hasOwn(SENDER_COUNTRIES, country))
    throw new Error("Unsupported sending country");
  return SENDER_COUNTRIES[country];
}
