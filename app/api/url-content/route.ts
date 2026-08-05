import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { assertPublicUrl, UnsafeUrlError } from "@/server/lib/safe-url";

/**
 * URL content response type
 */
export interface UrlContent {
  content: string;
  fetchedAt: string;
  originalLength: number;
  truncated: boolean;
  url: string;
}

const MAX_CONTENT_LENGTH = 15_000;

/**
 * GET /api/url-content?url=...
 * Pre-fetches full page content via Jina Reader for URL mentions
 * This runs in the background when URLs are detected in the input
 *
 * Note: This is a best-effort pre-fetch. If it fails, the server will
 * fall back to fetching during enrichment.
 */
export async function GET(request: Request) {
  // Fetches a caller-supplied URL (via Jina Reader) server-side. Previously
  // unauthenticated, so anyone who could reach it could use the app as a
  // proxy.
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "URL parameter is required" },
      {
        status: 400,
      }
    );
  }

  try {
    await assertPublicUrl(url);
  } catch (error) {
    if (error instanceof UnsafeUrlError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  try {
    // Use Jina Reader to fetch full content in markdown format
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000); // 30s timeout

    const jinaUrl = `https://r.jina.ai/${url}`;
    console.log(`[URL Pre-fetch API] Fetching via Jina Reader: ${jinaUrl}`);

    const response = await fetch(jinaUrl, {
      headers: {
        Accept: "text/markdown",
        // Add user agent to avoid being blocked
        "User-Agent": "Mozilla/5.0 (compatible; SplxBot/1.0)",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`[URL Pre-fetch API] Jina response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");

      // Check for specific Jina Reader errors
      if (response.status === 451 || errorText.includes("blocked")) {
        // Domain is blocked by Jina Reader (rate limit / abuse protection)
        console.warn(
          `[URL Pre-fetch API] Domain blocked by Jina Reader: ${url}`
        );
        return NextResponse.json(
          {
            blocked: true,
            details: errorText.slice(0, 200),
            error: "Domain temporarily blocked by content service",
          },
          { status: 451 }
        );
      }

      console.error(
        `[URL Pre-fetch API] Jina Reader error: ${response.status} - ${errorText.slice(
          0,
          200
        )}`
      );
      return NextResponse.json(
        {
          details: errorText.slice(0, 200),
          error: `Failed to fetch URL content: ${response.status}`,
        },
        { status: 502 }
      );
    }

    const content = await response.text();
    const originalLength = content.length;
    const truncated = content.length > MAX_CONTENT_LENGTH;
    const finalContent = truncated
      ? content.slice(0, MAX_CONTENT_LENGTH)
      : content;

    console.log(
      `[URL Pre-fetch API] Success: ${originalLength} chars${
        truncated ? ` (truncated to ${MAX_CONTENT_LENGTH})` : ""
      }`
    );

    const result: UrlContent = {
      content: finalContent,
      fetchedAt: new Date().toISOString(),
      originalLength,
      truncated,
      url,
    };

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error(`[URL Pre-fetch API] Timeout for: ${url}`);
      return NextResponse.json(
        { error: "Request timed out" },
        {
          status: 504,
        }
      );
    }

    console.error(`[URL Pre-fetch API] Error for ${url}:`, error);
    return NextResponse.json(
      {
        details: error instanceof Error ? error.message : "Unknown",
        error: "Failed to fetch content",
      },
      { status: 502 }
    );
  }
}
