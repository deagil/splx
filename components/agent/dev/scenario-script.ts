import type { ChatStatus } from "ai";
import type { EveMessage, EveMessagePart } from "eve/react";
import type { SubagentActivity } from "@/components/agent/lib/subagent-activity";
import type { OrbState } from "@/components/agent/ui/agent-orb";

/**
 * Compact scripting layer for the mock harness.
 *
 * A scenario is written as a short list of steps ("user says X", "reasons",
 * "calls this tool", "streams this text"). `buildFrames` expands that into
 * every intermediate snapshot the real reducer would have produced, so the
 * scrubber can stop on any of them — including the half-streamed ones that are
 * impossible to catch by hand in a live session.
 */

type DynamicToolPart = Extract<EveMessagePart, { type: "dynamic-tool" }>;
type InputRequest = NonNullable<
  NonNullable<DynamicToolPart["toolMetadata"]>["eve"]
>["inputRequest"];
type InputRequestOption = NonNullable<
  NonNullable<InputRequest>["options"]
>[number];
type AuthorizationPart = Extract<EveMessagePart, { type: "authorization" }>;
type AuthorizationOutcome = Extract<
  AuthorizationPart,
  { state: "completed" }
>["outcome"];

export type TodoFixture = {
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
};

/**
 * One running subagent. `callId` keys the pill across frames — reuse it to
 * change a subagent's activity, change it to swap the subagent out.
 */
export type SubagentFixture = {
  callId?: string;
  name: string;
  label: string;
  state: OrbState;
  /** The task it was handed — becomes the first message in its preview. */
  task?: string;
  /** What it has said so far, shown in the dock preview. */
  said?: string[];
};

export type ScenarioStep =
  /** A user turn. Emits the "submitted, nothing back yet" frame. */
  | { kind: "user"; text: string }
  /** Streamed reasoning. `chunks` controls how many partial frames appear. */
  | { kind: "reasoning"; text: string; chunks?: number }
  /** Streamed assistant prose. */
  | { kind: "text"; text: string; chunks?: number }
  /** A tool call running to completion (or to `error`). */
  | {
      kind: "tool";
      name: string;
      input?: unknown;
      output?: unknown;
      error?: string;
      /** Stop before the terminal frame — leaves the tool visibly running. */
      stayRunning?: boolean;
    }
  /** A HITL approval gate. Omit `approved` to park on the request. */
  | {
      kind: "approval";
      name: string;
      input?: unknown;
      approved?: boolean;
      output?: unknown;
    }
  /** An `ask_question`-style input request. Omit `answerId` to park on it. */
  | {
      kind: "ask";
      prompt: string;
      options: InputRequestOption[];
      display?: NonNullable<InputRequest>["display"];
      /** eve's request source. Defaults to `question`. */
      requestKind?: NonNullable<InputRequest>["kind"];
      allowFreeform?: boolean;
      answerId?: string;
    }
  /** A connector authorization card. Omit `outcome` to park on the prompt. */
  | {
      kind: "authorization";
      displayName: string;
      description: string;
      instructions?: string;
      url?: string;
      userCode?: string;
      outcome?: AuthorizationOutcome;
      reason?: string;
    }
  /** A todo-list tool call — renders the checklist card. */
  | { kind: "todos"; items: TodoFixture[] }
  /**
   * Sets the running-subagent roster (one presence pill each). Replaces the
   * previous roster wholesale, so pass `[]` to wind them all down.
   */
  | { kind: "subagents"; items: SubagentFixture[]; label?: string }
  /**
   * Completes the most recent tool left running by `stayRunning`. Without
   * this, a parked handoff keeps its live row (and the parent orb) going for
   * the rest of the scenario.
   */
  | { kind: "endTool"; output?: unknown; error?: string }
  /** A dead-air frame, e.g. the gap between two tool calls. */
  | { kind: "hold"; label?: string; ms?: number }
  /** Ends the turn: parts settle, status returns to `ready`. */
  | { kind: "done" }
  /** Ends the turn in the error state (drives the banner + toast path). */
  | { kind: "fail"; message?: string };

export type ScenarioFrame = {
  id: string;
  /** Shown on the scrubber, e.g. `reasoning · streaming 3/6`. */
  label: string;
  status: ChatStatus;
  messages: readonly EveMessage[];
  /** Running subagents at this frame — one presence pill each. */
  subagents: readonly SubagentActivity[];
  error?: Error;
  /** How long playback rests on this frame at 1x. */
  holdMs: number;
};

export type Scenario = {
  id: string;
  name: string;
  description: string;
  steps: ScenarioStep[];
};

const CHUNK_HOLD_MS = 90;
const TRANSITION_HOLD_MS = 550;
const SETTLE_HOLD_MS = 900;
const IDLE_HOLD_MS = 1400;

/**
 * A small transcript for a mocked subagent, so the dock preview has something
 * real to render. The live path gets this for free by folding the child's
 * event stream.
 */
function subagentFixtureMessages(
  callId: string,
  item: SubagentFixture
): readonly EveMessage[] {
  const messages: EveMessage[] = [
    {
      id: `${callId}-task`,
      metadata: { status: "complete" },
      parts: [
        {
          state: "done",
          text: item.task ?? `Delegated task for ${item.name}.`,
          type: "text",
        },
      ],
      role: "user",
    },
  ];

  const said = item.said ?? [];
  if (said.length > 0) {
    messages.push({
      id: `${callId}-said`,
      metadata: { status: "streaming" },
      parts: said.map((text, index) => ({
        state: index === said.length - 1 ? "streaming" : "done",
        text,
        type: "text",
      })),
      role: "assistant",
    });
  }

  return messages;
}

type DraftMessage = {
  id: string;
  role: "assistant" | "user";
  metadata?: EveMessage["metadata"];
  parts: EveMessagePart[];
};

/** Split text into `count` cumulative prefixes, breaking on word boundaries. */
function streamPrefixes(text: string, count: number): string[] {
  const words = text.split(/(\s+)/).filter(Boolean);
  const safeCount = Math.max(1, Math.min(count, words.length));
  const perChunk = Math.ceil(words.length / safeCount);
  const prefixes: string[] = [];

  for (let i = perChunk; i < words.length; i += perChunk) {
    prefixes.push(words.slice(0, i).join(""));
  }
  prefixes.push(text);

  return prefixes;
}

class FrameBuilder {
  private readonly messages: DraftMessage[];
  private readonly frames: ScenarioFrame[] = [];
  private assistantIndex: number | null = null;
  private stepIndex = 0;
  private seq = 0;
  private subagents: readonly SubagentActivity[] = [];
  private readonly turnId: string;

  constructor(seed: readonly EveMessage[], idPrefix: string) {
    this.turnId = `${idPrefix}-turn`;
    this.messages = seed.map((message) => ({
      id: message.id,
      metadata: message.metadata,
      parts: [...message.parts],
      role: message.role,
    }));

    // Continuing an unfinished turn (stop, or answering a HITL prompt) writes
    // into the assistant message already on screen, the way eve does — rather
    // than opening a second bubble beside it.
    const last = this.messages.at(-1);
    if (last?.role === "assistant" && last.metadata?.status !== "complete") {
      this.assistantIndex = this.messages.length - 1;
      this.stepIndex = last.parts.length;
      this.turnId = last.metadata?.turnId ?? this.turnId;
    }
  }

  build(steps: readonly ScenarioStep[]): ScenarioFrame[] {
    for (const step of steps) {
      this.applyStep(step);
    }
    return this.frames;
  }

  private applyStep(step: ScenarioStep): void {
    switch (step.kind) {
      case "user":
        this.applyUser(step.text);
        break;
      case "reasoning":
        this.applyStreamedPart("reasoning", step.text, step.chunks ?? 5);
        break;
      case "text":
        this.applyStreamedPart("text", step.text, step.chunks ?? 6);
        break;
      case "tool":
        this.applyTool(step);
        break;
      case "approval":
        this.applyApproval(step);
        break;
      case "ask":
        this.applyAsk(step);
        break;
      case "authorization":
        this.applyAuthorization(step);
        break;
      case "todos":
        this.applyTodos(step.items);
        break;
      case "subagents":
        this.applySubagents(step);
        break;
      case "endTool":
        this.applyEndTool(step);
        break;
      case "hold":
        this.emit(
          step.label ?? "waiting",
          "streaming",
          step.ms ?? IDLE_HOLD_MS
        );
        break;
      case "done":
        this.applyDone();
        break;
      case "fail":
        this.applyFail(step.message);
        break;
      default:
        break;
    }
  }

  private snapshot(): readonly EveMessage[] {
    return this.messages.map((message) => ({
      id: message.id,
      metadata: message.metadata,
      parts: [...message.parts],
      role: message.role,
    }));
  }

  private emit(
    label: string,
    status: ChatStatus,
    holdMs: number,
    error?: Error
  ): void {
    this.seq += 1;
    this.frames.push({
      error,
      holdMs,
      id: `frame-${this.seq}`,
      label,
      messages: this.snapshot(),
      status,
      subagents: this.subagents,
    });
  }

  private applyEndTool(step: Extract<ScenarioStep, { kind: "endTool" }>): void {
    if (this.assistantIndex === null) {
      return;
    }
    const { parts } = this.assistant();

    for (let slot = parts.length - 1; slot >= 0; slot--) {
      const part = parts[slot];
      if (
        part?.type !== "dynamic-tool" ||
        (part.state !== "input-available" && part.state !== "input-streaming")
      ) {
        continue;
      }

      const base = {
        stepIndex: part.stepIndex,
        toolCallId: part.toolCallId,
        toolMetadata: part.toolMetadata,
        toolName: part.toolName,
        type: "dynamic-tool",
      } as const;

      this.replacePart(
        slot,
        step.error
          ? {
              ...base,
              errorText: step.error,
              input: part.input,
              state: "output-error",
            }
          : {
              ...base,
              input: part.input,
              output: step.output ?? { ok: true },
              state: "output-available",
            }
      );
      this.emit(
        `${part.toolName} · ${step.error ? "failed" : "done"}`,
        "streaming",
        TRANSITION_HOLD_MS
      );
      return;
    }
  }

  private applySubagents(
    step: Extract<ScenarioStep, { kind: "subagents" }>
  ): void {
    // Keyed by name, not roster position: when one finishes and the list
    // shifts up, the survivors must keep their identity or their pills remount
    // (losing the animation) and their orb colours reshuffle.
    this.subagents = step.items.map((item) => {
      const callId = item.callId ?? `${this.turnId}-subagent-${item.name}`;
      return {
        callId,
        label: item.label,
        messages: subagentFixtureMessages(callId, item),
        name: item.name,
        state: item.state,
      };
    });

    const summary =
      step.items.length === 0
        ? "subagents · all finished"
        : `subagents · ${step.items.length} running`;
    this.emit(step.label ?? summary, "streaming", IDLE_HOLD_MS);
  }

  /** The assistant message the current turn is writing into. */
  private assistant(): DraftMessage {
    if (this.assistantIndex === null) {
      const draft: DraftMessage = {
        id: `${this.turnId}-assistant-${this.messages.length}`,
        metadata: { status: "streaming", turnId: this.turnId },
        parts: [],
        role: "assistant",
      };
      this.messages.push(draft);
      this.assistantIndex = this.messages.length - 1;
      return draft;
    }
    // biome-ignore lint/style/noNonNullAssertion: index is owned by this class
    return this.messages[this.assistantIndex]!;
  }

  /** Append a part and return its slot, so later frames can replace it. */
  private pushPart(part: EveMessagePart): number {
    const assistant = this.assistant();
    assistant.parts.push(part);
    return assistant.parts.length - 1;
  }

  private replacePart(slot: number, part: EveMessagePart): void {
    this.assistant().parts[slot] = part;
  }

  private applyUser(text: string): void {
    this.assistantIndex = null;
    this.stepIndex = 0;
    this.subagents = [];
    this.messages.push({
      id: `${this.turnId}-user-${this.messages.length}`,
      metadata: { status: "submitted" },
      parts: [{ state: "done", text, type: "text" }],
      role: "user",
    });
    this.emit("user sent · turn starting", "submitted", TRANSITION_HOLD_MS);
  }

  private applyStreamedPart(
    type: "reasoning" | "text",
    text: string,
    chunks: number
  ): void {
    const prefixes = streamPrefixes(text, chunks);
    const slot = this.pushPart({
      state: "streaming",
      stepIndex: this.stepIndex,
      text: prefixes[0] ?? "",
      type,
    });

    prefixes.forEach((prefix, index) => {
      this.replacePart(slot, {
        state: "streaming",
        stepIndex: this.stepIndex,
        text: prefix,
        type,
      });
      this.emit(
        `${type} · streaming ${index + 1}/${prefixes.length}`,
        "streaming",
        CHUNK_HOLD_MS
      );
    });

    this.replacePart(slot, {
      state: "done",
      stepIndex: this.stepIndex,
      text,
      type,
    });
    this.emit(`${type} · done`, "streaming", TRANSITION_HOLD_MS);
    this.stepIndex += 1;
  }

  private applyTool(step: Extract<ScenarioStep, { kind: "tool" }>): void {
    const toolCallId = `${this.turnId}-tool-${this.seq}`;
    const base = {
      stepIndex: this.stepIndex,
      toolCallId,
      toolName: step.name,
      type: "dynamic-tool",
    } as const;

    const slot = this.pushPart({
      ...base,
      input: undefined,
      state: "input-streaming",
    });
    this.emit(`${step.name} · input streaming`, "streaming", CHUNK_HOLD_MS * 3);

    this.replacePart(slot, {
      ...base,
      input: step.input ?? {},
      state: "input-available",
    });
    this.emit(`${step.name} · running`, "streaming", IDLE_HOLD_MS);

    if (step.stayRunning) {
      this.stepIndex += 1;
      return;
    }

    if (step.error) {
      this.replacePart(slot, {
        ...base,
        errorText: step.error,
        input: step.input ?? {},
        state: "output-error",
      });
      this.emit(`${step.name} · failed`, "streaming", TRANSITION_HOLD_MS);
    } else {
      this.replacePart(slot, {
        ...base,
        input: step.input ?? {},
        output: step.output ?? { ok: true },
        state: "output-available",
      });
      this.emit(`${step.name} · done`, "streaming", TRANSITION_HOLD_MS);
    }

    this.stepIndex += 1;
  }

  private applyApproval(
    step: Extract<ScenarioStep, { kind: "approval" }>
  ): void {
    const toolCallId = `${this.turnId}-approval-${this.seq}`;
    const approvalId = `${toolCallId}-approval`;
    const base = {
      stepIndex: this.stepIndex,
      toolCallId,
      toolName: step.name,
      type: "dynamic-tool",
    } as const;
    const input = step.input ?? {};

    const slot = this.pushPart({
      ...base,
      approval: { id: approvalId },
      input,
      state: "approval-requested",
    });
    this.emit(`${step.name} · awaiting approval`, "streaming", IDLE_HOLD_MS);

    if (step.approved === undefined) {
      this.stepIndex += 1;
      return;
    }

    this.replacePart(slot, {
      ...base,
      approval: { approved: step.approved, id: approvalId },
      input,
      state: "approval-responded",
    });
    this.emit(
      `${step.name} · ${step.approved ? "approved" : "denied"}`,
      "streaming",
      TRANSITION_HOLD_MS
    );

    if (step.approved) {
      this.replacePart(slot, {
        ...base,
        approval: { approved: true, id: approvalId },
        input,
        output: step.output ?? { ok: true },
        state: "output-available",
      });
      this.emit(`${step.name} · done`, "streaming", TRANSITION_HOLD_MS);
    } else {
      this.replacePart(slot, {
        ...base,
        approval: { approved: false, id: approvalId },
        input,
        state: "output-denied",
      });
      this.emit(`${step.name} · denied`, "streaming", TRANSITION_HOLD_MS);
    }

    this.stepIndex += 1;
  }

  private applyAsk(step: Extract<ScenarioStep, { kind: "ask" }>): void {
    const toolCallId = `${this.turnId}-ask-${this.seq}`;
    const requestId = `${toolCallId}-request`;
    const request: InputRequest = {
      allowFreeform: step.allowFreeform,
      display: step.display ?? "select",
      kind: step.requestKind ?? "question",
      options: step.options,
      prompt: step.prompt,
      requestId,
    };
    const base = {
      stepIndex: this.stepIndex,
      toolCallId,
      toolMetadata: { eve: { kind: "tool-call", name: "ask_question" } },
      toolName: "ask_question",
      type: "dynamic-tool",
    } as const;

    const slot = this.pushPart({
      ...base,
      approval: { id: `${toolCallId}-approval` },
      input: { prompt: step.prompt },
      state: "approval-requested",
      toolMetadata: {
        eve: { inputRequest: request, kind: "tool-call", name: "ask_question" },
      },
    });
    this.emit("ask_question · waiting for you", "streaming", IDLE_HOLD_MS);

    if (!step.answerId) {
      this.stepIndex += 1;
      return;
    }

    this.replacePart(slot, {
      ...base,
      input: { prompt: step.prompt },
      output: { optionId: step.answerId, status: "answered" },
      state: "output-available",
      toolMetadata: {
        eve: { inputRequest: request, kind: "tool-call", name: "ask_question" },
      },
    });
    this.emit("ask_question · answered", "streaming", TRANSITION_HOLD_MS);
    this.stepIndex += 1;
  }

  private applyAuthorization(
    step: Extract<ScenarioStep, { kind: "authorization" }>
  ): void {
    const base = {
      description: step.description,
      displayName: step.displayName,
      name: step.displayName.toLowerCase().replace(/\s+/g, "_"),
      stepIndex: this.stepIndex,
      turnId: this.turnId,
      type: "authorization",
    } as const;

    const slot = this.pushPart({
      ...base,
      authorization: {
        displayName: step.displayName,
        instructions: step.instructions,
        url: step.url,
        userCode: step.userCode,
      },
      state: "required",
    });
    this.emit(
      `${step.displayName} · authorization required`,
      "streaming",
      IDLE_HOLD_MS
    );

    if (!step.outcome) {
      this.stepIndex += 1;
      return;
    }

    this.replacePart(slot, {
      ...base,
      outcome: step.outcome,
      reason: step.reason,
      state: "completed",
    });
    this.emit(
      `${step.displayName} · ${step.outcome}`,
      "streaming",
      TRANSITION_HOLD_MS
    );
    this.stepIndex += 1;
  }

  private applyTodos(items: TodoFixture[]): void {
    const toolCallId = `${this.turnId}-todos-${this.seq}`;
    const base = {
      stepIndex: this.stepIndex,
      toolCallId,
      toolName: "todo_write",
      type: "dynamic-tool",
    } as const;
    const input = { todos: items };

    const slot = this.pushPart({ ...base, input, state: "input-available" });
    this.emit("todo_write · running", "streaming", CHUNK_HOLD_MS * 4);

    this.replacePart(slot, {
      ...base,
      input,
      output: {
        counts: {
          completed: items.filter((item) => item.status === "completed").length,
          total: items.length,
        },
        todos: items,
      },
      state: "output-available",
    });
    this.emit("todo_write · done", "streaming", TRANSITION_HOLD_MS);
    this.stepIndex += 1;
  }

  /** Settle any still-streaming parts, the way a finished turn would. */
  private settleParts(): void {
    if (this.assistantIndex === null) {
      return;
    }
    const assistant = this.assistant();
    assistant.parts = assistant.parts.map((part) =>
      (part.type === "text" || part.type === "reasoning") &&
      part.state === "streaming"
        ? { ...part, state: "done" }
        : part
    );
  }

  private applyDone(): void {
    this.settleParts();
    if (this.assistantIndex !== null) {
      this.assistant().metadata = { status: "complete", turnId: this.turnId };
    }
    this.subagents = [];
    this.emit("turn complete · idle", "ready", SETTLE_HOLD_MS);
    this.assistantIndex = null;
  }

  private applyFail(message?: string): void {
    this.settleParts();
    if (this.assistantIndex !== null) {
      this.assistant().metadata = { status: "failed", turnId: this.turnId };
    }
    this.subagents = [];
    this.emit(
      "turn failed · error pill",
      "error",
      SETTLE_HOLD_MS,
      new Error(message ?? "The model stopped responding. Please try again.")
    );
    this.assistantIndex = null;
  }
}

/**
 * Expand a script into every frame it passes through.
 * `seed` continues from an existing conversation instead of starting empty.
 */
export function buildFrames(
  steps: readonly ScenarioStep[],
  seed: readonly EveMessage[] = [],
  idPrefix = "mock"
): ScenarioFrame[] {
  return new FrameBuilder(seed, idPrefix).build(steps);
}
