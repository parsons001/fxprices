export const MAX_UPDATE_RESPONSE_BYTES = 16 * 1024;

// Measure the actual serialized UTF-8 body, including JSON escaping.
export function serializeUpdateResponse(quotes, failures) {
  const body = { success: failures.length === 0, quotes };
  if (!failures.length) return JSON.stringify(body);
  Object.assign(body, {
    failureCount: failures.length,
    omittedFailureCount: failures.length,
    failures: [],
  });
  for (const failure of failures) {
    body.failures.push(failure);
    body.omittedFailureCount--;
    if (
      Buffer.byteLength(JSON.stringify(body), "utf8") >
      MAX_UPDATE_RESPONSE_BYTES
    ) {
      body.failures.pop();
      body.omittedFailureCount++;
      break;
    }
  }
  return JSON.stringify(body);
}

// Count persisted provider rows (each Revolut plan is one quote).
export function summarizeQuoteUpdate(context, result, httpStatus = 200) {
  const quotes = { Wise: 0, Revolut: 0 };
  const failures = [];
  const fail = (stage, reason, provider) => {
    const operation = `${context.mode === "send" ? "bank-transfer" : "currency-conversion"} quotes for ${context.amount} ${context.sourceCurrency} → ${context.currency} (profile country: ${context.senderCountry})`;
    const savedCount =
      result.storage?.saved === true ? (result.quotes ?? []).length : 0;
    const outcome =
      stage === "update"
        ? "This update did not complete; quote storage could not be confirmed."
        : `${savedCount} quote${savedCount === 1 ? " was" : "s were"} saved for this update.`;
    const action =
      stage === "provider"
        ? `${provider ?? "Provider"} could not return usable ${operation}`
        : stage === "storage"
          ? `Could not save ${operation} to MongoDB`
          : `Could not complete the update of ${operation}`;
    failures.push({
      ...context,
      stage,
      ...(provider ? { provider } : {}),
      message: `${action}. ${describeReason(reason)} ${outcome}`.slice(0, 1000),
    });
  };
  for (const error of result.errors ?? [])
    fail("provider", error.message, error.provider);
  if (result.storage?.saved === true) {
    for (const quote of result.quotes ?? []) {
      if (Object.hasOwn(quotes, quote.provider)) quotes[quote.provider]++;
    }
  } else {
    fail(
      result.error || httpStatus >= 400 ? "update" : "storage",
      result.storage?.error ??
        result.error ??
        `Quotes were not saved (HTTP ${httpStatus}).`,
    );
  }
  return { quotes, failures };
}

function describeReason(reason) {
  const detail = String(reason || "No error details were provided").slice(
    0,
    500,
  );
  const status = Number(detail.match(/HTTP (\d{3})/)?.[1]);
  const explanation = {
    400: "The provider rejected the request as invalid.",
    401: "The provider requires authentication or rejected the supplied credentials.",
    403: "The provider refused access to the quote endpoint.",
    404: "The requested provider endpoint or resource was not found.",
    429: "The provider rate limit was reached.",
    500: "The provider encountered an internal server error.",
    502: "The provider gateway received an invalid upstream response.",
    503: "The provider service was unavailable at the time of the request.",
    504: "The provider gateway timed out waiting for an upstream response.",
  }[status];
  return `Reported error: ${detail}. ${explanation ?? (/timeout|timed out/i.test(detail) ? "The quote request did not finish within the allowed time." : "")}`.trim();
}
