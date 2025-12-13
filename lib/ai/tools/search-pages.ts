import { tool } from "ai";
import { z } from "zod";
import { resolveTenantContext } from "@/lib/server/tenant/context";
import { listPages } from "@/lib/server/pages/repository";

const inputSchema = z.object({
  query: z
    .string()
    .optional()
    .describe(
      "Search term for page name or description. Leave empty to list all pages."
    ),
  includeParams: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include URL parameter requirements in results (default true)"),
  includeBlocks: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Include block information to understand what data sources the page uses (default false)"
    ),
});

export type PageSearchResult = {
  id: string;
  name: string;
  description: string | null;
  url: string;
  urlParams?: Array<{
    name: string;
    required: boolean;
    description?: string;
  }>;
  blocks?: Array<{
    id: string;
    type: string;
    dataSource?: {
      tableName?: string;
      [key: string]: unknown;
    };
  }>;
};

/**
 * AI Tool: Search pages in the current workspace
 *
 * This tool allows the AI to search for pages by name/description and retrieve
 * metadata including URL parameters. This is useful for:
 * - Finding the right page to navigate to
 * - Understanding what parameters a page needs (e.g., userId for a profile page)
 * - Chaining with navigateToPage to navigate with correct parameters
 *
 * Security:
 * - Read-only access to page metadata
 * - Uses existing pages repository (respects workspace isolation)
 */
export const searchPages = tool({
  description: `Search for pages in the current workspace. Returns page metadata including URL parameters that may be required. Use this to find pages before navigating, especially when you need to know what parameters a page requires (like userId for a profile page).`,
  inputSchema,
  execute: async ({ query, includeParams, includeBlocks }): Promise<{
    pages: PageSearchResult[];
    totalCount: number;
    message: string;
  }> => {
    const tenant = await resolveTenantContext();
    const allPages = await listPages(tenant);

    let results = allPages;

    // Filter by search query if provided
    if (query && query.trim()) {
      const searchLower = query.toLowerCase().trim();
      const searchWords = searchLower.split(/\s+/);

      results = allPages.filter((page) => {
        const nameLower = page.name.toLowerCase();
        const descLower = page.description?.toLowerCase() ?? "";

        // Check if all search words appear in name or description
        return searchWords.every(
          (word) => nameLower.includes(word) || descLower.includes(word)
        );
      });

      // Sort by relevance: exact match > starts with > contains
      results.sort((a, b) => {
        const aNameLower = a.name.toLowerCase();
        const bNameLower = b.name.toLowerCase();

        // Exact match first
        if (aNameLower === searchLower && bNameLower !== searchLower) return -1;
        if (bNameLower === searchLower && aNameLower !== searchLower) return 1;

        // Starts with second
        if (
          aNameLower.startsWith(searchLower) &&
          !bNameLower.startsWith(searchLower)
        )
          return -1;
        if (
          bNameLower.startsWith(searchLower) &&
          !aNameLower.startsWith(searchLower)
        )
          return 1;

        // Otherwise alphabetical
        return aNameLower.localeCompare(bNameLower);
      });
    }

    // Map to result format
    const pages: PageSearchResult[] = results.map((page) => {
      const result: PageSearchResult = {
        id: page.id,
        name: page.name,
        description: page.description,
        url: `/app/pages/${page.id}`,
      };

      // Include URL params if requested
      if (includeParams) {
        const urlParams = page.settings?.urlParams;
        if (urlParams && Array.isArray(urlParams)) {
          result.urlParams = urlParams.map((param) => ({
            name: param.name,
            required: param.required ?? true,
            description: param.description,
          }));
        } else {
          result.urlParams = [];
        }
      }

      // Include block info if requested
      if (includeBlocks && page.blocks) {
        result.blocks = page.blocks.map((block) => ({
          id: block.id,
          type: block.type,
          dataSource: block.dataSource as { tableName?: string } | undefined,
        }));
      }

      return result;
    });

    const message = query
      ? `Found ${pages.length} page(s) matching "${query}"`
      : `Found ${pages.length} page(s) in workspace`;

    return {
      pages,
      totalCount: pages.length,
      message,
    };
  },
});
