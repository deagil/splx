"use client";

import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import type { ColumnDef, PaginationState, SortingState } from "@tanstack/react-table";
import { useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel } from "@tanstack/react-table";
import { Card, CardHeader, CardHeading, CardTable, CardFooter } from "@/components/ui/card";
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Settings2Icon, Trash2Icon } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import type { FieldMetadata } from "@/lib/server/tables";
import type { ListBlockDraft } from "../types";
import { useListBlockData, useTableMetadata } from "../hooks";
import { cn } from "@/lib/utils";

export type ListBlockViewProps = {
  block: ListBlockDraft;
  urlParams: Record<string, string>;
  editControls?: {
    onOpenSettings: () => void;
    onRemove: () => void;
    onStartDrag: (event: ReactPointerEvent) => void;
  };
};

type TableRow = Record<string, unknown>;
type ResolvedListFilter = ListBlockDraft["filters"][number] & { resolvedValue: string | null };

export function ListBlockView({ block, urlParams, editControls }: ListBlockViewProps) {
  const { data, isLoading, error } = useListBlockData(block, urlParams);
  const { table: tableMetadata, isLoading: isMetadataLoading, error: metadataError } = useTableMetadata(
    block.tableName || null
  );
  const { copy } = useCopyToClipboard();

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const fieldMetaMap = useMemo(() => {
    const meta = new Map<string, NonNullable<typeof tableMetadata>["config"]["field_metadata"][number]>();
    if (tableMetadata?.config?.field_metadata) {
      for (const field of tableMetadata.config.field_metadata) {
        meta.set(field.field_name, field);
      }
    }
    return meta;
  }, [tableMetadata]);

  const resolvedColumns = useMemo(() => {
    const availableColumns = data?.columns ?? [];
    if (block.display.columns.length === 0) {
      return availableColumns;
    }
    return block.display.columns.filter((column) => availableColumns.includes(column));
  }, [block.display.columns, data?.columns]);

  const rows = data?.rows ?? [];

  const columns = useMemo<ColumnDef<TableRow>[]>(() => {
    return resolvedColumns.map((columnName) => {
      const meta = fieldMetaMap.get(columnName);
      const headerLabel = meta?.display_name ?? columnName;
      return {
        id: columnName,
        accessorKey: columnName,
        header: ({ column }) => <DataGridColumnHeader title={headerLabel} visibility={true} column={column} />,
        cell: ({ row }) => formatCellValue((row.original as TableRow)[columnName], meta, copy),
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        size: 180,
      } satisfies ColumnDef<TableRow>;
    });
  }, [copy, fieldMetaMap, resolvedColumns]);

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      pagination,
      sorting,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: "onChange",
    pageCount: Math.max(1, Math.ceil((rows.length || 1) / pagination.pageSize)),
  });

  const resolvedFilters = useMemo<ResolvedListFilter[]>(
    () =>
      block.filters.map((filter) => ({
        ...filter,
        resolvedValue: resolveToken(filter.value, urlParams),
      })),
    [block.filters, urlParams]
  );

  const filterSummary = useMemo(() => {
    if (resolvedFilters.length === 0) {
      return "No filters";
    }
    if (resolvedFilters.length === 1) {
      const [filter] = resolvedFilters;
      const valueLabel = filter.resolvedValue ?? filter.value ?? "—";
      return `${filter.column} ${filter.operator} ${valueLabel}`;
    }
    return `${resolvedFilters.length} filters`;
  }, [resolvedFilters]);

  const hasError = error ?? metadataError;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4">
      <TooltipProvider delayDuration={80}>
        <DataGrid
          table={table}
          recordCount={rows.length}
          tableClassNames={{
            edgeCell: "px-5",
          }}
          tableLayout={{
            columnsPinnable: true,
            columnsResizable: true,
            columnsMovable: true,
            columnsVisibility: true,
            headerSticky: true,
          }}
        >
          <Card className="flex h-full min-h-0 flex-col">
            <CardHeader
              className={cn(
                "py-3.5",
                editControls ? "cursor-grab select-none active:cursor-grabbing" : undefined
              )}
              onPointerDown={editControls?.onStartDrag}
              role={editControls ? "presentation" : undefined}
            >
              <CardHeading className="flex w-full flex-wrap items-start gap-3 md:items-center md:gap-4">
                <div className="min-w-0 flex-1 space-y-1 md:me-6">
                  <div className="text-sm font-medium text-foreground">
                    {block.tableName || "Select a table"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {tableMetadata?.name ?? "Loading metadata..."}
                  </div>
                </div>
                <div className="flex flex-1 justify-end">
                  {editControls ? (
                    <div className="ms-auto flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={editControls.onOpenSettings}
                            aria-label="Configure block"
                          >
                            <Settings2Icon className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Configure block</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="border-destructive/60 text-red-500 hover:border-destructive hover:bg-destructive/5"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={editControls.onRemove}
                            aria-label="Remove block"
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Remove block</TooltipContent>
                      </Tooltip>
                    </div>
                  ) : (
                    <FilterSummary summary={filterSummary} filters={resolvedFilters} />
                  )}
                </div>
              </CardHeading>
            </CardHeader>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {isLoading || isMetadataLoading ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">Loading table data…</div>
              ) : hasError ? (
                <div className="px-4 py-6 text-sm text-destructive">{hasError}</div>
              ) : rows.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">No rows found for the current filters.</div>
              ) : (
                <>
                  <CardTable className="min-h-0 flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                      <DataGridTable />
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  </CardTable>
                  <CardFooter>
                    <DataGridPagination />
                  </CardFooter>
                </>
              )}
            </div>
          </Card>
        </DataGrid>
      </TooltipProvider>
    </div>
  );
}

function FilterSummary({ summary, filters }: { summary: string; filters: ResolvedListFilter[] }) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/70 px-3 py-1 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Filters</span>
          <span className="truncate">{summary}</span>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="max-w-md space-y-2 text-xs">
        {filters.length === 0 ? (
          <p className="text-muted-foreground">No filters applied.</p>
        ) : (
          <ul className="space-y-2">
            {filters.map((filter) => (
              <li key={filter.id} className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground">{filter.column}</span>
                <span className="text-muted-foreground">{filter.operator}</span>
                <span className="font-mono text-foreground">{filter.resolvedValue ?? filter.value ?? "—"}</span>
                {filter.resolvedValue !== filter.value ? (
                  <span className="text-[10px] text-muted-foreground/80">
                    Source: {filter.value || "—"}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

function resolveToken(value: string, urlParams: Record<string, string>): string | null {
  if (!value || !value.startsWith("url.")) {
    return value;
  }
  const key = value.slice(4);
  return urlParams[key] ?? null;
}

function formatCellValue(value: unknown, meta: FieldMetadata | undefined, copy: (text: string) => void) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground/70">—</span>;
  }

  const fieldType = (meta?.ui_hints?.field_type as string | undefined)?.toLowerCase();
  const dataType = meta?.data_type?.toLowerCase();

  if (typeof value === "string") {
    if (fieldType === "uuid" || dataType === "uuid") {
      const truncated =
        value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
      return (
        <Button
          type="button"
          variant="ghost"
          className="h-auto px-0 text-foreground underline-offset-4 hover:underline"
          onClick={() => copy(value)}
        >
          {truncated}
        </Button>
      );
    }

    if (fieldType === "email") {
      return (
        <Link href={`mailto:${value}`} className="text-primary hover:underline">
          {value}
        </Link>
      );
    }

    if (fieldType === "phone") {
      return (
        <Link href={`tel:${value}`} className="text-primary hover:underline">
          {value}
        </Link>
      );
    }

    if (fieldType === "url") {
      return (
        <Link href={value} className="text-primary hover:underline" target="_blank" rel="noreferrer noopener">
          {value}
        </Link>
      );
    }

    if (fieldType === "textarea" || fieldType === "long_text") {
      return renderLongTextWithHover(value);
    }

    if (fieldType === "date" || (dataType && dataType.includes("timestamp"))) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        const relative = formatRelativeTime(date);
        const full = formatFullDate(date);
        return renderHoverSwap(relative, full);
      }
    }
  }

  if (typeof value === "number") {
    if (fieldType === "currency") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    }
    return value.toLocaleString();
  }

  if (typeof value === "object") {
    try {
      return (
        <code className="text-[11px] text-foreground">
          {JSON.stringify(value)}
        </code>
      );
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function renderHoverSwap(primary: string, full: string) {
  const minCh = Math.max(primary.length, full.length);
  return (
    <span
      className="group inline-flex cursor-default whitespace-nowrap"
      style={{ minWidth: `${minCh}ch` }}
    >
      <span className="group-hover:hidden">{primary}</span>
      <span className="hidden group-hover:inline">{full}</span>
    </span>
  );
}

function renderLongTextWithHover(text: string) {
  const limit = 120;
  const truncated = text.length > limit ? `${text.slice(0, limit)}…` : text;

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <span className="inline-flex max-w-[240px] cursor-default truncate whitespace-nowrap">
          {truncated}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="max-w-md text-sm whitespace-pre-wrap wrap-break-word">
        {text}
      </HoverCardContent>
    </HoverCard>
  );
}

function formatFullDate(date: Date) {
  const day = date.getDate();
  const month = date.toLocaleString("en-GB", { month: "short" });
  const ordinal =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  const time = date.toLocaleString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${month} ${day}${ordinal}, ${time.toLowerCase()}`;
}

function formatRelativeTime(date: Date) {
  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 365 * day;

  if (absMs < minute) {
    return rtf.format(Math.round(diffMs / 1000), "second");
  }
  if (absMs < hour) {
    return rtf.format(Math.round(diffMs / minute), "minute");
  }
  if (absMs < day) {
    return rtf.format(Math.round(diffMs / hour), "hour");
  }
  if (absMs < month) {
    return rtf.format(Math.round(diffMs / day), "day");
  }
  if (absMs < year) {
    return rtf.format(Math.round(diffMs / month), "month");
  }
  return rtf.format(Math.round(diffMs / year), "year");
}