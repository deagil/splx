"use client";

import { Database, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface TableInfo {
  name: string;
  schema: string;
  type: string;
}

interface TableMetadata {
  config: {
    field_metadata?: Array<{
      field_name: string;
      display_name?: string;
      description?: string;
    }>;
  };
  description: string | null;
  id: string;
  name: string;
}

const fetcher = async (url: string): Promise<TableInfo[]> => {
  console.log("[TablesListView Fetcher] Fetching:", url);

  const response = await fetch(url, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    console.error("[TablesListView Fetcher] Error:", errorData);
    throw new Error(
      errorData.error || `Failed to load tables (${response.status})`
    );
  }

  const payload = await response.json();
  console.log("[TablesListView Fetcher] Payload:", payload);

  if (Array.isArray(payload)) {
    console.log(
      "[TablesListView Fetcher] Returning array directly, length:",
      payload.length
    );
    return payload;
  }

  if (payload && typeof payload === "object" && Array.isArray(payload.tables)) {
    console.log(
      "[TablesListView Fetcher] Returning payload.tables, length:",
      payload.tables.length
    );
    return payload.tables;
  }

  console.warn(
    "[TablesListView Fetcher] Unexpected payload structure, returning empty array"
  );
  return [];
};

const metadataFetcher = async (
  url: string
): Promise<Record<string, TableMetadata>> => {
  const response = await fetch(url, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    return {};
  }

  const payload = await response.json();

  // Convert array to map keyed by table id
  const metadataMap: Record<string, TableMetadata> = {};
  if (Array.isArray(payload.tables)) {
    for (const table of payload.tables) {
      metadataMap[table.id] = table;
    }
  }

  return metadataMap;
};

export function TablesListView() {
  const [isSyncing, setIsSyncing] = useState(false);

  const {
    data: tablesRaw,
    error,
    isLoading,
    mutate,
  } = useSWR<TableInfo[]>("/api/tables?type=data", fetcher);

  // Fetch table metadata from the tables config
  const { data: metadata } = useSWR<Record<string, TableMetadata>>(
    "/api/tables/metadata",
    metadataFetcher
  );

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/tables/sync", {
        credentials: "same-origin",
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to sync tables" }));
        throw new Error(errorData.error || "Failed to sync tables");
      }

      const result = await response.json();

      await mutate();

      toast.success(
        `Successfully synced ${result.synced} of ${result.total} tables`
      );
    } catch (error) {
      console.error("Sync error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to sync tables"
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle both array and {tables: [...]} response formats
  let tables: TableInfo[] = [];
  if (Array.isArray(tablesRaw)) {
    tables = tablesRaw;
  } else if (
    tablesRaw &&
    typeof tablesRaw === "object" &&
    "tables" in tablesRaw
  ) {
    tables = (tablesRaw as { tables: TableInfo[] }).tables || [];
  }

  // Debug logging
  console.log("[TablesListView] Debug:", {
    error: error?.message,
    isLoading,
    metadata,
    tablesLength: tables.length,
    tablesRaw,
  });

  const getTableMetadata = (tableName: string) => metadata?.[tableName];

  if (error) {
    return (
      <div className="rounded-md border border-border/60 border-dashed p-8 text-center text-destructive text-sm">
        <p className="font-semibold">Failed to load tables</p>
        <p className="mt-1 text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="rounded-md border">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-muted/60">
              <tr>
                <th className="px-4 py-3">
                  <Skeleton className="h-4 w-24" />
                </th>
                <th className="px-4 py-3">
                  <Skeleton className="h-4 w-32" />
                </th>
                <th className="px-4 py-3">
                  <Skeleton className="h-4 w-20" />
                </th>
                <th className="px-4 py-3">
                  <Skeleton className="h-4 w-20" />
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr className="border-b" key={i}>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-48" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-12" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="rounded-md border border-border/60 border-dashed bg-background p-12 text-center">
        <Database className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <p className="mb-2 font-semibold text-foreground">No tables found</p>
        <p className="mb-4 text-muted-foreground">
          Create tables in your connected database to see them here.
        </p>
        <Button asChild size="sm" variant="primary">
          <Link href="/build/data/create-wizard">
            <Plus className="mr-2 h-4 w-4" />
            Create Table
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-muted-foreground text-sm">
          <span className="font-medium text-foreground">
            {tables.length} {tables.length === 1 ? "table" : "tables"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="gap-2"
            disabled={isSyncing}
            onClick={handleSync}
            size="sm"
            type="button"
            variant="outline"
          >
            <RefreshCw
              className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
            />
            {isSyncing ? "Syncing..." : "Sync"}
          </Button>
          <Button asChild size="sm" variant="primary">
            <Link href="/build/data/create-wizard">
              <Plus className="mr-2 h-4 w-4" />
              New Table
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-muted/60">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Description</th>
              <th className="px-4 py-3 font-semibold">Schema</th>
              <th className="px-4 py-3 font-semibold">Fields</th>
            </tr>
          </thead>
          <tbody>
            {tables.map((table) => {
              const meta = getTableMetadata(table.name);
              const fieldCount = meta?.config?.field_metadata?.length || 0;

              return (
                <tr
                  className="border-b transition-colors last:border-b-0 hover:bg-accent"
                  key={table.name}
                >
                  <td className="px-4 py-3">
                    <Link
                      className="font-medium hover:underline"
                      href={`/data/tables/${table.name}`}
                    >
                      {meta?.name || table.name}
                    </Link>
                    <p className="font-mono text-muted-foreground text-xs">
                      {table.name}
                    </p>
                  </td>
                  <td className="max-w-md px-4 py-3 text-muted-foreground">
                    {meta?.description || (
                      <span className="text-muted-foreground/60 italic">
                        No description
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {table.schema}
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground">
                    {fieldCount > 0 ? fieldCount : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
