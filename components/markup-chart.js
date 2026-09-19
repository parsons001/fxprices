"use client";

import { aggregateHistory, rangeLabel } from "../lib/chart-history";
import { formatPct } from "../lib/format";
import { Card, CardContent, CardHeader } from "./ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

const COLORS = [
  "#2563eb",
  "#b93429",
  "#00785e",
  "#7c3aed",
  "#a16207",
  "#0369a1",
];

export default function MarkupChart({ points, currency, loading, days = 30 }) {
  const valid = points.filter((point) => Number.isFinite(point.markup));
  if (!valid.length)
    return (
      <Card>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            {loading
              ? "Loading markup comparison…"
              : "Markup chart unavailable until a Wise mid-market benchmark is available."}
          </p>
        </CardContent>
      </Card>
    );

  const { hourly, series: providerSeries, chartData } = aggregateHistory(valid, days);
  const series = providerSeries.map((entry, index) => ({ ...entry, color: COLORS[index % COLORS.length] }));
  const markupValues = chartData.flatMap((row) => series.map((entry) => row[entry.key])).filter(Number.isFinite);
  const dateLabel = (value, tooltip = false) => new Date(value).toLocaleString("en-GB", {
    timeZone: "UTC", month: "short", day: "numeric",
    ...(hourly ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
    ...(tooltip ? { year: "numeric" } : {}),
  });
  const min = Math.min(0, ...markupValues);
  const max = Math.max(0, ...markupValues);
  const padding = Math.max((max - min) * 0.15, 1);
  const tickStep = 0.5;
  const low = Math.floor((min - padding) / tickStep) * tickStep;
  const high = Math.ceil((max + padding) / tickStep) * tickStep;
  const ticks = Array.from(
    { length: Math.round((high - low) / tickStep) + 1 },
    (_, index) => low + index * tickStep,
  );
  const chartConfig = Object.fromEntries(
    series.map((entry) => [
      entry.key,
      { label: entry.label, color: entry.color },
    ]),
  );

  return (
    <Card className="mb-4 min-w-0 overflow-hidden">
      <CardHeader>
        <h3 className="font-semibold">Historic markup trend</h3>
        <p className="text-sm leading-6 text-muted-foreground">
          Markup vs Wise mid-market: {rangeLabel(days).toLowerCase()} for the selected
          amount and currency. {hourly ? "Hourly points (averaged when multiple quotes fall in the same hour)." : "Daily average markup."} Times are UTC. 0% matches mid-market.
        </p>
      </CardHeader>
      <CardContent className="min-w-0 overflow-hidden">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[220px] w-full min-w-0 sm:h-[290px]"
        >
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{ top: 12, right: 18, left: 4, bottom: 8 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="dateKey"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={28}
              tickFormatter={(value) => dateLabel(value)}
            />
            <YAxis
              domain={[low, high]}
              ticks={ticks}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => formatPct(value)}
              width={58}
            />
            <ChartTooltip
              cursor={{ stroke: "hsl(var(--border))", strokeDasharray: "3 3" }}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => `${dateLabel(value, true)} UTC`}
                  formatter={(value) => formatPct(Number(value))}
                />
              }
            />
            {series.map((entry) => (
              <Line
                key={entry.key}
                dataKey={entry.key}
                type="monotone"
                stroke={`var(--color-${entry.key})`}
                strokeWidth={2.5}
                dot={{
                  r: 3,
                  fill: entry.color,
                  stroke: entry.color,
                  strokeWidth: 1,
                }}
                activeDot={{ r: 5, fill: entry.color, stroke: entry.color }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ChartContainer>
        <div
          className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground"
          aria-label="Providers"
        >
          {series.map((entry) => (
            <div key={entry.key} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.label}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
