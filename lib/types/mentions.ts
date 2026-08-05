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
  | "lookup" // Generic data lookup
  | "url"; // Web page URL

/**
 * Base mention metadata
 */
export const mentionMetadataSchema = z.object({
  description: z.string().optional(), // Optional description
  id: z.string().optional(), // ID for the mentioned resource
  label: z.string(), // Display label
  type: z.enum(["page", "block", "table", "record", "user", "lookup", "url"]),
});

export type MentionMetadata = z.infer<typeof mentionMetadataSchema>;

/**
 * Page mention - references all data from current page
 */
export const pageMentionSchema = mentionMetadataSchema.extend({
  pageId: z.string().optional(), // Optional page ID if not current page
  type: z.literal("page"),
});

export type PageMention = z.infer<typeof pageMentionSchema>;

/**
 * Block mention - references specific block data
 */
export const blockMentionSchema = mentionMetadataSchema.extend({
  blockId: z.string(),
  blockType: z.enum(["list", "record", "report", "trigger"]),
  tableName: z.string().optional(), // For list/record blocks
  type: z.literal("block"),
});

export type BlockMention = z.infer<typeof blockMentionSchema>;

/**
 * Table mention - references table for lookup
 */
export const tableMentionSchema = mentionMetadataSchema.extend({
  filter: z.record(z.string(), z.unknown()).optional(), // Optional filter criteria
  tableName: z.string(),
  type: z.literal("table"),
});

export type TableMention = z.infer<typeof tableMentionSchema>;

/**
 * Record mention - references specific record
 */
export const recordMentionSchema = mentionMetadataSchema.extend({
  recordId: z.string(),
  tableName: z.string(),
  type: z.literal("record"),
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
  lookupType: z.string(), // Type of lookup (e.g., "errorLogs", "customers")
  query: z.record(z.string(), z.unknown()).optional(), // Query parameters
  type: z.literal("lookup"),
});

export type LookupMention = z.infer<typeof lookupMentionSchema>;

/**
 * URL mention - references a web page URL
 */
export const urlMentionSchema = mentionMetadataSchema.extend({
  favicon: z.string().optional(), // Favicon URL
  image: z.string().optional(), // OG image URL
  /** Pre-fetched content from Jina Reader (saves ~20-30s during enrichment) */
  prefetchedContent: z.string().optional(),
  title: z.string().optional(), // Page title from OG metadata
  type: z.literal("url"),
  url: z.string().url(), // The full URL
});

export type UrlMention = z.infer<typeof urlMentionSchema>;

/**
 * Union of all mention types
 */
export type Mention =
  | PageMention
  | BlockMention
  | TableMention
  | RecordMention
  | UserMention
  | LookupMention
  | UrlMention;

/**
 * Mention part for message parts array
 * Uses a union of all mention schemas to preserve type-specific fields
 */
export const mentionPartSchema = z.object({
  mention: z.union([
    pageMentionSchema,
    blockMentionSchema,
    tableMentionSchema,
    recordMentionSchema,
    userMentionSchema,
    lookupMentionSchema,
    urlMentionSchema,
  ]),
  type: z.literal("mention"),
});

export type MentionPart = z.infer<typeof mentionPartSchema>;

/**
 * Mentionable data item for UI display
 */
export interface MentionableItem {
  description?: string;
  icon?: string;
  key: string;
  mention: MentionMetadata;
  text: string;
}
