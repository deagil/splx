"use client";

import type { ChatStatus } from "ai";
import type { EveMessage } from "eve/react";
import { hasVisibleAssistantParts } from "@/components/agent/lib/orb-activity";
import type { SubagentActivity } from "@/components/agent/lib/subagent-activity";
import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerViewport,
} from "@/components/agent/ui/message-scroller";
import { Greeting } from "@/components/shared/greeting";
import { cn } from "@/lib/utils";
import { chatFooterSpacerClass, chatMessageColumnClass } from "./chat-layout";
import { ChatMessage } from "./chat-message";

export function MessageList({
  messages,
  onRespond,
  status,
  className,
  subagents = [],
}: {
  className?: string;
  messages: readonly EveMessage[];
  onRespond: (requestId: string, optionId: string) => void;
  status?: ChatStatus;
  /** Running subagents — attached to the live message only. */
  subagents?: readonly SubagentActivity[];
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
            <div className="flex min-h-full flex-1 flex-col items-stretch justify-center">
              <Greeting />
            </div>
          ) : (
            displayMessages.map((message, index) => (
              <MessageScrollerItem
                key={message.id}
                messageId={message.id}
                scrollAnchor={message.role === "user"}
              >
                <div className={chatMessageColumnClass}>
                  <ChatMessage
                    message={message}
                    onRespond={onRespond}
                    subagents={
                      index === displayMessages.length - 1
                        ? subagents
                        : undefined
                    }
                  />
                </div>
              </MessageScrollerItem>
            ))
          )}
        </MessageScrollerContent>
      </MessageScrollerViewport>
    </MessageScroller>
  );
}
