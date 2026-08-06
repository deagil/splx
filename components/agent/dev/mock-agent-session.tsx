"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AgentChatPane } from "@/components/agent/agent-chat-pane";
import {
  AgentDevPanel,
  DEFAULT_PRESENCE_OVERRIDE,
  type PresenceOverrideState,
  resolvePresenceOverride,
  type SubagentPlacement,
} from "./agent-dev-panel";
import { disableAgentMockMode } from "./mock-mode";
import { DEFAULT_SCENARIO_ID, getScenario } from "./scenarios";
import { useMockAgent } from "./use-mock-agent";

/**
 * Mock sidebar session: the real `AgentChatPane`, driven by scripted frames
 * instead of a live Eve stream, with the control panel portalled outside the
 * sidebar so it does not inherit the sidebar's width or stacking context.
 */
export function MockAgentSession({
  threadId,
  initialChatModel,
  scenarioId,
  onMessagesChange,
}: {
  threadId: string;
  initialChatModel: string;
  scenarioId: string | null;
  onMessagesChange?: (hasMessages: boolean) => void;
}) {
  const mock = useMockAgent(
    scenarioId ? getScenario(scenarioId).id : DEFAULT_SCENARIO_ID
  );
  const [presence, setPresence] = useState<PresenceOverrideState>(
    DEFAULT_PRESENCE_OVERRIDE
  );
  const [placement, setPlacement] = useState<SubagentPlacement>("feed");

  // Mirrors the live session so the sidebar header reacts the same way.
  const onMessagesChangeRef = useRef(onMessagesChange);
  onMessagesChangeRef.current = onMessagesChange;
  const messageCount = mock.messages.length;
  useEffect(() => {
    onMessagesChangeRef.current?.(messageCount > 0);
  }, [messageCount]);

  return (
    <>
      <AgentChatPane
        error={mock.error}
        initialChatModel={initialChatModel}
        messages={mock.messages}
        onRespond={mock.respond}
        onStop={mock.stop}
        onSubmit={mock.send}
        presenceOverride={resolvePresenceOverride(presence)}
        status={mock.status}
        subagentPlacement={placement}
        subagents={mock.subagents}
        threadId={threadId}
      />
      {typeof document === "undefined"
        ? null
        : createPortal(
            <AgentDevPanel
              mock={mock}
              onExit={disableAgentMockMode}
              onPlacementChange={setPlacement}
              onPresenceChange={setPresence}
              placement={placement}
              presence={presence}
            />,
            document.body
          )}
    </>
  );
}
