"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  Mention,
  MentionableItem,
  PageMention,
  BlockMention,
} from "@/lib/types/mentions";
import type { PageRecord } from "@/lib/server/pages";

/**
 * Data that can be mentioned from a block
 */
export type BlockMentionableData = {
  blockId: string;
  blockType: "list" | "record" | "report" | "trigger";
  tableName?: string;
  label: string;
  description?: string;
  data?: unknown; // The actual data from the block
};

/**
 * Context value for mentionable data
 */
type MentionContextValue = {
  /**
   * Register mentionable data from a block
   */
  registerBlockData: (data: BlockMentionableData) => void;
  /**
   * Unregister block data when block unmounts
   */
  unregisterBlockData: (blockId: string) => void;
  /**
   * Get all mentionable items for the current page
   */
  getMentionableItems: () => MentionableItem[];
  /**
   * Get mentionable data for a specific block
   */
  getBlockData: (blockId: string) => BlockMentionableData | undefined;
  /**
   * Current page information
   */
  page: PageRecord | null;
  /**
   * Set current page
   */
  setPage: (page: PageRecord | null) => void;
};

const MentionContext = createContext<MentionContextValue | null>(null);

/**
 * Hook to access mention context
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
    (blockId: string) => {
      return blockDataMap.get(blockId);
    },
    [blockDataMap]
  );

  const getMentionableItems = useCallback((): MentionableItem[] => {
    const items: MentionableItem[] = [];

    // Add "This Page" option if we have a page
    if (page) {
      const pageMention: PageMention = {
        type: "page",
        id: page.id,
        label: "This Page",
        description: `All data from ${page.name}`,
      };
      items.push({
        key: `page-${page.id}`,
        text: "@thisPage",
        description: pageMention.description,
        mention: pageMention,
      });
    }

    // Add block mentions
    for (const [blockId, blockData] of blockDataMap.entries()) {
      const blockMention: BlockMention = {
        type: "block",
        id: blockId,
        blockId,
        blockType: blockData.blockType,
        tableName: blockData.tableName,
        label: blockData.label,
        description: blockData.description,
      };
      items.push({
        key: `block-${blockId}`,
        text: `@${blockData.label}`,
        description: blockData.description,
        mention: blockMention,
      });
    }

    return items;
  }, [page, blockDataMap]);

  const value = useMemo(
    () => ({
      registerBlockData,
      unregisterBlockData,
      getMentionableItems,
      getBlockData,
      page,
      setPage,
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

