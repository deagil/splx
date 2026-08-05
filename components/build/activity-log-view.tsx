"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Shared list + detail view for the two control-plane logs.
 *
 * `audit_logs` and `event_logs` differ only in their columns and detail
 * fields, so one component takes a column definition rather than being written
 * twice.
 *
 * The selected row lives in the URL (`?id=`) rather than component state, so a
 * detail view can be linked to and survives a refresh.
 */

export type LogEntry = {
  id: string;
  createdAt: string;
  [key: string]: unknown;
};

export type LogColumn = {
  key: string;
  header: string;
  /** Rendered in the table. Falls back to a plain string cell. */
  render?: (entry: LogEntry) => React.ReactNode;
  className?: string;
};

export type DetailField = {
  label: string;
  render: (entry: LogEntry) => React.ReactNode;
};

type Props = {
  /** API path, e.g. `/api/v1/audit-logs`. */
  endpoint: string;
  columns: LogColumn[];
  detailFields: DetailField[];
  /** Title of the detail sheet for a given entry. */
  detailTitle: (entry: LogEntry) => string;
  emptyMessage: string;
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error ?? "Request failed");
  }
  return body;
};

export function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Relative age, for the "how fresh is this" glance. */
export function formatRelative(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) {
    return "just now";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return `${Math.floor(hours / 24)}d ago`;
}

export function JsonBlock({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  const isEmptyObject =
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value as object).length === 0;

  if (isEmptyObject) {
    return <span className="text-muted-foreground text-sm">Empty</span>;
  }

  return (
    <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">
      <code>{JSON.stringify(value, null, 2)}</code>
    </pre>
  );
}

export function ActivityLogView({
  endpoint,
  columns,
  detailFields,
  detailTitle,
  emptyMessage,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");

  const { data, error, isLoading, mutate } = useSWR(endpoint, fetcher);

  const entries: LogEntry[] = useMemo(
    () => data?.data?.entries ?? [],
    [data]
  );

  const selected = useMemo(
    () => entries.find((entry) => entry.id === selectedId) ?? null,
    [entries, selectedId]
  );

  const select = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) {
        params.set("id", id);
      } else {
        params.delete("id");
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams]
  );

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive">
        Failed to load: {error.message}
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {isLoading
            ? "Loading…"
            : `${entries.length} most recent, newest first`}
        </p>
        <Button onClick={() => mutate()} size="sm" type="button" variant="outline">
          Refresh
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead className={column.className} key={column.key}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              ["a", "b", "c", "d", "e"].map((key) => (
                <TableRow key={key}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!isLoading && entries.length === 0 && (
              <TableRow>
                <TableCell
                  className="py-10 text-center text-muted-foreground"
                  colSpan={columns.length}
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              entries.map((entry) => (
                <TableRow
                  className="cursor-pointer"
                  key={entry.id}
                  onClick={() => select(entry.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      select(entry.id);
                    }
                  }}
                  tabIndex={0}
                >
                  {columns.map((column) => (
                    <TableCell className={column.className} key={column.key}>
                      {column.render
                        ? column.render(entry)
                        : String(entry[column.key] ?? "—")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <Sheet
        onOpenChange={(open) => {
          if (!open) {
            select(null);
          }
        }}
        open={Boolean(selected)}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="break-all font-mono text-base">
                  {detailTitle(selected)}
                </SheetTitle>
                <SheetDescription>
                  {formatTimestamp(selected.createdAt)}
                </SheetDescription>
              </SheetHeader>

              <dl className="space-y-4 px-4 pb-8">
                {detailFields.map((field) => (
                  <div key={field.label}>
                    <dt className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                      {field.label}
                    </dt>
                    <dd className="text-sm">{field.render(selected)}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Shared cell renderers. */
export function MonoCell({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }
  return <span className="font-mono text-xs">{String(value)}</span>;
}

export function ActionBadge({ value }: { value: string }) {
  const variant = value.endsWith(".deleted")
    ? "destructive"
    : value.endsWith(".created")
      ? "success"
      : "secondary";

  return (
    <Badge className="font-mono text-xs" variant={variant}>
      {value}
    </Badge>
  );
}
