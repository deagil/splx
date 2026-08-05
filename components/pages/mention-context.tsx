"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { globalMentionRegistry } from "@/lib/mentions/global-registry";
import type { PageRecord } from "@/lib/server/pages";
import type {
  BlockMention,
  MentionableItem,
  PageMention,
} from "@/lib/types/mentions";

/**
 * Data that can be mentioned from a block
 */
export interface BlockMentionableData {
  blockId: string;
  blockType: "list" | "record" | "report" | "trigger";
  data?: unknown; // The actual data from the block
  description?: string;
  label: string;
  tableName?: string;
}

/**
 * Context value for mentionable data
 */
interface MentionContextValue {
  /**
   * Get mentionable data for a specific block
   */
  getBlockData: (blockId: string) => BlockMentionableData | undefined;
  /**
   * Get all mentionable items for the current page
   */
  getMentionableItems: () => MentionableItem[];
  /**
   * Current page information
   */
  page: PageRecord | null;
  /**
   * Register mentionable data from a block
   */
  registerBlockData: (data: BlockMentionableData) => void;
  /**
   * Set current page
   */
  setPage: (page: PageRecord | null) => void;
  /**
   * Unregister block data when block unmounts
   */
  unregisterBlockData: (blockId: string) => void;
}

const MentionContext = createContext<MentionContextValue | null>(null);

/**
 * Hook to access mention context
 * Throws if context is not available
 */
export function useMentionableData() {
  const context = useContext(MentionContext);
  if (!context) {
    throw new Error(
      "useMentionableData must be used within MentionContextProvider"
    );
  }
  return context;
}

/**
 * Safe hook to access mention context
 * Returns null if context is not available (doesn't throw)
 * Use this when you need to conditionally use the context
 */
export function useMentionableDataSafe() {
  return useContext(MentionContext);
}

/**
 * Provider component that collects mentionable data from blocks
 */
export function MentionContextProvider({
  children,
  page: initialPage = null,
}: {
  children: ReactNode;
  page?: PageRecord | null;
}) {
  const [page, setPage] = useState<PageRecord | null>(initialPage);
  const [blockDataMap, setBlockDataMap] = useState<
    Map<string, BlockMentionableData>
  >(new Map());

  const registerBlockData = useCallback((data: BlockMentionableData) => {
    setBlockDataMap((prev) => {
      const next = new Map(prev);
      next.set(data.blockId, data);
      return next;
    });
  }, []);

  const unregisterBlockData = useCallback((blockId: string) => {
    setBlockDataMap((prev) => {
      const next = new Map(prev);
      next.delete(blockId);
      return next;
    });
  }, []);

  const getBlockData = useCallback(
    (blockId: string) => blockDataMap.get(blockId),
    [blockDataMap]
  );

  const getMentionableItems = useCallback((): MentionableItem[] => {
    const items: MentionableItem[] = [];

    // Add "This Page" option if we have a page
    if (page) {
      const pageMention: PageMention = {
        description: `All data from ${page.name}`,
        id: page.id,
        label: "This Page",
        type: "page",
      };
      items.push({
        description: pageMention.description,
        key: `page-${page.id}`,
        mention: pageMention,
        text: "@thisPage",
      });
    }

    // Add block mentions
    for (const [blockId, blockData] of blockDataMap.entries()) {
      const blockMention: BlockMention = {
        blockId,
        blockType: blockData.blockType,
        description: blockData.description,
        id: blockId,
        label: blockData.label,
        tableName: blockData.tableName,
        type: "block",
      };
      items.push({
        description: blockData.description,
        key: `block-${blockId}`,
        mention: blockMention,
        text: `@${blockData.label}`,
      });
    }

    return items;
  }, [page, blockDataMap]);

  // Register items with global registry whenever they change
  useEffect(() => {
    const items = getMentionableItems();
    globalMentionRegistry.registerItems(items);
  }, [getMentionableItems]);

  const value = useMemo(
    () => ({
      getBlockData,
      getMentionableItems,
      page,
      registerBlockData,
      setPage,
      unregisterBlockData,
    }),
    [
      registerBlockData,
      unregisterBlockData,
      getMentionableItems,
      getBlockData,
      page,
    ]
  );

  return (
    <MentionContext.Provider value={value}>{children}</MentionContext.Provider>
  );
}
