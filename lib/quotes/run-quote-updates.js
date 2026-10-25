import { updateSend } from "../providers/fetch-send.js";
import { updateConversion } from "../providers/fetch-conversion.js";
import { mapConcurrent } from "../utils/map-concurrent.js";

export async function runQuoteUpdates(countries, settings, persist = true) {
  const jobs = [
    ["convert", updateConversion],
    ["send", updateSend],
  ].flatMap(([mode, update]) =>
    countries.flatMap((senderCountry) =>
      settings.currencyPairs.flatMap(({ sourceCurrency, currency }) =>
        settings.amounts.map((amount) => async () => {
          const context = {
            mode,
            senderCountry,
            sourceCurrency,
            currency,
            amount,
          };
          try {
            const result = await update({
              amount,
              currency,
              senderCountry,
              sourceCurrency,
              settings,
              persist,
            });
            return { context, result };
          } catch (error) {
            return {
              context,
              error: error?.message ?? "Unexpected update failure",
            };
          }
        }),
      ),
    ),
  );
  return mapConcurrent(jobs, 32);
}
