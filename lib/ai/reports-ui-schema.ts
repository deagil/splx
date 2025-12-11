import { z } from "zod";

export const reportOptionSchema = z.object({
  label: z.string().describe("Display label for the option"),
  value: z.string().describe("Value to send when option is selected"),
});

export const reportDataSchema = z.object({
  id: z.string().optional().describe("Proposed report id/slug"),
  title: z.string().describe("Report title"),
  description: z.string().optional().describe("Report description"),
  sql: z.string().describe("SQL query to produce chart-ready dataset"),
  chart_type: z.string().optional().describe("Recommended chart type"),
  chart_config: z.record(z.string(), z.unknown()).optional().describe(
    "Chart configuration hints",
  ),
});

export const reportUISchema = z.object({
  type: z
    .enum(["question", "variants", "clarification", "final-report"])
    .describe("Type of UI component to render"),
  message: z.string().describe("Message or question to display to the user"),
  options: z.array(reportOptionSchema).optional().describe(
    "Options for the user to pick",
  ),
  report: reportDataSchema.optional().describe(
    "Final report definition when type=final-report",
  ),
});

export type ReportUI = z.infer<typeof reportUISchema>;
export type ReportOption = z.infer<typeof reportOptionSchema>;
export type ReportData = z.infer<typeof reportDataSchema>;




