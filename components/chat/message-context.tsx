"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Paperclip } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Attachment } from "@/lib/types";
import type { MentionMetadata } from "@/lib/types/mentions";
import { cn } from "@/lib/utils";
import {
  ContextCard,
  type ContextItem,
  getContextColors,
  getContextIcon,
  getContextItemType,
} from "../input/context-card";
import { ContextPopover } from "../input/context-popover";

export interface MessageContextProps {
  attachments?: Attachment[];
  className?: string;
  mentions?: MentionMetadata[];
  skill?: { id: string; name: string; command: string; prompt?: string } | null;
}

/**
 * Build context items from message data
 */
function buildMessageContextItems(
  skill: MessageContextProps["skill"],
  mentions: MentionMetadata[] = [],
  attachments: Attachment[] = []
): ContextItem[] {
  const items: ContextItem[] = [];

  if (skill) {
    items.push({
      data: skill as ContextItem extends { type: "skill"; data: infer D }
        ? D
        : never,
      id: `skill-${skill.id}`,
      type: "skill",
    });
  }

  for (const [idx, mention] of mentions.entries()) {
    items.push({
      data: mention as ContextItem extends { type: "mention"; data: infer D }
        ? D
        : never,
      id: `mention-${mention.type}-${mention.id || mention.label}-${idx}`,
      type: "mention",
    });
  }

  for (const attachment of attachments) {
    items.push({
      data: attachment as ContextItem extends { type: "file"; data: infer D }
        ? D
        : never,
      id: `file-${attachment.url || attachment.name}`,
      type: "file",
    });
  }

  return items;
}

/**
 * Stacked context cards display for message history
 * Shows attached context (skills, mentions, files) in a collapsed stack
 * that can be expanded to show all items
 */
export function MessageContext({
  skill,
  mentions = [],
  attachments = [],
  className,
}: MessageContextProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const contextItems = useMemo(
    () => buildMessageContextItems(skill, mentions, attachments),
    [skill, mentions, attachments]
  );

  if (contextItems.length === 0) {
    return null;
  }

  const totalCount = contextItems.length;
  const showCollapsed = totalCount > 2 && !isExpanded;
  const visibleItems = showCollapsed ? contextItems.slice(0, 2) : contextItems;
  const hiddenCount = showCollapsed ? totalCount - 2 : 0;

  return (
    <div className={cn("mb-2", className)}>
      {isExpanded ? (
        // Expanded view - show all items in a row
        <motion.div
          animate={{ height: "auto", opacity: 1 }}
          className="flex flex-wrap gap-1.5"
          exit={{ height: 0, opacity: 0 }}
          initial={{ height: 0, opacity: 0 }}
        >
          <AnimatePresence mode="popLayout">
            {contextItems.map((item, idx) => (
              <motion.div
                animate={{
                  opacity: 1,
                  scale: 1,
                  transition: { delay: idx * 0.03 },
                }}
                exit={{ opacity: 0, scale: 0.8 }}
                initial={{ opacity: 0, scale: 0.8 }}
                key={item.id}
              >
                <ContextPopover item={item} side="bottom">
                  <div>
                    <ContextCard item={item} readOnly />
                  </div>
                </ContextPopover>
              </motion.div>
            ))}
          </AnimatePresence>

          <Button
            className="h-8 px-2 text-muted-foreground text-xs hover:text-foreground"
            onClick={() => setIsExpanded(false)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <ChevronDown className="mr-1 size-3 rotate-180" />
            Collapse
          </Button>
        </motion.div>
      ) : (
        // Collapsed view - stacked cards effect
        <button
          className={cn(
            "group relative inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5",
            "border border-border/50 bg-muted/30 hover:border-border",
            "transition-all duration-200 hover:shadow-sm"
          )}
          onClick={() => setIsExpanded(true)}
          type="button"
        >
          {/* Stacked cards visual */}
          <div className="relative flex items-center">
            {visibleItems.map((item, idx) => {
              const itemType = getContextItemType(item);
              const colors = getContextColors(itemType);
              const Icon = getContextIcon(itemType);

              return (
                <div
                  className={cn(
                    "flex size-6 items-center justify-center rounded-md border",
                    colors.bg,
                    colors.border,
                    idx > 0 && "-ml-2"
                  )}
                  key={item.id}
                  style={{
                    transform: idx > 0 ? `rotate(${idx * 3}deg)` : undefined,
                    zIndex: visibleItems.length - idx,
                  }}
                >
                  <Icon className={cn("size-3", colors.icon)} />
                </div>
              );
            })}

            {hiddenCount > 0 && (
              <div
                className="-ml-2 flex size-6 items-center justify-center rounded-md border border-border bg-muted font-medium text-[10px] text-muted-foreground"
                style={{ transform: "rotate(6deg)", zIndex: 0 }}
              >
                +{hiddenCount}
              </div>
            )}
          </div>

          {/* Label */}
          <span className="text-muted-foreground text-xs transition-colors group-hover:text-foreground">
            <Paperclip className="mr-1 inline size-3" />
            {totalCount} item{totalCount === 1 ? "" : "s"} attached
          </span>

          {/* Expand indicator */}
          <ChevronDown className="size-3 text-muted-foreground transition-colors group-hover:text-foreground" />
        </button>
      )}
    </div>
  );
}
