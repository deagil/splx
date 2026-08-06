"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useChatSession } from "@/components/agent/hooks/use-chat-session";
import { ensureAgentThread } from "@/components/agent/hooks/use-ensure-agent-thread";
import { queryKeys } from "@/components/agent/lib/query-keys";
import { deriveSubagentActivity } from "@/components/agent/lib/subagent-activity";
import type { AgentThreadRecord } from "@/lib/types/agent-thread";
import { AgentChatPane } from "./agent-chat-pane";
import { MOCK_MODE_AVAILABLE, useAgentMockMode } from "./dev/mock-mode";

// Dev-only harness. Lazy so it never lands in the main sidebar chunk, and
// gated on NODE_ENV so a production build never renders it.
const MockAgentSession = dynamic(
  () => import("./dev/mock-agent-session").then((mod) => mod.MockAgentSession),
  { ssr: false }
);

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
  const onMessagesChangeRef = useRef(onMessagesChange);
  onMessagesChangeRef.current = onMessagesChange;

  useEffect(() => {
    onMessagesChangeRef.current?.(agent.data.messages.length > 0);
  }, [agent.data.messages.length]);

  // eve drops subagent child events from the message projection, so live
  // subagent activity is folded out of the raw event stream instead.
  const subagents = useMemo(
    () => deriveSubagentActivity(agent.events, agent.status),
    [agent.events, agent.status]
  );

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
    <AgentChatPane
      error={error}
      initialChatModel={initialChatModel}
      messages={agent.data.messages}
      onRespond={respondToInput}
      onStop={agent.stop}
      onSubmit={submitMessage}
      status={agent.status}
      subagents={subagents}
      threadId={threadId}
    />
  );
}

/**
 * Eve sidebar chat mount. Ensures the `agent_threads` row exists, then starts
 * the Eve session. `key={threadId}` on the caller is load-bearing.
 *
 * In development, `?agentMock=1` swaps the live session for the scripted mock
 * harness (see `components/agent/dev/README.md`) — no thread row, no stream.
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
  const mockMode = useAgentMockMode();
  const useMock = MOCK_MODE_AVAILABLE && mockMode.enabled;

  const threadQuery = useQuery({
    enabled: !useMock,
    queryFn: () => ensureAgentThread(threadId),
    queryKey: queryKeys.thread(threadId),
    retry: 1,
    staleTime: Number.POSITIVE_INFINITY,
  });

  if (useMock) {
    return (
      <MockAgentSession
        initialChatModel={initialChatModel}
        onMessagesChange={onMessagesChange}
        scenarioId={mockMode.scenarioId}
        threadId={threadId}
      />
    );
  }

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
