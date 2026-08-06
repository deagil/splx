"use client";

import type { EveMessagePart } from "eve/react";
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
import { ToolPart } from "./tool-part";

const COMPLETED_STATES = new Set<
  Extract<EveMessagePart, { type: "dynamic-tool" }>["state"]
>(["output-available", "output-error", "output-denied"]);

const ACTIVE_STATES = new Set<
  Extract<EveMessagePart, { type: "dynamic-tool" }>["state"]
>(["input-streaming", "input-available", "approval-responded"]);

/**
 * Whether a tool call renders as its own card below the timeline instead of
 * collapsing into it. Agent C also listed `save_memory` and `create_artifact`
 * by name here; those renderers are out of scope, so what is left is the
 * structural test — the tool is waiting on the user.
 */
function isInteractiveTool(
  part: Extract<EveMessagePart, { type: "dynamic-tool" }>
): boolean {
  if (part.state === "approval-requested") {
    return true;
  }
  if (part.toolMetadata?.eve?.inputRequest) {
    return true;
  }
  return false;
}

function toToolCallEntry(
  part: Extract<EveMessagePart, { type: "dynamic-tool" }>
): ToolCallEntry {
  const display = getToolDisplayInfo(part.toolName, part.input);
  const errorText = "errorText" in part ? part.errorText : undefined;
  const output = "output" in part ? part.output : undefined;

  return {
    inputs: asToolInputs(part.input),
    integration_name: display.integrationName,
    message: display.completedLabel,
    output: serializeToolOutput(output, errorText),
    show_category: display.showCategory,
    tool_call_id: part.toolCallId,
    tool_category: display.category,
    tool_name: part.toolName,
  };
}

function buildTimelineSteps(items: ActivityItem[]): ActivityStep[] {
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

    const part = item.part;
    if (isInteractiveTool(part)) {
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

function getLiveState(items: ActivityItem[]): {
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
      !isInteractiveTool(item.part) &&
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

/**
 * Progressive disclosure for reasoning + tool calls in chronological order.
 */
export function AgentActivityGroup({
  items,
  onRespond,
}: {
  items: ActivityItem[];
  onRespond: (requestId: string, optionId: string) => void;
}) {
  const interactive = items.filter(
    (item): item is Extract<ActivityItem, { kind: "tool" }> =>
      item.kind === "tool" && isInteractiveTool(item.part)
  );

  const steps = buildTimelineSteps(items);
  const { liveReasoning, liveTool } = getLiveState(items);

  return (
    <div className="flex w-full flex-col gap-0.5">
      <AgentActivitySection
        liveReasoning={liveReasoning}
        liveTool={liveTool}
        steps={steps}
      />
      {interactive.map((item) => (
        <ToolPart
          key={item.part.toolCallId}
          onRespond={onRespond}
          part={item.part}
        />
      ))}
    </div>
  );
}
