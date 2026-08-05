"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ContextCard, type ContextItem } from "./context-card";
import { ContextPopover } from "./context-popover";

export interface ContextTrayProps {
  className?: string;
  items: ContextItem[];
  onRemoveItem: (id: string) => void;
  readOnly?: boolean;
}

/**
 * Unified scrollable container for all context items (skills, mentions, files)
 */
export function ContextTray({
  items,
  onRemoveItem,
  className,
  readOnly = false,
}: ContextTrayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const updateFades = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const hasOverflow = scrollWidth > clientWidth;

    setShowLeftFade(hasOverflow && scrollLeft > 0);
    setShowRightFade(hasOverflow && scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  useEffect(() => {
    updateFades();

    const el = scrollRef.current;
    if (!el) {
      return;
    }

    el.addEventListener("scroll", updateFades);

    // Also update on resize
    const resizeObserver = new ResizeObserver(updateFades);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener("scroll", updateFades);
      resizeObserver.disconnect();
    };
  }, [updateFades]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn("relative overflow-visible", className)}>
      {/* Scrollable container */}
      <div
        className="scrollbar-none flex gap-2 overflow-x-auto py-1"
        ref={scrollRef}
        style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((item) => (
            <motion.div
              animate={{ opacity: 1, scale: 1, x: 0 }}
              className="shrink-0"
              exit={{ opacity: 0, scale: 0.8, x: 10 }}
              initial={{ opacity: 0, scale: 0.8, x: -10 }}
              key={item.id}
              layout
              transition={{
                damping: 30,
                mass: 0.8,
                stiffness: 500,
                type: "spring",
              }}
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
          "pointer-events-none absolute top-0 bottom-0 left-0 z-10 w-12",
          "bg-gradient-to-r from-background via-background/80 to-transparent",
          "transition-opacity duration-200",
          showLeftFade ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Right fade - positioned at actual edge */}
      <div
        className={cn(
          "pointer-events-none absolute top-0 right-0 bottom-0 z-10 w-12",
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
export interface UrlMentionData {
  /** Error message if pre-fetch failed */
  contentError?: string;
  /** Content pre-fetch status */
  contentStatus?: "loading" | "loaded" | "error";
  description?: string;
  favicon?: string;
  id?: string;
  image?: string;
  label: string;
  title?: string;
  type: "url";
  url: string;
}

/**
 * Helper to convert skills, mentions, URLs, and attachments to ContextItems
 */
export function buildContextItems(
  skill: {
    id: string;
    name: string;
    command: string;
    prompt?: string;
    description?: string | null;
  } | null,
  mentions: Array<{
    type: string;
    label: string;
    id?: string;
    description?: string;
    [key: string]: unknown;
  }>,
  attachments: Array<{ url: string; name: string; contentType: string }>,
  urlMentions?: UrlMentionData[]
): ContextItem[] {
  const items: ContextItem[] = [];

  // Add skill if present
  if (skill) {
    items.push({
      data: {
        ...skill,
        description: skill.description ?? undefined,
      } as ContextItem extends { type: "skill"; data: infer D } ? D : never,
      id: `skill-${skill.id}`,
      type: "skill",
    });
  }

  // Add mentions - use mention array index for tracking
  for (const [idx, mention] of mentions.entries()) {
    items.push({
      data: mention as ContextItem extends { type: "mention"; data: infer D }
        ? D
        : never,
      id: `mention-${idx}`,
      type: "mention",
    });
  }

  // Add URL mentions (with status info for error display)
  if (urlMentions) {
    for (const urlMention of urlMentions) {
      items.push({
        data: urlMention as ContextItem extends {
          type: "mention";
          data: infer D;
        }
          ? D
          : never,
        id: `url-${urlMention.url}`,
        type: "mention",
      });
    }
  }

  // Add attachments
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
