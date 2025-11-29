import { NextResponse } from "next/server";

/**
 * OG Metadata response type
 */
export type OGMetadata = {
    url: string;
    title: string;
    description?: string;
    image?: string;
    favicon?: string;
    siteName?: string;
};

/**
 * Extract Open Graph and basic metadata from HTML
 */
function parseMetadata(html: string, url: string): OGMetadata {
    const getMetaContent = (
        property: string,
        fallbackName?: string,
    ): string | undefined => {
        // Try og: prefix first
        const ogMatch = html.match(
            new RegExp(
                `<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']*)["']`,
                "i",
            ),
        );
        if (ogMatch?.[1]) return ogMatch[1];

        // Try content before property (alternate order)
        const ogMatchAlt = html.match(
            new RegExp(
                `<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:${property}["']`,
                "i",
            ),
        );
        if (ogMatchAlt?.[1]) return ogMatchAlt[1];

        // Try Twitter prefix
        const twitterMatch = html.match(
            new RegExp(
                `<meta[^>]*name=["']twitter:${property}["'][^>]*content=["']([^"']*)["']`,
                "i",
            ),
        );
        if (twitterMatch?.[1]) return twitterMatch[1];

        // Try fallback name attribute
        if (fallbackName) {
            const nameMatch = html.match(
                new RegExp(
                    `<meta[^>]*name=["']${fallbackName}["'][^>]*content=["']([^"']*)["']`,
                    "i",
                ),
            );
            if (nameMatch?.[1]) return nameMatch[1];
        }

        return undefined;
    };

    // Extract title - try og:title, then <title> tag
    let title = getMetaContent("title");
    if (!title) {
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        title = titleMatch?.[1]?.trim() || new URL(url).hostname;
    }

    // Extract description
    const description = getMetaContent("description", "description");

    // Extract image
    const image = getMetaContent("image");

    // Extract site name
    const siteName = getMetaContent("site_name");

    // Extract favicon - try various link tags
    let favicon: string | undefined;

    // Try apple-touch-icon first (usually higher quality)
    const appleIconMatch = html.match(
        /<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']*)["']/i,
    );
    if (appleIconMatch?.[1]) {
        favicon = appleIconMatch[1];
    }

    // Try standard favicon
    if (!favicon) {
        const faviconMatch = html.match(
            /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']*)["']/i,
        );
        if (faviconMatch?.[1]) {
            favicon = faviconMatch[1];
        }
    }

    // Try alternate order (href before rel)
    if (!favicon) {
        const faviconAltMatch = html.match(
            /<link[^>]*href=["']([^"']*)["'][^>]*rel=["'](?:shortcut )?icon["']/i,
        );
        if (faviconAltMatch?.[1]) {
            favicon = faviconAltMatch[1];
        }
    }

    // Default to /favicon.ico if nothing found
    if (!favicon) {
        try {
            const urlObj = new URL(url);
            favicon = `${urlObj.origin}/favicon.ico`;
        } catch {
            // Invalid URL, no favicon
        }
    }

    // Resolve relative URLs to absolute
    const resolveUrl = (
        relativeUrl: string | undefined,
    ): string | undefined => {
        if (!relativeUrl) return undefined;
        try {
            return new URL(relativeUrl, url).href;
        } catch {
            return relativeUrl;
        }
    };

    return {
        url,
        title: decodeHtmlEntities(title),
        description: description ? decodeHtmlEntities(description) : undefined,
        image: resolveUrl(image),
        favicon: resolveUrl(favicon),
        siteName: siteName ? decodeHtmlEntities(siteName) : undefined,
    };
}

/**
 * Decode HTML entities in strings
 */
function decodeHtmlEntities(text: string): string {
    return text
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ");
}

/**
 * GET /api/og-metadata?url=...
 * Fetches Open Graph metadata from a URL
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
        return NextResponse.json({ error: "URL parameter is required" }, {
            status: 400,
        });
    }

    // Validate URL
    try {
        new URL(url);
    } catch {
        return NextResponse.json({ error: "Invalid URL format" }, {
            status: 400,
        });
    }

    try {
        // Fetch the page with a timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (compatible; SplxBot/1.0; +https://splx.studio)",
                Accept:
                    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            return NextResponse.json(
                { error: `Failed to fetch URL: ${response.status}` },
                { status: 502 },
            );
        }

        // Only read first 50KB to get metadata (no need to parse full page)
        const reader = response.body?.getReader();
        if (!reader) {
            return NextResponse.json(
                { error: "Failed to read response" },
                { status: 502 },
            );
        }

        let html = "";
        const decoder = new TextDecoder();
        const maxBytes = 50 * 1024; // 50KB

        while (html.length < maxBytes) {
            const { done, value } = await reader.read();
            if (done) break;
            html += decoder.decode(value, { stream: true });
        }

        reader.cancel();

        const metadata = parseMetadata(html, url);

        return NextResponse.json(metadata);
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            return NextResponse.json({ error: "Request timed out" }, {
                status: 504,
            });
        }

        console.error("Error fetching OG metadata:", error);
        return NextResponse.json(
            { error: "Failed to fetch metadata" },
            { status: 502 },
        );
    }
}
