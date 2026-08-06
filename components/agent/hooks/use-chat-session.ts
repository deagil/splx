"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEveAgent } from "eve/react";
import { useEffect, useRef, useState } from "react";
import {
  chatFailureFromEvent,
  showChatErrorToast,
} from "@/components/agent/lib/show-chat-error-toast";
import type { AgentThreadRecord } from "@/lib/types/agent-thread";
import { consumePendingMessage } from "./use-pending-message";
import { recordStreamEvent } from "./use-stream-log";
import {
  persistThreadState,
  resumeOptionsFromThread,
} from "./use-thread-state";
import { requestThreadTitleGeneration } from "./use-thread-title";

/**
 * Wraps `eve/react`'s `useEveAgent` for one chat thread.
 *
 * Session config (`initialSession`/`initialEvents`) is only read once, when
 * the hook's store is created — so the caller MUST mount the component that
 * calls this hook with `key={threadId}`, e.g.
 * `<AgentSidebarContent key={threadId} .../>`. Without that, switching threads
 * will keep showing the first thread's session.
 */
export function useChatSession(
  threadId: string,
  initialThread?: AgentThreadRecord
) {
  const queryClient = useQueryClient();
  const resumeOptions = initialThread
    ? resumeOptionsFromThread(initialThread)
    : {};
  const [streamFailure, setStreamFailure] = useState<Error | undefined>(
    undefined
  );

  const agent = useEveAgent({
    initialEvents: resumeOptions.initialEvents,
    initialSession: resumeOptions.initialSession,
    onError: (error) => {
      setStreamFailure(error);
      showChatErrorToast(error, threadId, { source: "agent.onError" });
    },
    onEvent: (event) => {
      recordStreamEvent(event.type);

      // Eve parks many model failures as turn.failed + session.waiting without
      // setting agent.error (that only follows session.failed / thrown errors).
      if (event.type === "turn.failed") {
        const failure = chatFailureFromEvent({
          code: event.data.code,
          details: event.data.details,
          message: event.data.message,
          source: event.type,
          turnId: event.data.turnId,
        });
        setStreamFailure(failure);
        showChatErrorToast(failure, threadId, {
          code: event.data.code,
          details: event.data.details,
          source: event.type,
          turnId: event.data.turnId,
        });
      }
    },
    onFinish: (snapshot) => {
      void (async () => {
        try {
          await persistThreadState(threadId, snapshot, queryClient);
        } catch (error) {
          console.error("[persist-thread] onFinish failed", {
            error,
            threadId,
          });
          showChatErrorToast(
            error instanceof Error ? error : new Error("Failed to save chat"),
            threadId,
            { source: "persistThreadState" }
          );
        }

        const userCount = snapshot.data.messages.filter(
          (message) => message.role === "user" && !message.metadata?.optimistic
        ).length;

        // Cadence only; server dedupes via titleMeta. Day-one stub is a no-op.
        if (userCount === 1 || userCount % 4 === 0) {
          void requestThreadTitleGeneration(
            threadId,
            { mode: "refine" },
            queryClient
          );
        }
      })();
    },
  });

  // Clear banner when a new turn starts.
  useEffect(() => {
    if (agent.status === "submitted" || agent.status === "streaming") {
      setStreamFailure(undefined);
    }
  }, [agent.status]);

  // Best-effort save if the tab hides/unloads before onFinish settles.
  useEffect(() => {
    function flush() {
      if (agent.status === "submitted" || agent.status === "streaming") {
        return;
      }
      void persistThreadState(threadId, agent, queryClient).catch((error) => {
        console.error("[persist-thread] flush failed", { error, threadId });
      });
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") {
        flush();
      }
    }

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [agent, queryClient, threadId]);

  const sentPendingRef = useRef(false);
  useEffect(() => {
    if (sentPendingRef.current) {
      return;
    }
    sentPendingRef.current = true;
    const pending = consumePendingMessage(threadId);
    if (pending) {
      void agent.send({ message: pending });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- send once per thread mount
  }, [threadId]);

  const isBusy = agent.status === "submitted" || agent.status === "streaming";
  const error = streamFailure ?? agent.error;

  return { agent, error, isBusy };
}
