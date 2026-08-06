import type { ChatStatus } from "ai";
import {
  defaultMessageReducer,
  type EveMessage,
  type EveMessageData,
  type UseEveAgentSnapshot,
} from "eve/react";
import type { OrbState } from "@/components/agent/ui/agent-orb";
import { getLiveOrbSignals, resolveOrbActivity } from "./orb-activity";

/**
 * Per-subagent live activity.
 *
 * eve streams a child subagent's own events to the client wrapped in
 * `subagent.event`, but `defaultMessageReducer` drops them — so a handoff
 * projects into the parent message as a single opaque tool call and the child's
 * work is invisible. This module unwraps those child streams and runs each one
 * through the same reducer + orb resolution the parent uses, so a subagent can
 * be shown doing what it is actually doing.
 */

type AgentEvent = UseEveAgentSnapshot<EveMessageData>["events"][number];
type EventMeta = AgentEvent["meta"];

export type SubagentActivity = {
  /** eve's call id — stable for the lifetime of the child, so a good React key. */
  callId: string;
  name: string;
  label: string;
  state: OrbState;
  /**
   * The child's own projected messages, for the dock preview. Empty until the
   * subagent emits something renderable.
   */
  messages: readonly EveMessage[];
};

type Draft = {
  callId: string;
  name: string;
  childEvents: AgentEvent[];
  completed: boolean;
};

/** Child events arrive unstamped; the reducer wants a stamped event. */
function stampChildEvent(
  event: AgentEvent extends { meta: EventMeta }
    ? Omit<AgentEvent, "meta">
    : never,
  meta: EventMeta,
  index: number
): AgentEvent {
  return {
    ...event,
    meta: { at: meta.at, id: `${meta.id}-child-${index}` },
  } as AgentEvent;
}

/**
 * Only the current turn's events matter, and a long session's log can run to
 * thousands — so rewind to the last turn boundary before folding anything.
 */
function currentTurnEvents(
  events: readonly AgentEvent[]
): readonly AgentEvent[] {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i]?.type === "turn.started") {
      return events.slice(i);
    }
  }
  return events;
}

/** Not every event in the union carries `data`, so read it defensively. */
function eventData(event: AgentEvent): Record<string, unknown> | undefined {
  if (!("data" in event) || typeof event.data !== "object") {
    return;
  }
  return event.data as Record<string, unknown>;
}

function subagentName(event: AgentEvent): string | undefined {
  const data = eventData(event);
  const named = data?.subagentName ?? data?.name;
  return typeof named === "string" ? named : undefined;
}

function callIdOf(event: AgentEvent): string | undefined {
  const data = eventData(event);
  return typeof data?.callId === "string" ? data.callId : undefined;
}

/** Project one child's event stream into an orb state + label. */
function resolveChildActivity(draft: Draft): SubagentActivity {
  const reducer = defaultMessageReducer();
  let data = reducer.initial();
  for (const event of draft.childEvents) {
    data = reducer.reduce(data, event);
  }

  const last = data.messages.at(-1);
  const activeAssistant = last?.role === "assistant" ? last : undefined;
  const signals = getLiveOrbSignals(activeAssistant);
  const activity = resolveOrbActivity({
    connecting: signals.connecting,
    creatingArtifact: signals.creatingArtifact,
    liveReasoning: signals.liveReasoning,
    liveTool: signals.liveTool,
    pending: !activeAssistant,
    status: "streaming",
    streamingText: signals.streamingText,
    waitingForUser: signals.waitingForUser,
  });

  return {
    callId: draft.callId,
    label: activity?.label ?? "Thinking…",
    messages: data.messages,
    name: draft.name,
    state: activity?.state ?? "breathing",
  };
}

/**
 * Running subagents for the current turn, in the order they started.
 *
 * Completed children drop out — the finished work is already in the message
 * timeline; presence is only ever about what is live.
 */
export function deriveSubagentActivity(
  events: readonly AgentEvent[],
  status: ChatStatus | undefined
): SubagentActivity[] {
  if (status !== "submitted" && status !== "streaming") {
    return [];
  }

  const drafts = new Map<string, Draft>();

  for (const event of currentTurnEvents(events)) {
    const callId = callIdOf(event);
    if (!callId) {
      continue;
    }

    if (event.type === "subagent.called" || event.type === "subagent.started") {
      const existing = drafts.get(callId);
      if (existing) {
        existing.name = subagentName(event) ?? existing.name;
        continue;
      }
      drafts.set(callId, {
        callId,
        childEvents: [],
        completed: false,
        name: subagentName(event) ?? "subagent",
      });
      continue;
    }

    if (event.type === "subagent.completed") {
      const draft = drafts.get(callId);
      if (draft) {
        draft.completed = true;
      }
      continue;
    }

    if (event.type === "subagent.event") {
      let draft = drafts.get(callId);
      if (!draft) {
        // A child event can land before (or without) its start event.
        draft = {
          callId,
          childEvents: [],
          completed: false,
          name: subagentName(event) ?? "subagent",
        };
        drafts.set(callId, draft);
      }
      draft.childEvents.push(
        stampChildEvent(
          event.data.event as Parameters<typeof stampChildEvent>[0],
          event.meta,
          draft.childEvents.length
        )
      );
    }
  }

  const running: SubagentActivity[] = [];
  for (const draft of drafts.values()) {
    if (!draft.completed) {
      running.push(resolveChildActivity(draft));
    }
  }
  return running;
}
