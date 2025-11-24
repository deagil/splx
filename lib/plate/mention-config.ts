/**
 * Plate mention configuration for AI chat mentions
 */

import type { MentionableItem } from "@/lib/types/mentions";

/**
 * Convert mentionable items to Plate's mention format
 */
export function mentionableItemsToPlateMentions(
  items: MentionableItem[]
): Array<{ key: string; text: string; value: string }> {
  return items.map((item) => ({
    key: item.key,
    text: item.text,
    value: JSON.stringify(item.mention), // Store full mention metadata as JSON
  }));
}

/**
 * Parse Plate mention value back to mention metadata
 */
export function parsePlateMentionValue(
  value: string
): MentionableItem["mention"] | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * Filter mentionable items by search query
 */
export function filterMentionableItems(
  items: MentionableItem[],
  search: string
): MentionableItem[] {
  if (!search) {
    return items;
  }

  const lowerSearch = search.toLowerCase();
  return items.filter(
    (item) =>
      item.text.toLowerCase().includes(lowerSearch) ||
      item.description?.toLowerCase().includes(lowerSearch)
  );
}

