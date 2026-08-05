"use client";

import {
  AlertCircle,
  Database,
  File,
  FileCode,
  FileSpreadsheet,
  FileText,
  Globe,
  Image,
  LayoutGrid,
  Loader2,
  Search,
  Table2,
  User,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Skill } from "@/hooks/use-skills";
import type { Attachment } from "@/lib/types";
import type {
  MentionMetadata,
  MentionType,
  UrlMention,
} from "@/lib/types/mentions";
import { cn } from "@/lib/utils";

/**
 * Context item types that can appear in the tray
 */
export type ContextItemType =
  | "skill"
  | "mention-user"
  | "mention-table"
  | "mention-record"
  | "mention-page"
  | "mention-block"
  | "mention-lookup"
  | "mention-url"
  | "file";

/**
 * Unified context item for the tray
 */
export type ContextItem =
  | { type: "skill"; data: Skill; id: string }
  | { type: "mention"; data: MentionMetadata; id: string }
  | { type: "file"; data: Attachment; id: string };

/**
 * Get the display type for styling from a context item
 */
export function getContextItemType(item: ContextItem): ContextItemType {
  if (item.type === "skill") {
    return "skill";
  }
  if (item.type === "file") {
    return "file";
  }
  // It's a mention
  const mentionType = item.data.type as MentionType;
  return `mention-${mentionType}` as ContextItemType;
}

/**
 * Get icon component for context item type
 */
export function getContextIcon(itemType: ContextItemType) {
  switch (itemType) {
    case "skill":
      return Zap;
    case "mention-user":
      return User;
    case "mention-table":
      return Table2;
    case "mention-record":
      return Database;
    case "mention-page":
      return FileText;
    case "mention-block":
      return LayoutGrid;
    case "mention-lookup":
      return Search;
    case "mention-url":
      return Globe;
    case "file":
      return File;
    default:
      return File;
  }
}

/**
 * Get file-specific icon based on content type
 */
function getFileIcon(contentType: string) {
  if (contentType.startsWith("image/")) {
    return Image;
  }
  if (
    contentType.includes("spreadsheet") ||
    contentType.includes("csv") ||
    contentType.includes("excel")
  ) {
    return FileSpreadsheet;
  }
  if (
    contentType.includes("json") ||
    contentType.includes("javascript") ||
    contentType.includes("typescript") ||
    contentType.includes("html") ||
    contentType.includes("css")
  ) {
    return FileCode;
  }
  return File;
}

/**
 * Get color classes for context item type
 */
export function getContextColors(itemType: ContextItemType): {
  border: string;
  icon: string;
  bg: string;
} {
  switch (itemType) {
    case "skill":
      return {
        bg: "bg-amber-500/5",
        border: "border-amber-500/30",
        icon: "text-amber-500",
      };
    case "mention-user":
      return {
        bg: "bg-blue-500/5",
        border: "border-blue-500/30",
        icon: "text-blue-500",
      };
    case "mention-table":
    case "mention-record":
      return {
        bg: "bg-emerald-500/5",
        border: "border-emerald-500/30",
        icon: "text-emerald-500",
      };
    case "mention-page":
    case "mention-block":
      return {
        bg: "bg-violet-500/5",
        border: "border-violet-500/30",
        icon: "text-violet-500",
      };
    case "mention-lookup":
      return {
        bg: "bg-cyan-500/5",
        border: "border-cyan-500/30",
        icon: "text-cyan-500",
      };
    case "mention-url":
      return {
        bg: "bg-indigo-500/5",
        border: "border-indigo-500/30",
        icon: "text-indigo-500",
      };
    case "file":
      return {
        bg: "bg-muted/50",
        border: "border-border",
        icon: "text-muted-foreground",
      };
    default:
      return {
        bg: "bg-muted/50",
        border: "border-border",
        icon: "text-muted-foreground",
      };
  }
}

/**
 * Get label for context item
 */
export function getContextLabel(item: ContextItem): string {
  if (item.type === "skill") {
    return item.data.name;
  }
  if (item.type === "file") {
    return item.data.name;
  }
  return item.data.label;
}

/**
 * Get description for context item
 */
export function getContextDescription(item: ContextItem): string | undefined {
  if (item.type === "skill") {
    return item.data.description ?? undefined;
  }
  if (item.type === "file") {
    return item.data.contentType;
  }
  return item.data.description;
}

export interface ContextCardProps {
  className?: string;
  item: ContextItem;
  onRemove?: () => void;
  readOnly?: boolean;
}

/**
 * Check if item is a URL mention with favicon
 */
function isUrlMentionWithFavicon(
  item: ContextItem
): item is { type: "mention"; data: UrlMention; id: string } {
  return (
    item.type === "mention" &&
    item.data.type === "url" &&
    "favicon" in item.data &&
    Boolean(item.data.favicon)
  );
}

/**
 * Extended URL mention data with content status
 */
type UrlMentionWithStatus = UrlMention & {
  contentStatus?: "loading" | "loaded" | "error";
  contentError?: string;
};

/**
 * Check if item is a URL mention with content status
 */
function getUrlContentStatus(
  item: ContextItem
): { status?: "loading" | "loaded" | "error"; error?: string } | null {
  if (item.type !== "mention" || item.data.type !== "url") {
    return null;
  }
  const urlData = item.data as UrlMentionWithStatus;
  return {
    error: urlData.contentError,
    status: urlData.contentStatus,
  };
}

/**
 * Compact context card for skills, mentions, and files
 * Chunkier design inspired by Dia's context tray
 */
export function ContextCard({
  item,
  onRemove,
  readOnly = false,
  className,
}: ContextCardProps) {
  const itemType = getContextItemType(item);
  const colors = getContextColors(itemType);
  const label = getContextLabel(item);

  // Get the appropriate icon
  let Icon = getContextIcon(itemType);
  if (item.type === "file" && item.data.contentType) {
    Icon = getFileIcon(item.data.contentType);
  }

  // Check if we should show favicon for URL mentions
  const showFavicon = isUrlMentionWithFavicon(item);
  const faviconUrl = showFavicon
    ? (item.data as UrlMention).favicon
    : undefined;

  // Check URL content status for error/loading indicators
  const urlStatus = getUrlContentStatus(item);
  const hasContentError = urlStatus?.status === "error";
  const isContentLoading = urlStatus?.status === "loading";

  // Override colors for error state
  const effectiveColors = hasContentError
    ? {
        bg: "bg-amber-500/5",
        border: "border-amber-500/40",
        icon: colors.icon,
      }
    : colors;

  return (
    <div
      className={cn(
        "group relative inline-flex h-9 items-center gap-2 rounded-xl border px-3",
        "transition-all duration-150 ease-out",
        "hover:shadow-sm",
        effectiveColors.border,
        effectiveColors.bg,
        hasContentError && "border-dashed",
        className
      )}
    >
      <div
        className={cn(
          "flex size-5 items-center justify-center overflow-hidden rounded-md",
          effectiveColors.bg
        )}
      >
        {showFavicon && faviconUrl ? (
          <img
            alt=""
            className={cn(
              "size-3.5 shrink-0 object-contain",
              hasContentError && "opacity-60"
            )}
            onError={(e) => {
              // Hide broken favicon images
              (e.target as HTMLImageElement).style.display = "none";
              // Show fallback icon by replacing parent content
              const parent = (e.target as HTMLImageElement).parentElement;
              if (parent) {
                parent.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5 shrink-0 ${colors.icon}"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`;
              }
            }}
            src={faviconUrl}
          />
        ) : (
          <Icon className={cn("size-3.5 shrink-0", effectiveColors.icon)} />
        )}
      </div>
      <span
        className={cn(
          "max-w-[120px] truncate font-medium text-sm",
          hasContentError && "opacity-80"
        )}
      >
        {label}
      </span>

      {/* Status indicators */}
      {isContentLoading && (
        <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" />
      )}
      {hasContentError && (
        <AlertCircle className="size-3 shrink-0 text-amber-500" />
      )}

      {!readOnly && onRemove && (
        <Button
          className={cn(
            "ml-0.5 size-5 shrink-0 rounded-md p-0",
            "opacity-0 transition-all duration-150 group-hover:opacity-100",
            "hover:bg-destructive/10 hover:text-destructive",
            "focus:bg-destructive/10 focus:text-destructive focus:opacity-100"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          size="sm"
          title="Remove"
          type="button"
          variant="ghost"
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
