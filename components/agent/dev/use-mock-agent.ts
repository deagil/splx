"use client";

import type { ChatStatus } from "ai";
import type { EveMessage, EveMessagePart } from "eve/react";
import { useCallback, useEffect, useState } from "react";
import type { SubagentActivity } from "@/components/agent/lib/subagent-activity";
import { buildFrames, type ScenarioFrame } from "./scenario-script";
import { buildReplyScript, getScenario } from "./scenarios";

export type MockAgentController = {
  messages: readonly EveMessage[];
  status: ChatStatus;
  error: Error | undefined;
  subagents: readonly SubagentActivity[];

  frames: readonly ScenarioFrame[];
  frameIndex: number;
  playing: boolean;
  speed: number;

  scenarioId: string;
  setScenarioId: (id: string) => void;
  seek: (index: number) => void;
  step: (delta: number) => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
  restart: () => void;

  /** Wired to the composer — appends a canned reply turn and plays it. */
  send: (message: string) => void;
  /** Wired to the composer's stop button — jumps to the settled frame. */
  stop: () => void;
  /** Wired to the HITL cards — resolves the pending request and continues. */
  respond: (requestId: string, optionId: string) => void;
};

const EMPTY_FRAME: ScenarioFrame = {
  holdMs: 1000,
  id: "frame-empty",
  label: "empty · greeting",
  messages: [],
  status: "ready",
  subagents: [],
};

function buildScenarioFrames(scenarioId: string): ScenarioFrame[] {
  const scenario = getScenario(scenarioId);
  return buildFrames(scenario.steps, [], scenario.id);
}

/** Mark a pending input-request part as answered, in place. */
function answerInputRequest(
  messages: readonly EveMessage[],
  requestId: string,
  optionId: string
): readonly EveMessage[] {
  return messages.map((message) => ({
    ...message,
    parts: message.parts.map((part): EveMessagePart => {
      if (
        part.type !== "dynamic-tool" ||
        part.state !== "approval-requested" ||
        part.toolMetadata?.eve?.inputRequest?.requestId !== requestId
      ) {
        return part;
      }
      return {
        input: part.input,
        output: { optionId, status: "answered" },
        state: "output-available",
        stepIndex: part.stepIndex,
        toolCallId: part.toolCallId,
        toolMetadata: part.toolMetadata,
        toolName: part.toolName,
        type: "dynamic-tool",
      };
    }),
  }));
}

/**
 * Drives the mock chat: expands a scenario into frames, then walks them.
 *
 * Playback is a chain of one-shot timers rather than an interval, so each
 * frame can hold for its own duration — a streamed chunk flicks past in ~90ms
 * while an awaiting-approval frame rests for over a second.
 */
export function useMockAgent(initialScenarioId: string): MockAgentController {
  const [scenarioId, setScenarioIdState] = useState(initialScenarioId);
  const [frames, setFrames] = useState<ScenarioFrame[]>(() =>
    buildScenarioFrames(initialScenarioId)
  );
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const lastIndex = Math.max(0, frames.length - 1);
  const safeIndex = Math.min(frameIndex, lastIndex);
  const current = frames[safeIndex] ?? EMPTY_FRAME;

  const setScenarioId = useCallback((id: string) => {
    setScenarioIdState(id);
    setFrames(buildScenarioFrames(id));
    setFrameIndex(0);
    setPlaying(false);
  }, []);

  const seek = useCallback(
    (index: number) => {
      setPlaying(false);
      setFrameIndex(Math.max(0, Math.min(index, lastIndex)));
    },
    [lastIndex]
  );

  const step = useCallback(
    (delta: number) => {
      setPlaying(false);
      setFrameIndex((index) => Math.max(0, Math.min(index + delta, lastIndex)));
    },
    [lastIndex]
  );

  const restart = useCallback(() => {
    setFrames(buildScenarioFrames(scenarioId));
    setFrameIndex(0);
    setPlaying(false);
  }, [scenarioId]);

  const togglePlay = useCallback(() => {
    if (playing) {
      setPlaying(false);
      return;
    }
    // Pressing play at the end replays rather than sitting still.
    if (safeIndex >= lastIndex) {
      setFrameIndex(0);
    }
    setPlaying(true);
  }, [lastIndex, playing, safeIndex]);

  // Advance one frame at a time, resting for the current frame's own duration.
  useEffect(() => {
    if (!playing || frames.length === 0 || safeIndex >= lastIndex) {
      return;
    }
    const delay = Math.max(16, current.holdMs / speed);
    const timer = window.setTimeout(() => {
      setFrameIndex((index) => Math.min(index + 1, lastIndex));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [current.holdMs, frames.length, lastIndex, playing, safeIndex, speed]);

  // Stop at the end rather than looping.
  useEffect(() => {
    if (playing && safeIndex >= lastIndex) {
      setPlaying(false);
    }
  }, [lastIndex, playing, safeIndex]);

  /**
   * Continue from the frame on screen: drop everything after it, append the
   * new frames, and jump to the first of them.
   */
  const appendAndPlay = useCallback(
    (next: ScenarioFrame[]) => {
      if (next.length === 0) {
        return;
      }
      setFrames((existing) => [...existing.slice(0, safeIndex + 1), ...next]);
      setFrameIndex(safeIndex + 1);
      setPlaying(true);
    },
    [safeIndex]
  );

  const send = useCallback(
    (message: string) => {
      const trimmed = message.trim();
      if (!trimmed) {
        return;
      }
      appendAndPlay(
        buildFrames(buildReplyScript(trimmed), current.messages, "reply")
      );
    },
    [appendAndPlay, current.messages]
  );

  const stop = useCallback(() => {
    setPlaying(false);
    appendAndPlay(buildFrames([{ kind: "done" }], current.messages, "stop"));
    setPlaying(false);
  }, [appendAndPlay, current.messages]);

  const respond = useCallback(
    (requestId: string, optionId: string) => {
      const answered = answerInputRequest(
        current.messages,
        requestId,
        optionId
      );
      appendAndPlay([
        {
          holdMs: 400,
          id: "frame-answered",
          label: "input request · answered",
          messages: answered,
          status: "streaming",
          subagents: current.subagents,
        },
        ...buildFrames(
          [
            {
              chunks: 8,
              kind: "text",
              text: "Got it — continuing with that option. (Mock harness reply.)",
            },
            { kind: "done" },
          ],
          answered,
          "answer"
        ),
      ]);
    },
    [appendAndPlay, current.messages, current.subagents]
  );

  return {
    error: current.error,
    frameIndex: safeIndex,
    frames,
    messages: current.messages,
    playing,
    respond,
    restart,
    scenarioId,
    seek,
    send,
    setScenarioId,
    setSpeed,
    speed,
    status: current.status,
    step,
    stop,
    subagents: current.subagents,
    togglePlay,
  };
}
