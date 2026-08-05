import { z } from "zod";

export const reportOptionSchema = z.object({
  label: z.string().describe("Display label for the option"),
  value: z.string().describe("Value to send when option is selected"),
});

export const reportDataSchema = z.object({
  chart_config: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Chart configuration hints"),
  chart_type: z.string().optional().describe("Recommended chart type"),
  description: z.string().optional().describe("Report description"),
  id: z.string().optional().describe("Proposed report id/slug"),
  sql: z.string().describe("SQL query to produce chart-ready dataset"),
  title: z.string().describe("Report title"),
});

export const reportUISchema = z.object({
  message: z.string().describe("Message or question to display to the user"),
  options: z
    .array(reportOptionSchema)
    .optional()
    .describe("Options for the user to pick"),
  report: reportDataSchema
    .optional()
    .describe("Final report definition when type=final-report"),
  type: z
    .enum(["question", "variants", "clarification", "final-report"])
    .describe("Type of UI component to render"),
});

export type ReportUI = z.infer<typeof reportUISchema>;
export type ReportOption = z.infer<typeof reportOptionSchema>;
export type ReportData = z.infer<typeof reportDataSchema>;
