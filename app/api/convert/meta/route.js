import { CURRENCIES, AMOUNTS_GBP } from "../../../../lib/currencies.js";
export function GET() {
  return Response.json({ currencies: CURRENCIES, amountsGbp: AMOUNTS_GBP });
}
