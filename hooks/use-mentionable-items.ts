"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { MentionableItem } from "@/lib/types/mentions";
import { useMentionableDataSafe } from "@/components/pages/mention-context";
import { globalMentionRegistry } from "@/lib/mentions/global-registry";
import { useMentionableTables } from "./use-mentionable-tables";

/**
 * Hook to get mentionable items for the current page/context
 * This can be used by the chat input to show available mentions
 *
 * Works both:
 * - Within MentionContextProvider (on page routes) - uses context directly
 * - Outside MentionContextProvider (e.g., chat sidebar) - uses global registry
 */
export function useMentionableItems(): MentionableItem[] {
  const pathname = usePathname();
  const isPageRoute = pathname?.startsWith("/pages/");

  // Always call the hook (Rules of Hooks) - it returns null if not in context
  const mentionContext = useMentionableDataSafe();

  // Get mentionable items from context if available
  const pageMentionableItems = useMemo(() => {
    if (mentionContext && isPageRoute) {
      return mentionContext.getMentionableItems();
    }
    return [];
  }, [mentionContext, isPageRoute]);

  // Determine if we should use global registry (when not in context)
  const useGlobalRegistry = !mentionContext;

  // Use global registry as fallback (for chat sidebar at layout level)
  const [globalItems, setGlobalItems] = useState<MentionableItem[]>(() =>
    useGlobalRegistry ? globalMentionRegistry.getItems() : []
  );

  useEffect(() => {
    if (!useGlobalRegistry) return;

    // Subscribe to global registry updates
    const unsubscribe = globalMentionRegistry.subscribe((items) => {
      setGlobalItems(items);
    });

    return unsubscribe;
  }, [useGlobalRegistry]);

  // Add global mentionable items (always available)
  const alwaysAvailableItems: MentionableItem[] = useMemo(
    () => [
      {
        key: "user-profile",
        text: "me",
        description: "Current user",
        mention: {
          type: "user",
          label: "User Profile",
          description: "Current user profile information",
        },
      },
    ],
    [],
  );

  // For non-page routes, also include tables as mentionable items
  const tableMentions = useMentionableTables();
  const includeTableMentions = useGlobalRegistry || !isPageRoute;

  // Combine items based on context
  return useMemo(() => {
    const baseItems = includeTableMentions
      ? [...alwaysAvailableItems, ...tableMentions]
      : alwaysAvailableItems;

    if (useGlobalRegistry) {
      // Use global registry items (from pages) + base items
      return [...baseItems, ...globalItems];
    }
    // Use page context items + base items
    return [...baseItems, ...pageMentionableItems];
  }, [
    alwaysAvailableItems,
    tableMentions,
    includeTableMentions,
    globalItems,
    pageMentionableItems,
    useGlobalRegistry,
  ]);
}
