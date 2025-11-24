"use client";

import { X } from "lucide-react";
import type { MentionMetadata } from "@/lib/types/mentions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MentionChip({
  mention,
  onRemove,
  readOnly = false,
}: {
  mention: MentionMetadata;
  onRemove: () => void;
  readOnly?: boolean;
}) {
  // Get icon based on mention type
  const getIcon = () => {
    switch (mention.type) {
      case "page":
        return "📄";
      case "block":
        return "🧩";
      case "table":
        return "📊";
      case "record":
        return "📝";
      case "user":
        return "👤";
      case "lookup":
        return "🔍";
      default:
        return "📎";
    }
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs",
        "border border-border/50 transition-colors hover:bg-muted/80"
      )}
    >
      <span className="text-sm leading-none">{getIcon()}</span>
      <span className="font-medium">{mention.label}</span>
      {mention.description && (
        <span className="text-[10px] text-muted-foreground max-w-[200px] truncate">
          {mention.description}
        </span>
      )}
      {!readOnly && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0 hover:bg-destructive/10 hover:text-destructive ml-1"
          onClick={onRemove}
          title="Remove mention"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
