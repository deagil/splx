"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMentionableItems } from "@/hooks/use-mentionable-items";
import type { MentionableItem } from "@/lib/types/mentions";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Component to visualize all available mentions
 * Shows a dialog with categorized mention types
 */
export function MentionsHelpPanel() {
  const mentionableItems = useMentionableItems();

  // Group mentions by type
  const groupedMentions = useMemo(() => {
    const groups: Record<string, MentionableItem[]> = {
      page: [],
      block: [],
      table: [],
      record: [],
      user: [],
      lookup: [],
    };

    mentionableItems.forEach((item) => {
      const type = item.mention.type;
      if (type in groups) {
        groups[type].push(item);
      }
    });

    return groups;
  }, [mentionableItems]);

  const typeLabels: Record<string, { label: string; description: string; color: string }> = {
    page: {
      label: "Pages",
      description: "Reference all data from a page",
      color: "bg-blue-500/10 text-blue-500",
    },
    block: {
      label: "Blocks",
      description: "Reference specific block data",
      color: "bg-purple-500/10 text-purple-500",
    },
    table: {
      label: "Tables",
      description: "Query data from tables",
      color: "bg-green-500/10 text-green-500",
    },
    record: {
      label: "Records",
      description: "Reference specific records",
      color: "bg-orange-500/10 text-orange-500",
    },
    user: {
      label: "Users",
      description: "Reference user profiles",
      color: "bg-pink-500/10 text-pink-500",
    },
    lookup: {
      label: "Lookups",
      description: "Generic data lookups",
      color: "bg-gray-500/10 text-gray-500",
    },
  };

  const totalCount = mentionableItems.length;
  const hasMentions = totalCount > 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative aspect-square h-8 rounded-lg p-1 transition-colors hover:bg-accent"
          title="Available mentions"
        >
          <HelpCircle className="h-4 w-4" />
          {hasMentions && (
            <Badge
              variant="secondary"
              className="absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[10px]"
            >
              {totalCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Available Mentions</DialogTitle>
          <DialogDescription>
            Type <code className="rounded bg-muted px-1.5 py-0.5 text-sm">@</code> in the chat
            input to reference these items. Mentions provide context to the AI about your data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!hasMentions ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              <p>No mentions available.</p>
              <p className="mt-2">
                Navigate to a page with blocks or create tables to see mentionable items.
              </p>
            </div>
          ) : (
            Object.entries(groupedMentions).map(([type, items]) => {
              if (items.length === 0) return null;

              const typeInfo = typeLabels[type];
              if (!typeInfo) return null;

              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={cn("font-medium", typeInfo.color)}>
                      {typeInfo.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {items.length} {items.length === 1 ? "item" : "items"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{typeInfo.description}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {items.map((item) => (
                      <div
                        key={item.key}
                        className="rounded-lg border bg-card p-3 text-sm transition-colors hover:bg-accent"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <code className="block truncate font-mono text-xs font-medium text-foreground">
                              {item.text}
                            </code>
                            {item.description && (
                              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="rounded-lg border bg-muted/50 p-4 text-sm">
          <p className="font-medium">How to use mentions:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>Type <code className="rounded bg-background px-1">@</code> in the chat input</li>
            <li>Select a mention from the dropdown</li>
            <li>The AI will receive context about the mentioned data</li>
            <li>Mentions appear as chips above the input</li>
          </ol>
        </div>
      </DialogContent>
    </Dialog>
  );
}

