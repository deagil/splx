"use client";

import type { ChatStatus } from "ai";
import type { EveMessage } from "eve/react";
import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AgentDock } from "@/components/agent/dock/agent-dock";
import type { OrbActivity } from "@/components/agent/lib/orb-activity";
import {
  isAwaitingUserInput,
  resolveTurnOrbActivity,
  shouldShowAgentPresence,
} from "@/components/agent/lib/orb-activity";
import type { SubagentActivity } from "@/components/agent/lib/subagent-activity";
import { Composer } from "@/components/agent/ui/composer";
import {
  MessageScrollerButton,
  MessageScrollerProvider,
} from "@/components/agent/ui/message-scroller";
import { ChatStatusBar } from "@/components/sidebar/chat-status-bar";
import { useChatSidebarSide } from "@/components/sidebar/use-chat-sidebar-side";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { AgentPresenceStack } from "./agent-presence-stack";
import {
  chatFloatingFooterClass,
  chatFooterFadeClass,
  chatFooterInputAreaClass,
  chatFooterInteractiveClass,
  chatFooterSolidClass,
  chatInputColumnClass,
} from "./chat-layout";
import { MessageList } from "./message-list";

const COMPLETION_SUMMARY_CHARS = 42;

/**
 * The opening words of the final answer, for the dock's completed chip — so a
 * finished turn says something about its result rather than just "Finished".
 */
function summariseFinalAnswer(
  messages: readonly EveMessage[]
): string | undefined {
  const last = messages.at(-1);
  if (last?.role !== "assistant") {
    return;
  }

  const text = last.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    // Strip the markdown that would otherwise show as stray syntax in a chip.
    .replace(/[#*`_>|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    return;
  }
  return text.length > COMPLETION_SUMMARY_CHARS
    ? text.slice(0, COMPLETION_SUMMARY_CHARS).trimEnd()
    : text;
}

export type AgentChatPaneProps = {
  messages: readonly EveMessage[];
  status: ChatStatus;
  error: Error | undefined;
  threadId: string;
  initialChatModel: string;
  onSubmit: (message: string) => void;
  onStop: () => void;
  onRespond: (requestId: string, optionId: string) => void;
  /** Running subagents for this turn — one presence pill each. */
  subagents?: readonly SubagentActivity[];
  /**
   * Where those pills live: `feed` (default) puts them in the message timeline
   * in place of the opaque handoff row; `stack` floats them above the composer
   * over the parent presence pill.
   */
  subagentPlacement?: "feed" | "stack";
  /**
   * Dev-only escape hatch: force the presence pill instead of deriving it from
   * `messages` + `status`. `undefined` keeps the derived behaviour; `null`
   * hides the pill. Only the mock harness passes this.
   */
  presenceOverride?: OrbActivity | null;
};

/**
 * Everything the sidebar chat renders, driven purely by props.
 *
 * Deliberately runtime-free: the live Eve session (`AgentSidebarContent`) and
 * the mock harness (`components/agent/dev/`) both mount this, so what you tune
 * in the harness is literally what ships.
 */
export function AgentChatPane({
  messages,
  status,
  error,
  threadId,
  initialChatModel,
  onSubmit,
  onStop,
  onRespond,
  subagents = [],
  subagentPlacement = "feed",
  presenceOverride,
}: AgentChatPaneProps) {
  const [selectedModelId, setSelectedModelId] = useState(initialChatModel);
  const [dismissedError, setDismissedError] = useState<Error | undefined>();
  const inFeed = subagentPlacement === "feed";
  const { state: sidebarState, isMobile, setOpen } = useSidebar();
  const { side } = useChatSidebarSide();
  const openSidebar = useCallback(() => setOpen(true), [setOpen]);

  // Only the desktop sidebar goes off-canvas with its content still mounted;
  // the mobile sheet unmounts, taking the session with it, so there is nothing
  // to dock there.
  const showDock = sidebarState === "collapsed" && !isMobile;

  const derivedActivity = shouldShowAgentPresence(messages, status)
    ? resolveTurnOrbActivity(messages, status)
    : null;
  const needsInput = isAwaitingUserInput(messages, status);
  const completionSummary = useMemo(
    () => (status === "ready" ? summariseFinalAnswer(messages) : undefined),
    [messages, status]
  );
  const orbActivity =
    presenceOverride === undefined ? derivedActivity : presenceOverride;
  const visibleError = error && error !== dismissedError ? error : undefined;
  const presenceVisible = Boolean(orbActivity) || Boolean(visibleError);

  return (
    <MessageScrollerProvider autoScroll>
      <div className="relative h-full min-w-0">
        <MessageList
          messages={messages}
          onRespond={onRespond}
          status={status}
          subagents={inFeed ? subagents : []}
        />

        <div className={chatFloatingFooterClass}>
          <div className="relative">
            <div aria-hidden className={chatFooterFadeClass} />

            {/* Anchored at the bottom so the subagent stack grows upward into
                the message fade and the parent pill never shifts. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center">
              <div
                className={cn(
                  "relative flex flex-col items-center justify-end",
                  visibleError && `w-full ${chatInputColumnClass}`
                )}
              >
                <AgentPresenceStack
                  activity={orbActivity}
                  attention={needsInput}
                  className={visibleError ? "w-full" : undefined}
                  error={visibleError}
                  onDismissError={() => {
                    if (error) {
                      setDismissedError(error);
                    }
                  }}
                  subagents={inFeed ? [] : subagents}
                  threadId={threadId}
                />

                <MessageScrollerButton
                  className={cn(
                    "pointer-events-auto z-10",
                    presenceVisible
                      ? [
                          // Aligned to the parent pill (the stack's last row),
                          // not the stack's centre.
                          "!absolute !inset-auto !bottom-0 !left-full !ml-2",
                          "!translate-x-0 !translate-y-0",
                          "data-[direction=end]:!bottom-0",
                          "data-[direction=end]:data-[active=false]:!translate-y-2 data-[direction=end]:data-[active=false]:!translate-x-1",
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
              <div className={`${chatInputColumnClass} relative`}>
                <Composer onStop={onStop} onSubmit={onSubmit} status={status} />
                <ChatStatusBar
                  onModelChange={setSelectedModelId}
                  selectedModelId={selectedModelId}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDock && typeof document !== "undefined"
        ? createPortal(
            <AgentDock
              activity={derivedActivity}
              busy={status === "submitted" || status === "streaming"}
              completionSummary={completionSummary}
              messages={messages}
              needsInput={needsInput}
              onOpenSidebar={openSidebar}
              side={side}
              subagents={subagents}
            />,
            document.body
          )
        : null}
    </MessageScrollerProvider>
  );
}
