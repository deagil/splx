"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartTypes = ["bar", "line", "area", "pie"] as const;

const colors = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 76%, 36%)",
  "hsl(262, 83%, 58%)",
  "hsl(24, 94%, 53%)",
];

function generateRandomData() {
  return [
    { name: "A", value: Math.floor(Math.random() * 100) + 20 },
    { name: "B", value: Math.floor(Math.random() * 100) + 20 },
    { name: "C", value: Math.floor(Math.random() * 100) + 20 },
    { name: "D", value: Math.floor(Math.random() * 100) + 20 },
    { name: "E", value: Math.floor(Math.random() * 100) + 20 },
  ];
}

const chartConfig: ChartConfig = {
  value: {
    color: "hsl(217, 91%, 60%)",
    label: "Value",
  },
};

export function ReportLoadingAnimation() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [data, setData] = useState(generateRandomData());
  const [dataKey, setDataKey] = useState(0);

  // Change chart type every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % chartTypes.length);
      setDataKey(0); // Reset data animation when chart changes
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Animate data changes within each chart (every 2 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setData(generateRandomData());
      setDataKey((prev) => prev + 1);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const currentType = chartTypes[currentIndex];

  return (
    <div className="flex flex-col items-center justify-center space-y-6">
      <AnimatePresence mode="wait">
        <motion.div
          animate={{ opacity: 1, rotateY: 0, scale: 1 }}
          className="w-full"
          exit={{ opacity: 0, rotateY: 20, scale: 0.9 }}
          initial={{ opacity: 0, rotateY: -20, scale: 0.9 }}
          key={currentIndex}
          transition={{ duration: 0.5 }}
        >
          <ChartContainer className="h-[200px] w-full" config={chartConfig}>
            {currentType === "bar" && (
              <BarChart accessibilityLayer data={data} key={dataKey}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis axisLine={false} dataKey="name" tickLine={false} />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="value"
                  fill="var(--color-value)"
                  radius={[4, 4, 0, 0]}
                >
                  {data.map((_, index) => (
                    <Cell
                      fill={colors[index % colors.length]}
                      key={`cell-${index}`}
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
            {currentType === "line" && (
              <LineChart accessibilityLayer data={data} key={dataKey}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis axisLine={false} dataKey="name" tickLine={false} />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  dataKey="value"
                  dot={{ r: 4 }}
                  stroke="var(--color-value)"
                  strokeWidth={2}
                  type="monotone"
                />
              </LineChart>
            )}
            {currentType === "area" && (
              <AreaChart accessibilityLayer data={data} key={dataKey}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis axisLine={false} dataKey="name" tickLine={false} />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  dataKey="value"
                  fill="var(--color-value)"
                  fillOpacity={0.3}
                  stroke="var(--color-value)"
                  type="monotone"
                />
              </AreaChart>
            )}
            {currentType === "pie" && (
              <PieChart key={dataKey}>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  cx="50%"
                  cy="50%"
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={60}
                >
                  {data.map((_, index) => (
                    <Cell
                      fill={colors[index % colors.length]}
                      key={`cell-${index}`}
                    />
                  ))}
                </Pie>
              </PieChart>
            )}
          </ChartContainer>
        </motion.div>
      </AnimatePresence>

      <div className="space-y-2 text-center">
        <motion.p
          animate={{ opacity: [1, 0.5, 1] }}
          className="font-medium text-foreground text-sm"
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
        >
          Generating your report...
        </motion.p>
        <div className="flex items-center justify-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              animate={{
                opacity: [0.5, 1, 0.5],
                scale: [1, 1.5, 1],
              }}
              className="h-1.5 w-1.5 rounded-full bg-primary"
              key={i}
              transition={{
                delay: i * 0.2,
                duration: 1.5,
                repeat: Number.POSITIVE_INFINITY,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
