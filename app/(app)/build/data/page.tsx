"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Database, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type Table = {
  schema: string;
  name: string;
  type: string;
};

type ApiResponse =
  | {
      tables: Table[];
      error?: never;
    }
  | {
      tables?: never;
      error: string;
    };

export default function BuildDataPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const response = await fetch("/api/tables?type=data");
        const data: ApiResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch tables");
        }

        setTables(data.tables);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTables();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6 py-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Data Tables
          </h1>
          <p className="text-sm text-muted-foreground">
            Browse and manage your workspace data tables
          </p>
        </div>
        <div className="rounded-lg border border-border/70 bg-background p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">Loading tables...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const isConnectionError = error.includes("No resource connection");

    return (
      <div className="flex flex-1 flex-col gap-6 py-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Data Tables
          </h1>
          <p className="text-sm text-muted-foreground">
            Browse and manage your workspace data tables
          </p>
        </div>

        <Alert variant={isConnectionError ? "default" : "destructive"}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {isConnectionError
              ? "No Database Connection"
              : "Failed to Load Tables"}
          </AlertTitle>
          <AlertDescription className="mt-2 flex flex-col gap-3">
            <p>
              {isConnectionError
                ? "You need to connect a PostgreSQL database to view and manage your data tables."
                : error}
            </p>
            {isConnectionError && (
              <div>
                <Button asChild>
                  <Link href="/workspace-settings#connected-apps">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Configure Database Connection
                  </Link>
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Data Tables
          </h1>
          <p className="text-sm text-muted-foreground">
            Browse and manage your workspace data tables from your connected
            PostgreSQL database
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border/70 bg-background p-6 shadow-sm">
        {tables.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <Database className="h-12 w-12 text-muted-foreground/50" />
            <div>
              <p className="text-sm font-medium text-foreground">
                No data tables found
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Your connected database doesn&apos;t have any user tables yet.
                Create tables in your database to see them here.
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {tables.map((table) => (
              <li key={table.name} className="py-3 first:pt-0 last:pb-0">
                <Link
                  href={`/api/data/${table.name}`}
                  className="group flex flex-col gap-1 rounded-md px-2 py-1 transition hover:bg-muted/40"
                >
                  <span className="text-sm font-medium text-foreground group-hover:text-primary">
                    {table.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {table.schema}.{table.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {tables.length > 0 && (
        <div className="text-xs text-muted-foreground">
          Showing {tables.length} table{tables.length !== 1 ? "s" : ""} from
          your connected database
        </div>
      )}
    </div>
  );
}
