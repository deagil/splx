"use client";

import Link from "next/link";
import { useMemo, type PointerEvent as ReactPointerEvent } from "react";
import { Settings2Icon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardHeading,
} from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import type { FieldMetadata } from "@/lib/server/tables";
import { cn } from "@/lib/utils";
import type { RecordBlockDraft } from "../types";
import { useRecordBlockData, useTableMetadata } from "../hooks";

export type RecordBlockViewProps = {
  block: RecordBlockDraft;
  urlParams: Record<string, string>;
  editControls?: {
    onOpenSettings: () => void;
    onRemove: () => void;
    onStartDrag: (event: ReactPointerEvent) => void;
  };
};

export function RecordBlockView({ block, urlParams, editControls }: RecordBlockViewProps) {
  const { data, isLoading, error } = useRecordBlockData(block, urlParams);
  const {
    table: tableMetadata,
    isLoading: isMetadataLoading,
    error: metadataError,
  } = useTableMetadata(block.tableName || null);
  const { copy } = useCopyToClipboard();

  const resolvedRecordId = useMemo(
    () => resolveToken(block.recordId, urlParams),
    [block.recordId, urlParams]
  );

  const fieldMetaMap = useMemo(() => {
    const meta = new Map<string, FieldMetadata>();
    if (tableMetadata?.config?.field_metadata) {
      for (const field of tableMetadata.config.field_metadata) {
        meta.set(field.field_name, field);
      }
    }
    return meta;
  }, [tableMetadata]);

  const resolvedColumns = useMemo(() => {
    const availableColumns = data?.columns ?? Array.from(fieldMetaMap.keys());
    const selected =
      block.display.columns.length === 0 ? availableColumns : block.display.columns;
    return selected
      .filter((column) => availableColumns.includes(column))
      .filter((column) => !isFieldHidden(fieldMetaMap.get(column)));
  }, [block.display.columns, data?.columns, fieldMetaMap]);

  const displayColumns =
    resolvedColumns.length > 0
      ? resolvedColumns
      : data?.columns?.filter((column) => !isFieldHidden(fieldMetaMap.get(column))) ?? [];

  const hasError = error ?? metadataError;
  const isBusy = isLoading || isMetadataLoading;

  return (
    <TooltipProvider delayDuration={80}>
      <div className="flex h-full min-h-0 w-full flex-col">
        <Card className="flex h-full min-h-0 flex-col">
          <CardHeader
            className={cn(
              "py-3.5",
              editControls ? "cursor-grab select-none active:cursor-grabbing" : undefined
            )}
            onPointerDown={editControls?.onStartDrag}
            role={editControls ? "presentation" : undefined}
          >
            <CardHeading className="flex w-full items-center gap-3">
              <div className="min-w-0 flex-1 space-y-1 md:me-6">
                <div className="text-sm font-medium text-foreground">
                  {block.tableName || "Select a table"}
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                  {tableMetadata?.name ?? "Loading metadata..."}
                </CardDescription>
              </div>
              {editControls ? (
                <div className="ms-auto flex shrink-0 items-center gap-2">
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
              ) : null}
            </CardHeading>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 space-y-4 overflow-auto">
            {isBusy ? (
              <p className="text-sm text-muted-foreground">Loading record…</p>
            ) : hasError ? (
              <p className="text-sm text-destructive">{hasError}</p>
            ) : !data?.record ? (
              <p className="text-sm text-muted-foreground">
                No record found for the provided identifier.
              </p>
            ) : (
              <dl className="grid gap-2 text-sm">
                {displayColumns.map((column) => {
                  const meta = fieldMetaMap.get(column);
                  const label = meta?.display_name ?? column;
                  return (
                    <div key={column} className="grid grid-cols-[140px,1fr] items-start gap-1">
                      <dt className="truncate text-sm font-medium text-muted-foreground leading-snug">{label}</dt>
                      <dd className="text-base text-foreground leading-normal pb-2">
                        {formatRecordValue(data.record?.[column], meta, copy)}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

function resolveToken(
  value: string,
  urlParams: Record<string, string>
): string | null {
  if (!value || !value.startsWith("url.")) {
    return value;
  }
  const key = value.slice(4);
  return urlParams[key] ?? null;
}

function isFieldHidden(meta: FieldMetadata | undefined) {
  const hints = meta?.ui_hints as Record<string, unknown> | undefined;
  return Boolean(hints?.hidden);
}

function formatRecordValue(
  value: unknown,
  meta: FieldMetadata | undefined,
  copy: (text: string) => void
) {
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
        <span className="inline-flex max-w-[320px] cursor-default truncate whitespace-nowrap">
          {truncated}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="max-w-md whitespace-pre-wrap text-sm">
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

