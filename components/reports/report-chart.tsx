"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

type ReportChartProps = {
  data: Array<Record<string, unknown>>;
  chartType?: string | null;
  chartConfig?: Record<string, unknown>;
};

function isNumericValue(value: unknown): boolean {
  if (typeof value === "number") return true;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return !Number.isNaN(parsed) && Number.isFinite(parsed);
  }
  return false;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseFloat(value);
  return 0;
}

function detectKeys(
  data: Array<Record<string, unknown>>,
  chartConfig?: Record<string, unknown>
): { xKey: string | null; yKeys: string[] } {
  if (!data.length) return { xKey: null, yKeys: [] };

  // Try to use chart config hints first
  const configXKey = chartConfig?.xKey as string | undefined;
  const configYKey = chartConfig?.yKey as string | undefined;

  const keys = Object.keys(data[0]);

  // Find numeric columns by sampling
  const numericKeys: string[] = [];
  const nonNumericKeys: string[] = [];

  for (const key of keys) {
    const sampleValues = data.slice(0, 10).map((row) => row[key]);
    const numericCount = sampleValues.filter(isNumericValue).length;

    if (numericCount > sampleValues.length / 2) {
      numericKeys.push(key);
    } else {
      nonNumericKeys.push(key);
    }
  }

  // Determine x-axis key
  let xKey: string | null = null;
  if (configXKey && keys.includes(configXKey)) {
    xKey = configXKey;
  } else if (nonNumericKeys.length > 0) {
    xKey = nonNumericKeys[0];
  } else if (keys.length > 0) {
    xKey = keys[0];
  }

  // Determine y-axis keys
  let yKeys: string[] = [];
  if (configYKey && keys.includes(configYKey)) {
    yKeys = [configYKey];
  } else if (numericKeys.length > 0) {
    // Filter out xKey from numeric keys
    yKeys = numericKeys.filter((k) => k !== xKey).slice(0, 5);
    // If all keys were numeric and xKey was removed, add the first numeric back
    if (yKeys.length === 0 && numericKeys.length > 0) {
      yKeys = [numericKeys[0]];
    }
  }

  return { xKey, yKeys };
}

function generateChartConfig(yKeys: string[]): ChartConfig {
  const colors = [
    "hsl(217, 91%, 60%)",   // Blue
    "hsl(142, 76%, 36%)",   // Green
    "hsl(262, 83%, 58%)",   // Purple
    "hsl(24, 94%, 53%)",    // Orange
    "hsl(346, 87%, 57%)",   // Pink
  ];

  const config: ChartConfig = {};
  for (let i = 0; i < yKeys.length; i++) {
    config[yKeys[i]] = {
      label: formatLabel(yKeys[i]),
      color: colors[i % colors.length],
    };
  }
  return config;
}

function formatLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ReportChart({ data, chartType, chartConfig }: ReportChartProps) {
  const { xKey, yKeys } = useMemo(
    () => detectKeys(data, chartConfig),
    [data, chartConfig]
  );

  const config = useMemo(() => generateChartConfig(yKeys), [yKeys]);

  const normalizedData = useMemo(() => {
    return data.map((row) => {
      const normalized: Record<string, unknown> = { ...row };
      for (const yKey of yKeys) {
        normalized[yKey] = toNumber(row[yKey]);
      }
      return normalized;
    });
  }, [data, yKeys]);

  if (!xKey || yKeys.length === 0 || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border bg-muted/30">
        <p className="text-sm text-muted-foreground">
          Unable to detect chart axes from data
        </p>
      </div>
    );
  }

  const normalizedType = chartType?.toLowerCase() ?? "bar";

  return (
    <ChartContainer config={config} className="min-h-[300px] w-full">
      {normalizedType.includes("line") ? (
        <LineChart data={normalizedData} accessibilityLayer>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {yKeys.length > 1 && (
            <ChartLegend content={<ChartLegendContent />} />
          )}
          {yKeys.map((yKey) => (
            <Line
              key={yKey}
              type="monotone"
              dataKey={yKey}
              stroke={`var(--color-${yKey})`}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      ) : normalizedType.includes("area") ? (
        <AreaChart data={normalizedData} accessibilityLayer>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {yKeys.length > 1 && (
            <ChartLegend content={<ChartLegendContent />} />
          )}
          {yKeys.map((yKey) => (
            <Area
              key={yKey}
              type="monotone"
              dataKey={yKey}
              fill={`var(--color-${yKey})`}
              stroke={`var(--color-${yKey})`}
              fillOpacity={0.3}
            />
          ))}
        </AreaChart>
      ) : (
        <BarChart data={normalizedData} accessibilityLayer>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {yKeys.length > 1 && (
            <ChartLegend content={<ChartLegendContent />} />
          )}
          {yKeys.map((yKey) => (
            <Bar
              key={yKey}
              dataKey={yKey}
              fill={`var(--color-${yKey})`}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      )}
    </ChartContainer>
  );
}
