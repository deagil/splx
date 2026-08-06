import type { EveMessagePart } from "eve/react";

export type ToolCallEntry = {
  tool_name: string;
  tool_category: string;
  message?: string;
  show_category?: boolean;
  tool_call_id?: string;
  inputs?: Record<string, unknown>;
  output?: string;
  icon_url?: string;
  integration_name?: string;
  /** True while this tool call is still in progress (live row only). */
  is_streaming?: boolean;
};

export type ReasoningStep = {
  id: string;
  text: string;
  isStreaming: boolean;
};

export type ActivityStep =
  | { kind: "reasoning"; step: ReasoningStep }
  | { kind: "tool"; entry: ToolCallEntry };

type ReasoningPartData = Extract<EveMessagePart, { type: "reasoning" }>;
type DynamicToolPartData = Extract<EveMessagePart, { type: "dynamic-tool" }>;

export type ActivityItem =
  | { kind: "reasoning"; part: ReasoningPartData; index: number }
  | { kind: "tool"; part: DynamicToolPartData; index: number };
