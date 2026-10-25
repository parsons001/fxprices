export const QUOTE_FILTER_OPTIONS = [
  { value: "Wise", label: "Wise", provider: "Wise" },
  {
    value: "Revolut:STANDARD",
    label: "Revolut Standard",
    provider: "Revolut",
    planId: "STANDARD",
  },
  {
    value: "Revolut:PLUS",
    label: "Revolut Plus",
    provider: "Revolut",
    planId: "PLUS",
  },
  {
    value: "Revolut:PREMIUM",
    label: "Revolut Premium",
    provider: "Revolut",
    planId: "PREMIUM",
  },
  {
    value: "Revolut:METAL",
    label: "Revolut Metal",
    provider: "Revolut",
    planId: "METAL",
  },
  {
    value: "Revolut:ULTRA",
    label: "Revolut Ultra",
    provider: "Revolut",
    planId: "ULTRA",
  },
];
export const DEFAULT_SELECTED_PROVIDERS = QUOTE_FILTER_OPTIONS.map(
  ({ value }) => value,
);

export function isQuoteProviderSelected(quote, selectedProviders) {
  return (
    selectedProviders.includes(quote.provider) ||
    selectedProviders.includes(`${quote.provider}:${quote.planId}`)
  );
}

export function resolveSelectedProviders(params = {}) {
  const rawProviders =
    typeof params.providers === "string"
      ? params.providers.split(",")
      : Array.isArray(params.providers)
        ? params.providers.flatMap((value) => value.split(","))
        : [];
  const expandedProviders = rawProviders.flatMap((provider) =>
    provider === "Revolut"
      ? QUOTE_FILTER_OPTIONS.filter(
          (option) => option.provider === "Revolut",
        ).map(({ value }) => value)
      : [provider],
  );
  const requestedProviders = DEFAULT_SELECTED_PROVIDERS.filter((provider) =>
    expandedProviders.includes(provider),
  );
  return requestedProviders.length
    ? requestedProviders
    : DEFAULT_SELECTED_PROVIDERS;
}
