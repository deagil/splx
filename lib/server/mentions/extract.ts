/**
 * Server-side mention data extraction utilities
 */

import { createClient } from "@/lib/supabase/server";
import type {
  Mention,
  PageMention,
  BlockMention,
  TableMention,
  RecordMention,
  UserMention,
  LookupMention,
  UrlMention,
} from "@/lib/types/mentions";

/**
 * Extract data for a page mention
 */
export async function extractPageMentionData(
  mention: PageMention
): Promise<string> {
  try {
    if (!mention.id && !mention.pageId) {
      return `[Page Context: ${mention.label}]\n\nPage context includes all visible blocks and data on the current page.`;
    }

    const supabase = await createClient();
    const pageId = mention.pageId || mention.id;

    if (!pageId) {
      return `[Page Context: ${mention.label}]\n\nPage context includes all visible blocks and data on the current page.`;
    }

    // Fetch page metadata
    const { data: page, error } = await supabase
      .from("pages")
      .select("*")
      .eq("id", pageId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!page) {
      return `[Page Context: ${mention.label}]\n\nPage not found.`;
    }

    // Format page info
    let result = `[Page: ${page.name || mention.label}]\n\n`;

    if (page.description) {
      result += `Description: ${page.description}\n\n`;
    }

    result += "Note: Block data from this page is included in the context.";

    return result;
  } catch (error) {
    console.error(`Error extracting page mention data:`, error);
    return `[Page Context: ${mention.label}]\n\nError loading page data: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

/**
 * Extract data for a block mention
 */
export async function extractBlockMentionData(
  mention: BlockMention
): Promise<string> {
  try {
    const supabase = await createClient();

    // For list and record blocks, fetch data from the table
    if ((mention.blockType === "list" || mention.blockType === "record") && mention.tableName) {
      // Fetch data from the table (limit to 10 rows for list blocks)
      const query = supabase
        .from(mention.tableName)
        .select("*");

      if (mention.blockType === "list") {
        query.limit(10);
      } else {
        query.limit(1);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      if (!data || data.length === 0) {
        return `[Block: ${mention.label}]\n\n${mention.blockType} block (${mention.tableName})\n\nNo data found.`;
      }

      // Format data as readable text
      const rows = data.map((row: any, idx: number) => {
        const fields = Object.entries(row)
          .map(([key, value]) => `  ${key}: ${String(value)}`)
          .join("\n");
        return mention.blockType === "list"
          ? `Row ${idx + 1}:\n${fields}`
          : fields;
      }).join("\n\n");

      const countInfo = mention.blockType === "list" && data.length >= 10
        ? "(showing first 10 rows)"
        : "";

      return `[Block: ${mention.label}]\n\n${mention.blockType} block (${mention.tableName}) ${countInfo}\n\n${rows}`;
    }

    // For other block types, return basic info
    return `[Block: ${mention.label}]\n\n${mention.blockType} block${mention.tableName ? ` (table: ${mention.tableName})` : ""}`;
  } catch (error) {
    console.error(`Error extracting block mention data:`, error);
    return `[Block: ${mention.label}]\n\nError loading block data: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

/**
 * Extract data for a table mention (lookup)
 */
export async function extractTableMentionData(
  mention: TableMention
): Promise<string> {
  try {
    const supabase = await createClient();

    // Fetch first 10 rows from the table
    const query = supabase
      .from(mention.tableName)
      .select("*")
      .limit(10);

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      return `[Table: ${mention.tableName}]\n\nNo data found in this table.`;
    }

    // Format data as readable text
    const rows = data.slice(0, 10).map((row: any, idx: number) => {
      const fields = Object.entries(row)
        .map(([key, value]) => `  ${key}: ${String(value)}`)
        .join("\n");
      return `Row ${idx + 1}:\n${fields}`;
    }).join("\n\n");

    const countInfo = data.length < 10
      ? `(showing all ${data.length} rows)`
      : "(showing first 10 rows)";

    return `[Table: ${mention.tableName}] ${countInfo}\n\n${rows}`;
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
    const supabase = await createClient();

    // Fetch the specific record
    const { data, error } = await supabase
      .from(mention.tableName)
      .select("*")
      .eq("id", mention.recordId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return `[Record: ${mention.tableName}:${mention.recordId}]\n\nRecord not found.`;
    }

    // Format record data as readable text
    const fields = Object.entries(data)
      .map(([key, value]) => `  ${key}: ${String(value)}`)
      .join("\n");

    return `[Record: ${mention.tableName}:${mention.recordId}]\n\n${fields}`;
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
  try {
    const supabase = await createClient();

    // Get current user if no specific user ID provided
    const userId = mention.userId || (await supabase.auth.getUser()).data.user?.id;

    if (!userId) {
      return `[User Profile: ${mention.label}]\n\nUser not authenticated.`;
    }

    // Fetch user profile from users table
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return `[User Profile: ${mention.label}]\n\nUser profile not found.`;
    }

    // Format user data as readable text
    const fields = Object.entries(data)
      .filter(([key]) => !["password", "password_hash"].includes(key)) // Don't expose sensitive data
      .map(([key, value]) => `  ${key}: ${String(value)}`)
      .join("\n");

    return `[User Profile: ${mention.label}]\n\n${fields}`;
  } catch (error) {
    console.error(`Error extracting user mention data:`, error);
    return `[User Profile: ${mention.label}]\n\nError loading user data: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
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
 * Extract data for a URL mention
 * Fetches full page content via Jina Reader API
 */
export async function extractUrlMentionData(
  mention: UrlMention
): Promise<string> {
  try {
    // Use Jina Reader to fetch full content in markdown format
    const response = await fetch(`https://r.jina.ai/${mention.url}`, {
      headers: { Accept: "text/markdown" },
    });

    if (!response.ok) {
      return `[URL: ${mention.title || mention.url}]\n\nFailed to fetch content from URL: ${response.status}`;
    }

    const content = await response.text();

    // Truncate if too long (to avoid token limits)
    const maxLength = 15000;
    const truncated = content.length > maxLength;
    const finalContent = truncated ? content.slice(0, maxLength) : content;

    // Format with title and URL info
    let result = `[Web Page: ${mention.title || mention.label}]\n`;
    result += `URL: ${mention.url}\n`;
    if (truncated) {
      result += `(Content truncated from ${content.length} to ${maxLength} characters)\n`;
    }
    result += `\n${finalContent}`;

    return result;
  } catch (error) {
    console.error(`Error extracting URL mention data:`, error);
    return `[URL: ${mention.title || mention.url}]\n\nError fetching content: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
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
    case "url":
      return extractUrlMentionData(mention);
    default:
      return `[Unknown mention type]`;
  }
}

