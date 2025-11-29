"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OGMetadata } from "@/app/api/og-metadata/route";
import type { UrlMention } from "@/lib/types/mentions";

/**
 * URL detection state for a single URL
 */
export type DetectedUrl = {
  url: string;
  status: "loading" | "loaded" | "error";
  metadata?: OGMetadata;
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
 * Convert detected URL with metadata to a UrlMention
 */
export function toUrlMention(detected: DetectedUrl): UrlMention {
  const { url, metadata } = detected;

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

  /**
   * Fetch OG metadata for a URL
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
  }, []);

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
   */
  const getUrlMentions = useCallback((): UrlMention[] => {
    const mentions: UrlMention[] = [];

    for (const detected of detectedUrls.values()) {
      // Only include successfully loaded URLs
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

