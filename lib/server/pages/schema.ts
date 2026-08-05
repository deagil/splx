import { z } from "zod";

export const pageIdSchema = z
  .string()
  .min(1, "Page id is required")
  .max(64, "Page id must be 64 characters or fewer")
  .regex(
    /^[a-z0-9_-]+$/,
    "Page id must use lowercase alphanumerics, hyphen, or underscore"
  );

export const pageBlockPositionSchema = z.object({
  height: z.number().int().positive().default(4),
  width: z.number().int().positive().default(12),
  x: z.number().int().nonnegative().default(0),
  y: z.number().int().nonnegative().default(0),
});

export const pageBlockTypeSchema = z.enum([
  "list",
  "record",
  "report",
  "trigger",
]);

export const pageBlockSchema = z.object({
  dataSource: z.record(z.string(), z.unknown()).optional(),
  displayConfig: z.record(z.string(), z.unknown()).optional(),
  id: z.string().min(1, "Block id is required"),
  position: pageBlockPositionSchema.optional(),
  type: pageBlockTypeSchema,
});

export const pageUrlParamSchema = z.object({
  description: z
    .string()
    .max(256, "URL parameter description must be 256 characters or fewer")
    .optional(),
  name: z
    .string()
    .min(1, "URL parameter name is required")
    .max(64, "URL parameter name must be 64 characters or fewer"),
  required: z.boolean().default(true),
});

export const pageSettingsSchema = z
  .object({
    hideHeader: z.boolean().optional(),
    urlParams: z.array(pageUrlParamSchema).optional(),
  })
  .catchall(z.unknown())
  .default({});

export const pageLayoutSchema = z.record(z.string(), z.unknown()).default({});

export const createPageSchema = z.object({
  blocks: z.array(pageBlockSchema).optional().default([]),
  description: z
    .string()
    .max(512, "Description must be 512 characters or fewer")
    .optional(),
  id: pageIdSchema,
  layout: pageLayoutSchema.optional().default({}),
  name: z
    .string()
    .min(1, "Name is required")
    .max(120, "Name must be 120 characters or fewer"),
  settings: pageSettingsSchema.optional().default({}),
});

export const updatePageSchema = z.object({
  blocks: z.array(pageBlockSchema).optional(),
  description: z
    .string()
    .max(512, "Description must be 512 characters or fewer")
    .nullable()
    .optional(),
  id: pageIdSchema.optional(),
  layout: pageLayoutSchema.optional(),
  name: z
    .string()
    .min(1, "Name is required")
    .max(120, "Name must be 120 characters or fewer"),
  settings: pageSettingsSchema.optional(),
});

export const pageRecordSchema = z.object({
  blocks: z.array(pageBlockSchema),
  created_at: z.string(),
  created_by: z.string().uuid().nullable(),
  description: z.string().nullable(),
  id: pageIdSchema,
  is_system: z.boolean().default(false),
  layout: pageLayoutSchema,
  name: z.string(),
  settings: pageSettingsSchema,
  updated_at: z.string(),
  workspace_id: z.string().uuid(),
});

export type PageId = z.infer<typeof pageIdSchema>;
export type PageBlock = z.infer<typeof pageBlockSchema>;
export type PageSettings = z.infer<typeof pageSettingsSchema>;
export type PageLayout = z.infer<typeof pageLayoutSchema>;
export type CreatePageInput = z.infer<typeof createPageSchema>;
export type UpdatePageInput = z.infer<typeof updatePageSchema>;
export type PageRecord = z.infer<typeof pageRecordSchema>;
