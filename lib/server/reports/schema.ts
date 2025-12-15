import { z } from "zod";

export const reportIdSchema = z
  .string()
  .min(1, "Report id is required")
  .max(64, "Report id must be 64 characters or fewer")
  .regex(
    /^[a-z0-9_-]+$/,
    "Report id must use lowercase alphanumerics, hyphen, or underscore",
  );

export const reportChartConfigSchema = z.record(z.string(), z.unknown())
  .default({});

export const createReportSchema = z.object({
  id: reportIdSchema,
  title: z.string().min(1, "Title is required").max(
    160,
    "Title must be 160 characters or fewer",
  ),
  description: z.string().max(
    512,
    "Description must be 512 characters or fewer",
  ).optional(),
  sql: z.string().min(1, "SQL is required"),
  chart_type: z.string().optional(),
  chart_config: reportChartConfigSchema.optional(),
});

export const reportRecordSchema = z.object({
  id: reportIdSchema,
  workspace_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  sql: z.string(),
  chart_type: z.string().nullable(),
  chart_config: reportChartConfigSchema,
  created_by: z.string().uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ReportId = z.infer<typeof reportIdSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ReportRecord = z.infer<typeof reportRecordSchema>;






