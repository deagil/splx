import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import { getPageById, listPages } from "@/lib/server/pages/repository";
import { resolveTenantContext } from "@/lib/server/tenant/context";
import type { ChatMessage } from "@/lib/types";

const whitespaceSplitRegex = /\s+/;

interface NavigateToPageProps {
  dataStream: UIMessageStreamWriter<ChatMessage>;
}

const inputSchema = z.object({
  pageId: z
    .string()
    .optional()
    .describe(
      "The ID of the page to navigate to (takes precedence over pageName)"
    ),
  pageName: z
    .string()
    .optional()
    .describe("The name of the page to navigate to (case-insensitive search)"),
  params: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      "URL parameters to pass to the page (e.g., { userId: '123', view: 'edit' }). Use searchPages first to find what parameters a page requires."
    ),
});

/**
 * AI Tool: Navigate to a page with optional URL parameters
 *
 * This tool navigates the user to a specific page. It can be combined with
 * queryUserTable and searchPages for powerful multi-step workflows:
 *
 * Example: "Take me to John Smith's contact profile"
 * 1. queryUserTable({ tableName: "contacts", filters: [{ column: "name", operator: "contains", value: "John Smith" }] })
 * 2. searchPages({ query: "profile" }) // to find profile page and its required params
 * 3. navigateToPage({ pageId: "profile-page", params: { contactId: "user-123" } })
 *
 * Security:
 * - Uses existing pages repository (respects workspace isolation)
 * - Navigation is client-side only (no server-side redirect)
 */
export const navigateToPage = ({ dataStream }: NavigateToPageProps) =>
  tool({
    description:
      "Navigate the user to a specific page in the app with optional URL parameters. Use searchPages first if you need to know what parameters a page requires. Provide either a page name (for search) or page ID (for direct lookup).",
    execute: async ({ pageName, pageId, params }) => {
      // Validate that at least one of pageName or pageId is provided
      if (!pageName && !pageId) {
        return {
          found: false,
          message: "Either pageName or pageId must be provided.",
        };
      }

      const tenant = await resolveTenantContext();

      // Helper to build URL with params
      const buildUrl = (basePageId: string): string => {
        let url = `/pages/${basePageId}`;
        if (params && Object.keys(params).length > 0) {
          const searchParams = new URLSearchParams(params);
          url += `?${searchParams.toString()}`;
        }
        return url;
      };

      // If pageId provided, look up directly
      if (pageId) {
        const page = await getPageById(tenant, pageId);

        if (!page) {
          return {
            found: false,
            message: `No page found with ID "${pageId}".`,
          };
        }

        const url = buildUrl(page.id);

        // Check if page has required params that weren't provided
        const requiredParams = (page.settings?.urlParams ?? [])
          .filter((p) => p.required)
          .map((p) => p.name);
        const providedParams = params ? Object.keys(params) : [];
        const missingParams = requiredParams.filter(
          (p) => !providedParams.includes(p)
        );

        if (missingParams.length > 0) {
          return {
            found: true,
            message: `Found page "${page.name}" but it requires parameters: ${missingParams.join(
              ", "
            )}. Use queryUserTable to find the appropriate IDs first.`,
            navigated: false,
            pageId: page.id,
            pageName: page.name,
            requiredParams: page.settings?.urlParams ?? [],
            url,
            warning: `Page "${page.name}" requires parameters that were not provided: ${missingParams.join(
              ", "
            )}`,
          };
        }

        // Write navigation event to dataStream
        dataStream.write({
          data: {
            pageId: page.id,
            pageName: page.name,
            url,
          },
          type: "data-navigate",
        });

        return {
          description: page.description,
          found: true,
          message:
            params && Object.keys(params).length > 0
              ? `Navigating to "${page.name}" with parameters.`
              : `Navigating to "${page.name}".`,
          navigated: true,
          pageId: page.id,
          pageName: page.name,
          params: params ?? {},
          url,
        };
      }

      // Search by pageName
      if (pageName) {
        const pages = await listPages(tenant);
        const searchTerm = pageName.toLowerCase().trim();

        // Try exact match first (case-insensitive)
        let matchedPage = pages.find(
          (p) => p.name.toLowerCase() === searchTerm
        );

        // If no exact match, try partial match
        if (!matchedPage) {
          matchedPage = pages.find((p) =>
            p.name.toLowerCase().includes(searchTerm)
          );
        }

        // If still no match, try matching individual words
        if (!matchedPage) {
          const searchWords = searchTerm.split(whitespaceSplitRegex);
          matchedPage = pages.find((p) => {
            const pageNameLower = p.name.toLowerCase();
            return searchWords.every((word) => pageNameLower.includes(word));
          });
        }

        if (!matchedPage) {
          // Return list of available pages for reference
          const availablePages = pages.slice(0, 10).map((p) => ({
            id: p.id,
            name: p.name,
          }));

          return {
            availablePages,
            found: false,
            message: `No page found matching "${pageName}".`,
            suggestions:
              availablePages.length > 0
                ? `Available pages: ${availablePages
                    .map((p) => p.name)
                    .join(", ")}`
                : "No pages available in this workspace.",
          };
        }

        const url = buildUrl(matchedPage.id);

        // Check if page has required params that weren't provided
        const requiredParams = (matchedPage.settings?.urlParams ?? [])
          .filter((p) => p.required)
          .map((p) => p.name);
        const providedParams = params ? Object.keys(params) : [];
        const missingParams = requiredParams.filter(
          (p) => !providedParams.includes(p)
        );

        if (missingParams.length > 0) {
          return {
            found: true,
            message: `Found page "${matchedPage.name}" but it requires parameters: ${missingParams.join(
              ", "
            )}. Use queryUserTable to find the appropriate IDs first.`,
            navigated: false,
            pageId: matchedPage.id,
            pageName: matchedPage.name,
            requiredParams: matchedPage.settings?.urlParams ?? [],
            url,
            warning: `Page "${matchedPage.name}" requires parameters that were not provided: ${missingParams.join(
              ", "
            )}`,
          };
        }

        // Write navigation event to dataStream
        dataStream.write({
          data: {
            pageId: matchedPage.id,
            pageName: matchedPage.name,
            url,
          },
          type: "data-navigate",
        });

        return {
          description: matchedPage.description,
          found: true,
          message:
            params && Object.keys(params).length > 0
              ? `Navigating to "${matchedPage.name}" with parameters.`
              : `Navigating to "${matchedPage.name}".`,
          navigated: true,
          pageId: matchedPage.id,
          pageName: matchedPage.name,
          params: params ?? {},
          url,
        };
      }

      // This shouldn't happen due to refine validation, but TypeScript needs it
      return {
        found: false,
        message: "Either pageName or pageId must be provided.",
      };
    },
    inputSchema,
  });
