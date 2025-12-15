import { tool } from "ai";
import { z } from "zod";

export const readUrlContent = tool({
  description:
    "Read and extract the main content from a webpage URL. Returns clean markdown text suitable for understanding the page content. Use this when a user shares a URL and wants you to read or analyze its content.",
  inputSchema: z.object({
    url: z.string().url().describe("The URL of the webpage to read"),
  }),
  execute: async ({ url }) => {
    const response = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Accept: "text/markdown" },
    });

    if (!response.ok) {
      return { error: `Failed to fetch content from URL: ${response.status}` };
    }

    const content = await response.text();

    // Truncate if too long (to avoid token limits)
    const maxLength = 15000;
    if (content.length > maxLength) {
      return {
        content: content.slice(0, maxLength),
        truncated: true,
        originalLength: content.length,
      };
    }

    return { content, truncated: false };
  },
});












