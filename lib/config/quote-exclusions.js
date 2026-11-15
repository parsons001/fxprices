const fields = ["provider", "amount", "sourceCurrency", "currency"];

export function parseQuoteExclusions(value = []) {
  if (!Array.isArray(value))
    throw new Error("FX_QUOTE_EXCLUSIONS must be an array.");
  return value.map((rule) => {
    if (
      !rule ||
      typeof rule !== "object" ||
      Array.isArray(rule) ||
      Object.keys(rule).some((key) => !fields.includes(key)) ||
      !["Wise", "Revolut"].includes(rule.provider) ||
      !Number.isFinite(rule.amount) ||
      rule.amount <= 0 ||
      !/^[A-Z]{3}$/.test(rule.sourceCurrency ?? "") ||
      !/^[A-Z]{3}$/.test(rule.currency ?? "")
    ) {
      throw new Error(
        "FX_QUOTE_EXCLUSIONS entries require a provider, positive amount, sourceCurrency and currency.",
      );
    }
    return { ...rule };
  });
}

export function isQuoteExcluded(settings, context) {
  return (settings.quoteExclusions ?? []).some((rule) =>
    fields.every((field) => rule[field] === context[field]),
  );
}
