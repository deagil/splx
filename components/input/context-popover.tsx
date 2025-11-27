"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  type ContextItem,
  getContextItemType,
  getContextIcon,
  getContextColors,
  getContextLabel,
  getContextDescription,
} from "./context-card";

/**
 * Get type label for display
 */
function getTypeLabel(item: ContextItem): string {
  if (item.type === "skill") return "Skill";
  if (item.type === "file") return "Attachment";
  
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
 * Get additional metadata for popover display
 */
function getMetadata(item: ContextItem): Array<{ label: string; value: string }> {
  const metadata: Array<{ label: string; value: string }> = [];
  
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

export type ContextPopoverProps = {
  item: ContextItem;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
};

/**
 * Rich hover popover for context items
 */
export function ContextPopover({ 
  item, 
  children, 
  side = "top",
  align = "center" 
}: ContextPopoverProps) {
  const itemType = getContextItemType(item);
  const colors = getContextColors(itemType);
  const label = getContextLabel(item);
  const description = getContextDescription(item);
  const typeLabel = getTypeLabel(item);
  const metadata = getMetadata(item);
  const Icon = getContextIcon(itemType);
  
  // Check if file is an image for preview
  const isImage = item.type === "file" && item.data.contentType?.startsWith("image/");

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent 
        side={side} 
        align={align}
        className="w-72 p-0 overflow-hidden"
      >
        {/* Image preview for file attachments */}
        {isImage && item.type === "file" && item.data.url && (
          <div className="relative h-32 w-full bg-muted">
            <Image
              src={item.data.url}
              alt={label}
              fill
              className="object-cover"
            />
          </div>
        )}
        
        <div className="p-3 space-y-3">
          {/* Header with icon and type */}
          <div className="flex items-start gap-3">
            <div className={cn(
              "flex size-10 items-center justify-center rounded-lg",
              colors.bg,
              colors.border,
              "border"
            )}>
              <Icon className={cn("size-5", colors.icon)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {typeLabel}
              </p>
              <p className="text-sm font-semibold truncate mt-0.5">
                {label}
              </p>
            </div>
          </div>
          
          {/* Description */}
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}
          
          {/* Metadata */}
          {metadata.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-border">
              {metadata.map((meta) => (
                <div key={meta.label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{meta.label}</span>
                  <span className="font-mono text-foreground truncate max-w-[150px]">
                    {meta.value}
                  </span>
                </div>
              ))}
            </div>
          )}
          
          {/* Skill prompt preview */}
          {item.type === "skill" && item.data.prompt && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Prompt</p>
              <p className="text-xs bg-muted rounded p-2 line-clamp-3 font-mono">
                {item.data.prompt}
              </p>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

