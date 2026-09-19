# FX Convert

A Next.js app displaying the latest MongoDB snapshot for each currency and GBP amount. Loading the page and changing filters never request new provider quotes or write to the database.

## Run

Requires Node.js 20.9 or newer. Set `MONGODB_URI` and `MONGODB_DB=fxprices_app` in `.env.local` (Git-ignored). Optionally set `FX_CURRENCIES` and `FX_AMOUNTS_GBP` as comma-separated lists to change the supported filters. See `.env.example` for a credential-free template.

```sh
npm install
npm run dev
```

For production, run `npm run build` followed by `npm start`. Configure the same environment variables on your deployment.

## Saved results

The app reads `fxprices_app.conversion_snapshots`, selecting the newest `fetchedAt` for each currency/amount pair, with document ID as a tie-breaker. Every page load reads MongoDB afresh. Filters operate locally on those saved results. Saved timestamps, provider errors, empty states and database failures are displayed; there is no live-quote fallback.

Currency sections include provider tables and markup charts. Revolut fees are deducted from the selected GBP budget before conversion. Markup compares received currency against the full GBP budget multiplied by the saved Wise mid-market rate. Percentages display two decimals. Paid-plan estimates exclude subscriptions and retain the existing allowance assumptions.

## API and code

- `GET /api/convert`: latest saved snapshots; optional `currency` and `gbpAmount` filters. Read-only.
- `GET /api/convert/meta`: supported currencies and amounts.
- `GET /api/cron/update-quotes`: manually triggered endpoint that refreshes every supported currency and GBP amount. Requires `Authorization: Bearer <CRON_SECRET>`; missing or incorrect tokens return HTTP 401.
- `app/page.js`: loads saved results on the server.
- `components/`: converter filters, tables, notes and charts.
- `lib/conversion-store.js`: MongoDB snapshot reads and writes.
- `lib/fetch-conversion.js`: ingestion helper used by the protected update endpoint.
- `revolut-plans.js`: existing conversion and plan calculations.

`npm test` checks calculations, ingestion and the read-only public endpoint.

## Vercel deployment

Set `MONGODB_URI`, `MONGODB_DB` and `CRON_SECRET` in the deployment environment (or `.env.local` for local development). `CRON_SECRET` is the bearer password; the existing name is retained for compatibility. No Vercel cron schedule is configured. Deploy this change to remove the existing Vercel schedule.

Trigger an update manually with the secret set in your shell environment:

```sh
curl --header "Authorization: Bearer $CRON_SECRET" https://your-app.example/api/cron/update-quotes
```

Chart ranges include Last 24 hours and Last 7 days with UTC hourly points (multiple quotes within an hour are averaged per provider). The 30/60/90/180-day ranges show daily arithmetic mean markup per provider. Missing intervals remain gaps; table quotes remain individual snapshots.

## Navigation

The site navigation links to `/convert` (existing saved conversion charts and tables) and `/send` (saved bank-transfer comparisons). `/` redirects to `/convert`, preserving filter query parameters.

## Send comparisons

`/send` reuses the Convert filters, Graph/Table views, quote-date selection and hourly/daily chart aggregation. It reads only `send_snapshots` in MongoDB. `/api/send` and `/api/send/meta` provide read-only saved results and metadata. No live provider requests are made when either page loads.

The bearer-protected `/api/cron/update-quotes` now updates both Convert and Send, with a `mode` on each result and explicit provider errors. There is no automatic Vercel schedule.

Send uses Wise `gateway/v1/price` with `BALANCE` funding and `BANK_TRANSFER` payout. Revolut uses `api/remittance/routes`, selecting `BANK` and the API's plan fees. Source amounts are major GBP units for Wise and minor GBP units for Revolut. Revolut received amounts deduct the API total fee from the GBP budget before applying the quoted rate. No conversion-plan fee estimates are reused for transfers.

Recipient countries are explicit in `lib/send-countries.js`: EUR→ES, AED→AE, AUD→AU, CAD→CA, USD→US, PLN→PL, RON→RO, CHF→CH, ZAR→ZA, INR→IN, PHP→PH, BDT→BD, PKR→PK, JPY→JP. The country is shown on Send. Unsupported currency/country mappings return an error instead of using an unrelated route. Intermediary-bank fees are not included in the comparison.
