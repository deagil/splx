"use client";

import type { EveMessage } from "eve/react";
import { Maximize2Icon, XIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { ChatMessage } from "@/components/agent/chat-message";
import { AgentOrb, type OrbState } from "@/components/agent/ui/agent-orb";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const noopRespond = () => undefined;

/**
 * Peek at what an agent is doing, without leaving where you are.
 *
 * Used twice: in the dock, when the sidebar is closed, and in a popover off a
 * subagent pill in the feed, when it is open. Read-only on purpose — the
 * composer and HITL affordances stay in the sidebar, so this can never become
 * a second place to drive the conversation.
 *
 * `onClose` / `onOpenSidebar` are dock-only; in the popover the trigger owns
 * dismissal and the sidebar is already open, so both controls are omitted.
 */
export function AgentActivityPreview({
  title,
  label,
  state,
  colorFilter,
  messages,
  onClose,
  onOpenSidebar,
  className,
}: {
  title: string;
  label: string;
  state: OrbState;
  colorFilter?: string;
  messages: readonly EveMessage[];
  onClose?: () => void;
  onOpenSidebar?: () => void;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessage = messages.at(-1);
  const lastPartCount = lastMessage?.parts.length ?? 0;

  // Follow the tail as the turn streams — the newest activity is the point.
  // biome-ignore lint/correctness/useExhaustiveDependencies: these are trigger deps, not values the body reads — dropping them would scroll once on mount and never again
  useEffect(() => {
    const node = scrollRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [lastPartCount, messages.length]);

  return (
    <div
      className={cn(
        "flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden",
        "rounded-xl border border-border/60 bg-card shadow-lg",
        className
      )}
    >
      <div className="flex items-center gap-2 border-border/60 border-b px-3 py-2">
        <span
          className="inline-flex shrink-0 items-center justify-center"
          style={colorFilter ? { filter: colorFilter } : undefined}
        >
          <AgentOrb className="scale-[0.72]" state={state} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium text-xs">{title}</span>
          <span className="truncate text-[11px] text-muted-foreground">
            {label}
          </span>
        </div>
        {onOpenSidebar ? (
          <Button
            className="size-6 shrink-0"
            onClick={onOpenSidebar}
            size="icon"
            title="Open in sidebar"
            type="button"
            variant="ghost"
          >
            <Maximize2Icon className="size-3.5" />
          </Button>
        ) : null}
        {onClose ? (
          <Button
            className="size-6 shrink-0"
            onClick={onClose}
            size="icon"
            title="Close preview"
            type="button"
            variant="ghost"
          >
            <XIcon className="size-3.5" />
          </Button>
        ) : null}
      </div>

      <div
        className="flex max-h-[min(24rem,50vh)] flex-col gap-4 overflow-y-auto px-3 py-3"
        ref={scrollRef}
      >
        {messages.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground text-xs">
            Nothing to show yet.
          </p>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onRespond={noopRespond}
            />
          ))
        )}
      </div>
    </div>
  );
}
