"use client";

import * as React from "react";
import { useId } from "react";
import { ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { cn } from "../../lib/utils";

const ChartContext = React.createContext(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context)
    throw new Error("useChart must be used within a ChartContainer");
  return context;
}

export function ChartContainer({ id, className, children, config, ...props }) {
  const generatedId = useId();
  const chartId = `chart-${id || generatedId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-sector]:outline-none",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartStyle({ id, config }) {
  const colorEntries = Object.entries(config).filter(
    ([, value]) => value.color,
  );
  if (!colorEntries.length) return null;
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `[data-chart=${id}] { ${colorEntries.map(([key, value]) => `--color-${key}: ${value.color};`).join(" ")} }`,
      }}
    />
  );
}

export function ChartTooltip(props) {
  return <RechartsTooltip {...props} />;
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  className,
  indicator = "dot",
  hideLabel = false,
  formatter,
}) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;
  const formattedLabel = labelFormatter
    ? labelFormatter(label, payload)
    : label;

  return (
    <div
      className={cn(
        "grid min-w-[8rem] gap-1.5 rounded-lg border bg-white px-3 py-2 text-xs shadow-xl",
        className,
      )}
    >
      {!hideLabel && <div className="font-medium">{formattedLabel}</div>}
      <div className="grid gap-1.5">
        {payload.map((item) => {
          const key = item.dataKey || item.name;
          const itemConfig = config[key] || {};
          const value = formatter
            ? formatter(item.value, item.name, item, 0, payload)
            : item.value;
          return (
            <div key={key} className="flex w-full items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-[2px]",
                  indicator === "line" && "h-0.5 w-3 rounded-none",
                )}
                style={{ backgroundColor: item.color || itemConfig.color }}
              />
              <span className="text-muted-foreground">
                {itemConfig.label || item.name}
              </span>
              <span className="ml-auto font-mono font-medium tabular-nums text-foreground">
                {formatter ? value : `${value}%`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
