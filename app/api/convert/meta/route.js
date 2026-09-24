import { CURRENCIES, AMOUNTS_GBP } from "../../../../lib/currencies.js";
import { SENDER_COUNTRIES, senderConfig, targetCurrencies } from "../../../../lib/sender-countries.js";
export function GET(request) {
 const country = request ? new URL(request.url).searchParams.get("senderCountry") ?? "GB" : "GB";
 if (!Object.hasOwn(SENDER_COUNTRIES,country)) return Response.json({error:"Unsupported sending country"},{status:400});
 return Response.json({senderCountry:country,sourceCurrency:senderConfig(country).currency,currencies:targetCurrencies(CURRENCIES,country),amountsGbp:AMOUNTS_GBP,amounts:AMOUNTS_GBP});
}
