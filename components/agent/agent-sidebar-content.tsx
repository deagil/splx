"use client";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useChatSession } from "@/components/agent/hooks/use-chat-session";
import { ensureAgentThread } from "@/components/agent/hooks/use-ensure-agent-thread";
import {
  resolveTurnOrbActivity,
  shouldShowAgentPresence,
} from "@/components/agent/lib/orb-activity";
import { queryKeys } from "@/components/agent/lib/query-keys";
import { Composer } from "@/components/agent/ui/composer";
import {
  MessageScrollerButton,
  MessageScrollerProvider,
} from "@/components/agent/ui/message-scroller";
import { ChatStatusBar } from "@/components/sidebar/chat-status-bar";
import type { AgentThreadRecord } from "@/lib/types/agent-thread";
import { cn } from "@/lib/utils";
import { AgentPresence } from "./agent-presence";
import { ChatErrorBanner } from "./chat-error-banner";
import {
  chatFloatingFooterClass,
  chatFooterFadeClass,
  chatFooterInputAreaClass,
  chatFooterInteractiveClass,
  chatFooterSolidClass,
  chatInputColumnClass,
} from "./chat-layout";
import { MessageList } from "./message-list";

function AgentSidebarSession({
  threadId,
  initialThread,
  initialChatModel,
  onMessagesChange,
}: {
  threadId: string;
  initialThread: AgentThreadRecord;
  initialChatModel: string;
  onMessagesChange?: (hasMessages: boolean) => void;
}) {
  const { agent, error } = useChatSession(threadId, initialThread);
  const reduceMotion = useReducedMotion();
  const [selectedModelId, setSelectedModelId] = useState(initialChatModel);
  const onMessagesChangeRef = useRef(onMessagesChange);
  onMessagesChangeRef.current = onMessagesChange;

  const showPresence = shouldShowAgentPresence(
    agent.data.messages,
    agent.status
  );
  const orbActivity = showPresence
    ? resolveTurnOrbActivity(agent.data.messages, agent.status)
    : null;

  useEffect(() => {
    onMessagesChangeRef.current?.(agent.data.messages.length > 0);
  }, [agent.data.messages.length]);

  const respondToInput = useCallback(
    (requestId: string, optionId: string) => {
      agent
        .send({ inputResponses: [{ optionId, requestId }] })
        .catch(() => undefined);
    },
    [agent]
  );

  const submitMessage = useCallback(
    (message: string) => {
      if (message.trim()) {
        agent.send({ message }).catch(() => undefined);
      }
    },
    [agent]
  );

  return (
    <MessageScrollerProvider autoScroll>
      <div className="relative h-full min-w-0">
        <MessageList
          messages={agent.data.messages}
          onRespond={respondToInput}
          status={agent.status}
        />

        <div className={chatFloatingFooterClass}>
          <div className="relative">
            <div aria-hidden className={chatFooterFadeClass} />

            <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center">
              <div className="relative flex items-center justify-center">
                <AnimatePresence initial={false}>
                  {orbActivity ? (
                    <motion.div
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={
                        reduceMotion
                          ? undefined
                          : { opacity: 0, scale: 0.96, y: 6 }
                      }
                      initial={
                        reduceMotion ? false : { opacity: 0, scale: 0.96, y: 8 }
                      }
                      key="agent-presence"
                      transition={{
                        duration: 0.28,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <AgentPresence
                        label={orbActivity.label}
                        paused={orbActivity.state === "listening"}
                        state={orbActivity.state}
                      />
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <MessageScrollerButton
                  className={cn(
                    "pointer-events-auto z-10",
                    orbActivity
                      ? [
                          "!absolute !inset-auto !left-full !top-1/2 !ml-2",
                          "!-translate-y-1/2 !translate-x-0",
                          "data-[direction=end]:!bottom-auto",
                          "data-[direction=end]:data-[active=false]:!translate-y-[-40%] data-[direction=end]:data-[active=false]:!translate-x-1",
                        ]
                      : [
                          "!static !inset-auto !translate-x-0",
                          "data-[direction=end]:!bottom-auto",
                          "data-[direction=end]:data-[active=false]:!translate-y-2",
                        ]
                  )}
                />
              </div>
            </div>
          </div>

          <div className={chatFooterInputAreaClass}>
            <div aria-hidden className={chatFooterSolidClass} />
            <div className={chatFooterInteractiveClass}>
              <ChatErrorBanner error={error} threadId={threadId} />

              <div className={`${chatInputColumnClass} relative`}>
                <Composer
                  onStop={agent.stop}
                  onSubmit={submitMessage}
                  status={agent.status}
                />
                <ChatStatusBar
                  onModelChange={setSelectedModelId}
                  selectedModelId={selectedModelId}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </MessageScrollerProvider>
  );
}

/**
 * Eve sidebar chat mount. Ensures the `agent_threads` row exists, then starts
 * the Eve session. `key={threadId}` on the caller is load-bearing.
 */
export function AgentSidebarContent({
  threadId,
  initialChatModel,
  onMessagesChange,
}: {
  threadId: string;
  initialChatModel: string;
  onMessagesChange?: (hasMessages: boolean) => void;
}) {
  const threadQuery = useQuery({
    queryFn: () => ensureAgentThread(threadId),
    queryKey: queryKeys.thread(threadId),
    retry: 1,
    staleTime: Number.POSITIVE_INFINITY,
  });

  if (threadQuery.isPending) {
    return <div className="h-full min-w-0" />;
  }

  if (threadQuery.isError || !threadQuery.data) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-muted-foreground text-sm">
        Could not start chat. Refresh and try again.
      </div>
    );
  }

  return (
    <AgentSidebarSession
      initialChatModel={initialChatModel}
      initialThread={threadQuery.data}
      onMessagesChange={onMessagesChange}
      threadId={threadId}
    />
  );
}
