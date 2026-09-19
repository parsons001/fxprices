"use client";

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

  const series = Object.entries(
    valid.reduce((groups, point) => {
      const key = point.label;
      groups[key] ??= [];
      groups[key].push({
        ...point,
        date: new Date(point.fetchedAt),
        dateKey: new Date(point.fetchedAt).toISOString().slice(0, 10),
      });
      return groups;
    }, {}),
  ).map(([label, values], index) => ({
    key: `provider${index}`,
    label,
    color: COLORS[index % COLORS.length],
    values: values.sort((a, b) => a.date - b.date),
  }));
  const dates = Array.from(
    new Set(
      valid.map((point) =>
        new Date(point.fetchedAt).toISOString().slice(0, 10),
      ),
    ),
  ).sort();
  const chartData = dates.map((dateKey) =>
    Object.fromEntries([
      ["dateKey", dateKey],
      ...series.map((entry) => [
        entry.key,
        entry.values.find((point) => point.dateKey === dateKey)?.markup ?? null,
      ]),
    ]),
  );
  const markupValues = valid.map((point) => point.markup);
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
    <Card className="mb-4">
      <CardHeader>
        <h3 className="font-semibold">Historic markup trend</h3>
        <p className="text-sm leading-6 text-muted-foreground">
          Markup vs Wise mid-market over the last {days} days for the selected
          amount and currency. 0% matches mid-market.
        </p>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="h-[290px] w-full min-w-[880px]"
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
              tickFormatter={(value) =>
                new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
                  month: "short",
                  day: "numeric",
                })
              }
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
                  labelFormatter={(value) =>
                    new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  }
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
                connectNulls
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
