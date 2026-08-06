"use client";

import type { EveMessagePart } from "eve/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  getInputRequestResponseLabel,
  isInputRequestPending,
} from "@/components/agent/lib/input-request-display";
import {
  agentLayoutSpring,
  agentRevealEase,
} from "@/components/agent/lib/motion";
import type { SubagentActivity } from "@/components/agent/lib/subagent-activity";
import {
  asToolInputs,
  collapseStatefulToolCalls,
  getToolDisplayInfo,
  STATEFUL_TOOL_CATEGORIES,
  serializeToolOutput,
} from "@/components/agent/lib/tool-call-display";
import { AgentActivitySection } from "@/components/agent/ui/agent-activity-section";
import type {
  ActivityItem,
  ActivityStep,
  ReasoningStep,
  ToolCallEntry,
} from "./activity-types";
import { SubagentActivityRows } from "./subagent-activity-rows";
import { ToolPart } from "./tool-part";

const COMPLETED_STATES = new Set<
  Extract<EveMessagePart, { type: "dynamic-tool" }>["state"]
>(["output-available", "output-error", "output-denied", "approval-responded"]);

const ACTIVE_STATES = new Set<
  Extract<EveMessagePart, { type: "dynamic-tool" }>["state"]
>(["input-streaming", "input-available"]);

/** Keep the answered card visible briefly before folding into the timeline. */
const ANSWER_SETTLE_MS = 1600;

type DynamicToolPart = Extract<EveMessagePart, { type: "dynamic-tool" }>;

/**
 * Whether a tool call renders as its own card below the timeline instead of
 * collapsing into it. Pending input requests stay as cards; answered ones
 * linger briefly (or until later activity) then fold into the feed.
 */
function isPendingInteractiveTool(part: DynamicToolPart): boolean {
  return isInputRequestPending(part) || part.state === "approval-requested";
}

function hasLaterActivity(items: ActivityItem[], toolCallId: string): boolean {
  let seen = false;
  for (const item of items) {
    if (item.kind === "tool" && item.part.toolCallId === toolCallId) {
      seen = true;
      continue;
    }
    if (!seen) {
      continue;
    }
    if (item.kind === "reasoning" && item.part.text.trim()) {
      return true;
    }
    if (item.kind === "tool") {
      return true;
    }
  }
  return false;
}

function toToolCallEntry(part: DynamicToolPart): ToolCallEntry {
  const display = getToolDisplayInfo(part.toolName, part.input);
  const errorText = "errorText" in part ? part.errorText : undefined;
  const output = "output" in part ? part.output : undefined;
  const responseLabel = part.toolMetadata?.eve?.inputRequest
    ? getInputRequestResponseLabel(part)
    : undefined;

  let message = display.completedLabel;
  if (part.state === "output-denied") {
    message = "Declined request";
  } else if (responseLabel && responseLabel !== "Answered") {
    message =
      part.toolName === "ask_question"
        ? `Answered “${responseLabel}”`
        : `Responded “${responseLabel}”`;
  }

  return {
    inputs: asToolInputs(part.input),
    integration_name: display.integrationName,
    message,
    output: serializeToolOutput(output, errorText),
    show_category: display.showCategory,
    tool_call_id: part.toolCallId,
    tool_category: display.category,
    tool_name: part.toolName,
  };
}

function buildTimelineSteps(
  items: ActivityItem[],
  isShowingAsCard: (part: DynamicToolPart) => boolean
): ActivityStep[] {
  const steps: ActivityStep[] = [];
  let pendingTools: ToolCallEntry[] = [];

  const flushPendingTools = () => {
    const collapsed = collapseStatefulToolCalls(pendingTools);
    for (const entry of collapsed) {
      steps.push({ entry, kind: "tool" });
    }
    pendingTools = [];
  };

  for (const item of items) {
    if (item.kind === "reasoning") {
      if (item.part.state === "streaming") {
        continue;
      }
      if (!item.part.text.trim()) {
        continue;
      }
      flushPendingTools();
      steps.push({
        kind: "reasoning",
        step: {
          id: `reasoning-${item.index}`,
          isStreaming: false,
          text: item.part.text,
        },
      });
      continue;
    }

    const { part } = item;
    if (isShowingAsCard(part)) {
      continue;
    }

    if (COMPLETED_STATES.has(part.state)) {
      const entry = toToolCallEntry(part);
      const prev = pendingTools.at(-1);
      if (
        prev &&
        STATEFUL_TOOL_CATEGORIES.has(entry.tool_category) &&
        prev.tool_category === entry.tool_category
      ) {
        pendingTools[pendingTools.length - 1] = entry;
      } else {
        pendingTools.push(entry);
      }
    }
  }

  flushPendingTools();
  return steps;
}

function getLiveState(
  items: ActivityItem[],
  isShowingAsCard: (part: DynamicToolPart) => boolean
): {
  liveReasoning: ReasoningStep | null;
  liveTool: { category: string; label: string; detail?: string } | null;
} {
  let liveReasoning: ReasoningStep | null = null;
  let liveTool: { category: string; label: string; detail?: string } | null =
    null;

  for (const item of items) {
    if (item.kind === "reasoning" && item.part.state === "streaming") {
      liveReasoning = {
        id: `reasoning-live-${item.index}`,
        isStreaming: true,
        text: item.part.text,
      };
    }
    if (
      item.kind === "tool" &&
      !isShowingAsCard(item.part) &&
      ACTIVE_STATES.has(item.part.state)
    ) {
      const display = getToolDisplayInfo(item.part.toolName, item.part.input);
      const inputs = asToolInputs(item.part.input);
      const task =
        typeof inputs?.message === "string" ? inputs.message.trim() : undefined;
      liveTool = {
        category: display.category,
        detail: display.category === "handoff" ? task : undefined,
        label:
          display.category === "handoff"
            ? "Working via subagent"
            : display.runningLabel,
      };
    }
  }

  return { liveReasoning, liveTool };
}

function useSettlingAnswerIds(items: ActivityItem[]): Set<string> {
  const [settlingIds, setSettlingIds] = useState<Set<string>>(() => new Set());
  const prevPendingRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const pendingIds = new Set(
      items
        .filter(
          (item): item is Extract<ActivityItem, { kind: "tool" }> =>
            item.kind === "tool" && isPendingInteractiveTool(item.part)
        )
        .map((item) => item.part.toolCallId)
    );

    for (const id of prevPendingRef.current) {
      if (pendingIds.has(id) || timersRef.current.has(id)) {
        continue;
      }

      setSettlingIds((current) => {
        const next = new Set(current);
        next.add(id);
        return next;
      });

      const timerId = window.setTimeout(() => {
        timersRef.current.delete(id);
        setSettlingIds((current) => {
          if (!current.has(id)) {
            return current;
          }
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      }, ANSWER_SETTLE_MS);

      timersRef.current.set(id, timerId);
    }

    prevPendingRef.current = pendingIds;
  }, [items]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timerId of timers.values()) {
        window.clearTimeout(timerId);
      }
      timers.clear();
    };
  }, []);

  // Fold early once later activity exists — don't wait out the settle timer.
  const effective = new Set<string>();
  for (const id of settlingIds) {
    if (!hasLaterActivity(items, id)) {
      effective.add(id);
    }
  }
  return effective;
}

type LiveTool = { category: string; label: string; detail?: string };

/**
 * Relabel a live handoff for the phase it is in. "Working via subagent" is
 * only true while children are running, and in that window the subagent rows
 * have replaced this row anyway.
 */
function handoffLabelled(
  liveTool: LiveTool | null,
  seenSubagents: boolean
): LiveTool | null {
  if (liveTool?.category !== "handoff") {
    return liveTool;
  }
  return {
    ...liveTool,
    label: seenSubagents ? "Dismissing subagents" : "Creating subagents",
  };
}

/**
 * Progressive disclosure for reasoning + tool calls in chronological order.
 */
export function AgentActivityGroup({
  items,
  onRespond,
  subagents = [],
}: {
  items: ActivityItem[];
  onRespond: (requestId: string, optionId: string) => void;
  /** Running subagents — rendered in place of the live handoff row. */
  subagents?: readonly SubagentActivity[];
}) {
  const reduceMotion = useReducedMotion();
  const settlingIds = useSettlingAnswerIds(items);

  // The handoff tool brackets the children: it is live before the first one
  // reports and after the last one finishes. Which side of that we are on is
  // what makes "creating" vs "dismissing" the honest label.
  const [seenSubagents, setSeenSubagents] = useState(false);
  useEffect(() => {
    if (subagents.length > 0) {
      setSeenSubagents(true);
    }
  }, [subagents.length]);

  const isShowingAsCard = (part: DynamicToolPart): boolean => {
    if (isPendingInteractiveTool(part)) {
      return true;
    }
    return (
      Boolean(part.toolMetadata?.eve?.inputRequest) &&
      settlingIds.has(part.toolCallId) &&
      !hasLaterActivity(items, part.toolCallId)
    );
  };

  const interactive = items.filter(
    (item): item is Extract<ActivityItem, { kind: "tool" }> =>
      item.kind === "tool" && isShowingAsCard(item.part)
  );

  const steps = buildTimelineSteps(items, isShowingAsCard);
  const { liveReasoning, liveTool } = getLiveState(items, isShowingAsCard);

  // Running subagents say what the handoff is actually doing, so they stand in
  // for the generic live row rather than sitting alongside it.
  const showSubagentRows =
    subagents.length > 0 && liveTool?.category === "handoff";

  return (
    <div className="flex w-full flex-col gap-0.5">
      <AgentActivitySection
        liveReasoning={liveReasoning}
        liveTool={
          showSubagentRows ? null : handoffLabelled(liveTool, seenSubagents)
        }
        steps={steps}
      />
      {showSubagentRows ? <SubagentActivityRows subagents={subagents} /> : null}
      <AnimatePresence initial={false} mode="popLayout">
        {interactive.map((item) => (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="pt-1"
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98, y: 6 }}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            key={item.part.toolCallId}
            layout={!reduceMotion}
            transition={{
              duration: 0.35,
              ease: agentRevealEase,
              layout: agentLayoutSpring,
            }}
          >
            <ToolPart onRespond={onRespond} part={item.part} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
