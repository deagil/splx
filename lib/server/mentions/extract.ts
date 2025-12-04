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
 * Uses pre-fetched content if available, otherwise fetches via Jina Reader API
 * Skips retry if pre-fetch already failed with a known error (e.g., domain blocked)
 */
export async function extractUrlMentionData(
  mention: UrlMention & { 
    prefetchedContent?: string;
    contentStatus?: "loading" | "loaded" | "error";
    contentError?: string;
  }
): Promise<string> {
  try {
    // Check if we have pre-fetched content (saves ~20-30s!)
    if (mention.prefetchedContent) {
      console.log(`[URL Enrichment] Using pre-fetched content for ${mention.url} (${mention.prefetchedContent.length} chars)`);
      
      // Format with title and URL info
      let result = `[Web Page: ${mention.title || mention.label}]\n`;
      result += `URL: ${mention.url}\n`;
      result += `(Content pre-fetched by client)\n`;
      result += `\n${mention.prefetchedContent}`;

      return result;
    }

    // If pre-fetch failed with a known error (e.g., domain blocked), skip retry
    // Both use the same service, so retry would likely fail too
    if (mention.contentStatus === "error" && mention.contentError) {
      const errorLower = mention.contentError.toLowerCase();
      if (errorLower.includes("blocked") || errorLower.includes("domain temporarily")) {
        console.log(`[URL Enrichment] Skipping retry - pre-fetch already failed with known error: ${mention.url}`);
        return `[Web Page Reference: ${mention.title || mention.label}]\nURL: ${mention.url}\n\n(Note: Full content could not be retrieved - the content service has temporarily blocked this domain. The user referenced this URL in their message.)`;
      }
    }

    // Fallback: fetch via Jina Reader (slow path)
    // Only attempt if pre-fetch didn't fail or failed for unknown reason
    console.log(`[URL Enrichment] No pre-fetched content, fetching via Jina Reader for ${mention.url}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    
    const response = await fetch(`https://r.jina.ai/${mention.url}`, {
      signal: controller.signal,
      headers: { 
        Accept: "text/markdown",
        "User-Agent": "Mozilla/5.0 (compatible; SplxBot/1.0)",
      },
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      
      // Check if domain is blocked
      if (response.status === 451 || errorText.includes("blocked")) {
        console.warn(`[URL Enrichment] Domain blocked by Jina Reader: ${mention.url}`);
        return `[Web Page Reference: ${mention.title || mention.label}]\nURL: ${mention.url}\n\n(Note: Full content could not be retrieved - the content service has temporarily blocked this domain. The user referenced this URL in their message.)`;
      }
      
      console.warn(`[URL Enrichment] Failed to fetch ${mention.url}: ${response.status}`);
      return `[Web Page Reference: ${mention.title || mention.label}]\nURL: ${mention.url}\n\n(Note: Full content could not be retrieved. The user referenced this URL in their message.)`;
    }

    const content = await response.text();

    // Truncate if too long (to avoid token limits)
    const maxLength = 15000;
    const truncated = content.length > maxLength;
    const finalContent = truncated ? content.slice(0, maxLength) : content;

    console.log(`[URL Enrichment] Fetched ${mention.url} (${content.length} chars${truncated ? ", truncated" : ""})`);

    // Format with title and URL info
    let result = `[Web Page: ${mention.title || mention.label}]\n`;
    result += `URL: ${mention.url}\n`;
    if (truncated) {
      result += `(Content truncated from ${content.length} to ${maxLength} characters)\n`;
    }
    result += `\n${finalContent}`;

    return result;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.warn(`[URL Enrichment] Timeout fetching ${mention.url}`);
      return `[Web Page Reference: ${mention.title || mention.label}]\nURL: ${mention.url}\n\n(Note: Request timed out while fetching content. The user referenced this URL in their message.)`;
    }
    
    console.error(`[URL Enrichment] Error for ${mention.url}:`, error);
    return `[Web Page Reference: ${mention.title || mention.label}]\nURL: ${mention.url}\n\n(Note: Could not fetch content - ${error instanceof Error ? error.message : "Unknown error"}. The user referenced this URL in their message.)`;
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

