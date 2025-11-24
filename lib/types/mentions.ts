/**
 * Mention types and schemas for AI chat mentions system
 */

import { z } from "zod";

/**
 * Mention types that can be referenced in chat
 */
export type MentionType =
  | "page" // Current page data
  | "block" // Specific block on page
  | "table" // Table lookup
  | "record" // Specific record
  | "user" // User profile
  | "lookup"; // Generic data lookup

/**
 * Base mention metadata
 */
export const mentionMetadataSchema = z.object({
  type: z.enum(["page", "block", "table", "record", "user", "lookup"]),
  id: z.string().optional(), // ID for the mentioned resource
  label: z.string(), // Display label
  description: z.string().optional(), // Optional description
});

export type MentionMetadata = z.infer<typeof mentionMetadataSchema>;

/**
 * Page mention - references all data from current page
 */
export const pageMentionSchema = mentionMetadataSchema.extend({
  type: z.literal("page"),
  pageId: z.string().optional(), // Optional page ID if not current page
});

export type PageMention = z.infer<typeof pageMentionSchema>;

/**
 * Block mention - references specific block data
 */
export const blockMentionSchema = mentionMetadataSchema.extend({
  type: z.literal("block"),
  blockId: z.string(),
  blockType: z.enum(["list", "record", "report", "trigger"]),
  tableName: z.string().optional(), // For list/record blocks
});

export type BlockMention = z.infer<typeof blockMentionSchema>;

/**
 * Table mention - references table for lookup
 */
export const tableMentionSchema = mentionMetadataSchema.extend({
  type: z.literal("table"),
  tableName: z.string(),
  filter: z.record(z.string(), z.unknown()).optional(), // Optional filter criteria
});

export type TableMention = z.infer<typeof tableMentionSchema>;

/**
 * Record mention - references specific record
 */
export const recordMentionSchema = mentionMetadataSchema.extend({
  type: z.literal("record"),
  tableName: z.string(),
  recordId: z.string(),
});

export type RecordMention = z.infer<typeof recordMentionSchema>;

/**
 * User mention - references user profile
 */
export const userMentionSchema = mentionMetadataSchema.extend({
  type: z.literal("user"),
  userId: z.string().optional(), // Optional, defaults to current user
});

export type UserMention = z.infer<typeof userMentionSchema>;

/**
 * Lookup mention - generic data lookup
 */
export const lookupMentionSchema = mentionMetadataSchema.extend({
  type: z.literal("lookup"),
  lookupType: z.string(), // Type of lookup (e.g., "errorLogs", "customers")
  query: z.record(z.string(), z.unknown()).optional(), // Query parameters
});

export type LookupMention = z.infer<typeof lookupMentionSchema>;

/**
 * Union of all mention types
 */
export type Mention =
  | PageMention
  | BlockMention
  | TableMention
  | RecordMention
  | UserMention
  | LookupMention;

/**
 * Mention part for message parts array
 * Uses a union of all mention schemas to preserve type-specific fields
 */
export const mentionPartSchema = z.object({
  type: z.literal("mention"),
  mention: z.union([
    pageMentionSchema,
    blockMentionSchema,
    tableMentionSchema,
    recordMentionSchema,
    userMentionSchema,
    lookupMentionSchema,
  ]),
});

export type MentionPart = z.infer<typeof mentionPartSchema>;

/**
 * Mentionable data item for UI display
 */
export type MentionableItem = {
  key: string;
  text: string;
  description?: string;
  icon?: string;
  mention: MentionMetadata;
};

