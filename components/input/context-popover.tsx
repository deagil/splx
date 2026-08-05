"use client";

import { AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import Image from "next/image";
import type * as React from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { UrlMention } from "@/lib/types/mentions";
import { cn } from "@/lib/utils";
import {
  type ContextItem,
  getContextColors,
  getContextDescription,
  getContextIcon,
  getContextItemType,
  getContextLabel,
} from "./context-card";

/**
 * Get type label for display
 */
function getTypeLabel(item: ContextItem): string {
  if (item.type === "skill") {
    return "Skill";
  }
  if (item.type === "file") {
    return "Attachment";
  }

  const mentionType = item.data.type;
  switch (mentionType) {
    case "user":
      return "User Profile";
    case "table":
      return "Table";
    case "record":
      return "Record";
    case "page":
      return "Page";
    case "block":
      return "Block";
    case "lookup":
      return "Data Lookup";
    default:
      return "Context";
  }
}

/**
 * Get URL content status for display
 */
function getUrlContentStatus(
  item: ContextItem
): { status?: "loading" | "loaded" | "error"; error?: string } | null {
  if (item.type !== "mention" || item.data.type !== "url") {
    return null;
  }
  const urlData = item.data as UrlMention & {
    contentStatus?: "loading" | "loaded" | "error";
    contentError?: string;
  };
  return {
    error: urlData.contentError,
    status: urlData.contentStatus,
  };
}

/**
 * Get additional metadata for popover display
 */
function getMetadata(
  item: ContextItem
): Array<{ label: string; value: string; link?: boolean }> {
  const metadata: Array<{ label: string; value: string; link?: boolean }> = [];

  if (item.type === "skill") {
    if (item.data.command) {
      metadata.push({ label: "Command", value: `/${item.data.command}` });
    }
    return metadata;
  }

  if (item.type === "file") {
    if (item.data.contentType) {
      metadata.push({ label: "Type", value: item.data.contentType });
    }
    return metadata;
  }

  // URL mentions - show URL as clickable link
  if (item.type === "mention" && item.data.type === "url") {
    const urlData = item.data as UrlMention;
    if (urlData.url) {
      metadata.push({ label: "URL", link: true, value: urlData.url });
    }
    return metadata;
  }

  // Mention metadata - cast to any to access dynamic properties
  const mention = item.data as Record<string, unknown>;

  if ("tableName" in mention && typeof mention.tableName === "string") {
    metadata.push({ label: "Table", value: mention.tableName });
  }

  if ("recordId" in mention && typeof mention.recordId === "string") {
    metadata.push({ label: "Record ID", value: mention.recordId });
  }

  if ("blockId" in mention && typeof mention.blockId === "string") {
    metadata.push({ label: "Block ID", value: mention.blockId });
  }

  if ("blockType" in mention && typeof mention.blockType === "string") {
    metadata.push({ label: "Block Type", value: mention.blockType });
  }

  if ("pageId" in mention && typeof mention.pageId === "string") {
    metadata.push({ label: "Page ID", value: mention.pageId });
  }

  return metadata;
}

export interface ContextPopoverProps {
  align?: "start" | "center" | "end";
  children: React.ReactNode;
  item: ContextItem;
  side?: "top" | "bottom" | "left" | "right";
}

/**
 * Rich hover popover for context items
 */
export function ContextPopover({
  item,
  children,
  side = "top",
  align = "center",
}: ContextPopoverProps) {
  const itemType = getContextItemType(item);
  const colors = getContextColors(itemType);
  const label = getContextLabel(item);
  const description = getContextDescription(item);
  const typeLabel = getTypeLabel(item);
  const metadata = getMetadata(item);
  const Icon = getContextIcon(itemType);

  // Check if file is an image for preview
  const isImage =
    item.type === "file" && item.data.contentType?.startsWith("image/");

  return (
    <HoverCard closeDelay={100} openDelay={200}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        align={align}
        className="w-72 overflow-hidden p-0"
        side={side}
      >
        {/* Image preview for file attachments */}
        {isImage && item.type === "file" && item.data.url && (
          <div className="relative h-32 w-full bg-muted">
            <Image
              alt={label}
              className="object-cover"
              fill
              src={item.data.url}
            />
          </div>
        )}

        <div className="space-y-3 p-3">
          {/* Header with icon and type */}
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-lg",
                colors.bg,
                colors.border,
                "border"
              )}
            >
              <Icon className={cn("size-5", colors.icon)} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                {typeLabel}
              </p>
              <p className="mt-0.5 truncate font-semibold text-sm">{label}</p>
            </div>
          </div>

          {/* Description */}
          {description && (
            <p className="line-clamp-2 text-muted-foreground text-sm">
              {description}
            </p>
          )}

          {/* URL content status (error/loading) */}
          {(() => {
            const urlStatus = getUrlContentStatus(item);
            if (!urlStatus) {
              return null;
            }

            if (urlStatus.status === "loading") {
              return (
                <div className="flex items-center gap-2 border-border border-t pt-2 text-muted-foreground text-xs">
                  <Loader2 className="size-3 animate-spin" />
                  <span>Loading article content...</span>
                </div>
              );
            }

            if (urlStatus.status === "error" && urlStatus.error) {
              return (
                <div className="border-border border-t pt-2">
                  <div className="flex items-start gap-2 text-xs">
                    <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 font-medium text-amber-500">
                        Content pre-fetch failed
                      </p>
                      <p className="text-muted-foreground leading-relaxed">
                        {urlStatus.error}
                      </p>
                      <p className="mt-1.5 text-[11px] text-muted-foreground/80">
                        The server will attempt to fetch content during message
                        processing.
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            return null;
          })()}

          {/* Metadata */}
          {metadata.length > 0 && (
            <div className="space-y-1.5 border-border border-t pt-2">
              {metadata.map((meta) => (
                <div
                  className="flex items-center justify-between text-xs"
                  key={meta.label}
                >
                  <span className="text-muted-foreground">{meta.label}</span>
                  {meta.link ? (
                    <a
                      className="flex max-w-[150px] items-center gap-1 truncate font-mono text-foreground hover:text-primary hover:underline"
                      href={meta.value}
                      onClick={(e) => e.stopPropagation()}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <span className="truncate">{meta.value}</span>
                      <ExternalLink className="size-3 shrink-0" />
                    </a>
                  ) : (
                    <span className="max-w-[150px] truncate font-mono text-foreground">
                      {meta.value}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Skill prompt preview */}
          {item.type === "skill" && item.data.prompt && (
            <div className="border-border border-t pt-2">
              <p className="mb-1 text-muted-foreground text-xs">Prompt</p>
              <p className="line-clamp-3 rounded bg-muted p-2 font-mono text-xs">
                {item.data.prompt}
              </p>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
