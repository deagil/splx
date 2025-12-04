"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OGMetadata } from "@/app/api/og-metadata/route";
import type { UrlContent } from "@/app/api/url-content/route";
import type { UrlMention } from "@/lib/types/mentions";

/**
 * URL detection state for a single URL
 */
export type DetectedUrl = {
  url: string;
  status: "loading" | "loaded" | "error";
  metadata?: OGMetadata;
  /** Pre-fetched full content (fetched in background) */
  content?: UrlContent;
  /** Content fetch status */
  contentStatus?: "loading" | "loaded" | "error";
  /** Content fetch error message */
  contentError?: string;
  error?: string;
};

/**
 * URL regex pattern - matches http/https URLs
 */
const URL_PATTERN =
  /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;

/**
 * Extract unique URLs from text
 */
export function extractUrls(text: string): string[] {
  const matches = text.match(URL_PATTERN);
  if (!matches) return [];

  // Deduplicate URLs
  return [...new Set(matches)];
}

/**
 * Extended UrlMention with pre-fetch status for UI display
 */
export type UrlMentionWithStatus = UrlMention & { 
  prefetchedContent?: string;
  /** Content pre-fetch status */
  contentStatus?: "loading" | "loaded" | "error";
  /** Error message if pre-fetch failed */
  contentError?: string;
};

/**
 * Convert detected URL with metadata to a UrlMention
 * Includes pre-fetched content and status for UI display
 */
export function toUrlMention(detected: DetectedUrl): UrlMentionWithStatus {
  const { url, metadata, content, contentStatus, contentError } = detected;

  // Extract domain for fallback label
  let label = url;
  try {
    const urlObj = new URL(url);
    label = metadata?.title || urlObj.hostname;
  } catch {
    label = metadata?.title || url;
  }

  return {
    type: "url",
    id: url, // Use URL as ID
    label,
    description: metadata?.description,
    url,
    title: metadata?.title,
    favicon: metadata?.favicon,
    image: metadata?.image,
    // Include pre-fetched content if available (saves ~20-30s during enrichment!)
    prefetchedContent: content?.content,
    // Include status and error for UI display
    contentStatus,
    contentError,
  };
}

/**
 * Hook for detecting URLs in text and fetching their metadata
 */
export function useUrlDetection(options?: {
  debounceMs?: number;
  maxUrls?: number;
}) {
  const { debounceMs = 300, maxUrls = 5 } = options || {};

  const [detectedUrls, setDetectedUrls] = useState<Map<string, DetectedUrl>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(false);

  // Track pending fetches
  const pendingFetches = useRef<Set<string>>(new Set());
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Track pending content fetches separately
  const pendingContentFetches = useRef<Set<string>>(new Set());

  /**
   * Fetch full page content in background (for fast enrichment later)
   * This is best-effort - failures are OK, server will fall back to fetching during enrichment
   */
  const fetchContent = useCallback(async (url: string) => {
    // Skip if already fetching
    if (pendingContentFetches.current.has(url)) return;

    pendingContentFetches.current.add(url);

    // Set content loading state
    setDetectedUrls((prev) => {
      const next = new Map(prev);
      const existing = next.get(url);
      if (existing) {
        next.set(url, { ...existing, contentStatus: "loading" });
      }
      return next;
    });

    try {
      // Use a shorter timeout for pre-fetch (10s) - if it takes longer, skip it
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `/api/url-content?url=${encodeURIComponent(url)}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = "Content couldn't be pre-loaded. Will attempt during processing.";
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
            // Include details if available (e.g., "Domain temporarily blocked")
            if (errorData.details) {
              errorMessage += `: ${errorData.details.slice(0, 100)}`;
            }
          }
        } catch {
          // If JSON parse fails, use default message
        }
        
        // Don't throw - just log and mark as failed
        // Server will skip retry if it's a known error (e.g., domain blocked)
        console.log(`[URL Pre-fetch] Failed for ${url}: ${response.status} - ${errorMessage}`);
        setDetectedUrls((prev) => {
          const next = new Map(prev);
          const existing = next.get(url);
          if (existing) {
            // Mark as error with message - the mention is still valid
            next.set(url, { 
              ...existing, 
              contentStatus: "error",
              contentError: errorMessage,
            });
          }
          return next;
        });
        return;
      }

      const content = await response.json();

      setDetectedUrls((prev) => {
        const next = new Map(prev);
        const existing = next.get(url);
        if (existing) {
          next.set(url, { ...existing, content, contentStatus: "loaded" });
        }
        return next;
      });

      console.log(`[URL Pre-fetch] ✓ Content loaded for ${url} (${content.originalLength} chars)`);
    } catch (error) {
      // Handle errors - pre-fetch is best-effort
      // Server will skip retry if it's a known error (e.g., timeout/blocked)
      let errorMessage = "Content couldn't be pre-loaded. Will attempt during processing.";
      
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "Request timed out. Will attempt during processing.";
          console.log(`[URL Pre-fetch] Timeout for ${url}`);
        } else {
          errorMessage = `Error: ${error.message}. Will attempt during processing.`;
          console.log(`[URL Pre-fetch] Error for ${url}:`, error);
        }
      }
      
      setDetectedUrls((prev) => {
        const next = new Map(prev);
        const existing = next.get(url);
        if (existing) {
          next.set(url, { 
            ...existing, 
            contentStatus: "error",
            contentError: errorMessage,
          });
        }
        return next;
      });
    } finally {
      pendingContentFetches.current.delete(url);
    }
  }, []);

  /**
   * Fetch OG metadata for a URL, then trigger content pre-fetch
   */
  const fetchMetadata = useCallback(async (url: string) => {
    // Skip if already fetching or loaded
    if (pendingFetches.current.has(url)) return;

    pendingFetches.current.add(url);

    // Set loading state
    setDetectedUrls((prev) => {
      const next = new Map(prev);
      next.set(url, { url, status: "loading" });
      return next;
    });

    try {
      const response = await fetch(
        `/api/og-metadata?url=${encodeURIComponent(url)}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.status}`);
      }

      const metadata: OGMetadata = await response.json();

      setDetectedUrls((prev) => {
        const next = new Map(prev);
        next.set(url, { url, status: "loaded", metadata });
        return next;
      });

      // Start fetching full content in background (don't await)
      // This saves ~20-30s during message enrichment!
      fetchContent(url);
    } catch (error) {
      setDetectedUrls((prev) => {
        const next = new Map(prev);
        next.set(url, {
          url,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        return next;
      });
    } finally {
      pendingFetches.current.delete(url);
    }
  }, [fetchContent]);

  /**
   * Process text to detect and fetch URLs
   */
  const detectUrls = useCallback(
    (text: string) => {
      // Clear previous debounce
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        const urls = extractUrls(text).slice(0, maxUrls);

        // Find new URLs that need fetching
        const newUrls = urls.filter((url) => !detectedUrls.has(url));

        if (newUrls.length > 0) {
          setIsLoading(true);
          Promise.all(newUrls.map(fetchMetadata)).finally(() => {
            setIsLoading(false);
          });
        }
      }, debounceMs);
    },
    [debounceMs, maxUrls, detectedUrls, fetchMetadata]
  );

  /**
   * Add a URL manually (for paste events)
   */
  const addUrl = useCallback(
    (url: string) => {
      if (!detectedUrls.has(url) && detectedUrls.size < maxUrls) {
        fetchMetadata(url);
      }
    },
    [detectedUrls, maxUrls, fetchMetadata]
  );

  /**
   * Remove a detected URL
   */
  const removeUrl = useCallback((url: string) => {
    setDetectedUrls((prev) => {
      const next = new Map(prev);
      next.delete(url);
      return next;
    });
  }, []);

  /**
   * Clear all detected URLs
   */
  const clearUrls = useCallback(() => {
    setDetectedUrls(new Map());
    pendingFetches.current.clear();
  }, []);

  /**
   * Get URL mentions for inclusion in message
   * Returns extended type with content status for UI display
   */
  const getUrlMentions = useCallback((): UrlMentionWithStatus[] => {
    const mentions: UrlMentionWithStatus[] = [];

    for (const detected of detectedUrls.values()) {
      // Include URLs once metadata is loaded (content may still be loading/failed)
      if (detected.status === "loaded" || detected.status === "error") {
        mentions.push(toUrlMention(detected));
      }
    }

    return mentions;
  }, [detectedUrls]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    detectedUrls: Array.from(detectedUrls.values()),
    isLoading,
    detectUrls,
    addUrl,
    removeUrl,
    clearUrls,
    getUrlMentions,
  };
}

