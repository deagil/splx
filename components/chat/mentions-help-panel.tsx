"use client";

import { HelpCircle } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMentionableItems } from "@/hooks/use-mentionable-items";
import type { MentionableItem } from "@/lib/types/mentions";
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
      block: [],
      lookup: [],
      page: [],
      record: [],
      table: [],
      user: [],
    };

    for (const item of mentionableItems) {
      const { type } = item.mention;
      if (type in groups) {
        groups[type].push(item);
      }
    }

    return groups;
  }, [mentionableItems]);

  const typeLabels: Record<
    string,
    { label: string; description: string; color: string }
  > = {
    block: {
      color: "bg-purple-500/10 text-purple-500",
      description: "Reference specific block data",
      label: "Blocks",
    },
    lookup: {
      color: "bg-gray-500/10 text-gray-500",
      description: "Generic data lookups",
      label: "Lookups",
    },
    page: {
      color: "bg-blue-500/10 text-blue-500",
      description: "Reference all data from a page",
      label: "Pages",
    },
    record: {
      color: "bg-orange-500/10 text-orange-500",
      description: "Reference specific records",
      label: "Records",
    },
    table: {
      color: "bg-green-500/10 text-green-500",
      description: "Query data from tables",
      label: "Tables",
    },
    user: {
      color: "bg-pink-500/10 text-pink-500",
      description: "Reference user profiles",
      label: "Users",
    },
  };

  const totalCount = mentionableItems.length;
  const hasMentions = totalCount > 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className="relative aspect-square h-8 rounded-lg p-1 transition-colors hover:bg-accent"
          size="sm"
          title="Available mentions"
          variant="ghost"
        >
          <HelpCircle className="h-4 w-4" />
          {hasMentions && (
            <Badge
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]"
              variant="secondary"
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
            Type{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm">@</code> in
            the chat input to reference these items. Mentions provide context to
            the AI about your data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {hasMentions ? (
            Object.entries(groupedMentions).map(([type, items]) => {
              if (items.length === 0) {
                return null;
              }

              const typeInfo = typeLabels[type];
              if (!typeInfo) {
                return null;
              }

              return (
                <div className="space-y-2" key={type}>
                  <div className="flex items-center gap-2">
                    <Badge className={cn("font-medium", typeInfo.color)}>
                      {typeInfo.label}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {items.length} {items.length === 1 ? "item" : "items"}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {typeInfo.description}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {items.map((item) => (
                      <div
                        className="rounded-lg border bg-card p-3 text-sm transition-colors hover:bg-accent"
                        key={item.key}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <code className="block truncate font-medium font-mono text-foreground text-xs">
                              {item.text}
                            </code>
                            {!!item.description && (
                              <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
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
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
              <p>No mentions available.</p>
              <p className="mt-2">
                Navigate to a page with blocks or create tables to see
                mentionable items.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-muted/50 p-4 text-sm">
          <p className="font-medium">How to use mentions:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>
              Type <code className="rounded bg-background px-1">@</code> in the
              chat input
            </li>
            <li>Select a mention from the dropdown</li>
            <li>The AI will receive context about the mentioned data</li>
            <li>Mentions appear as chips above the input</li>
          </ol>
        </div>
      </DialogContent>
    </Dialog>
  );
}
