"use client";

import type { EveMessagePart } from "eve/react";
import {
  getInputRequestResponseLabel,
  isInputRequestPending,
} from "@/components/agent/lib/input-request-display";
import { InputRequestCard } from "@/components/agent/ui/input-request-card";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/agent/ui/tool";

type DynamicToolPartData = Extract<EveMessagePart, { type: "dynamic-tool" }>;

function getInputRequestTitle(part: DynamicToolPartData): string {
  const request = part.toolMetadata?.eve?.inputRequest;
  if (part.toolName === "ask_question") {
    return "Quick question";
  }
  if (request?.display === "confirmation") {
    return "Needs your approval";
  }
  return "Needs your input";
}

function getInputRequestDescription(
  part: DynamicToolPartData
): string | undefined {
  const request = part.toolMetadata?.eve?.inputRequest;
  if (!request) {
    return;
  }
  return request.prompt;
}

function getInputRequestIconCategory(part: DynamicToolPartData): string {
  const request = part.toolMetadata?.eve?.inputRequest;
  if (request?.display === "confirmation") {
    return "approval";
  }
  return "question";
}

export function ToolPart({
  part,
  onRespond,
}: {
  part: DynamicToolPartData;
  onRespond: (requestId: string, optionId: string) => void;
}) {
  // Agent C special-cased `save_memory` and `create_artifact` by tool name
  // here. Memory and artifacts are out of scope, so every tool without an
  // input request now falls through to the generic card below.
  const request = part.toolMetadata?.eve?.inputRequest;

  if (request) {
    const isPending = isInputRequestPending(part);
    const respondedWith = getInputRequestResponseLabel(part);

    return (
      <InputRequestCard
        allowFreeform={request.allowFreeform}
        description={getInputRequestDescription(part)}
        iconCategory={getInputRequestIconCategory(part)}
        isDenied={part.state === "output-denied"}
        isPending={isPending}
        onSelect={(optionId) => onRespond(request.requestId, optionId)}
        options={request.options}
        respondedWith={respondedWith}
        statusLabel={
          request.display === "confirmation"
            ? "Awaiting approval"
            : "Waiting for you"
        }
        title={getInputRequestTitle(part)}
      />
    );
  }

  return (
    <Tool
      defaultOpen={
        part.state === "approval-requested" || part.state === "output-error"
      }
    >
      <ToolHeader
        state={part.state}
        toolName={part.toolName}
        type="dynamic-tool"
      />
      <ToolContent>
        {"input" in part && part.input !== undefined ? (
          <ToolInput input={part.input} />
        ) : null}
        {"output" in part || "errorText" in part ? (
          <ToolOutput errorText={part.errorText} output={part.output} />
        ) : null}
      </ToolContent>
    </Tool>
  );
}
