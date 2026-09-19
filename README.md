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
- `GET /api/cron/update-quotes`: protected Vercel Cron endpoint that refreshes every supported currency and GBP amount daily at 12:00 UTC. Vercel sends the `CRON_SECRET` as a bearer token.
- `app/page.js`: loads saved results on the server.
- `components/`: converter filters, tables, notes and charts.
- `lib/conversion-store.js`: MongoDB snapshot reads and writes.
- `lib/fetch-conversion.js`: offline ingestion helper retained for explicit maintenance; not exposed through any public route or UI.
- `revolut-plans.js`: existing conversion and plan calculations.

`npm test` checks calculations, ingestion and the read-only public endpoint.

## Vercel deployment

Set `MONGODB_URI`, `MONGODB_DB` and `CRON_SECRET` in the Vercel project environment variables. `vercel.json` schedules the quote refresh for 12:00 UTC every day. The schedule is UTC, so change the cron expression if midday should mean another timezone.
