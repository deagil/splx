"use client";

import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";

interface MessageReasoningProps {
  /** When true, text response has started streaming - triggers collapse */
  hasTextStarted?: boolean;
  isLoading: boolean;
  reasoning: string;
}

export function MessageReasoning({
  isLoading,
  reasoning,
  hasTextStarted = false,
}: MessageReasoningProps) {
  // Show reasoning component immediately when streaming starts, even with empty content
  // This ensures the "Thinking..." state appears right away
  const shouldShow = isLoading || reasoning.trim().length > 0;

  if (!shouldShow) {
    return null;
  }

  // When text starts streaming, reasoning is no longer actively streaming
  // This triggers the auto-collapse behavior
  const isReasoningStreaming = isLoading && !hasTextStarted;

  return (
    <Reasoning
      data-testid="message-reasoning"
      defaultOpen={true}
      isStreaming={isReasoningStreaming}
      reasoning={reasoning}
    >
      <ReasoningTrigger />
      <ReasoningContent />
    </Reasoning>
  );
}
