"use client";

import type { ChatStatus } from "ai";
import type { EveMessage } from "eve/react";
import { hasVisibleAssistantParts } from "@/components/agent/lib/orb-activity";
import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerViewport,
} from "@/components/agent/ui/message-scroller";
import { cn } from "@/lib/utils";
import { chatFooterSpacerClass, chatMessageColumnClass } from "./chat-layout";
import { ChatMessage } from "./chat-message";

export function MessageList({
  messages,
  onRespond,
  status,
  className,
}: {
  className?: string;
  messages: readonly EveMessage[];
  onRespond: (requestId: string, optionId: string) => void;
  status?: ChatStatus;
}) {
  const isBusy = status === "submitted" || status === "streaming";
  const displayMessages = isBusy
    ? messages.filter((message) => {
        if (message.role !== "assistant") {
          return true;
        }
        // Hide empty assistant shells while the turn is starting.
        if (!hasVisibleAssistantParts(message)) {
          return false;
        }
        return true;
      })
    : messages;

  return (
    <MessageScroller className={cn("h-full", className)}>
      <MessageScrollerViewport>
        <MessageScrollerContent className={chatFooterSpacerClass}>
          {displayMessages.length === 0 ? (
            <div className="flex size-full flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="space-y-1">
                <h3 className="font-medium text-sm">No messages yet</h3>
                <p className="text-muted-foreground text-sm">
                  Send a message to get started
                </p>
              </div>
            </div>
          ) : (
            displayMessages.map((message) => (
              <MessageScrollerItem
                key={message.id}
                messageId={message.id}
                scrollAnchor={message.role === "user"}
              >
                <div className={chatMessageColumnClass}>
                  <ChatMessage message={message} onRespond={onRespond} />
                </div>
              </MessageScrollerItem>
            ))
          )}
        </MessageScrollerContent>
      </MessageScrollerViewport>
    </MessageScroller>
  );
}
