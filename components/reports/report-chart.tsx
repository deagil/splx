"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface ReportChartProps {
  chartConfig?: Record<string, unknown>;
  chartType?: string | null;
  data: Record<string, unknown>[];
}

function isNumericValue(value: unknown): boolean {
  if (typeof value === "number") {
    return true;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return !Number.isNaN(parsed) && Number.isFinite(parsed);
  }
  return false;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return Number.parseFloat(value);
  }
  return 0;
}

function detectKeys(
  data: Record<string, unknown>[],
  chartConfig?: Record<string, unknown>
): { xKey: string | null; yKeys: string[] } {
  if (!data.length) {
    return { xKey: null, yKeys: [] };
  }

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
    [xKey] = nonNumericKeys;
  } else if (keys.length > 0) {
    [xKey] = keys;
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
    "hsl(217, 91%, 60%)", // Blue
    "hsl(142, 76%, 36%)", // Green
    "hsl(262, 83%, 58%)", // Purple
    "hsl(24, 94%, 53%)", // Orange
    "hsl(346, 87%, 57%)", // Pink
  ];

  const config: ChartConfig = {};
  for (let i = 0; i < yKeys.length; i += 1) {
    config[yKeys[i]] = {
      color: colors[i % colors.length],
      label: formatLabel(yKeys[i]),
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

export function ReportChart({
  data,
  chartType,
  chartConfig,
}: ReportChartProps) {
  const { xKey, yKeys } = useMemo(
    () => detectKeys(data, chartConfig),
    [data, chartConfig]
  );

  const config = useMemo(() => generateChartConfig(yKeys), [yKeys]);

  const normalizedData = useMemo(
    () =>
      data.map((row) => {
        const normalized: Record<string, unknown> = { ...row };
        for (const yKey of yKeys) {
          normalized[yKey] = toNumber(row[yKey]);
        }
        return normalized;
      }),
    [data, yKeys]
  );

  if (!xKey || yKeys.length === 0 || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border bg-muted/30">
        <p className="text-muted-foreground text-sm">
          Unable to detect chart axes from data
        </p>
      </div>
    );
  }

  const normalizedType = chartType?.toLowerCase() ?? "bar";

  return (
    <ChartContainer className="min-h-[300px] w-full" config={config}>
      {normalizedType.includes("line") ? (
        <LineChart accessibilityLayer data={normalizedData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey={xKey}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis axisLine={false} tickLine={false} tickMargin={8} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {yKeys.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
          {yKeys.map((yKey) => (
            <Line
              dataKey={yKey}
              dot={false}
              key={yKey}
              stroke={`var(--color-${yKey})`}
              strokeWidth={2}
              type="monotone"
            />
          ))}
        </LineChart>
      ) : normalizedType.includes("area") ? (
        <AreaChart accessibilityLayer data={normalizedData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey={xKey}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis axisLine={false} tickLine={false} tickMargin={8} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {yKeys.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
          {yKeys.map((yKey) => (
            <Area
              dataKey={yKey}
              fill={`var(--color-${yKey})`}
              fillOpacity={0.3}
              key={yKey}
              stroke={`var(--color-${yKey})`}
              type="monotone"
            />
          ))}
        </AreaChart>
      ) : (
        <BarChart accessibilityLayer data={normalizedData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey={xKey}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis axisLine={false} tickLine={false} tickMargin={8} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {yKeys.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
          {yKeys.map((yKey) => (
            <Bar
              dataKey={yKey}
              fill={`var(--color-${yKey})`}
              key={yKey}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      )}
    </ChartContainer>
  );
}
