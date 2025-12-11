"use client";

import useSWR from "swr";
import Link from "next/link";
import { Database, RefreshCw, Table2, Plus } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

type TableInfo = {
  schema: string;
  name: string;
  type: string;
};

type TableMetadata = {
  id: string;
  name: string;
  description: string | null;
  config: {
    field_metadata?: Array<{
      field_name: string;
      display_name?: string;
      description?: string;
    }>;
  };
};

const fetcher = async (url: string): Promise<TableInfo[]> => {
  console.log('[TablesListView Fetcher] Fetching:', url);

  const response = await fetch(url, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
    console.error('[TablesListView Fetcher] Error:', errorData);
    throw new Error(errorData.error || `Failed to load tables (${response.status})`);
  }

  const payload = await response.json();
  console.log('[TablesListView Fetcher] Payload:', payload);

  if (Array.isArray(payload)) {
    console.log('[TablesListView Fetcher] Returning array directly, length:', payload.length);
    return payload;
  }

  if (payload && typeof payload === "object" && Array.isArray(payload.tables)) {
    console.log('[TablesListView Fetcher] Returning payload.tables, length:', payload.tables.length);
    return payload.tables;
  }

  console.warn('[TablesListView Fetcher] Unexpected payload structure, returning empty array');
  return [];
};

const metadataFetcher = async (url: string): Promise<Record<string, TableMetadata>> => {
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

  const { data: tablesRaw, error, isLoading, mutate } = useSWR<TableInfo[]>(
    "/api/tables?type=data",
    fetcher
  );

  // Fetch table metadata from the tables config
  const { data: metadata } = useSWR<Record<string, TableMetadata>>(
    "/api/tables/metadata",
    metadataFetcher
  );

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/tables/sync", {
        method: "POST",
        credentials: "same-origin",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to sync tables" }));
        throw new Error(errorData.error || "Failed to sync tables");
      }

      const result = await response.json();

      await mutate();

      toast.success(
        `Successfully synced ${result.synced} of ${result.total} tables`
      );
    } catch (error) {
      console.error("Sync error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to sync tables");
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle both array and {tables: [...]} response formats
  let tables: TableInfo[] = [];
  if (Array.isArray(tablesRaw)) {
    tables = tablesRaw;
  } else if (tablesRaw && typeof tablesRaw === 'object' && 'tables' in tablesRaw) {
    tables = (tablesRaw as { tables: TableInfo[] }).tables || [];
  }

  // Debug logging
  console.log('[TablesListView] Debug:', {
    tablesRaw,
    tablesLength: tables.length,
    isLoading,
    error: error?.message,
    metadata,
  });

  const getTableMetadata = (tableName: string) => {
    return metadata?.[tableName];
  };

  if (error) {
    return (
      <div className="rounded-md border border-dashed border-border/60 p-8 text-center text-sm text-destructive">
        <p className="font-semibold">Failed to load tables</p>
        <p className="text-muted-foreground mt-1">{error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="rounded-md border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-muted/60 border-b">
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
                <tr key={i} className="border-b">
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
      <div className="rounded-md border border-dashed border-border/60 bg-background p-12 text-center">
        <Database className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="font-semibold text-foreground mb-2">No tables found</p>
        <p className="text-muted-foreground mb-4">
          Create tables in your connected database to see them here.
        </p>
        <Button variant="primary" size="sm" asChild>
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
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {tables.length} {tables.length === 1 ? "table" : "tables"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync"}
          </Button>
          <Button variant="primary" size="sm" asChild>
            <Link href="/build/data/create-wizard">
              <Plus className="mr-2 h-4 w-4" />
              New Table
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-muted/60 border-b">
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
                  key={table.name}
                  className="border-b last:border-b-0 hover:bg-accent transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/data/tables/${table.name}`}
                      className="font-medium hover:underline"
                    >
                      {meta?.name || table.name}
                    </Link>
                    <p className="text-xs text-muted-foreground font-mono">
                      {table.name}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-md">
                    {meta?.description || (
                      <span className="italic text-muted-foreground/60">No description</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{table.schema}</td>
                  <td className="px-4 py-3 text-muted-foreground text-center">
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
