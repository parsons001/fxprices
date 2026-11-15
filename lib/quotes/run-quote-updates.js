import { isQuoteExcluded } from "../config/quote-exclusions.js";
import { updateSend } from "../providers/fetch-send.js";
import { updateConversion } from "../providers/fetch-conversion.js";
import { mapConcurrent } from "../utils/map-concurrent.js";

export async function runQuoteUpdates(countries, settings, persist = true) {
  const jobs = [
    ["convert", updateConversion],
    ["send", updateSend],
  ].flatMap(([mode, update]) =>
    countries.flatMap((senderCountry) =>
      settings.currencyPairs[senderCountry].flatMap(
        ({ sourceCurrency, currency }) =>
          settings.amounts
            .filter((amount) =>
              ["Wise", "Revolut"].some(
                (provider) =>
                  !isQuoteExcluded(settings, {
                    provider,
                    senderCountry,
                    mode,
                    amount,
                    sourceCurrency,
                    currency,
                  }),
              ),
            )
            .map((amount) => async () => {
              const startedAt = Date.now();
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
                return { context, result, durationMs: Date.now() - startedAt };
              } catch (error) {
                return {
                  context,
                  error: error?.message ?? "Unexpected update failure",
                  durationMs: Date.now() - startedAt,
                };
              }
            }),
      ),
    ),
  );
  return mapConcurrent(jobs, 32);
}
