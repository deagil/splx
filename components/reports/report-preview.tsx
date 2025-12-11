"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Code2, Table2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ReportData } from "@/lib/ai/reports-ui-schema";
import { ReportLoadingAnimation } from "./report-loading-animation";
import { ReportChart } from "./report-chart";

type ReportPreviewProps = {
  report: ReportData | null;
  isLoading?: boolean;
  queryResult?: Array<Record<string, unknown>>;
};

export function ReportPreview({ report, isLoading = false, queryResult }: ReportPreviewProps) {
  const [sqlExpanded, setSqlExpanded] = useState(false);
  const [dataExpanded, setDataExpanded] = useState(false);

  // Show loading animation while generating
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 300, damping: 30 }}
        className="overflow-hidden rounded-2xl border bg-background shadow-lg"
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

  const columns = queryResult && queryResult.length > 0 ? Object.keys(queryResult[0]) : [];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 300, damping: 30 }}
      className="overflow-hidden rounded-2xl border bg-background shadow-lg"
    >
      {/* Header with title and description */}
      <div className="border-b bg-gradient-to-b from-muted/30 to-background p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1.5">
            <h3 className="text-xl font-semibold">{report.title}</h3>
            {report.description && (
              <p className="text-sm text-muted-foreground">{report.description}</p>
            )}
          </div>
          {report.chart_type && (
            <Badge variant="secondary" className="shrink-0">
              {report.chart_type}
            </Badge>
          )}
        </div>
      </div>

      {/* Chart visualization */}
      <div className="p-6">
        {queryResult && queryResult.length > 0 ? (
          <ReportChart
            data={queryResult}
            chartType={report.chart_type}
            chartConfig={report.chart_config}
          />
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed bg-muted/30">
            <p className="text-sm text-muted-foreground">
              Chart will render when query executes
            </p>
          </div>
        )}
      </div>

      {/* Expandable SQL section */}
      <div className="border-t">
        <button
          type="button"
          onClick={() => setSqlExpanded(!sqlExpanded)}
          className="flex w-full items-center justify-between px-6 py-4 text-sm font-medium hover:bg-muted/50 transition-colors"
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
          {sqlExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="border-t bg-muted/30 px-6 py-4">
                <pre className="overflow-x-auto text-xs font-mono text-foreground whitespace-pre-wrap rounded-md border bg-background p-4">
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
            type="button"
            onClick={() => setDataExpanded(!dataExpanded)}
            className="flex w-full items-center justify-between px-6 py-4 text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Table2 className="h-4 w-4 text-muted-foreground" />
              <span>Data Results</span>
              <Badge variant="outline" className="text-xs">
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
            {dataExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="border-t bg-muted/30 px-6 py-4">
                  <div className="max-h-96 overflow-auto rounded-md border bg-background">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 border-b bg-muted/50">
                        <tr>
                          {columns.map((col) => (
                            <th
                              key={col}
                              className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResult.map((row, rowIndex) => (
                          <tr key={rowIndex} className="border-b last:border-0">
                            {columns.map((col) => (
                              <td key={col} className="whitespace-nowrap px-3 py-2">
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
  const keywords = ["SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", "LIMIT", "JOIN", "LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "ON", "AND", "OR"];
  let formatted = sql;

  for (const keyword of keywords) {
    const regex = new RegExp(`\\b(${keyword})\\b`, "gi");
    formatted = formatted.replace(regex, `\n$1`);
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
