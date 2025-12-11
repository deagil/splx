"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Area,
  AreaChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartTypes = ["bar", "line", "area", "pie"] as const;

const colors = ["hsl(217, 91%, 60%)", "hsl(142, 76%, 36%)", "hsl(262, 83%, 58%)", "hsl(24, 94%, 53%)"];

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
    label: "Value",
    color: "hsl(217, 91%, 60%)",
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
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.9, rotateY: -20 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          exit={{ opacity: 0, scale: 0.9, rotateY: 20 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            {currentType === "bar" && (
              <BarChart data={data} key={dataKey} accessibilityLayer>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]}>
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            )}
            {currentType === "line" && (
              <LineChart data={data} key={dataKey} accessibilityLayer>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-value)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            )}
            {currentType === "area" && (
              <AreaChart data={data} key={dataKey} accessibilityLayer>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  fill="var(--color-value)"
                  stroke="var(--color-value)"
                  fillOpacity={0.3}
                />
              </AreaChart>
            )}
            {currentType === "pie" && (
              <PieChart key={dataKey}>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                >
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
              </PieChart>
            )}
          </ChartContainer>
        </motion.div>
      </AnimatePresence>

      <div className="space-y-2 text-center">
        <motion.p
          className="text-sm font-medium text-foreground"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
        >
          Generating your report...
        </motion.p>
        <div className="flex items-center justify-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-primary"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Number.POSITIVE_INFINITY,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
