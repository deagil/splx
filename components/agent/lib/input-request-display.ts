import type { EveMessagePart } from "eve/react";

type DynamicToolPartData = Extract<EveMessagePart, { type: "dynamic-tool" }>;
type InputRequest = NonNullable<
  NonNullable<DynamicToolPartData["toolMetadata"]>["eve"]
>["inputRequest"];

type AskQuestionOutput = {
  optionId?: string;
  text?: string;
  status?: "answered" | "ignored";
};

function resolveOptionLabel(
  request: InputRequest | undefined,
  optionId: string | undefined,
  text: string | undefined
): string | undefined {
  const selectedOption = request?.options?.find(
    (option) => option.id === optionId
  );
  return selectedOption?.label ?? text ?? optionId;
}

function getResponseFromOutput(
  part: DynamicToolPartData,
  request: InputRequest | undefined
): string | undefined {
  if (
    !("output" in part) ||
    part.output === undefined ||
    part.output === null
  ) {
    return;
  }

  if (typeof part.output !== "object") {
    return typeof part.output === "string" ? part.output : undefined;
  }

  const output = part.output as AskQuestionOutput;
  if (output.status === "ignored") {
    return "Skipped";
  }

  return resolveOptionLabel(request, output.optionId, output.text);
}

/** True while the runtime is waiting for a user response. */
export function isInputRequestPending(part: DynamicToolPartData): boolean {
  return (
    part.state === "approval-requested" &&
    Boolean(part.toolMetadata?.eve?.inputRequest)
  );
}

/**
 * Resolve the label shown after answering.
 * Live sessions store `inputResponse` on metadata; historic replays derive it
 * from terminal tool state and `ask_question` output instead.
 */
export function getInputRequestResponseLabel(
  part: DynamicToolPartData
): string | undefined {
  const request = part.toolMetadata?.eve?.inputRequest;
  const inputResponse = part.toolMetadata?.eve?.inputResponse;

  if (inputResponse) {
    return resolveOptionLabel(
      request,
      inputResponse.optionId,
      inputResponse.text ?? inputResponse.optionId
    );
  }

  const fromOutput = getResponseFromOutput(part, request);
  if (fromOutput) {
    return fromOutput;
  }

  if (part.state === "approval-responded" && part.approval?.reason) {
    return part.approval.reason;
  }

  if (
    part.state === "output-available" ||
    part.state === "approval-responded"
  ) {
    return "Answered";
  }
}
