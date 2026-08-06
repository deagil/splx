"use client";

import {
  ChevronDownIcon,
  ChevronUpIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  SkipBackIcon,
  SkipForwardIcon,
  XIcon,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import type { OrbActivity } from "@/components/agent/lib/orb-activity";
import type { OrbState } from "@/components/agent/ui/agent-orb";
import { useChatSidebarSide } from "@/components/sidebar/use-chat-sidebar-side";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getScenario, SCENARIOS } from "./scenarios";
import type { MockAgentController } from "./use-mock-agent";

const ORB_STATES: OrbState[] = [
  "breathing",
  "working",
  "searching",
  "solving",
  "listening",
  "connecting",
  "weaving",
  "composing",
  "shaping",
];

const SPEEDS = [0.25, 0.5, 1, 2, 4];

export type SubagentPlacement = "feed" | "stack";

export type PresenceOverrideState = {
  enabled: boolean;
  state: OrbState;
  label: string;
};

export const DEFAULT_PRESENCE_OVERRIDE: PresenceOverrideState = {
  enabled: false,
  label: "Thinking…",
  state: "breathing",
};

export function resolvePresenceOverride(
  override: PresenceOverrideState
): OrbActivity | undefined {
  return override.enabled
    ? { label: override.label, state: override.state }
    : undefined;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="w-16 shrink-0 text-[10px] text-muted-foreground uppercase tracking-wide">
      {children}
    </span>
  );
}

const selectClass =
  "min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Floating dev-only control surface for the mock sidebar chat.
 *
 * Deliberately plain HTML controls: it must never be mistaken for product UI,
 * and it must not perturb the component tree it exists to inspect.
 */
export function AgentDevPanel({
  mock,
  presence,
  onPresenceChange,
  placement,
  onPlacementChange,
  onExit,
}: {
  mock: MockAgentController;
  presence: PresenceOverrideState;
  onPresenceChange: (next: PresenceOverrideState) => void;
  placement: SubagentPlacement;
  onPlacementChange: (next: SubagentPlacement) => void;
  onExit: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  // Sit opposite the agent dock, which anchors to the sidebar's corner.
  const { side } = useChatSidebarSide();
  const scenario = getScenario(mock.scenarioId);
  const frame = mock.frames[mock.frameIndex];
  const lastIndex = Math.max(0, mock.frames.length - 1);

  return (
    <div
      className={cn(
        "fixed bottom-4 z-[100] w-[22rem] max-w-[calc(100vw-2rem)]",
        side === "right" ? "left-4" : "right-4",
        "rounded-xl border border-border bg-card/95 shadow-lg backdrop-blur",
        "font-mono text-foreground text-xs"
      )}
    >
      <div className="flex items-center gap-2 border-border border-b px-3 py-2">
        <span className="size-2 shrink-0 rounded-full bg-amber-500" />
        <span className="flex-1 font-semibold text-[11px] uppercase tracking-wide">
          Agent mock harness
        </span>
        <Button
          className="size-6"
          onClick={() => setCollapsed((value) => !value)}
          size="icon"
          type="button"
          variant="ghost"
        >
          {collapsed ? (
            <ChevronUpIcon className="size-3.5" />
          ) : (
            <ChevronDownIcon className="size-3.5" />
          )}
        </Button>
        <Button
          className="size-6"
          onClick={onExit}
          size="icon"
          title="Exit mock mode"
          type="button"
          variant="ghost"
        >
          <XIcon className="size-3.5" />
        </Button>
      </div>

      {collapsed ? null : (
        <div className="flex flex-col gap-2.5 p-3">
          <label className="flex items-center gap-2">
            <FieldLabel>Scenario</FieldLabel>
            <select
              className={selectClass}
              onChange={(event) => mock.setScenarioId(event.target.value)}
              value={mock.scenarioId}
            >
              {SCENARIOS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {scenario.description}
          </p>

          <div className="flex items-center gap-1">
            <Button
              className="size-7"
              disabled={mock.frameIndex === 0}
              onClick={() => mock.step(-1)}
              size="icon"
              title="Previous frame"
              type="button"
              variant="outline"
            >
              <SkipBackIcon className="size-3.5" />
            </Button>
            <Button
              className="size-7"
              disabled={mock.frames.length <= 1}
              onClick={mock.togglePlay}
              size="icon"
              title={mock.playing ? "Pause" : "Play"}
              type="button"
              variant="outline"
            >
              {mock.playing ? (
                <PauseIcon className="size-3.5" />
              ) : (
                <PlayIcon className="size-3.5" />
              )}
            </Button>
            <Button
              className="size-7"
              disabled={mock.frameIndex >= lastIndex}
              onClick={() => mock.step(1)}
              size="icon"
              title="Next frame"
              type="button"
              variant="outline"
            >
              <SkipForwardIcon className="size-3.5" />
            </Button>
            <Button
              className="size-7"
              onClick={mock.restart}
              size="icon"
              title="Restart scenario"
              type="button"
              variant="outline"
            >
              <RotateCcwIcon className="size-3.5" />
            </Button>

            <select
              className="ml-auto rounded-md border border-border bg-background px-1.5 py-1 text-[11px]"
              onChange={(event) =>
                mock.setSpeed(Number.parseFloat(event.target.value))
              }
              value={mock.speed}
            >
              {SPEEDS.map((value) => (
                <option key={value} value={value}>
                  {value}×
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <input
              className="w-full accent-primary"
              disabled={mock.frames.length <= 1}
              max={lastIndex}
              min={0}
              onChange={(event) =>
                mock.seek(Number.parseInt(event.target.value, 10))
              }
              step={1}
              type="range"
              value={mock.frameIndex}
            />
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[10px] text-muted-foreground">
                {frame?.label ?? "—"}
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                {mock.frames.length === 0
                  ? "0 / 0"
                  : `${mock.frameIndex + 1} / ${mock.frames.length}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 border-border border-t pt-2.5">
            <FieldLabel>Status</FieldLabel>
            <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
              {mock.status}
            </code>
            {mock.error ? (
              <span className="truncate text-[10px] text-destructive">
                error pill
              </span>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 border-border border-t pt-2.5">
            <label className="flex items-center gap-2">
              <FieldLabel>Subagents</FieldLabel>
              <select
                className={selectClass}
                onChange={(event) =>
                  onPlacementChange(event.target.value as SubagentPlacement)
                }
                value={placement}
              >
                <option value="feed">In feed (replaces handoff row)</option>
                <option value="stack">Stacked above composer</option>
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-2 border-border border-t pt-2.5">
            <label className="flex items-center gap-2">
              <input
                checked={presence.enabled}
                className="accent-primary"
                onChange={(event) =>
                  onPresenceChange({
                    ...presence,
                    enabled: event.target.checked,
                  })
                }
                type="checkbox"
              />
              <span className="text-[11px]">Force presence pill</span>
            </label>

            <label className="flex items-center gap-2">
              <FieldLabel>Orb</FieldLabel>
              <select
                className={selectClass}
                disabled={!presence.enabled}
                onChange={(event) =>
                  onPresenceChange({
                    ...presence,
                    state: event.target.value as OrbState,
                  })
                }
                value={presence.state}
              >
                {ORB_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2">
              <FieldLabel>Label</FieldLabel>
              <input
                className={selectClass}
                disabled={!presence.enabled}
                onChange={(event) =>
                  onPresenceChange({ ...presence, label: event.target.value })
                }
                type="text"
                value={presence.label}
              />
            </label>
          </div>

          <p className="border-border border-t pt-2 text-[10px] text-muted-foreground leading-relaxed">
            Mock mode — no model calls, no tokens. Typing in the composer plays
            a canned reply.
          </p>
        </div>
      )}
    </div>
  );
}
