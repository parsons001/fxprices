import LocalizedDate from "../layout/localized-date.js";
import { Card } from "../ui/card.js";
import ProviderRunDurationChart from "./provider-run-duration-chart.js";
import {
  minutesUntilNextHourlyUpdate,
  providerMetricsAcrossRuns,
  providerRunSeries,
  summarizeCronRuns,
} from "../../lib/quotes/cron-run-analytics.js";

const numberFormat = new Intl.NumberFormat("en-GB");

function formatDuration(durationMs) {
  if (!Number.isFinite(durationMs)) return "—";
  if (durationMs < 1000) return `${Math.round(durationMs)} ms`;
  return `${(durationMs / 1000).toFixed(1)} s`;
}

function Metric({ label, value, items }) {
  return (
    <Card className="p-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      {items ? (
        <div className="mt-1">
          <p className="text-xs text-muted-foreground">{items[0].label}</p>
          <p className="text-2xl font-semibold tabular-nums">
            {items[0].value}
          </p>
          {items.slice(1).map((item) => (
            <p key={item.label} className="mt-1 text-xs text-muted-foreground">
              {item.label}:{" "}
              <span className="font-medium text-foreground">{item.value}</span>
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      )}
    </Card>
  );
}

function ProviderMetrics({ runs, title, showErrors = false }) {
  const metrics = providerMetricsAcrossRuns(runs);
  if (!metrics.length) {
    return (
      <section>
        <h4 className="text-sm font-medium">{title}</h4>
        <p className="mt-2 text-sm text-muted-foreground">
          Provider timing data is not available for these runs.
        </p>
      </section>
    );
  }
  const errors = metrics.flatMap((metric) =>
    metric.errorDetails.map(({ run, failure }) => ({
      provider: metric.provider,
      run,
      failure,
    })),
  );

  return (
    <section>
      <h4 className="text-sm font-medium">{title}</h4>
      <div className="mt-2 overflow-x-auto rounded-md border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Provider</th>
              <th className="px-3 py-2 font-medium">Requests</th>
              {showErrors && <th className="px-3 py-2 font-medium">Errors</th>}
              <th className="px-3 py-2 font-medium">Total request time</th>
              <th className="px-3 py-2 font-medium">Max request</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => (
              <tr key={metric.provider} className="border-t">
                <th scope="row" className="px-3 py-2 font-medium">
                  {metric.provider}
                </th>
                <td className="px-3 py-2 tabular-nums">
                  {numberFormat.format(metric.requests)}
                </td>
                {showErrors && (
                  <td className="px-3 py-2 tabular-nums">
                    {numberFormat.format(metric.errors)}
                  </td>
                )}
                <td className="px-3 py-2 tabular-nums">
                  {metric.requests
                    ? formatDuration(metric.elapsedDurationMs)
                    : "—"}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {metric.requests ? formatDuration(metric.maxDurationMs) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showErrors && errors.length > 0 && (
        <div className="mt-3">
          <h5 className="text-xs font-medium text-red-800">
            Provider errors ({numberFormat.format(errors.length)})
          </h5>
          <ul className="mt-1 space-y-2 text-xs">
            {errors.slice(0, 10).map(({ provider, run, failure }, index) => (
              <li
                key={`${provider}-${failure.mode}-${failure.currency}-${failure.amount}-${index}`}
                className="rounded-md bg-red-50 px-3 py-2 text-red-900"
              >
                <span className="font-medium">
                  {provider} · {failure.senderCountry} · {failure.mode} ·{" "}
                  {failure.amount} {failure.sourceCurrency} → {failure.currency}
                  {run.startedAt instanceof Date && (
                    <>
                      {" · "}
                      <LocalizedDate
                        value={run.startedAt.toISOString()}
                        options={{ dateStyle: "medium", timeStyle: "short" }}
                      />
                    </>
                  )}
                  :
                </span>{" "}
                {failure.message}
              </li>
            ))}
            {errors.length > 10 && (
              <li className="text-muted-foreground">
                Showing 10 of {numberFormat.format(errors.length)} provider
                errors.
              </li>
            )}
          </ul>
        </div>
      )}
    </section>
  );
}

function RunStatus({ status }) {
  const styles = {
    success: "bg-emerald-50 text-emerald-800",
    partial: "bg-amber-50 text-amber-900",
    failed: "bg-red-50 text-red-900",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {status ?? "unknown"}
    </span>
  );
}

export default function CronRunsAnalytics({ runs }) {
  const durations = runs.map((run) => run.durationMs).filter(Number.isFinite);
  const overview = summarizeCronRuns(runs);
  const chartData = providerRunSeries(runs);
  const failureTotal = runs.reduce(
    (total, run) => total + (run.totals?.failures ?? 0),
    0,
  );
  const maximumDuration = Math.max(1, ...durations);

  return (
    <div className="mb-8 grid gap-8">
      <section className="grid gap-4" aria-labelledby="cron-overview-title">
        <div>
          <h2 id="cron-overview-title" className="text-lg font-semibold">
            Overview
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Summary of {numberFormat.format(runs.length)} recent runs.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Metric
            label="Run duration"
            items={[
              {
                label: "Average",
                value:
                  overview.averageDurationMs === null
                    ? "—"
                    : formatDuration(overview.averageDurationMs),
              },
              {
                label: "Last run",
                value:
                  overview.lastDurationMs === null
                    ? "—"
                    : formatDuration(overview.lastDurationMs),
              },
            ]}
          />
          <Metric
            label="Quotes stored"
            items={[
              {
                label: "Average",
                value:
                  overview.averageQuotes === null
                    ? "—"
                    : numberFormat.format(Math.round(overview.averageQuotes)),
              },
              {
                label: "Last run",
                value:
                  overview.lastQuotes === null
                    ? "—"
                    : numberFormat.format(overview.lastQuotes),
              },
            ]}
          />
          <Metric
            label="Provider updates"
            items={[
              {
                label: "Last update",
                value: overview.lastRunAt ? (
                  <LocalizedDate
                    value={overview.lastRunAt}
                    options={{ dateStyle: "medium", timeStyle: "short" }}
                    className="text-base"
                  />
                ) : (
                  "—"
                ),
              },
              {
                label: "Next update",
                value: `in ${minutesUntilNextHourlyUpdate()} minutes`,
              },
            ]}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {numberFormat.format(failureTotal)} quote update failures across the
          recorded runs. Run duration includes provider requests and database
          writes.
        </p>
      </section>

      <section
        className="grid gap-4"
        aria-labelledby="provider-analytics-title"
      >
        <div>
          <h2 id="provider-analytics-title" className="text-lg font-semibold">
            Per-provider performance
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Request timings for each provider across recorded runs.
          </p>
        </div>
        <ProviderRunDurationChart data={chartData} />
        <Card className="p-5 sm:p-6">
          <ProviderMetrics
            runs={runs}
            title="Provider request summary across recorded runs"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Total request time sums each provider’s elapsed time across runs,
            from its first job starting to its last job finishing.
          </p>
        </Card>
      </section>

      <section
        className="grid gap-4"
        aria-labelledby="recent-provider-updates-title"
      >
        <div>
          <h2
            id="recent-provider-updates-title"
            className="text-lg font-semibold"
          >
            Recent runs
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Expand a run for provider timings, outcomes, and errors.
          </p>
        </div>
        <Card as="section" className="overflow-hidden">
          <div className="p-5 sm:p-6">
            {runs.length ? (
              <ul className="space-y-3">
                {runs.slice(0, 10).map((run) => {
                  const quoteCount = Object.values(
                    run.totals?.quotes ?? {},
                  ).reduce((total, count) => total + count, 0);
                  const width = Math.max(
                    2,
                    (Math.min(run.durationMs ?? 0, maximumDuration) /
                      maximumDuration) *
                      100,
                  );
                  return (
                    <li
                      key={run._id.toString()}
                      className="grid gap-2 sm:grid-cols-[minmax(10rem,1fr)_minmax(8rem,2fr)_auto_auto] sm:items-center"
                    >
                      <span className="text-sm">
                        <LocalizedDate
                          value={run.startedAt?.toISOString?.() ?? null}
                          options={{ dateStyle: "medium", timeStyle: "short" }}
                        />
                      </span>
                      <div
                        className="h-2 overflow-hidden rounded-full bg-muted"
                        role="img"
                        aria-label={`Run duration ${formatDuration(run.durationMs)}`}
                      >
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <span className="text-sm tabular-nums">
                        {formatDuration(run.durationMs)}
                      </span>
                      <RunStatus status={run.status} />
                      <span className="text-xs text-muted-foreground sm:col-span-4">
                        {run.countries?.join(", ") ?? "—"} ·{" "}
                        {numberFormat.format(run.totals?.jobs ?? 0)} jobs ·{" "}
                        {numberFormat.format(quoteCount)} quotes ·{" "}
                        {numberFormat.format(run.totals?.failures ?? 0)}{" "}
                        failures
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No provider update runs have been recorded yet. Analytics will
                appear after the next authorized quote refresh.
              </p>
            )}
          </div>

          {runs.length > 0 && (
            <div className="divide-y border-t">
              {runs.map((run) => (
                <details key={run._id.toString()} className="px-5 py-4 sm:px-6">
                  <summary className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <span className="font-medium">
                      <LocalizedDate
                        value={run.startedAt?.toISOString?.() ?? null}
                        options={{ dateStyle: "medium", timeStyle: "short" }}
                      />
                      {" — "}
                      {run.countries?.join(", ") ?? "—"}
                    </span>
                    <span className="flex flex-wrap items-center gap-3 text-muted-foreground">
                      <span>{formatDuration(run.durationMs)}</span>
                      <RunStatus status={run.status} />
                    </span>
                  </summary>
                  <div className="mt-3 text-sm text-muted-foreground">
                    {run.settings && (
                      <p>
                        Configuration: {run.settings.pairCount} currency pairs
                        across {run.settings.amountCount} amounts.
                      </p>
                    )}
                    {run.error && (
                      <p className="mt-2 text-red-800">{run.error}</p>
                    )}
                    <ProviderMetrics
                      runs={[run]}
                      title="Provider summary"
                      showErrors
                    />
                  </div>
                </details>
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
