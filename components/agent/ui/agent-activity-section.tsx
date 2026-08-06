"use client";

import { ChevronDownIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Streamdown } from "streamdown";
import {
  streamdownAnimation,
  streamdownPlugins,
} from "@/components/agent/lib/streamdown-config";
import {
  formatToolName,
  getActivitySummaryLabel,
  getReasoningSummaryLabel,
  getReasoningTimelineLabel,
  getToolCallsSummaryLabel,
  stripLatestReasoningHeading,
} from "@/components/agent/lib/tool-call-display";
import { getToolCategoryIcon } from "@/components/agent/lib/tool-icons";
import type {
  ActivityStep,
  ReasoningStep,
  ToolCallEntry,
} from "@/components/agent/parts/activity-types";
import {
  resolveTodos,
  type TodoItemData,
  TodosChecklist,
} from "@/components/agent/parts/todos-checklist";
import { useElapsedSeconds } from "@/components/agent/parts/use-elapsed-seconds";
import { useReasoningDuration } from "@/components/agent/parts/use-reasoning-duration";
import { streamdownLinkSafety } from "@/components/agent/ui/streamdown-link-safety-modal";
import { cn } from "@/lib/utils";

export type { ActivityStep, ReasoningStep, ToolCallEntry };

function formatElapsed(seconds: number | undefined): string | null {
  if (seconds === undefined || seconds < 0) {
    return null;
  }
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return rem === 0 ? `${minutes}m` : `${minutes}m ${rem}s`;
}

function DefaultContent({ content }: { content: unknown }) {
  const text =
    typeof content === "string"
      ? content
      : (() => {
          try {
            return JSON.stringify(content, null, 2);
          } catch {
            return String(content);
          }
        })();

  return (
    <pre className="max-h-60 w-fit max-w-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/60 p-3 text-muted-foreground text-xs">
      {text}
    </pre>
  );
}

function ToolCallDetails({
  call,
  contentRenderer,
}: {
  call: ToolCallEntry;
  contentRenderer: (content: unknown) => ReactNode;
}) {
  if (call.tool_category === "todos") {
    const todos = resolveTodos(call.inputs, call.output) ?? [];
    return <TodosChecklist todos={todos} />;
  }

  if (call.tool_category === "handoff") {
    const task =
      typeof call.inputs?.message === "string"
        ? call.inputs.message.trim()
        : undefined;
    return (
      <div className="space-y-2">
        {task ? (
          <div className="space-y-1">
            <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
              Task
            </p>
            <p className="whitespace-pre-wrap break-words text-muted-foreground text-xs leading-relaxed">
              {task}
            </p>
          </div>
        ) : null}
        {call.output ? (
          <div className="space-y-1">
            <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
              Result
            </p>
            {contentRenderer(call.output)}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {call.inputs && Object.keys(call.inputs).length > 0 ? (
        <div className="space-y-1">
          <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
            Input
          </p>
          {contentRenderer(call.inputs)}
        </div>
      ) : null}
      {call.output ? (
        <div className="space-y-1">
          <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
            Output
          </p>
          {contentRenderer(call.output)}
        </div>
      ) : null}
    </>
  );
}

function ReasoningDetails({
  text,
  isStreaming,
}: {
  text: string;
  isStreaming: boolean;
}) {
  const body = stripLatestReasoningHeading(text);
  if (!body.trim()) {
    return null;
  }

  return (
    <div className="max-h-60 overflow-y-auto text-muted-foreground text-xs">
      <Streamdown
        animated={streamdownAnimation}
        isAnimating={isStreaming}
        linkSafety={streamdownLinkSafety}
        plugins={streamdownPlugins}
      >
        {body}
      </Streamdown>
    </div>
  );
}

function ReasoningTimelineRow({
  step,
  isLast,
  iconSize,
  defaultExpanded,
}: {
  step: ReasoningStep;
  isLast: boolean;
  iconSize: number;
  defaultExpanded?: boolean;
}) {
  const duration = useReasoningDuration(step.isStreaming);
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const hasText = step.text.trim().length > 0;
  const bodyText = stripLatestReasoningHeading(step.text);
  const hasBody = bodyText.trim().length > 0;
  const label = getReasoningTimelineLabel({
    durationSeconds: duration,
    isStreaming: step.isStreaming,
    text: step.text,
  });

  return (
    <div className="flex gap-2">
      <div className="flex w-7 shrink-0 flex-col items-center">
        <span
          className="flex size-7 shrink-0 items-center justify-center"
          style={{ rotate: "-8deg" }}
        >
          {getToolCategoryIcon("reasoning", { size: iconSize })}
        </span>
        {isLast ? null : (
          <span className="mt-0.5 min-h-2 w-px flex-1 bg-border" />
        )}
      </div>

      <div className="min-w-0 flex-1 pb-2">
        <div className="flex min-h-7 items-center gap-1">
          {hasBody ? (
            <button
              aria-expanded={expanded}
              className="group/parent flex min-w-0 cursor-pointer items-center gap-1 text-left"
              onClick={() => setExpanded((open) => !open)}
              type="button"
            >
              <span
                className={cn(
                  "font-medium text-foreground/80 text-xs group-hover/parent:text-foreground",
                  step.isStreaming && "shimmer shimmer-duration-1000"
                )}
              >
                {label}
              </span>
              <ChevronDownIcon
                className={cn(
                  "size-3 shrink-0 text-muted-foreground transition-transform duration-200",
                  expanded && "rotate-180"
                )}
              />
            </button>
          ) : (
            <p
              className={cn(
                "font-medium text-foreground/80 text-xs",
                step.isStreaming && "shimmer shimmer-duration-1000"
              )}
            >
              {label}
            </p>
          )}
        </div>

        {expanded && hasBody ? (
          <div className="mt-2">
            <ReasoningDetails isStreaming={step.isStreaming} text={step.text} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SoloReasoningSection({
  step,
  className,
  iconSize = 16,
}: {
  step: ReasoningStep;
  className?: string;
  iconSize?: number;
}) {
  const duration = useReasoningDuration(step.isStreaming);
  const [isExpanded, setIsExpanded] = useState(false);
  const label = getReasoningTimelineLabel({
    durationSeconds: duration,
    isStreaming: step.isStreaming,
    text: step.text,
  });

  return (
    <div className={cn("not-prose w-full", className)}>
      <button
        aria-expanded={isExpanded}
        className="flex cursor-pointer items-center gap-2 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => setIsExpanded((open) => !open)}
        type="button"
      >
        <span style={{ rotate: "-8deg" }}>
          {getToolCategoryIcon("reasoning", { size: iconSize })}
        </span>
        <span
          className={cn(
            "font-medium text-xs",
            step.isStreaming && "shimmer shimmer-duration-1000"
          )}
        >
          {label}
        </span>
        <ChevronDownIcon
          className={cn(
            "size-3.5 transition-transform duration-200",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="pb-1 pl-1">
          <ReasoningDetails isStreaming={step.isStreaming} text={step.text} />
        </div>
      </div>
    </div>
  );
}

function isTodosOnlySteps(steps: ActivityStep[]): boolean {
  return (
    steps.length > 0 &&
    steps.every(
      (step) => step.kind === "tool" && step.entry.tool_category === "todos"
    )
  );
}

function SoloTodosSection({
  entry,
  todos,
  iconRenderer,
  iconSize,
  className,
}: {
  entry: ToolCallEntry;
  todos: TodoItemData[];
  iconRenderer: (call: ToolCallEntry, size: number) => ReactNode;
  iconSize: number;
  className?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className={cn("not-prose w-full", className)}>
      <button
        aria-expanded={isExpanded}
        className="flex cursor-pointer items-center gap-2 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => setIsExpanded((open) => !open)}
        type="button"
      >
        {iconRenderer(entry, iconSize)}
        <span className="font-medium text-xs">
          {entry.message || getToolCallsSummaryLabel([entry])}
        </span>
        <ChevronDownIcon
          className={cn(
            "size-3.5 transition-transform duration-200",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="pb-1 pl-1">
          <TodosChecklist todos={todos} />
        </div>
      </div>
    </div>
  );
}

export interface AgentActivitySectionProps {
  className?: string;
  iconSize?: number;
  liveReasoning?: ReasoningStep | null;
  liveTool?: { category: string; label: string; detail?: string } | null;
  maxIconsToShow?: number;
  steps: ActivityStep[];
}

export function AgentActivitySection({
  steps,
  liveReasoning = null,
  liveTool = null,
  className,
  iconSize = 16,
  maxIconsToShow = 10,
}: AgentActivitySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(
    () => new Set()
  );

  const toolEntries = useMemo(
    () =>
      steps
        .filter(
          (s): s is Extract<ActivityStep, { kind: "tool" }> => s.kind === "tool"
        )
        .map((s) => s.entry),
    [steps]
  );

  const reasoningSteps = useMemo(
    () =>
      steps.filter(
        (s): s is Extract<ActivityStep, { kind: "reasoning" }> =>
          s.kind === "reasoning"
      ),
    [steps]
  );

  const liveReasoningDuration = useReasoningDuration(
    liveReasoning?.isStreaming ?? false
  );
  const liveToolElapsed = useElapsedSeconds(Boolean(liveTool), liveTool?.label);

  const summaryLabel = getActivitySummaryLabel(
    reasoningSteps.length > 0 || liveReasoning
      ? {
          durationSeconds: liveReasoning ? liveReasoningDuration : undefined,
          isStreaming: liveReasoning?.isStreaming ?? false,
          text: liveReasoning?.text,
        }
      : null,
    toolEntries
  );

  const toggleStepExpansion = (index: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  if (steps.length === 0 && !liveReasoning && !liveTool) {
    return null;
  }

  const iconRenderer = (category: string, size: number) =>
    getToolCategoryIcon(category || "general", { size });

  // Solo reasoning — flat header + content
  if (
    steps.length === 1 &&
    steps[0]!.kind === "reasoning" &&
    !liveTool &&
    !liveReasoning
  ) {
    return (
      <SoloReasoningSection
        className={className}
        iconSize={iconSize}
        step={steps[0]!.step}
      />
    );
  }

  // Solo todos — flat header + checklist
  if (isTodosOnlySteps(steps) && !liveReasoning && !liveTool) {
    const entry = steps[steps.length - 1] as Extract<
      ActivityStep,
      { kind: "tool" }
    >;
    const todos = resolveTodos(entry.entry.inputs, entry.entry.output) ?? [];
    return (
      <SoloTodosSection
        className={className}
        entry={entry.entry}
        iconRenderer={(call, size) => iconRenderer(call.tool_category, size)}
        iconSize={iconSize}
        todos={todos}
      />
    );
  }

  const renderStackedIcons = () => {
    const icons: { key: string; category: string }[] = [];
    const seen = new Set<string>();

    for (const step of steps) {
      const category =
        step.kind === "reasoning" ? "reasoning" : step.entry.tool_category;
      if (seen.has(category)) {
        continue;
      }
      seen.add(category);
      icons.push({
        category,
        key:
          step.kind === "reasoning"
            ? step.step.id
            : (step.entry.tool_call_id ?? step.entry.tool_name),
      });
    }

    const displayIcons = icons.slice(0, maxIconsToShow);

    return (
      <span className="flex items-center -space-x-1.5">
        {displayIcons.map((item, index) => (
          <span
            className="relative inline-flex items-center justify-center"
            key={item.key}
            style={{
              rotate:
                displayIcons.length > 1
                  ? index % 2 === 0
                    ? "8deg"
                    : "-8deg"
                  : item.category === "reasoning"
                    ? "-8deg"
                    : "0deg",
              zIndex: index,
            }}
          >
            {iconRenderer(item.category, iconSize)}
          </span>
        ))}
        {icons.length > maxIconsToShow ? (
          <span className="relative z-10 ml-1 text-muted-foreground text-xs">
            +{icons.length - maxIconsToShow}
          </span>
        ) : null}
      </span>
    );
  };

  return (
    <div className={cn("not-prose w-full", className)}>
      <button
        aria-expanded={isExpanded}
        className="flex cursor-pointer items-center gap-2 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => setIsExpanded((open) => !open)}
        type="button"
      >
        {renderStackedIcons()}
        <span
          className={cn(
            "font-medium text-xs",
            liveReasoning?.isStreaming && "shimmer shimmer-duration-1000"
          )}
        >
          {summaryLabel}
        </span>
        <ChevronDownIcon
          className={cn(
            "size-3.5 transition-transform duration-200",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      {liveTool || (liveReasoning && steps.length > 0) ? (
        <div className="flex flex-col gap-0.5 py-1 text-muted-foreground">
          {liveTool ? (
            <div className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0">
                {iconRenderer(liveTool.category, 14)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="animate-pulse text-xs">
                    {liveTool.label}
                  </span>
                  {formatElapsed(liveToolElapsed) ? (
                    <span className="text-[11px] text-muted-foreground/80 tabular-nums">
                      {formatElapsed(liveToolElapsed)}
                    </span>
                  ) : null}
                </div>
                {liveTool.detail ? (
                  <p className="mt-0.5 line-clamp-3 text-[11px] text-muted-foreground/90 leading-snug">
                    {liveTool.detail}
                  </p>
                ) : null}
              </div>
            </div>
          ) : liveReasoning ? (
            <div className="flex items-center gap-2">
              <span style={{ rotate: "-8deg" }}>
                {iconRenderer("reasoning", 14)}
              </span>
              <span className="shimmer shimmer-duration-1000 animate-pulse text-xs">
                {getReasoningSummaryLabel({
                  durationSeconds: liveReasoningDuration,
                  isStreaming: true,
                  text: liveReasoning.text,
                })}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="flex flex-col gap-1 pt-1 pb-1">
          {steps.map((step, index) => {
            if (step.kind === "reasoning") {
              return (
                <ReasoningTimelineRow
                  defaultExpanded={false}
                  iconSize={iconSize}
                  isLast={index === steps.length - 1}
                  key={step.step.id}
                  step={step.step}
                />
              );
            }

            const call = step.entry;
            const hasCategoryText =
              call.show_category !== false &&
              Boolean(call.tool_category) &&
              call.tool_category !== "unknown" &&
              call.tool_category !== "general";
            const hasDetails = Boolean(call.inputs) || Boolean(call.output);
            const isTodosCall = call.tool_category === "todos";
            const isHandoffCall = call.tool_category === "handoff";
            const isStepExpanded =
              isTodosCall || isHandoffCall || expandedSteps.has(index);
            const label = call.message || formatToolName(call.tool_name);
            const contentRenderer = (content: unknown) => (
              <DefaultContent content={content} />
            );

            return (
              <div
                className="flex gap-2"
                key={call.tool_call_id ?? `${call.tool_name}-step-${index}`}
              >
                <div className="flex w-7 shrink-0 flex-col items-center">
                  <span className="flex size-7 shrink-0 items-center justify-center">
                    {iconRenderer(call.tool_category, iconSize)}
                  </span>
                  {index < steps.length - 1 ? (
                    <span className="mt-0.5 min-h-2 w-px flex-1 bg-border" />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1 pb-2">
                  <div className="flex min-h-7 items-center gap-1">
                    {hasDetails && !isTodosCall && !isHandoffCall ? (
                      <button
                        aria-expanded={isStepExpanded}
                        className="group/parent flex min-w-0 cursor-pointer items-center gap-1 text-left"
                        onClick={() => toggleStepExpansion(index)}
                        type="button"
                      >
                        <span className="font-medium text-foreground/80 text-xs group-hover/parent:text-foreground">
                          {label}
                        </span>
                        <ChevronDownIcon
                          className={cn(
                            "size-3 shrink-0 text-muted-foreground transition-transform duration-200",
                            isStepExpanded && "rotate-180"
                          )}
                        />
                      </button>
                    ) : (
                      <p className="font-medium text-foreground/80 text-xs">
                        {label}
                      </p>
                    )}
                  </div>

                  {hasCategoryText ? (
                    <p className="text-[11px] text-muted-foreground">
                      {call.integration_name ||
                        call.tool_category
                          .replace(/_/g, " ")
                          .split(" ")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() +
                              word.slice(1).toLowerCase()
                          )
                          .join(" ")}
                    </p>
                  ) : null}

                  {isStepExpanded && hasDetails ? (
                    <div className="mt-2 flex flex-col gap-2">
                      <ToolCallDetails
                        call={call}
                        contentRenderer={contentRenderer}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default AgentActivitySection;
