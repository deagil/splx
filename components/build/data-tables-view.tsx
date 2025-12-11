"use client";

import useSWR from "swr";
import Link from "next/link";
import { Database, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "../ui/button";
import { toast } from "sonner";

type TableInfo = {
  schema: string;
  name: string;
  type: string;
};

type TablesResponse = {
  tables: TableInfo[];
};

const fetcher = async (url: string): Promise<TableInfo[]> => {
  console.log('[Fetcher] Fetching:', url);

  const response = await fetch(url, {
    credentials: "same-origin",
  });

  console.log('[Fetcher] Response status:', response.status, response.statusText);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
    console.error('[Fetcher] Error response:', errorData);
    throw new Error(errorData.error || `Failed to load tables (${response.status})`);
  }

  const payload = await response.json();
  console.log('[Fetcher] Payload received:', payload);

  // Handle case where payload might be the array directly or wrapped in {tables: [...]}
  if (Array.isArray(payload)) {
    console.log('[Fetcher] Payload is array, returning directly');
    return payload;
  }

  if (payload && typeof payload === "object" && Array.isArray(payload.tables)) {
    console.log('[Fetcher] Payload has tables array, returning payload.tables:', payload.tables);
    return payload.tables;
  }

  // If we get here, the response structure is unexpected
  console.error("[Fetcher] Unexpected API response structure:", payload);
  return [];
};

export function DataTablesView() {
  const [isSyncing, setIsSyncing] = useState(false);
  const { data: tablesRaw, error, isLoading, mutate } = useSWR<TableInfo[]>(
    "/api/tables?type=data",
    fetcher
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

      // Refresh the tables list
      await mutate();

      toast.success(
        `Successfully synced ${result.synced} of ${result.total} tables and created pages`
      );
    } catch (error) {
      console.error("Sync error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to sync tables");
    } finally {
      setIsSyncing(false);
    }
  };

  // Normalize tables to always be an array (defensive handling)
  // Handle both direct array and {tables: [...]} object structure
  let tables: TableInfo[] = [];
  if (Array.isArray(tablesRaw)) {
    tables = tablesRaw;
  } else if (tablesRaw && typeof tablesRaw === 'object' && 'tables' in tablesRaw) {
    // Handle case where SWR bypasses fetcher and returns raw API response
    tables = (tablesRaw as TablesResponse).tables || [];
  }

  console.log('[DataTablesView] Debug:', {
    isLoading,
    error: error?.message,
    tablesRaw,
    tablesLength: tables.length,
    tablesIsArray: Array.isArray(tablesRaw),
    tablesType: typeof tablesRaw
  });

  if (error) {
    return (
      <div className="rounded-md border border-dashed border-border/60 p-8 text-center text-sm text-destructive">
        <p className="font-semibold">Failed to load data tables</p>
        <p className="text-muted-foreground mt-1">{error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-md border border-dashed border-border/60 bg-muted/50 p-3">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="overflow-auto rounded border border-border/50">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-3 py-2 font-semibold">
                  <Skeleton className="h-4 w-24" />
                </th>
                <th className="px-3 py-2 font-semibold">
                  <Skeleton className="h-4 w-24" />
                </th>
                <th className="px-3 py-2 font-semibold">
                  <Skeleton className="h-4 w-24" />
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="even:bg-muted/40">
                  <td className="px-3 py-2">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-4 w-20" />
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
      <div className="rounded-md border border-dashed border-border/60 bg-background p-3 text-xs text-muted-foreground">
        <div className="text-center py-12">
          <Database className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="font-semibold text-foreground mb-2">No data tables found</p>
          <p>Create tables in your connected database to see them here.</p>
          {/* <Button variant="default" size="sm" className="mt-4 cursor-pointer" asChild> */}
          <Link href="/build/data/create-wizard">
            <Button variant="primary" size="sm" className="mt-4 cursor-pointer">Create Table</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Final safety check - this should never happen due to earlier checks
  if (!Array.isArray(tables)) {
    console.error("Tables is not an array at render time:", tables);
    return (
      <div className="rounded-md border border-dashed border-border/60 p-8 text-center text-sm text-destructive">
        <p className="font-semibold">Invalid data format</p>
        <p className="text-muted-foreground mt-1">Please refresh the page or contact support.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            Tables: <span className="font-mono">{tables.length}</span>
          </span>
          <span>Type: Data tables</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={isSyncing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Syncing..." : "Sync Tables"}
        </Button>
      </div>

      <div className="rounded-md border border-dashed border-border/60 bg-background p-3 text-xs text-foreground">
        <p className="font-semibold mb-3">Data Tables</p>
        <div className="mt-3 overflow-auto rounded border border-border/50">
          <table className="min-w-full text-left text-xs text-foreground">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-3 py-2 font-semibold">Table Name</th>
                <th className="px-3 py-2 font-semibold">Schema</th>
                <th className="px-3 py-2 font-semibold">Type</th>
              </tr>
            </thead>
            <tbody>
              {tables.map((table) => (
                <tr
                  key={table.name}
                  className="even:bg-muted/40 hover:bg-accent cursor-pointer transition-colors"
                >
                  <td className="px-3 py-2">
                    <Link
                      href={`/data/tables/${table.name}`}
                      className="font-mono text-foreground hover:underline"
                    >
                      {table.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{table.schema}</td>
                  <td className="px-3 py-2 text-muted-foreground">{table.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

