import { z } from "zod";

export const reportIdSchema = z
  .string()
  .min(1, "Report id is required")
  .max(64, "Report id must be 64 characters or fewer")
  .regex(
    /^[a-z0-9_-]+$/,
    "Report id must use lowercase alphanumerics, hyphen, or underscore"
  );

export const reportChartConfigSchema = z
  .record(z.string(), z.unknown())
  .default({});

export const createReportSchema = z.object({
  chart_config: reportChartConfigSchema.optional(),
  chart_type: z.string().optional(),
  description: z
    .string()
    .max(512, "Description must be 512 characters or fewer")
    .optional(),
  id: reportIdSchema,
  sql: z.string().min(1, "SQL is required"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(160, "Title must be 160 characters or fewer"),
});

export const reportRecordSchema = z.object({
  chart_config: reportChartConfigSchema,
  chart_type: z.string().nullable(),
  created_at: z.string(),
  created_by: z.string().uuid().nullable(),
  description: z.string().nullable(),
  id: reportIdSchema,
  sql: z.string(),
  title: z.string(),
  updated_at: z.string(),
  workspace_id: z.string().uuid(),
});

export type ReportId = z.infer<typeof reportIdSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ReportRecord = z.infer<typeof reportRecordSchema>;
