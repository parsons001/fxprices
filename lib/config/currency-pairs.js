export function parseCurrencyPairs(value) {
  if (!Array.isArray(value))
    throw new Error(
      'Global Config "FX_CURRENCY_PAIRS" must be an array of SOURCE:TARGET strings.',
    );
  return value
    .map((entry) => {
      if (typeof entry !== "string")
        throw new Error(
          'Global Config "FX_CURRENCY_PAIRS" entries must be strings.',
        );
      const match = entry
        .trim()
        .toUpperCase()
        .match(/^([A-Z]{3})\s*:\s*([A-Z]{3})$/);
      if (!match) {
        throw new Error(
          `Invalid FX_CURRENCY_PAIRS entry "${entry}". Use three-letter codes as SOURCE:TARGET.`,
        );
      }
      return { sourceCurrency: match[1], currency: match[2] };
    })
    .filter(
      (pair, index, pairs) =>
        pairs.findIndex(
          (candidate) =>
            candidate.sourceCurrency === pair.sourceCurrency &&
            candidate.currency === pair.currency,
        ) === index,
    );
}

export function sourceCurrenciesForPairs(currencyPairs) {
  return [
    ...new Set(currencyPairs.map(({ sourceCurrency }) => sourceCurrency)),
  ];
}

export function targetCurrenciesForSource(sourceCurrency, currencyPairs) {
  return currencyPairs
    .filter((pair) => pair.sourceCurrency === sourceCurrency)
    .map((pair) => pair.currency);
}

export function isCurrencyPairSupported(
  sourceCurrency,
  currency,
  currencyPairs,
) {
  return currencyPairs.some(
    (pair) =>
      pair.sourceCurrency === sourceCurrency && pair.currency === currency,
  );
}

export function resolveSourceCurrency(
  requestedSourceCurrency,
  profileCurrency,
  requestedTargetCurrency,
  currencyPairs,
) {
  const sourceCurrencies = sourceCurrenciesForPairs(currencyPairs);
  if (sourceCurrencies.includes(requestedSourceCurrency))
    return requestedSourceCurrency;
  const targetSources = currencyPairs
    .filter(({ currency }) => currency === requestedTargetCurrency)
    .map(({ sourceCurrency }) => sourceCurrency);
  if (
    sourceCurrencies.includes(profileCurrency) &&
    (!requestedTargetCurrency || targetSources.includes(profileCurrency))
  )
    return profileCurrency;
  return targetSources[0] ?? sourceCurrencies[0];
}
