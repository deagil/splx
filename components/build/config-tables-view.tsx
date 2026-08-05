"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { Skeleton } from "@/components/ui/skeleton";

interface TableInfo {
  name: string;
  schema: string;
  type: string;
}

interface TablesResponse {
  tables: TableInfo[];
}

const fetcher = async (url: string): Promise<TableInfo[]> => {
  const response = await fetch(url, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Failed to load tables");
  }

  const payload = (await response.json()) as TablesResponse;
  return payload.tables;
};

export function ConfigTablesView() {
  const {
    data: tables,
    error,
    isLoading,
  } = useSWR<TableInfo[]>("/api/tables?type=config", fetcher);

  if (error) {
    return (
      <div className="rounded-md border border-border/60 border-dashed p-8 text-center text-destructive text-sm">
        <p className="font-semibold">Failed to load config tables</p>
        <p className="mt-1 text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-md border border-border/60 border-dashed bg-muted/50 p-3">
        <Skeleton className="mb-4 h-6 w-32" />
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
                <tr className="even:bg-muted/40" key={i}>
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

  if (!tables || tables.length === 0) {
    return (
      <div className="rounded-md border border-border/60 border-dashed bg-background p-3 text-muted-foreground text-xs">
        <div className="py-12 text-center">
          <Sparkles className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-2 font-semibold text-foreground">
            No config tables found
          </p>
          <p>Workspace configuration tables will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex flex-wrap gap-3 text-muted-foreground text-sm">
        <span className="font-medium text-foreground">
          Tables: <span className="font-mono">{tables.length}</span>
        </span>
        <span>Type: Config tables</span>
      </div>

      <div className="rounded-md border border-border/60 border-dashed bg-background p-3 text-foreground text-xs">
        <p className="mb-3 font-semibold">Config Tables</p>
        <div className="mt-3 overflow-auto rounded border border-border/50">
          <table className="min-w-full text-left text-foreground text-xs">
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
                  className="cursor-pointer transition-colors even:bg-muted/40 hover:bg-accent"
                  key={table.name}
                >
                  <td className="px-3 py-2">
                    <Link
                      className="font-mono text-foreground hover:underline"
                      href={`/build/config/${table.name}`}
                    >
                      {table.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {table.schema}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {table.type}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
