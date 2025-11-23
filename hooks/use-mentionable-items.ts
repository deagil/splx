"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import type { MentionableItem } from "@/lib/types/mentions";
import { useMentionableData } from "@/components/pages/mention-context";

/**
 * Hook to get mentionable items for the current page/context
 * This can be used by the chat input to show available mentions
 */
export function useMentionableItems(): MentionableItem[] {
  const pathname = usePathname();
  const isPageRoute = pathname?.startsWith("/pages/");

  // Try to get mentionable data from page context if on a page route
  let pageMentionableItems: MentionableItem[] = [];
  try {
    if (isPageRoute) {
      const { getMentionableItems } = useMentionableData();
      pageMentionableItems = getMentionableItems();
    }
  } catch {
    // Not in a page context, that's okay
  }

  // Add global mentionable items
  const globalItems: MentionableItem[] = useMemo(
    () => [
      {
        key: "user-profile",
        text: "@userProfile",
        description: "Current user profile",
        mention: {
          type: "user",
          label: "User Profile",
          description: "Current user profile information",
        },
      },
    ],
    []
  );

  return useMemo(
    () => [...globalItems, ...pageMentionableItems],
    [globalItems, pageMentionableItems]
  );
}

