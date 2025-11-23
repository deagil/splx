/**
 * Server-side mention data extraction utilities
 */

import type {
  Mention,
  PageMention,
  BlockMention,
  TableMention,
  RecordMention,
  UserMention,
  LookupMention,
} from "@/lib/types/mentions";

/**
 * Extract data for a page mention
 */
export async function extractPageMentionData(
  mention: PageMention
): Promise<string> {
  // For now, return a placeholder
  // In production, this would fetch all block data from the page
  return `[Page Context: ${mention.label}]\n\nThis page contains data from multiple blocks.`;
}

/**
 * Extract data for a block mention
 */
export async function extractBlockMentionData(
  mention: BlockMention
): Promise<string> {
  // For now, return a placeholder
  // In production, this would fetch the specific block's data
  return `[Block Context: ${mention.label}]\n\nData from ${mention.blockType} block${mention.tableName ? ` (table: ${mention.tableName})` : ""}.`;
}

/**
 * Extract data for a table mention (lookup)
 */
export async function extractTableMentionData(
  mention: TableMention
): Promise<string> {
  try {
    // For now, return a placeholder
    // In production, this would fetch table data using the existing API endpoints
    // or directly query the database using the resource store
    return `[Table: ${mention.tableName}]\n\nTable data lookup - ${mention.tableName}${mention.filter ? ` (with filters)` : ""}.`;
  } catch (error) {
    console.error(`Error extracting table mention data:`, error);
    return `[Table: ${mention.tableName}]\n\nError loading data: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

/**
 * Extract data for a record mention
 */
export async function extractRecordMentionData(
  mention: RecordMention
): Promise<string> {
  try {
    // For now, return a placeholder
    // In production, this would fetch the specific record using the existing API endpoints
    // or directly query the database using the resource store
    return `[Record: ${mention.tableName}:${mention.recordId}]\n\nRecord data from ${mention.tableName}.`;
  } catch (error) {
    console.error(`Error extracting record mention data:`, error);
    return `[Record: ${mention.tableName}:${mention.recordId}]\n\nError loading data: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

/**
 * Extract data for a user mention
 */
export async function extractUserMentionData(
  mention: UserMention
): Promise<string> {
  // For now, return a placeholder
  // In production, this would fetch user profile data
  return `[User Profile: ${mention.label}]\n\nUser profile information.`;
}

/**
 * Extract data for a lookup mention
 */
export async function extractLookupMentionData(
  mention: LookupMention
): Promise<string> {
  // For now, return a placeholder
  // In production, this would perform the specific lookup
  return `[Lookup: ${mention.lookupType}]\n\nLookup data for ${mention.lookupType}.`;
}

/**
 * Extract data for any mention type
 */
export async function extractMentionData(mention: Mention): Promise<string> {
  switch (mention.type) {
    case "page":
      return extractPageMentionData(mention);
    case "block":
      return extractBlockMentionData(mention);
    case "table":
      return extractTableMentionData(mention);
    case "record":
      return extractRecordMentionData(mention);
    case "user":
      return extractUserMentionData(mention);
    case "lookup":
      return extractLookupMentionData(mention);
    default:
      return `[Unknown mention type]`;
  }
}

