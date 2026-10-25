export function quoteConfigurationUnavailable(context, error) {
  console.error(`${context} configuration could not be loaded`, error);
  return Response.json(
    { error: "Quote configuration is unavailable." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
