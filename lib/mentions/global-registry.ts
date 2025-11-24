/**
 * Global mention registry that can be accessed from anywhere
 * This allows the chat sidebar (which is at layout level) to access
 * mention data from pages (which are wrapped in MentionContextProvider)
 */

import type { MentionableItem } from "@/lib/types/mentions";

type MentionRegistryListener = (items: MentionableItem[]) => void;

class GlobalMentionRegistry {
  private items: MentionableItem[] = [];
  private listeners: Set<MentionRegistryListener> = new Set();

  /**
   * Register mentionable items (called by MentionContextProvider)
   */
  registerItems(items: MentionableItem[]): void {
    this.items = items;
    this.notifyListeners();
  }

  /**
   * Get current mentionable items
   */
  getItems(): MentionableItem[] {
    return [...this.items];
  }

  /**
   * Subscribe to changes in mentionable items
   */
  subscribe(listener: MentionRegistryListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current items
    listener(this.items);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const items = this.getItems();
    this.listeners.forEach((listener) => {
      listener(items);
    });
  }
}

// Singleton instance
export const globalMentionRegistry = new GlobalMentionRegistry();


