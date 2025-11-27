"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  ContextCard, 
  type ContextItem,
  getContextItemType,
  getContextColors,
  getContextIcon,
} from "../input/context-card";
import { ContextPopover } from "../input/context-popover";
import { Button } from "@/components/ui/button";
import type { MentionMetadata } from "@/lib/types/mentions";
import type { Skill } from "@/hooks/use-skills";
import type { Attachment } from "@/lib/types";

export type MessageContextProps = {
  skill?: { id: string; name: string; command: string; prompt?: string } | null;
  mentions?: MentionMetadata[];
  attachments?: Attachment[];
  className?: string;
};

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
      type: "skill",
      id: `skill-${skill.id}`,
      data: skill as ContextItem extends { type: "skill"; data: infer D } ? D : never,
    });
  }
  
  for (const [idx, mention] of mentions.entries()) {
    items.push({
      type: "mention",
      id: `mention-${mention.type}-${mention.id || mention.label}-${idx}`,
      data: mention as ContextItem extends { type: "mention"; data: infer D } ? D : never,
    });
  }
  
  for (const attachment of attachments) {
    items.push({
      type: "file",
      id: `file-${attachment.url || attachment.name}`,
      data: attachment as ContextItem extends { type: "file"; data: infer D } ? D : never,
    });
  }
  
  return items;
}

/**
 * Stacked context cards display for message history
 * Shows attached context (skills, mentions, files) in a collapsed stack
 * that can be expanded to show all items
 */
export function MessageContext({ skill, mentions = [], attachments = [], className }: MessageContextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const contextItems = useMemo(
    () => buildMessageContextItems(skill, mentions, attachments),
    [skill, mentions, attachments]
  );
  
  if (contextItems.length === 0) return null;
  
  const totalCount = contextItems.length;
  const showCollapsed = totalCount > 2 && !isExpanded;
  const visibleItems = showCollapsed ? contextItems.slice(0, 2) : contextItems;
  const hiddenCount = showCollapsed ? totalCount - 2 : 0;

  return (
    <div className={cn("mb-2", className)}>
      {isExpanded ? (
        // Expanded view - show all items in a row
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-wrap gap-1.5"
        >
          <AnimatePresence mode="popLayout">
            {contextItems.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  transition: { delay: idx * 0.03 }
                }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <ContextPopover item={item} side="bottom">
                  <div>
                    <ContextCard item={item} readOnly />
                  </div>
                </ContextPopover>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {totalCount > 2 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setIsExpanded(false)}
            >
              <ChevronDown className="size-3 mr-1 rotate-180" />
              Collapse
            </Button>
          )}
        </motion.div>
      ) : (
        // Collapsed view - stacked cards effect
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className={cn(
            "group relative inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5",
            "bg-muted/30 border border-border/50 hover:border-border",
            "transition-all duration-200 hover:shadow-sm"
          )}
        >
          {/* Stacked cards visual */}
          <div className="relative flex items-center">
            {visibleItems.map((item, idx) => {
              const itemType = getContextItemType(item);
              const colors = getContextColors(itemType);
              const Icon = getContextIcon(itemType);
              
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex size-6 items-center justify-center rounded-md border",
                    colors.bg,
                    colors.border,
                    idx > 0 && "-ml-2"
                  )}
                  style={{
                    zIndex: visibleItems.length - idx,
                    transform: idx > 0 ? `rotate(${idx * 3}deg)` : undefined,
                  }}
                >
                  <Icon className={cn("size-3", colors.icon)} />
                </div>
              );
            })}
            
            {hiddenCount > 0 && (
              <div 
                className="flex size-6 items-center justify-center rounded-md border border-border bg-muted -ml-2 text-[10px] font-medium text-muted-foreground"
                style={{ zIndex: 0, transform: "rotate(6deg)" }}
              >
                +{hiddenCount}
              </div>
            )}
          </div>
          
          {/* Label */}
          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            <Paperclip className="size-3 inline mr-1" />
            {totalCount} item{totalCount !== 1 ? "s" : ""} attached
          </span>
          
          {/* Expand indicator */}
          <ChevronDown className="size-3 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      )}
    </div>
  );
}



