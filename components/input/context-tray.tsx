"use client";

import * as React from "react";
import { useRef, useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ContextCard, type ContextItem } from "./context-card";
import { ContextPopover } from "./context-popover";

export type ContextTrayProps = {
  items: ContextItem[];
  onRemoveItem: (id: string) => void;
  className?: string;
  readOnly?: boolean;
};

/**
 * Unified scrollable container for all context items (skills, mentions, files)
 */
export function ContextTray({ items, onRemoveItem, className, readOnly = false }: ContextTrayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const updateFades = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const hasOverflow = scrollWidth > clientWidth;
    
    setShowLeftFade(hasOverflow && scrollLeft > 0);
    setShowRightFade(hasOverflow && scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  useEffect(() => {
    updateFades();
    
    const el = scrollRef.current;
    if (!el) return;
    
    el.addEventListener("scroll", updateFades);
    
    // Also update on resize
    const resizeObserver = new ResizeObserver(updateFades);
    resizeObserver.observe(el);
    
    return () => {
      el.removeEventListener("scroll", updateFades);
      resizeObserver.disconnect();
    };
  }, [updateFades, items.length]);

  if (items.length === 0) return null;

  return (
    <div className={cn("relative overflow-visible", className)}>
      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-none py-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.8, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 10 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30,
                mass: 0.8,
              }}
              className="shrink-0"
            >
              <ContextPopover item={item}>
                <div>
                  <ContextCard
                    item={item}
                    onRemove={() => onRemoveItem(item.id)}
                    readOnly={readOnly}
                  />
                </div>
              </ContextPopover>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {/* Left fade - positioned at actual edge */}
      <div
        className={cn(
          "pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-12",
          "bg-gradient-to-r from-background via-background/80 to-transparent",
          "transition-opacity duration-200",
          showLeftFade ? "opacity-100" : "opacity-0"
        )}
      />
      
      {/* Right fade - positioned at actual edge */}
      <div
        className={cn(
          "pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-12",
          "bg-gradient-to-l from-background via-background/80 to-transparent",
          "transition-opacity duration-200",
          showRightFade ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}

/**
 * URL mention with optional status for error display
 */
export type UrlMentionData = {
  type: "url";
  label: string;
  url: string;
  description?: string;
  favicon?: string;
  image?: string;
  title?: string;
  id?: string;
  /** Content pre-fetch status */
  contentStatus?: "loading" | "loaded" | "error";
  /** Error message if pre-fetch failed */
  contentError?: string;
};

/**
 * Helper to convert skills, mentions, URLs, and attachments to ContextItems
 */
export function buildContextItems(
  skill: { id: string; name: string; command: string; prompt?: string; description?: string | null } | null,
  mentions: Array<{ type: string; label: string; id?: string; description?: string; [key: string]: unknown }>,
  attachments: Array<{ url: string; name: string; contentType: string }>,
  urlMentions?: UrlMentionData[]
): ContextItem[] {
  const items: ContextItem[] = [];
  
  // Add skill if present
  if (skill) {
    items.push({
      type: "skill",
      id: `skill-${skill.id}`,
      data: {
        ...skill,
        description: skill.description ?? undefined,
      } as ContextItem extends { type: "skill"; data: infer D } ? D : never,
    });
  }
  
  // Add mentions - use mention array index for tracking
  for (const [idx, mention] of mentions.entries()) {
    items.push({
      type: "mention",
      id: `mention-${idx}`,
      data: mention as ContextItem extends { type: "mention"; data: infer D } ? D : never,
    });
  }
  
  // Add URL mentions (with status info for error display)
  if (urlMentions) {
    for (const urlMention of urlMentions) {
      items.push({
        type: "mention",
        id: `url-${urlMention.url}`,
        data: urlMention as ContextItem extends { type: "mention"; data: infer D } ? D : never,
      });
    }
  }
  
  // Add attachments
  for (const attachment of attachments) {
    items.push({
      type: "file",
      id: `file-${attachment.url || attachment.name}`,
      data: attachment as ContextItem extends { type: "file"; data: infer D } ? D : never,
    });
  }
  
  return items;
}

