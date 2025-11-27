"use client";

import * as React from "react";
import { X, Zap, User, Table2, Database, FileText, LayoutGrid, Search, File, Image, FileCode, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { MentionMetadata, MentionType } from "@/lib/types/mentions";
import type { Skill } from "@/hooks/use-skills";
import type { Attachment } from "@/lib/types";

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
  if (item.type === "skill") return "skill";
  if (item.type === "file") return "file";
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
  if (contentType.startsWith("image/")) return Image;
  if (contentType.includes("spreadsheet") || contentType.includes("csv") || contentType.includes("excel")) return FileSpreadsheet;
  if (contentType.includes("json") || contentType.includes("javascript") || contentType.includes("typescript") || contentType.includes("html") || contentType.includes("css")) return FileCode;
  return File;
}

/**
 * Get color classes for context item type
 */
export function getContextColors(itemType: ContextItemType): { border: string; icon: string; bg: string } {
  switch (itemType) {
    case "skill":
      return {
        border: "border-amber-500/30",
        icon: "text-amber-500",
        bg: "bg-amber-500/5",
      };
    case "mention-user":
      return {
        border: "border-blue-500/30",
        icon: "text-blue-500",
        bg: "bg-blue-500/5",
      };
    case "mention-table":
    case "mention-record":
      return {
        border: "border-emerald-500/30",
        icon: "text-emerald-500",
        bg: "bg-emerald-500/5",
      };
    case "mention-page":
    case "mention-block":
      return {
        border: "border-violet-500/30",
        icon: "text-violet-500",
        bg: "bg-violet-500/5",
      };
    case "mention-lookup":
      return {
        border: "border-cyan-500/30",
        icon: "text-cyan-500",
        bg: "bg-cyan-500/5",
      };
    case "file":
      return {
        border: "border-border",
        icon: "text-muted-foreground",
        bg: "bg-muted/50",
      };
    default:
      return {
        border: "border-border",
        icon: "text-muted-foreground",
        bg: "bg-muted/50",
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

export type ContextCardProps = {
  item: ContextItem;
  onRemove?: () => void;
  readOnly?: boolean;
  className?: string;
};

/**
 * Compact context card for skills, mentions, and files
 * Chunkier design inspired by Dia's context tray
 */
export function ContextCard({ item, onRemove, readOnly = false, className }: ContextCardProps) {
  const itemType = getContextItemType(item);
  const colors = getContextColors(itemType);
  const label = getContextLabel(item);
  
  // Get the appropriate icon
  let Icon = getContextIcon(itemType);
  if (item.type === "file" && item.data.contentType) {
    Icon = getFileIcon(item.data.contentType);
  }

  return (
    <div
      className={cn(
        "group relative inline-flex h-9 items-center gap-2 rounded-xl border px-3",
        "transition-all duration-150 ease-out",
        "hover:shadow-sm",
        colors.border,
        colors.bg,
        className
      )}
    >
      <div className={cn(
        "flex size-5 items-center justify-center rounded-md",
        colors.bg,
      )}>
        <Icon className={cn("size-3.5 shrink-0", colors.icon)} />
      </div>
      <span className="max-w-[120px] truncate text-sm font-medium">
        {label}
      </span>
      
      {!readOnly && onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "ml-0.5 size-5 rounded-md p-0 shrink-0",
            "opacity-0 group-hover:opacity-100 transition-all duration-150",
            "hover:bg-destructive/10 hover:text-destructive",
            "focus:opacity-100 focus:bg-destructive/10 focus:text-destructive"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Remove"
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  );
}

