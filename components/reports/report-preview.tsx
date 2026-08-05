"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Code2, Table2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { ReportData } from "@/lib/ai/reports-ui-schema";
import { ReportChart } from "./report-chart";
import { ReportLoadingAnimation } from "./report-loading-animation";

interface ReportPreviewProps {
  isLoading?: boolean;
  queryResult?: Record<string, unknown>[];
  report: ReportData | null;
}

export function ReportPreview({
  report,
  isLoading = false,
  queryResult,
}: ReportPreviewProps) {
  const [sqlExpanded, setSqlExpanded] = useState(false);
  const [dataExpanded, setDataExpanded] = useState(false);

  // Show loading animation while generating
  if (isLoading) {
    return (
      <motion.div
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border bg-background shadow-lg"
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        transition={{
          damping: 30,
          duration: 0.5,
          stiffness: 300,
          type: "spring",
        }}
      >
        <div className="p-12">
          <ReportLoadingAnimation />
        </div>
      </motion.div>
    );
  }

  if (!report) {
    return null;
  }

  const columns =
    queryResult && queryResult.length > 0 ? Object.keys(queryResult[0]) : [];

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border bg-background shadow-lg"
      initial={{ opacity: 0, scale: 0.9, y: 30 }}
      transition={{
        damping: 30,
        duration: 0.5,
        stiffness: 300,
        type: "spring",
      }}
    >
      {/* Header with title and description */}
      <div className="border-b bg-gradient-to-b from-muted/30 to-background p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1.5">
            <h3 className="font-semibold text-xl">{report.title}</h3>
            {!!report.description && (
              <p className="text-muted-foreground text-sm">
                {report.description}
              </p>
            )}
          </div>
          {!!report.chart_type && (
            <Badge className="shrink-0" variant="secondary">
              {report.chart_type}
            </Badge>
          )}
        </div>
      </div>

      {/* Chart visualization */}
      <div className="p-6">
        {queryResult && queryResult.length > 0 ? (
          <ReportChart
            chartConfig={report.chart_config}
            chartType={report.chart_type}
            data={queryResult}
          />
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed bg-muted/30">
            <p className="text-muted-foreground text-sm">
              Chart will render when query executes
            </p>
          </div>
        )}
      </div>

      {/* Expandable SQL section */}
      <div className="border-t">
        <button
          className="flex w-full items-center justify-between px-6 py-4 font-medium text-sm transition-colors hover:bg-muted/50"
          onClick={() => setSqlExpanded(!sqlExpanded)}
          type="button"
        >
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-muted-foreground" />
            <span>SQL Query</span>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${
              sqlExpanded ? "rotate-180" : ""
            }`}
          />
        </button>
        <AnimatePresence>
          {!!sqlExpanded && (
            <motion.div
              animate={{ height: "auto", opacity: 1 }}
              className="overflow-hidden"
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="border-t bg-muted/30 px-6 py-4">
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border bg-background p-4 font-mono text-foreground text-xs">
                  {formatSQL(report.sql)}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Expandable data results section */}
      {queryResult && queryResult.length > 0 && (
        <div className="border-t">
          <button
            className="flex w-full items-center justify-between px-6 py-4 font-medium text-sm transition-colors hover:bg-muted/50"
            onClick={() => setDataExpanded(!dataExpanded)}
            type="button"
          >
            <div className="flex items-center gap-2">
              <Table2 className="h-4 w-4 text-muted-foreground" />
              <span>Data Results</span>
              <Badge className="text-xs" variant="outline">
                {queryResult.length} {queryResult.length === 1 ? "row" : "rows"}
              </Badge>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                dataExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
          <AnimatePresence>
            {!!dataExpanded && (
              <motion.div
                animate={{ height: "auto", opacity: 1 }}
                className="overflow-hidden"
                exit={{ height: 0, opacity: 0 }}
                initial={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="border-t bg-muted/30 px-6 py-4">
                  <div className="max-h-96 overflow-auto rounded-md border bg-background">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 border-b bg-muted/50">
                        <tr>
                          {columns.map((col) => (
                            <th
                              className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground"
                              key={col}
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResult.map((row, rowIndex) => (
                          <tr className="border-b last:border-0" key={rowIndex}>
                            {columns.map((col) => (
                              <td
                                className="whitespace-nowrap px-3 py-2"
                                key={col}
                              >
                                {formatCellValue(row[col])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

function formatSQL(sql: string): string {
  const keywords = [
    "SELECT",
    "FROM",
    "WHERE",
    "GROUP BY",
    "ORDER BY",
    "HAVING",
    "LIMIT",
    "JOIN",
    "LEFT JOIN",
    "RIGHT JOIN",
    "INNER JOIN",
    "ON",
    "AND",
    "OR",
  ];
  let formatted = sql;

  for (const keyword of keywords) {
    const regex = new RegExp(`\\b(${keyword})\\b`, "gi");
    formatted = formatted.replace(regex, "\n$1");
  }

  return formatted.replace(/\n+/g, "\n").trim();
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
