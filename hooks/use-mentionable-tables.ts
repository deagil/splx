"use client";

import { useMemo } from "react";
import useSWR from "swr";
import type { MentionableItem } from "@/lib/types/mentions";
import { fetcher } from "@/lib/utils";

/**
 * Hook to fetch tables and convert them to mentionable items
 * Used for non-page routes where we want to show table mentions
 */
export function useMentionableTables(): MentionableItem[] {
  const { data: tablesData } = useSWR<{ tables: Array<{ name: string; schema: string }> }>(
    "/api/tables?type=data",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return useMemo(() => {
    if (!tablesData?.tables) return [];

    return tablesData.tables.map((table) => ({
      key: `table-${table.schema}-${table.name}`,
      text: `@table:${table.name}`,
      description: `Data from ${table.name} table`,
      mention: {
        type: "table" as const,
        tableName: table.name,
        label: `Table: ${table.name}`,
        description: `Query data from ${table.name} table`,
      },
    }));
  }, [tablesData]);
}


