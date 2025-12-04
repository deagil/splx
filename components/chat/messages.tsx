import type { UseChatHelpers } from "@ai-sdk/react";
import equal from "fast-deep-equal";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownIcon, PinIcon, PinOffIcon } from "lucide-react";
import { memo, useEffect, useRef } from "react";
import { useMessages } from "@/hooks/use-messages";
import type { Vote } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useDataStream } from "../shared/data-stream-provider";
import { Conversation, ConversationContent } from "../elements/conversation";
import { Greeting } from "../shared/greeting";
import { PreviewMessage, ThinkingMessage } from "./message";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

// Helper for timestamped logging
function logMessages(label: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[Messages UI] ${timestamp} | ${label}`, data);
  } else {
    console.log(`[Messages UI] ${timestamp} | ${label}`);
  }
}

/** Optimistic user message for instant display */
export type OptimisticMessage = {
  id: string;
  text: string;
  attachments?: { name: string; url: string; contentType?: string }[];
  mentions?: unknown[];
  skill?: { id: string; name: string; command: string; prompt?: string };
};

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
  /** Optimistic user message for instant display before server confirms */
  optimisticMessage?: OptimisticMessage | null;
};

/** 
 * Renders the user's message optimistically (before server confirms)
 * with a smooth animation from bottom
 */
const OptimisticUserMessage = memo(({ message }: { message: OptimisticMessage }) => {
  return (
    <motion.div
      className="group/message w-full"
      data-role="user"
      data-testid="message-user-optimistic"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="flex w-full items-start justify-end gap-2 md:gap-3">
        <div className="flex max-w-[calc(100%-2.5rem)] flex-col gap-2 sm:max-w-[min(fit-content,80%)]">
          {/* Show attachments if any */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-row justify-end gap-2">
              {message.attachments.map((attachment) => (
                <div
                  key={attachment.url}
                  className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2"
                >
                  <span className="text-sm text-muted-foreground">{attachment.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Message text bubble */}
          <div
            className="w-fit break-words rounded-2xl px-3 py-2 text-right text-white"
            style={{ backgroundColor: "#006cff" }}
          >
            <span className="whitespace-pre-wrap">{message.text}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

OptimisticUserMessage.displayName = "OptimisticUserMessage";

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
  optimisticMessage,
}: MessagesProps) {
  const {
    containerRef: messagesContainerRef,
    endRef: messagesEndRef,
    isAtBottom,
    scrollToBottom,
    hasSentMessage,
    isPinned,
    setIsPinned,
  } = useMessages({
    status,
  });

  useDataStream();

  // Track if we've already scrolled for the current optimistic message
  const lastScrolledOptimisticIdRef = useRef<string | null>(null);
  
  // Track message count for logging new messages
  const prevMessageCountRef = useRef(messages.length);
  const prevStatusRef = useRef(status);

  // Log when messages are added
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      const newMessages = messages.slice(prevMessageCountRef.current);
      logMessages("📬 New message(s) rendered", { 
        newCount: newMessages.length,
        totalCount: messages.length,
        roles: newMessages.map(m => m.role),
      });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  // Log status-based UI changes
  useEffect(() => {
    if (prevStatusRef.current !== status) {
      if (status === "submitted") {
        logMessages("⏳ Showing thinking indicator");
      } else if (status === "streaming" && prevStatusRef.current === "submitted") {
        logMessages("📝 Started streaming (typing indicator → text)");
      } else if (status === "ready" && prevStatusRef.current === "streaming") {
        logMessages("✅ Stream rendering complete");
      }
      prevStatusRef.current = status;
    }
  }, [status]);

  // Scroll to bottom when user submits a message (only if pinned mode is on)
  // The useScrollToBottom hook handles "stick to bottom" during streaming
  useEffect(() => {
    if (status === "submitted" && isPinned) {
      scrollToBottom("smooth");
    }
  }, [status, scrollToBottom, isPinned]);

  // Scroll immediately when optimistic message appears (only once per message)
  useEffect(() => {
    if (optimisticMessage && isPinned && optimisticMessage.id !== lastScrolledOptimisticIdRef.current) {
      lastScrolledOptimisticIdRef.current = optimisticMessage.id;
      scrollToBottom("smooth");
    }
  }, [optimisticMessage, isPinned, scrollToBottom]);

  // Extract last user message info once for ThinkingMessage props
  // Use optimistic message if available, otherwise use last message
  const lastUserMessage = optimisticMessage 
    ? { parts: optimisticMessage.attachments?.map(a => ({ type: "file" as const })) || [], mentions: optimisticMessage.mentions }
    : messages.filter(m => m.role === "user").at(-1);
  
  // Extract mention details for contextual thinking message
  const messageMentions = (lastUserMessage as unknown as { mentions?: Array<{ type: string }> })?.mentions || [];
  const urlMentions = messageMentions.filter(m => m.type === "url");
  
  const thinkingProps = {
    hasMentions: messageMentions.length > 0,
    hasUrlMentions: urlMentions.length > 0,
    urlCount: urlMentions.length,
    hasAttachments: lastUserMessage?.parts?.some(p => p.type === "file") ?? false,
    attachmentCount: lastUserMessage?.parts?.filter(p => p.type === "file").length ?? 0,
  };

  return (
    <div
      className="relative flex flex-1 flex-col overflow-hidden"
    >
      {/* Scrollable messages area */}
      <div
        className="overscroll-behavior-contain -webkit-overflow-scrolling-touch flex-1 touch-pan-y overflow-y-scroll scroll-smooth"
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

            {/* Render all confirmed messages */}
            <AnimatePresence initial={false}>
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
                    hasSentMessage && index === messages.length - 1 && status !== "streaming" && !optimisticMessage
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

            {/* Optimistic user message - appears immediately before server confirms */}
            <AnimatePresence>
              {optimisticMessage && (
                <OptimisticUserMessage
                  key={`optimistic-${optimisticMessage.id}`}
                  message={optimisticMessage}
                />
              )}
            </AnimatePresence>

            {/* Thinking indicator while waiting for response */}
            <AnimatePresence>
              {status === "submitted" && (
                <ThinkingMessage 
                  key="thinking" 
                  hasMentions={thinkingProps.hasMentions}
                  hasUrlMentions={thinkingProps.hasUrlMentions}
                  urlCount={thinkingProps.urlCount}
                  hasAttachments={thinkingProps.hasAttachments}
                  attachmentCount={thinkingProps.attachmentCount}
                />
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

      {/* Scroll mode toggle - subtle pill above input, right side */}
      {!isReadonly && (
        <div className="pointer-events-none absolute bottom-[180px] right-3 z-20">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                  onClick={() => setIsPinned(!isPinned)}
                  className={cn(
                    "pointer-events-auto flex items-center gap-1 rounded-md px-2 py-1 text-[10px] transition-all duration-150",
                    isPinned
                      ? "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                      : "bg-muted/40 text-muted-foreground/70 hover:bg-muted/60 hover:text-muted-foreground"
                  )}
                  type="button"
                  aria-label={isPinned ? "Disable auto-scroll" : "Enable auto-scroll"}
                >
                  {isPinned ? (
                    <PinIcon className="size-2.5" />
                  ) : (
                    <PinOffIcon className="size-2.5" />
                  )}
                  <span className="hidden sm:inline font-medium">
                    {isPinned ? "Auto" : "Free"}
                  </span>
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs" sideOffset={8}>
                {isPinned 
                  ? "Auto-scrolls to new messages"
                  : "Free scrolling mode"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

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

  // Re-render when optimistic message changes (critical for instant message display)
  if (prevProps.optimisticMessage?.id !== nextProps.optimisticMessage?.id) {
    return false;
  }

  // No changes detected, skip re-render
  return true;
});
