"use client";

import { CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from "recharts";
import { useBrowserDateFormatter } from "../quotes/use-browser-date-formatter.js";
import { Card } from "../ui/card.js";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart.js";

const chartConfig = {
  Wise: { label: "Wise", color: "#2563eb" },
  Revolut: { label: "Revolut", color: "#b93429" },
};

function formatDuration(value) {
  return `${(Number(value) / 1000).toFixed(2)} s`;
}

export default function ProviderRunDurationChart({ data }) {
  const formatDate = useBrowserDateFormatter();

  if (!data.length) {
    return (
      <Card className="p-5">
        <h3 className="font-semibold">Provider time per run</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Provider timing charts will appear after a run with timing data is
          recorded.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5 sm:p-6">
      <h3 className="font-semibold">Provider time per run</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Provider time runs from its first job starting to its last job
        finishing, including gaps between jobs. Concurrent jobs are counted
        once. Older runs without elapsed timing are shown as gaps.
      </p>
      <ChartContainer
        config={chartConfig}
        className="mt-4 aspect-[4/3] sm:aspect-[2/1]"
      >
        <LineChart data={data} margin={{ left: 8, right: 12, top: 10 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="runAt"
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            tickFormatter={(value) =>
              formatDate(value, { month: "short", day: "numeric" })
            }
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={50}
            tickFormatter={(value) => `${(Number(value) / 1000).toFixed(1)}s`}
          />
          <Legend />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value) =>
                  formatDate(value, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                }
                formatter={(value) => formatDuration(value)}
              />
            }
          />
          {Object.entries(chartConfig).map(([provider, config]) => (
            <Line
              key={provider}
              dataKey={provider}
              name={config.label}
              type="monotone"
              stroke={config.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
    </Card>
  );
}
