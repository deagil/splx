import type { QueryClient } from "@tanstack/react-query";
import type { HandleMessageStreamEvent, SessionState } from "eve/client";
import type { UseEveAgentSnapshot } from "eve/react";
import { queryKeys } from "@/components/agent/lib/query-keys";
import type {
  AgentThreadRecord,
  AgentThreadState,
} from "@/lib/types/agent-thread";

interface ResumeOptions {
  initialEvents?: readonly HandleMessageStreamEvent[];
  initialSession?: SessionState;
}

export function resumeOptionsFromThread(
  thread: AgentThreadRecord
): ResumeOptions {
  const events = thread.state?.events;
  if (!events?.length) {
    return {};
  }

  const session = thread.state?.session ?? { streamIndex: 0 };

  return {
    initialEvents: events as readonly HandleMessageStreamEvent[],
    initialSession: {
      ...session,
      streamIndex: Math.max(session.streamIndex ?? 0, events.length),
    },
  };
}

export async function persistThreadState(
  threadId: string,
  snapshot: UseEveAgentSnapshot<unknown>,
  queryClient: QueryClient
) {
  if (!snapshot.events.length) {
    return;
  }

  const state: AgentThreadState = {
    events: [...snapshot.events],
    session: {
      continuationToken: snapshot.session.continuationToken,
      sessionId: snapshot.session.sessionId,
      streamIndex: snapshot.events.length,
    },
  };

  const response = await fetch(`/api/v1/agent-threads/${threadId}`, {
    body: JSON.stringify({ state }),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[persist-thread] failed", {
      detail: detail.slice(0, 500),
      eventCount: snapshot.events.length,
      status: response.status,
      threadId,
    });
    throw new Error(`Failed to persist chat (${response.status})`);
  }

  void queryClient.invalidateQueries({ queryKey: queryKeys.threads });
}
