import type { UseChatHelpers } from "@ai-sdk/react";
import equal from "fast-deep-equal";
import { AnimatePresence } from "framer-motion";
import { ArrowDownIcon } from "lucide-react";
import { memo, useEffect } from "react";
import { useMessages } from "@/hooks/use-messages";
import type { Vote } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import { useDataStream } from "../shared/data-stream-provider";
import { Conversation, ConversationContent } from "../elements/conversation";
import { Greeting } from "../shared/greeting";
import { PreviewMessage, ThinkingMessage } from "./message";

type MessagesProps = {
  chatId: string;
  status: UseChatHelpers<ChatMessage>["status"];
  votes: Vote[] | undefined;
  messages: ChatMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  isArtifactVisible: boolean;
  selectedModelId: string;
  inputSlot?: React.ReactNode;
};

function PureMessages({
  chatId,
  status,
  votes,
  messages,
  setMessages,
  regenerate,
  isReadonly,
  selectedModelId,
  inputSlot,
}: MessagesProps) {
  const {
    containerRef: messagesContainerRef,
    endRef: messagesEndRef,
    isAtBottom,
    scrollToBottom,
    hasSentMessage,
  } = useMessages({
    status,
  });

  useDataStream();

  useEffect(() => {
    if (status === "submitted") {
      requestAnimationFrame(() => {
        const container = messagesContainerRef.current;
        if (container) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth",
          });
        }
      });
    }
  }, [status, messagesContainerRef]);

  return (
    <div
      className="relative flex flex-1 flex-col overflow-hidden"
    >
      {/* Scrollable messages area */}
      <div
        className="overscroll-behavior-contain -webkit-overflow-scrolling-touch flex-1 touch-pan-y overflow-y-scroll"
        ref={messagesContainerRef}
        style={{ overflowAnchor: "none" }}
      >
        <Conversation className="mx-auto flex min-h-full min-w-0 max-w-4xl flex-col gap-4 md:gap-6">
          <ConversationContent className="flex flex-1 flex-col gap-4 px-2 pt-4 pb-2 md:gap-6 md:px-2">
            {messages.length === 0 && (
              <div className="flex min-h-[30vh] flex-col justify-end">
                <Greeting />
              </div>
            )}

            <AnimatePresence mode="popLayout" initial={false}>
              {messages.map((message, index) => (
                <PreviewMessage
                  chatId={chatId}
                  isLoading={
                    status === "streaming" && messages.length - 1 === index
                  }
                  isReadonly={isReadonly}
                  key={message.id}
                  message={message}
                  regenerate={regenerate}
                  requiresScrollPadding={
                    hasSentMessage && index === messages.length - 1 && status !== "streaming"
                  }
                  setMessages={setMessages}
                  vote={
                    votes
                      ? votes.find((vote) => vote.message_id === message.id)
                      : undefined
                  }
                />
              ))}
            </AnimatePresence>

            <AnimatePresence mode="popLayout">
              {status === "submitted" && (
                <ThinkingMessage key="thinking" />
              )}
            </AnimatePresence>

            {/* Spacer to ensure messages can scroll above the sticky input */}
            <div
              className="min-h-[200px] min-w-[24px] shrink-0"
              ref={messagesEndRef}
            />
          </ConversationContent>
        </Conversation>
      </div>

      {/* Input slot - positioned at bottom, overlays messages with gradient fade */}
      {inputSlot}

      {!isAtBottom && (
        <div className="pointer-events-none absolute bottom-56 left-0 right-0 z-30 flex justify-center">
          <button
            aria-label="Scroll to bottom"
            className="pointer-events-auto rounded-full border bg-background p-2 shadow-lg transition-colors hover:bg-muted"
            onClick={() => scrollToBottom("smooth")}
            type="button"
          >
            <ArrowDownIcon className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  // Always re-render when artifact visibility changes
  if (prevProps.isArtifactVisible !== nextProps.isArtifactVisible) {
    return false;
  }
  
  // Skip re-renders when artifact is visible (optimization)
  if (prevProps.isArtifactVisible && nextProps.isArtifactVisible) {
    return true;
  }

  // Re-render when status changes (important for showing ThinkingMessage)
  if (prevProps.status !== nextProps.status) {
    return false;
  }
  
  // Re-render when model changes
  if (prevProps.selectedModelId !== nextProps.selectedModelId) {
    return false;
  }
  
  // Re-render when messages change (critical for showing new user messages)
  if (prevProps.messages.length !== nextProps.messages.length) {
    return false;
  }
  if (!equal(prevProps.messages, nextProps.messages)) {
    return false;
  }
  
  // Re-render when votes change
  if (!equal(prevProps.votes, nextProps.votes)) {
    return false;
  }

  // Re-render when inputSlot changes (critical for input state updates)
  if (prevProps.inputSlot !== nextProps.inputSlot) {
    return false;
  }

  // No changes detected, skip re-render
  return true;
});
